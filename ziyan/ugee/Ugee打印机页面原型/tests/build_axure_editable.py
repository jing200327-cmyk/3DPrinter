import io
import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOOLS = os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto'))
sys.path.insert(0, TOOLS)

from PIL import Image, ImageGrab  # noqa: E402
import win32clipboard  # noqa: E402
import win32con  # noqa: E402
import win32gui  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402

AXURE = r'E:\ai\AxureRP9.exe'
RP_FILE = os.path.join(ROOT, 'ugee-editable.rp')
ASSETS = os.path.join(ROOT, 'axure-assets')
INSPECTION = os.path.join(ROOT, 'axure-editable-built.png')


def clipboard(action):
    last_error = None
    for _ in range(20):
        try:
            win32clipboard.OpenClipboard()
            try:
                win32clipboard.EmptyClipboard()
                action()
            finally:
                win32clipboard.CloseClipboard()
            return
        except Exception as error:
            last_error = error
            time.sleep(0.1)
    raise last_error


def set_clipboard_text(value):
    clipboard(lambda: win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, value))


def set_clipboard_image(image_path):
    image = Image.open(image_path).convert('RGB')
    stream = io.BytesIO()
    image.save(stream, 'BMP')
    dib = stream.getvalue()[14:]
    stream.close()
    clipboard(lambda: win32clipboard.SetClipboardData(win32clipboard.CF_DIB, dib))


def replace_value(coords, value):
    mouse.click(coords=coords)
    keyboard.send_keys('^a')
    keyboard.send_keys(str(value))
    keyboard.send_keys('{ENTER}')
    time.sleep(0.15)


def set_geometry(x, y, width=None, height=None):
    replace_value((1065, 134), x)
    replace_value((1120, 134), y)
    if width is not None:
        replace_value((1175, 134), width)
    if height is not None:
        replace_value((1248, 134), height)


def set_name(name):
    mouse.click(coords=(1668, 181))
    time.sleep(0.2)
    mouse.click(coords=(1780, 220))
    keyboard.send_keys('^a')
    set_clipboard_text(name)
    keyboard.send_keys('^v')
    keyboard.send_keys('{ENTER}')
    time.sleep(0.25)


def paste_image(filename, name, x, y):
    set_clipboard_image(os.path.join(ASSETS, filename))
    mouse.click(coords=(1400, 900))
    keyboard.send_keys('^v')
    time.sleep(0.8)
    set_name(name)
    set_geometry(x, y)
    return (x, y)


def hide_selected_at_origin():
    set_geometry(0, 0)
    mouse.click(coords=(600, 240), button='right')
    time.sleep(0.5)
    # Context menu: “设为隐藏” is the sixth row, 156 px below the click point.
    mouse.click(coords=(660, 396))
    time.sleep(0.5)


def paste_overlay_image(filename, name):
    set_clipboard_image(os.path.join(ASSETS, filename))
    mouse.click(coords=(1400, 900))
    keyboard.send_keys('^v')
    time.sleep(0.8)
    set_name(name)
    set_geometry(0, 0)


def prepare_hotspot_library():
    mouse.click(coords=(25, 205))
    set_clipboard_text('热区')
    keyboard.send_keys('^v')
    time.sleep(1)


def add_hotspot(name, x, y, width, height):
    mouse.press(coords=(50, 305))
    mouse.move(coords=(450, 320))
    mouse.release(coords=(450, 320))
    time.sleep(0.5)
    set_name(name)
    set_geometry(x, y, width, height)


def add_toggle_to_visible_origin_target():
    mouse.click(coords=(1815, 181))
    time.sleep(0.4)
    mouse.click(coords=(1780, 420))
    time.sleep(0.4)
    mouse.click(coords=(620, 235))
    time.sleep(0.4)
    mouse.click(coords=(1865, 402))
    mouse.click(coords=(1870, 577))
    time.sleep(0.7)


def hide_and_move_visible_origin_target(x, y):
    mouse.click(coords=(620, 235))
    time.sleep(0.4)
    hide_selected_at_origin()
    set_geometry(x, y)


app = Application(backend='uia').start(f'"{AXURE}" "{RP_FILE}"', timeout=30)
try:
    time.sleep(8)
    window = app.top_window()
    window.maximize()
    handle = window.handle
    win32gui.SetWindowPos(handle, win32con.HWND_TOPMOST, 0, 0, 0, 0,
                         win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(handle)
    window.set_focus()
    time.sleep(2)

    mouse.click(coords=(1200, 800))
    keyboard.send_keys('^a{DELETE}')
    time.sleep(1)

    # Independent visual widgets; no full-page screenshot is embedded.
    paste_image('01-header.png', '顶部_打印机状态_切换_设置', 0, 0)
    paste_image('02-timelapse.png', '延时摄影_占位画面', 16, 155)
    paste_image('03-task-default.png', '打印任务面板_默认状态', 16, 387)
    paste_image('06-filament.png', '进料退料_按钮区域', 16, 715)
    paste_image('07-controls-page-1.png', '控制菜单_第1页', 16, 839)
    paste_image('09-bottom-nav.png', '底部导航', 0, 766)

    prepare_hotspot_library()

    # Queue dropdown state and native visibility interaction.
    paste_overlay_image('04-task-queue-open.png', '打印任务面板_队列展开状态')
    add_hotspot('热区_打印队列_展开收起', 16, 634, 358, 64)
    add_toggle_to_visible_origin_target()
    hide_and_move_visible_origin_target(16, 387)

    # Pause / resume state and native visibility interaction.
    paste_overlay_image('05-task-paused.png', '打印任务面板_暂停状态')
    add_hotspot('热区_暂停继续', 36, 574, 152, 48)
    add_toggle_to_visible_origin_target()
    hide_and_move_visible_origin_target(16, 387)

    # Second carousel page; a native hotspot toggles it like a two-state panel.
    paste_overlay_image('08-controls-page-2.png', '控制菜单_第2页')
    add_hotspot('热区_控制菜单_左右轮播', 16, 839, 358, 214)
    add_toggle_to_visible_origin_target()
    hide_and_move_visible_origin_target(16, 839)

    # Named native hotspots for every primary control.
    for hotspot in [
        ('热区_切换打印机', 247, 70, 48, 48),
        ('热区_打印机设置', 307, 68, 67, 55),
        ('热区_取消打印', 203, 574, 151, 48),
        ('热区_进料', 16, 715, 174, 108),
        ('热区_退料', 200, 715, 174, 108),
        ('热区_舱内灯', 30, 894, 70, 98),
        ('热区_舱外灯', 111, 894, 70, 98),
        ('热区_风扇', 210, 894, 70, 98),
        ('热区_提示音', 291, 894, 70, 98),
    ]:
        add_hotspot(*hotspot)

    # Reassert the untouched header as a visible layer. Some Axure builds select
    # the underlying image when setting a newly pasted overlay to hidden.
    paste_image('01-header.png', '顶部_打印机状态_可见层', 0, 0)
    mouse.click(coords=(452, 78))
    time.sleep(0.5)

    keyboard.send_keys('^s')
    time.sleep(5)
    window.set_focus()
    ImageGrab.grab().save(INSPECTION)
finally:
    try:
        win32gui.SetWindowPos(handle, win32con.HWND_NOTOPMOST, 0, 0, 0, 0,
                             win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
    except Exception:
        pass
    app.kill()
