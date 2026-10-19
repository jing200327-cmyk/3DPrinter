#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
由 R002-模型导入/白膜1.stl 生成浏览器可离线加载的内嵌几何资产。
产出：prototype/assets/model-v2.js  （window.__MODEL_ASSET_V2）

做法：
  1. 读二进制 STL → 三角形列表
  2. 顶点聚类（按 1e-4 mm 量化）合并重复顶点
  3. 简化：按空间哈希网格做顶点聚类降采样（保持外形，控制面数）
  4. 输出 bbox / pos(Float32) / idx(Uint32 或 Uint16) 的 base64
"""
import io
import os
import struct
import sys
import base64
import math
import json

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '白膜1.stl')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model-v2.js')

TARGET_TRIS = int(sys.argv[1]) if len(sys.argv) > 1 else 36000


def read_stl(path):
    with open(path, 'rb') as f:
        head = f.read(84)
        n = struct.unpack('<I', head[80:84])[0]
        data = f.read()
    tris = []
    off = 0
    for i in range(n):
        # normal(12) + v1(12) v2(12) v3(12) + attr(2)
        vals = struct.unpack_from('<12f', data, off)
        tris.append((vals[3], vals[4], vals[5],
                     vals[6], vals[7], vals[8],
                     vals[9], vals[10], vals[11]))
        off += 50
    return tris


def dedup(tris, q=1e-4):
    """顶点聚类：按量化格点合并重复顶点"""
    table = {}
    verts = []
    out = []
    for t in tris:
        idx = []
        for k in range(3):
            p = t[k * 3:k * 3 + 3]
            key = (round(p[0] / q), round(p[1] / q), round(p[2] / q))
            j = table.get(key)
            if j is None:
                j = len(verts)
                table[key] = j
                verts.append(p)
            idx.append(j)
        out.append(tuple(idx))
    return verts, out


def bounds(verts):
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    zs = [v[2] for v in verts]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def simplify(verts, tris, target):
    """基于网格分辨率的顶点聚类降采样：二分搜索格点边长，使最终面数贴近 target。"""
    if len(tris) <= target:
        return verts, tris
    lo, hi = bounds(verts)
    dx = hi[0] - lo[0] or 1.0
    dy = hi[1] - lo[1] or 1.0
    dz = hi[2] - lo[2] or 1.0
    vol = dx * dy * dz
    # 面数 ≈ 顶点数 × 2（三角网格）→ 目标顶点数 = target/2 → 格点边长初值
    want_v = max(600, target // 2)
    cell = (vol / max(1, want_v)) ** (1.0 / 3.0)

    best = None
    for _ in range(16):
        table = {}
        new_verts = []
        remap = []
        for v in verts:
            key = (int(math.floor(v[0] / cell)),
                   int(math.floor(v[1] / cell)),
                   int(math.floor(v[2] / cell)))
            j = table.get(key)
            if j is None:
                j = len(new_verts)
                table[key] = j
                new_verts.append(v)
            remap.append(j)
        cand = []
        for a, b, c in tris:
            na, nb, nc = remap[a], remap[b], remap[c]
            if na == nb or nb == nc or na == nc:
                continue           # 退化成线/点，丢弃
            cand.append((na, nb, nc))
        if best is None or abs(len(cand) - target) < abs(len(best[1]) - target):
            best = (new_verts, cand, cell)
        if abs(len(cand) - target) / target < 0.03:
            break
        cell *= 1.12 if len(cand) > target else 0.90

    new_verts, new_tris, cell = best
    print('    网格边长 cell = %.4f mm' % cell)
    return new_verts, new_tris


def recenter(verts, tris):
    """把模型平移到「底面贴 Z=0、XY 居中」，便于直接按 mm 堆层。"""
    lo, hi = bounds(verts)
    cx = (lo[0] + hi[0]) / 2.0
    cy = (lo[1] + hi[1]) / 2.0
    cz = lo[2]
    out = [(v[0] - cx, v[1] - cy, v[2] - cz) for v in verts]
    return out


def main():
    print('读取 STL …')
    tris_raw = read_stl(SRC)
    print('  原始三角面：%d' % len(tris_raw))

    verts, tris = dedup(tris_raw, q=1e-4)
    print('  顶点聚类后：%d 顶点 / %d 面' % (len(verts), len(tris)))

    lo, hi = bounds(verts)
    print('  原始包围盒：%.3f x %.3f x %.3f mm' % (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))

    verts, tris = simplify(verts, tris, TARGET_TRIS)
    print('  减面后：%d 顶点 / %d 面' % (len(verts), len(tris)))

    verts = recenter(verts, tris)
    lo, hi = bounds(verts)
    size = (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    print('  归零后尺寸：%.3f x %.3f x %.3f mm' % size)

    # 输出缓冲区
    pos = []
    for v in verts:
        pos.extend(v)
    pos_b = base64.b64encode(struct.pack('<%df' % len(pos), *pos)).decode('ascii')

    idx = []
    for t in tris:
        idx.extend(t)
    idx_b = base64.b64encode(struct.pack('<%dI' % len(idx), *idx)).decode('ascii')

    asset = {
        'name': '白膜1',
        'vCount': len(verts),
        'tCount': len(tris),
        'idxDtype': 'Uint32',
        'bbox': {'x': round(size[0], 3), 'y': round(size[1], 3), 'z': round(size[2], 3)},
        'pos': pos_b,
        'idx': idx_b,
    }
    js = (
        '/* 由 R002-模型导入/白膜1.stl 自动生成 —— 请勿手工编辑。\n'
        ' * 原始 %d 面 -> 顶点聚类 + 网格降采样 -> %d 面 (%d 顶点)，实际尺寸 %.3f x %.3f x %.3f mm。\n'
        ' * 已归零：底面贴 Z=0，XY 居中，便于直接按 mm 堆层。\n'
        ' * 生成原因：浏览器在 file:// 协议下禁止读取本地 .stl（CORS），必须内嵌。\n'
        ' */\n'
        'window.__MODEL_ASSET_V2 = %s;\n'
    ) % (
        len(tris_raw), len(tris), len(verts),
        size[0], size[1], size[2],
        json.dumps(asset, ensure_ascii=False, separators=(',', ':')),
    )

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print('已写出：%s（%.2f MB）' % (OUT, os.path.getsize(OUT) / 1024.0 / 1024.0))


if __name__ == '__main__':
    main()