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

app = Application(backend='uia').start(
    f'"E:\\ai\\AxureRP9.exe" "{os.path.join(ROOT, "ugee-editable.rp")}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.maximize()
    handle = window.handle
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)
    mouse.click(coords=(100, 659))
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, '交互_打印队列_打开HTML')
    win32clipboard.CloseClipboard()
    keyboard.send_keys('^v')
    time.sleep(1)
    mouse.click(coords=(100, 722))
    mouse.click(coords=(1815, 181))
    time.sleep(2)
    ImageGrab.grab().save(os.path.join(ROOT, 'queue-binding.png'))
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
