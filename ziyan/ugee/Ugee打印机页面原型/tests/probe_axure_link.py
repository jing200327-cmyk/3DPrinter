import os,sys,time
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
sys.path.insert(0,os.path.abspath(os.path.join(ROOT,'..','..','..','.tools','pywinauto')))
import win32clipboard,win32con,win32gui  # noqa: E402
from PIL import ImageGrab  # noqa: E402
from pywinauto import Application,keyboard,mouse  # noqa: E402
app=Application(backend='uia').start(f'"E:\\ai\\AxureRP9.exe" "{os.path.join(ROOT,"interaction-probe.rp")}"',timeout=30)
try:
 time.sleep(8);w=app.top_window();w.maximize();h=w.handle;win32gui.SetForegroundWindow(h);time.sleep(2)
 mouse.click(coords=(1200,800));keyboard.send_keys('^a{DELETE}');mouse.click(coords=(25,205))
 win32clipboard.OpenClipboard();win32clipboard.EmptyClipboard();win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT,'热区');win32clipboard.CloseClipboard();keyboard.send_keys('^v');time.sleep(1)
 mouse.press(coords=(50,305));mouse.move(coords=(450,320));mouse.release(coords=(450,320));time.sleep(1)
 mouse.click(coords=(1815,181));time.sleep(.5);mouse.click(coords=(1780,388));time.sleep(1)
 mouse.click(coords=(1780,510));time.sleep(1)
 mouse.click(coords=(1780,414));keyboard.send_keys('^a')
 win32clipboard.OpenClipboard();win32clipboard.EmptyClipboard();win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT,'file:///E:/3Dprinter/ziyan/ugee/Ugee%E6%89%93%E5%8D%B0%E6%9C%BA%E9%A1%B5%E9%9D%A2%E5%8E%9F%E5%9E%8B/index.html');win32clipboard.CloseClipboard();keyboard.send_keys('^v')
 mouse.click(coords=(1870,477));time.sleep(1)
 ImageGrab.grab().save(os.path.join(ROOT,'probe-link-action.png'))
finally: app.kill()
