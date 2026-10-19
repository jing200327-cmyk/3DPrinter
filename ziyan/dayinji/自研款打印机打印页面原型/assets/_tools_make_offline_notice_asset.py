# -*- coding: utf-8 -*-
"""生成摄像头下方「离线态说明卡片」的插画：3D 打印机 + 斜杠。

上一版这里是自绘的扁平打印机 SVG；按需求把打印机换成**产品真实的 3D 打印机**
（就是头部卡片左侧那只渲染图，从 ugee-page-1.jpg 裁出），斜杠保留（表达「不可用」）。

做法：
1. 从 ugee-page-1.jpg 裁出缩略图（390 标度 x 19~65 / y 79~133，含 1px 余量）；
2. 泛洪去白底——只把与四边连通的近白像素变透明，保留产品原色（浅蓝机身 + 橙环 + 深色舱门）；
3. 缩放到 52 × 62 设计像素，居中放到 88 × 88 的浅蓝圆角方（#EAF2FE，圆角 24）上；
4. 画一条灰色斜杠（#98A2B3，5 设计像素，圆头），与旧版插画同角度。

画布 88 × 88 设计像素，2 倍精度输出 = 176 × 176。
用法：python assets/_tools_make_offline_notice_asset.py
"""
import os

from PIL import Image, ImageDraw

BASE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
Ugee_PAGE = os.path.abspath(os.path.join(BASE, '../../ugee/Ugee打印机页面原型/assets/ugee-page-1.jpg'))
OUT = os.path.join(BASE, 'assets', '离线说明-3D打印机.png')

SCALE = 2  # 2 倍精度输出
CANVAS = 88  # 设计像素
PRINTER_W, PRINTER_H = 52, 62  # 插画里打印机的大小（设计像素）
SLATE = (152, 162, 179)  # #98A2B3 斜杠
SLASH_W = 5  # 斜杠宽度（设计像素）
WHITE_THRESHOLD = 246  # 近白判定（原始亮度）


def flood_transparent(image):
    """泛洪去白底：与四边连通的近白像素变透明，内部高光保留。返回 RGBA（保留原色）。"""
    gray = image.convert('L')
    width, height = image.size
    mask = Image.new('L', (width, height), 255)
    pixels = mask.load()
    stack = [(x, y) for x in range(width) for y in (0, height - 1)]
    stack += [(x, y) for y in range(height) for x in (0, width - 1)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < width and 0 <= y < height):
            continue
        if pixels[x, y] == 0:
            continue
        if gray.getpixel((x, y)) >= WHITE_THRESHOLD:
            pixels[x, y] = 0
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    rgba = image.convert('RGBA')
    rgba.putalpha(mask)
    return rgba


def main():
    source = Image.open(Ugee_PAGE).convert('RGB')
    factor = source.size[0] / 390.0  # 390 标度 -> 源图像素
    printer = source.crop((int(19 * factor), int(79 * factor), int(65 * factor), int(133 * factor)))
    printer = flood_transparent(printer)
    printer = printer.resize((PRINTER_W * SCALE, PRINTER_H * SCALE), Image.LANCZOS)

    canvas = Image.new('RGBA', (CANVAS * SCALE, CANVAS * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # 浅蓝圆角方（与旧版 SVG 插画同一底色 / 圆角）
    draw.rounded_rectangle([0, 0, CANVAS * SCALE - 1, CANVAS * SCALE - 1], radius=24 * SCALE, fill=(234, 242, 254, 255))
    # 3D 打印机居中
    px = (CANVAS - PRINTER_W) // 2 * SCALE
    py = (CANVAS - PRINTER_H) // 2 * SCALE
    canvas.paste(printer, (px, py), printer)
    # 灰色斜杠（圆头：线 + 两端圆点）
    x0, y0, x1, y1 = 25 * SCALE, 63 * SCALE, 63 * SCALE, 25 * SCALE
    w = SLASH_W * SCALE
    draw.line([x0, y0, x1, y1], fill=SLATE + (255,), width=w)
    r = w / 2
    for cx, cy in ((x0, y0), (x1, y1)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SLATE + (255,))
    canvas.save(OUT)
    print('offline notice art ->', OUT, canvas.size)


if __name__ == '__main__':
    main()
