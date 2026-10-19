import io
import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

from PIL import Image  # noqa: E402
import win32clipboard  # noqa: E402
import win32con  # noqa: E402
import win32gui  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402

AXURE = r'E:\ai\AxureRP9.exe'
RP_FILE = os.path.join(ROOT, 'Ugee打印机页面原型.rp')
PREVIEW = os.path.join(ROOT, 'prototype-preview.png')
INSPECTION = os.path.join(ROOT, 'axure-final-clean.png')


def set_clipboard_text(value):
    win32clipboard.OpenClipboard()
    try:
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, value)
    finally:
        win32clipboard.CloseClipboard()


def set_clipboard_image(image_path):
    image = Image.open(image_path).convert('RGB')
    stream = io.BytesIO()
    image.save(stream, 'BMP')
    dib = stream.getvalue()[14:]
    stream.close()

    win32clipboard.OpenClipboard()
    try:
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_DIB, dib)
    finally:
        win32clipboard.CloseClipboard()


app = Application(backend='uia').start(f'"{AXURE}" "{RP_FILE}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.restore()
    window.maximize()
    handle = window.handle
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)

    # Replace the active page's demo widgets with the browser-verified Ugee prototype image.
    mouse.click(coords=(1400, 900))
    keyboard.send_keys('^a{DELETE}', pause=0.1)
    time.sleep(1)
    set_clipboard_image(PREVIEW)
    keyboard.send_keys('^v', pause=0.1)
    time.sleep(3)

    # Axure centers pasted images; normalize the embedded prototype to the page origin.
    mouse.click(coords=(1000, 350))
    mouse.click(coords=(1695, 290))
    keyboard.send_keys('^a', pause=0.1)
    keyboard.send_keys('0', pause=0.1)
    keyboard.send_keys('{ENTER}', pause=0.1)
    mouse.click(coords=(1795, 290))
    keyboard.send_keys('^a', pause=0.1)
    keyboard.send_keys('0', pause=0.1)
    keyboard.send_keys('{ENTER}', pause=0.1)
    time.sleep(2)

    keyboard.send_keys('^s', pause=0.1)
    time.sleep(4)
    window.set_focus()
    window.capture_as_image().save(INSPECTION)
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
