# -*- coding: utf-8 -*-
"""从「进料中.png / 退料中.png」两张多屏合并截图里，拆出进料/退料页要用的插画资源。

来源：原型修改复用图片资源/进料中.png（4 屏）、退料中.png（3 屏）
产物：assets/耗材操作-*.png  —— 圆环内部插画，白底去背（圆环外只保留插画本体）

坐标体系：每屏宽 686 px（= 原型设备框 375 逻辑像素），圆环圆心 (359,715)、
外径 402 px、描边 6 px（内径 388）。圆环本体在原型里用 SVG 重绘并做进度动画，
所以这里必须把原图里烘焙的圆环描边抠掉（否则动画时会出现「冻结的橙弧」）。
"""
import os
import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
SRC_DIR = os.path.join(ROOT, '原型修改复用图片资源')

# 多屏合并图里每一屏的 x 区间（由逐列空白带检出）
SCREENS = {
    '进料中': [(80, 766), (863, 1550), (1646, 2334), (2416, 3104)],
    '退料中': [(80, 766), (837, 1525), (1593, 2296)],
}

# 圆环几何（屏内像素）
CX, CY = 359.0, 715.0
R_OUT = 201.0          # 描边外沿
R_IN = 195.0           # 描边内沿
CROP = (140, 505, 590, 928)   # 插画裁剪窗口（排除上方 75% 文本与下方步骤胶囊）

# (源图, 屏序号从 1 起, 产物名)
ASSETS = [
    ('进料中', 2, '耗材操作-进料-抽回当前耗材.png'),
    ('进料中', 3, '耗材操作-进料-送出新耗材.png'),
    ('退料中', 2, '耗材操作-退料-退出当前耗材.png'),
    ('退料中', 3, '耗材操作-退料-退料完成.png'),
]


def load_screen(source, index):
    boxes = SCREENS[source]
    x0, x1 = boxes[index - 1]
    im = Image.open(os.path.join(SRC_DIR, source + '.png')).convert('RGB')
    return im.crop((x0, 0, x1, im.size[1]))


def build_alpha(rgb):
    """返回 alpha（uint8）：圆环内全不透明；圆环外只保留非白且非描边色的像素。"""
    a = rgb.astype(int)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    radius = np.hypot(xx - CX, yy - CY)

    nonwhite = (np.abs(a - 255).sum(axis=2) > 18)
    # 圆环描边/轨迹色：橙弧 #EB5D11、浅橙轨迹 #F6D4C4
    ring_like = (a[:, :, 0] > 232) & (a[:, :, 1] > 185) & (a[:, :, 2] > 150)
    band = (radius >= R_IN - 5) & (radius <= R_OUT + 5)
    outside_ink = nonwhite & ~(band & ring_like)

    alpha = np.where(radius <= R_IN + 1, 255, np.where(outside_ink, 255, 0)).astype(np.uint8)
    return alpha


def main():
    rgba_cache = {}
    for source, index, out_name in ASSETS:
        screen = load_screen(source, index)
        alpha = build_alpha(np.asarray(screen))
        image = np.dstack([np.asarray(screen), alpha])
        rgba_cache[out_name] = Image.fromarray(image, 'RGBA')
        print('extract %s <- %s 第 %d 屏' % (out_name, source, index))

    # 统一裁剪窗口：所有状态用同一个框，保证在圆环里的位置完全一致
    x0, y0, x1, y1 = CROP
    for out_name, im in rgba_cache.items():
        tile = im.crop((x0, y0, x1, y1))
        target = os.path.join(BASE, out_name)
        tile.save(target)
        print('  ->', os.path.basename(target), tile.size)

    # 位置参数（供 CSS 使用）：相对圆环外接正方形 [158,514]-[560,916]
    ratio = lambda v: round((v - 158.0) / 402.0 * 100, 4) if v < 600 else None
    print('\nCSS 定位（相对圆环 402px 方框，x 基准 158 / y 基准 514）：')
    print('  left = %.4f%%  top = %.4f%%  width = %.4f%%  height = %.4f%%' % (
        (x0 - 158) / 402 * 100, (y0 - 514) / 402 * 100,
        (x1 - x0) / 402 * 100, (y1 - y0) / 402 * 100))


if __name__ == '__main__':
    main()
