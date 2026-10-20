# -*- coding: utf-8 -*-
"""从 `原型修改复用图片资源/延时摄影页.png` 裁出延时摄影模型列表页要用的三张缩略图。

为什么不用整图复用：延时摄影页要做成**真实可交互**的原型（下载 → 进度 → 播放、多选删除），
整图铺满只能做热区点不动；所以按原图量取坐标，把三张模型缩略图单独裁成透明底 PNG，
页面其余部分（卡片、按钮、进度环、文字）全部用真实 DOM 重建。

坐标怎么来的：原图 2800×1711 是三联图（三个面板各 ~642px 宽，x 95~741 / 1025~1667 / 2053~2694），
只取第 1 个面板。三张卡片在面板内的纵向区间是 y 225~493 / 623~827 / 959~1177（卡片底色 #f5f6fa）。
缩略图用「非卡片底色」的包围盒在卡片左半区求得（避开右侧文字），再向四周留 6px 余量裁出，
最后把与卡片底色连通的背景泛洪成透明，得到可直接放在浅灰卡片上的透明底模型图。

可重复执行。
"""
import os
from collections import deque

from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
SRC = os.path.join(ROOT, '原型修改复用图片资源', '延时摄影页.png')

CARD_FILL = (245, 246, 250)      # 卡片底色
CARD_TOL = 4                     # 判定「属于卡片底色」的容差
PAD = 6                          # 裁图四周留的余量

# 第 1 个面板里三张卡片的纵向区间（像素）
CARDS = [(225, 493), (623, 827), (959, 1177)]
# 缩略图用「非卡片底色」的连续段求得：先在卡片内做逐列统计，模型是第一段、
# 右侧文字是第二段（实测三张卡的 x 分段分别是 [146,388]/[453,470]、[154,320]/[364,470]、
# [169,322]/[369,470]），只取第一段再在列范围内求纵向段，避免把文字裁进图里。
THUMBS = [
    (146, 309, 387, 443),
    (154, 653, 319, 739),
    (169, 987, 321, 1157),
]
OUT_NAMES = ['延时摄影-模型1.png', '延时摄影-模型2.png', '延时摄影-模型3.png']


def is_card_bg(rgb):
    return all(abs(a - b) <= CARD_TOL for a, b in zip(rgb, CARD_FILL))


def cut_thumb(im, box, out_path):
    """裁出缩略图并把卡片底色泛洪成透明。"""
    x0, y0, x1, y1 = box
    crop = im.crop((x0 - PAD, y0 - PAD, x1 + PAD + 1, y1 + PAD + 1)).convert('RGBA')
    w, h = crop.size
    px = crop.load()

    seen = [[False] * w for _ in range(h)]
    queue = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not seen[y][x] and is_card_bg(px[x, y][:3]):
            seen[y][x] = True
            queue.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while queue:
        x, y = queue.popleft()
        px[x, y] = (255, 255, 255, 0)
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    crop.save(out_path)
    return crop.size


def main():
    im = Image.open(SRC).convert('RGB')
    for name, box in zip(OUT_NAMES, THUMBS):
        size = cut_thumb(im, box, os.path.join(BASE, name))
        print('%s %dx%d' % (name, size[0], size[1]))
    # 顺带核对卡片区间没写错：三张卡片的底色采样点应都命中卡片色
    probe = im.load()
    for i, (y0, _y1) in enumerate(CARDS, 1):
        print('card %d probe %s' % (i, probe[700, y0 + 20]))


if __name__ == '__main__':
    main()
