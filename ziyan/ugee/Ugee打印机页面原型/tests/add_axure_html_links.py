import os, sys, time
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
sys.path.insert(0,os.path.abspath(os.path.join(ROOT,'..','..','..','.tools','pywinauto')))
import win32clipboard,win32con,win32gui  # noqa: E402
from PIL import ImageGrab  # noqa: E402
from pywinauto import Application,keyboard,mouse  # noqa: E402

URL='file:///E:/3Dprinter/ziyan/ugee/Ugee%E6%89%93%E5%8D%B0%E6%9C%BA%E9%A1%B5%E9%9D%A2%E5%8E%9F%E5%9E%8B/index.html'

def put(v):
 for _ in range(20):
  try:
   win32clipboard.OpenClipboard();win32clipboard.EmptyClipboard();win32clipboard.SetClipboardData(win32clipboard.CF_UNICODETEXT,v);win32clipboard.CloseClipboard();return
  except Exception: time.sleep(.1)

def field(c,v):
 mouse.click(coords=c);keyboard.send_keys('^a');keyboard.send_keys(str(v));keyboard.send_keys('{ENTER}')

def hotspot(name,x,y,w,h):
 mouse.press(coords=(50,305));mouse.move(coords=(450,320));mouse.release(coords=(450,320));time.sleep(.4)
 mouse.click(coords=(1668,181));mouse.click(coords=(1780,220));keyboard.send_keys('^a');put(name);keyboard.send_keys('^v{ENTER}')
 for c,v in [((1065,134),x),((1120,134),y),((1175,134),w),((1248,134),h)]: field(c,v)
 mouse.click(coords=(1815,181));time.sleep(.3);mouse.click(coords=(1780,388));time.sleep(.5)
 mouse.click(coords=(1780,510));time.sleep(.5);mouse.click(coords=(1780,414));keyboard.send_keys('^a');put(URL);keyboard.send_keys('^v')
 mouse.click(coords=(1870,526));time.sleep(.7)

rp=os.path.join(ROOT,'ugee-editable.rp')
app=Application(backend='uia').start(f'"E:\\ai\\AxureRP9.exe" "{rp}"',timeout=30)
try:
 time.sleep(8);win=app.top_window();win.maximize();handle=win.handle
 win32gui.SetWindowPos(handle,win32con.HWND_TOPMOST,0,0,0,0,win32con.SWP_NOMOVE|win32con.SWP_NOSIZE);win32gui.SetForegroundWindow(handle);time.sleep(2)
 mouse.click(coords=(25,205));keyboard.send_keys('^a');put('热区');keyboard.send_keys('^v');time.sleep(1)
 for spec in [
  ('交互_切换打印机_打开HTML',247,70,48,48),('交互_打印机设置_打开HTML',307,68,67,55),
  ('交互_打印队列_打开HTML',16,634,358,64),('交互_暂停继续_打开HTML',36,574,152,48),
  ('交互_取消打印_打开HTML',203,574,151,48),('交互_进料_打开HTML',16,715,174,108),
  ('交互_退料_打开HTML',200,715,174,108),('交互_控制菜单轮播_打开HTML',16,839,358,214),
 ]: hotspot(*spec)
 keyboard.send_keys('^s');time.sleep(5);ImageGrab.grab().save(os.path.join(ROOT,'axure-html-links-added.png'))
finally:
 try: win32gui.SetWindowPos(handle,win32con.HWND_NOTOPMOST,0,0,0,0,win32con.SWP_NOMOVE|win32con.SWP_NOSIZE)
 except Exception: pass
 app.kill()
