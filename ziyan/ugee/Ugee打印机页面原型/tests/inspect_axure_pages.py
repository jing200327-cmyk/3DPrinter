import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

import win32con  # noqa: E402
import win32gui  # noqa: E402
from pywinauto import Application, mouse  # noqa: E402

AXURE = r'E:\ai\AxureRP9.exe'
RP_FILE = os.path.join(ROOT, 'Ugee打印机页面原型.rp')

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

    for index, x_coord in enumerate((292, 360, 425), start=1):
        mouse.click(coords=(x_coord, 165))
        time.sleep(2)
        window.capture_as_image().save(os.path.join(ROOT, f'axure-page-{index}.png'))
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
