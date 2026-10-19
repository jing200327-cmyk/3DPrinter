import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

from pywinauto import Application  # noqa: E402

AXURE = r'E:\ai\AxureRP9.exe'
RP_FILE = os.path.join(ROOT, 'Ugee打印机页面原型.rp')
SCREENSHOT = os.path.join(ROOT, 'axure-inspection.png')

app = Application(backend='uia').start(f'"{AXURE}" "{RP_FILE}"', timeout=30)
try:
    time.sleep(8)
    windows = app.windows()
    print('WINDOWS')
    for window in windows:
        print(window.window_text(), window.element_info.control_type, window.rectangle())

    top = app.top_window()
    top.restore()
    top.maximize()
    top.set_focus()
    time.sleep(2)
    top.capture_as_image().save(SCREENSHOT)
    print('TOP', top.window_text(), top.rectangle())
    print('CONTROLS')
    for index, control in enumerate(top.descendants()[:500]):
        info = control.element_info
        label = control.window_text()
        if label or info.control_type in {'Tree', 'List', 'Edit', 'Tab', 'TabItem'}:
            safe_label = label.encode('unicode_escape').decode('ascii')
            print(index, safe_label, info.control_type, info.class_name, control.rectangle())
finally:
    app.kill()
