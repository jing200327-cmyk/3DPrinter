import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

import win32clipboard  # noqa: E402
import win32con  # noqa: E402
import win32gui  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402

AXURE = r'E:\ai\AxureRP9.exe'
RP_FILE = os.path.join(ROOT, 'Ugee打印机页面原型.rp')
INSPECTION = os.path.join(ROOT, 'axure-final.png')


def set_clipboard_text(value):
    for _ in range(12):
        try:
            win32clipboard.OpenClipboard()
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, value)
            win32clipboard.CloseClipboard()
            return
        except Exception:
            try:
                win32clipboard.CloseClipboard()
            except Exception:
                pass
            time.sleep(0.15)
    raise RuntimeError('Unable to set clipboard text.')


app = Application(backend='uia').start(f'"{AXURE}" "{RP_FILE}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    handle = window.handle
    win32gui.ShowWindow(handle, win32con.SW_MAXIMIZE)
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)

    mouse.click(coords=(72, 749))
    keyboard.send_keys('{F2}', pause=0.1)
    set_clipboard_text('Ugee打印机设备页')
    keyboard.send_keys('^a^v{ENTER}', pause=0.1)
    keyboard.send_keys('^s', pause=0.1)
    time.sleep(4)
    window.capture_as_image().save(INSPECTION)
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
