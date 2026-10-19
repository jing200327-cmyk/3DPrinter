import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

import win32con  # noqa: E402
import win32gui  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402

app = Application(backend='uia').start(
    f'"E:\\ai\\AxureRP9.exe" "{os.path.join(ROOT, "interaction-probe.rp")}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.maximize()
    handle = window.handle
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)
    mouse.click(coords=(1200, 800))
    keyboard.send_keys('^a{DELETE}')
    mouse.press(coords=(42, 310))
    mouse.move(coords=(340, 280))
    mouse.release(coords=(340, 280))
    time.sleep(1)
    mouse.click(coords=(1815, 181))
    time.sleep(2)
    print('--- BEFORE ---')
    for item in window.descendants():
        try:
            rect = item.rectangle()
            if rect.left >= 1600 and rect.top < 700:
                print(item.element_info.control_type, repr(item.window_text()), rect)
        except Exception:
            pass
    window.set_focus()
    mouse.click(coords=(1780, 299))
    time.sleep(2)
    print('--- AFTER ---')
    for item in window.descendants():
        try:
            rect = item.rectangle()
            if rect.left >= 1500 and rect.top < 700:
                print(item.element_info.control_type, repr(item.window_text()), rect)
        except Exception:
            pass
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
