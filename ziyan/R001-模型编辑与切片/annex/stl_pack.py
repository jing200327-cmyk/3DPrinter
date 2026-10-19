"""把二进制 STL 顶点聚类减面后，导出为 base64 内嵌资源（供原型 file:// 离线加载）。

用法：python stl_pack.py <in.stl> <out.js>
产出：window.__MODEL_ASSET = { name, vCount, tCount, bbox, pos:<b64 Float32>, idx:<b64 Uint16|Uint32> }
"""
import base64
import json
import struct
import sys

import numpy as np


def read_binary_stl(path: str) -> np.ndarray:
    with open(path, "rb") as f:
        f.read(80)
        (n,) = struct.unpack("<I", f.read(4))
        raw = f.read(n * 50)
    if len(raw) != n * 50:
        raise ValueError("STL 数据长度与面数不符，可能不是二进制 STL")
    data = np.frombuffer(raw, dtype=np.uint8).reshape(n, 50)
    # 每面：12 字节法线 + 9 个 float32 顶点
    verts = data[:, 12:48].copy().view(np.float32).reshape(n, 3, 3)
    return verts.astype(np.float64)


def weld(tris: np.ndarray, eps: float = 1e-4):
    """按坐标合并重复顶点，返回 (vertices, faces)。"""
    flat = tris.reshape(-1, 3)
    key = np.round(flat / eps).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    verts = np.zeros((inv.max() + 1, 3), dtype=np.float64)
    counts = np.zeros(inv.max() + 1, dtype=np.float64)
    np.add.at(verts, inv, flat)
    np.add.at(counts, inv, 1.0)
    verts /= counts[:, None]
    faces = inv.reshape(-1, 3)
    return verts, faces


def cluster_decimate(verts: np.ndarray, faces: np.ndarray, cell: float):
    """顶点聚类减面：把落在同一网格单元内的顶点合并到其均值。"""
    key = np.floor(verts / cell).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    n = inv.max() + 1
    new_verts = np.zeros((n, 3), dtype=np.float64)
    counts = np.zeros(n, dtype=np.float64)
    np.add.at(new_verts, inv, verts)
    np.add.at(counts, inv, 1.0)
    new_verts /= counts[:, None]

    new_faces = inv[faces]
    # 丢弃退化三角形（三个顶点塌缩到 <3 个唯一顶点）
    a, b, c = new_faces[:, 0], new_faces[:, 1], new_faces[:, 2]
    keep = (a != b) & (b != c) & (a != c)
    new_faces = new_faces[keep]
    if len(new_faces) == 0:
        return new_verts, new_faces
    # 去重（三角形无序）并剔除重复面
    s = np.sort(new_faces, axis=1)
    _, uniq = np.unique(s, axis=0, return_index=True)
    new_faces = new_faces[np.sort(uniq)]

    # 清理未被任何面引用的顶点并重建索引
    used = np.unique(new_faces)
    remap = np.full(new_verts.shape[0], -1, dtype=np.int64)
    remap[used] = np.arange(len(used))
    return new_verts[used], remap[new_faces]


def main():
    src, dst = sys.argv[1], sys.argv[2]
    target = int(sys.argv[3]) if len(sys.argv) > 3 else 12000

    tris = read_binary_stl(src)
    print(f"原始三角面: {len(tris)}")

    verts, faces = weld(tris)
    print(f"合并后顶点: {len(verts)}  面: {len(faces)}")

    # 二分搜索合适的聚类单元边长，逼近目标面数
    lo, hi = 0.02, 8.0
    best = None
    for _ in range(28):
        mid = (lo + hi) / 2
        v, f = cluster_decimate(verts, faces, mid)
        if len(f) > target:
            lo = mid
        else:
            hi = mid
        if best is None or abs(len(f) - target) < abs(best[2] - target):
            best = (v, f, len(f), mid)
    dv, df, dcount, dcell = best
    print(f"减面后: 顶点 {len(dv)}  面 {dcount}  (cell={dcell:.4f} mm)")

    # 归一化位置：X/Y 居中，Z 最小值贴 0
    mn, mx = dv.min(axis=0), dv.max(axis=0)
    size = mx - mn
    dv = dv.copy()
    dv[:, 0] -= (mn[0] + mx[0]) / 2
    dv[:, 1] -= (mn[1] + mx[1]) / 2
    dv[:, 2] -= mn[2]
    bbox = {
        "x": round(float(size[0]), 3),
        "y": round(float(size[1]), 3),
        "z": round(float(size[2]), 3),
    }
    print(f"归一化后尺寸: {bbox}")

    pos = dv.astype(np.float32).reshape(-1)
    if len(dv) < 65536:
        idx = df.astype(np.uint16).reshape(-1)
        idx_dtype = "Uint16"
    else:
        idx = df.astype(np.uint32).reshape(-1)
        idx_dtype = "Uint32"

    pos_b64 = base64.b64encode(pos.tobytes()).decode("ascii")
    idx_b64 = base64.b64encode(idx.tobytes()).decode("ascii")

    payload = {
        "name": "电击小子_3D浮雕",
        "vCount": int(len(dv)),
        "tCount": int(dcount),
        "idxDtype": idx_dtype,
        "bbox": bbox,
        "pos": pos_b64,
        "idx": idx_b64,
    }

    lines = [
        "/* 由 annex/电击小子_3D浮雕.stl 顶点聚类减面后自动生成 —— 请勿手工编辑。",
        f" * 原始 79916 面 -> 减面后 {dcount} 面 (顶点 {len(dv)})，实际尺寸 "
        f"{bbox['x']} x {bbox['y']} x {bbox['z']} mm。",
        " * 生成原因：浏览器在 file:// 协议下禁止读取本地 .stl（CORS），必须内嵌。",
        " */",
        "window.__MODEL_ASSET = " + json.dumps(payload) + ";",
        "",
    ]
    with open(dst, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    import os

    print(f"已写出 {dst}  ({os.path.getsize(dst)/1024:.1f} KB)")


if __name__ == "__main__":
    main()
