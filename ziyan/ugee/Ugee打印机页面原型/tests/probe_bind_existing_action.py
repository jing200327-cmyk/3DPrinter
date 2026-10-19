import os, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, '..', '..', '..', '.tools', 'pywinauto')))
import win32clipboard, win32con, win32gui  # noqa: E402
from PIL import ImageGrab  # noqa: E402
from pywinauto import Application, keyboard, mouse  # noqa: E402

def put(value):
    win32clipboard.OpenClipboard(); win32clipboard.EmptyClipboard()
    win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT, value); win32clipboard.CloseClipboard()

def outline(value):
    mouse.click(coords=(100,659)); keyboard.send_keys('^a'); put(value); keyboard.send_keys('^v')
    time.sleep(.8); mouse.click(coords=(100,722)); time.sleep(.4)

def geom(x,y):
    for c,v in [((1065,134),x),((1120,134),y)]:
        mouse.click(coords=c); keyboard.send_keys('^a'); keyboard.send_keys(str(v)); keyboard.send_keys('{ENTER}')

app=Application(backend='uia').start(f'"E:\\ai\\AxureRP9.exe" "{os.path.join(ROOT,"ugee-editable.rp")}"',timeout=30)
try:
    time.sleep(8); w=app.top_window(); w.maximize(); h=w.handle
    win32gui.SetWindowPos(h,win32con.HWND_TOPMOST,0,0,0,0,win32con.SWP_NOMOVE|win32con.SWP_NOSIZE)
    win32gui.SetForegroundWindow(h); time.sleep(2)
    outline('打印任务面板_队列展开状态')
    mouse.click(coords=(100,722),button='right'); time.sleep(.4); keyboard.send_keys('{HOME}{DOWN 5}{ENTER}')
    geom(500,100)
    outline('热区_打印队列_展开收起'); mouse.click(coords=(1815,181)); time.sleep(.7)
    mouse.click(coords=(1875,310)); time.sleep(.7)
    mouse.click(coords=(800,350)); time.sleep(1)
    outline('热区_打印队列_展开收起'); mouse.click(coords=(1815,181)); time.sleep(1)
    ImageGrab.grab().save(os.path.join(ROOT,'probe-binding-added.png'))
finally:
    try: win32gui.SetWindowPos(h,win32con.HWND_NOTOPMOST,0,0,0,0,win32con.SWP_NOMOVE|win32con.SWP_NOSIZE)
    except Exception: pass
    app.kill()
