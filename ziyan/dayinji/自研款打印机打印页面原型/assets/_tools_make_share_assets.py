# -*- coding: utf-8 -*-
"""生成「分享打印机」页所需的两个视觉资源：
1. assets/分享打印机-打印机.png —— 从 src/lianjiepeiwnag/选择打印机类型.jpg 裁出白色封闭式打印机渲染图，
   并从四边泛洪去掉纯白背景，得到透明底 PNG（放在浅色托底上不会露出白方块）。
2. assets/分享打印机-二维码.svg —— 用 qrcode 生成真实可扫的二维码（ECC H，中心可压图标）。
可重复执行。
"""
import os
from collections import deque

from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
SRC = os.path.join(ROOT, 'src', 'lianjiepeiwnag', '选择打印机类型.jpg')

# 在原图 1216 x 2640 的像素空间里手工定位并留出边距（已裁剪复核）
CROP = (130, 604, 370, 890)


def invite_link(code):
    """邀请链接：二维码里编码的就是这个地址，去掉邀请码里的空格。"""
    return 'https://app.ugee.com/i/%s' % code.replace(' ', '')


def build_printer():
    im = Image.open(SRC).convert('RGB').crop(CROP)
    w, h = im.size
    px = im.load()

    # 泛洪：与白底连通的、接近纯白的像素变透明；机身内部的高光被轮廓包围，不会被打穿
    gid = [[-1] * w for _ in range(h)]
    queue = deque()
    threshold = 246

    def is_bg(x, y):
        r, g, b = px[x, y]
        return r >= threshold and g >= threshold and b >= threshold

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y) and gid[y][x] == -1:
                gid[y][x] = 0
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and gid[y][x] == -1:
                gid[y][x] = 0
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and gid[ny][nx] == -1 and is_bg(nx, ny):
                gid[ny][nx] = 0
                queue.append((nx, ny))

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if gid[y][x] == 0:
                continue
            # 边缘补一点柔和过渡：越接近白底越透明，避免留下硬白描边
            lum = min(r, g, b)
            alpha = 255 if lum < 235 else int(255 * (246 - lum) / 11)
            op[x, y] = (r, g, b, max(0, min(255, alpha)))

    target = os.path.join(BASE, '分享打印机-打印机.png')
    out.save(target)
    print('printer ->', target, out.size)


def build_qr():
    import qrcode

    # 6 组「邀请码 + 二维码」成对预生成：原型点「重新生成邀请码」时按顺序换下一组，
    # 保证二维码里编的链接和页面上写的邀请码永远一致（换一台打印机同样换一组）。
    codes = [
        'ABCD 1234',
        'K7MP 4821',
        'TRQ9 6135',
        'WXHN 2847',
        'JLPZ 9406',
        'FGDR 3728',
    ]

    def path_for(payload):
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=0,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        modules = qr.get_matrix()
        n = len(modules)
        parts = []
        for y in range(n):
            x = 0
            while x < n:
                if modules[y][x]:
                    run = 1
                    while x + run < n and modules[y][x + run]:
                        run += 1
                    parts.append('M%d %dh%dv1h-%dz' % (x, y, run, run))
                    x += run
                else:
                    x += 1
        return n, ''.join(parts)

    entries = []
    for index, code in enumerate(codes, start=1):
        payload = invite_link(code)
        n, path = path_for(payload)
        svg = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" '
            'shape-rendering="crispEdges" role="img" aria-label="分享打印机邀请二维码">\n'
            '<rect width="%d" height="%d" fill="#ffffff"/>\n'
            '<path d="%s" fill="#1f242c"/>\n'
            '</svg>\n' % (n, n, n, n, n, n, path)
        )
        target = os.path.join(BASE, '分享打印机-二维码-%d.svg' % index)
        with open(target, 'w', encoding='utf-8') as fh:
            fh.write(svg)
        entries.append((code, payload, index))
        print('qr #%d ->' % index, target, '%dx%d' % (n, n), code)

    # file:// 下不能 fetch 本地 JSON（CORS），所以码池直接生成成一份 JS 常量
    pool_path = os.path.join(BASE, '..', 'share-code-pool.js')
    lines = [
        '/* 由 assets/_tools_make_share_assets.py 生成：邀请码与二维码成对预置。',
        '   改码池请改脚本后重新执行，不要手改本文件。 */',
        'window.SHARE_CODE_POOL = [',
    ]
    for code, payload, index in entries:
        lines.append(
            "  { code: '%s', link: '%s', qr: 'assets/分享打印机-二维码-%d.svg' },"
            % (code, payload, index)
        )
    lines.append('];')
    lines.append('')
    pool_text = '\n'.join(lines)
    with open(pool_path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(pool_text)
    print('pool ->', os.path.normpath(pool_path))


if __name__ == '__main__':
    build_printer()
    build_qr()
