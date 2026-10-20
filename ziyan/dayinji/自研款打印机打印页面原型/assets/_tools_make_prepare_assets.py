"""只裁出准备打印页需要的局部图片；页面文字、色卡与布局由 HTML/CSS 绘制。"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent

for plate in (1, 2, 3):
    Image.open(ASSETS / f'准备打印页-盘{plate}.png').crop((24, 8, 125, 77)).save(
        ASSETS / f'准备打印-模型{plate}.png')

Image.open(ASSETS / '准备打印页-盘2.png').crop((146, 50, 169, 77)).save(
    ASSETS / '准备打印-蓝色料盘.png')
Image.open(ASSETS.parent / '../../原型修改复用图片资源/准备打印页.png').crop(
    (24, 82, 74, 139)).save(ASSETS / '准备打印-打印机.png')
