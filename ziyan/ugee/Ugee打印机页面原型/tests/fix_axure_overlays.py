import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

import win32clipboard  # noqa: E402
import win32con  # noqa: E402
import win32gui  # noqa: E402
from PIL import ImageGrab  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402


def text_clipboard(value):
    for _ in range(20):
        try:
            win32clipboard.OpenClipboard()
            try:
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, value)
            finally:
                win32clipboard.CloseClipboard()
            return
        except Exception:
            time.sleep(0.1)


def replace_value(coords, value):
    mouse.click(coords=coords)
    keyboard.send_keys('^a')
    keyboard.send_keys(str(value))
    keyboard.send_keys('{ENTER}')


def select_outline(name):
    mouse.click(coords=(100, 659))
    keyboard.send_keys('^a')
    text_clipboard(name)
    keyboard.send_keys('^v')
    time.sleep(0.8)
    mouse.click(coords=(100, 722))
    time.sleep(0.5)


def clear_outline():
    mouse.click(coords=(100, 659))
    keyboard.send_keys('^a{BACKSPACE}')
    time.sleep(0.6)


rp_file = os.path.join(ROOT, 'ugee-editable.rp')
app = Application(backend='uia').start(f'"E:\\ai\\AxureRP9.exe" "{rp_file}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.maximize()
    handle = window.handle
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)

    for name, x, y in [
        ('打印任务面板_队列展开状态', 16, 387),
        ('打印任务面板_暂停状态', 16, 387),
        ('控制菜单_第2页', 16, 839),
    ]:
        select_outline(name)
        replace_value((1065, 134), x)
        replace_value((1120, 134), y)
        mouse.click(coords=(100, 722), button='right')
        time.sleep(0.5)
        keyboard.send_keys('{HOME}{DOWN 5}{ENTER}')
        time.sleep(0.7)
        clear_outline()

    keyboard.send_keys('^s')
    time.sleep(5)
    ImageGrab.grab().save(os.path.join(ROOT, 'axure-overlays-fixed.png'))
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
