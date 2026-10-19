import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

import win32con  # noqa: E402
import win32gui  # noqa: E402
from PIL import ImageGrab  # noqa: E402
from pywinauto import Application, mouse  # noqa: E402

app = Application(backend='uia').start(
    f'"E:\\ai\\AxureRP9.exe" "{os.path.join(ROOT, "ugee-editable.rp")}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.maximize()
    handle = window.handle
    win32gui.SetForegroundWindow(handle)
    time.sleep(2)
    mouse.click(coords=(1659, 78))
    time.sleep(12)
    ImageGrab.grab().save(os.path.join(ROOT, 'axure-preview-default.png'))
finally:
    app.kill()
