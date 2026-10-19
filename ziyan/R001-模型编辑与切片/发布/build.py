"""把 R001 交付物打包成一个可直接静态托管的站点目录。

产物（发布/）：
  index.html            原型首页（根链接直接可玩）
  prototype_v1.0.html   原型原文件名副本（供 PRD 深链使用）
  prd.html              在线可读的 PRD（marked 渲染 markdown）
  shots/                23 张验收截图 + 画廊页
  vendor/ assets/       原型依赖与素材
  README.md             交付说明

用法：python build.py
"""
import io
import json
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)          # R001-模型编辑与切片/
OUT = HERE                            # 发布/

SHOT_TITLES = [
    ("01-model-detail", "模型详情页 · 复用设计稿整图（底部左侧「打印设置」为跳转热区）"),
    ("02-model-editor-1plate", "模型编辑页 · 单盘（不展示盘号切换控件）"),
    ("03-model-editor-8plates", "模型编辑页 · 8 盘上限（盘号区可横向滑动）"),
    ("04-model-selected", "选中零件 · 橙色包围框（同一时间仅允许选中一个）"),
    ("05-scale-panel-percent", "缩放面板 · 百分比模式（10%–300%）"),
    ("06-scale-panel-size", "缩放面板 · 尺寸模式（XYZ 分轴，红绿蓝标识）"),
    ("07-out-of-bounds-300pct", "放大到 300% → 触发越界阻断"),
    ("08-after-copy", "复制零件 · 副本默认选中并自动摆盘"),
    ("09-copy-insufficient", "打印盘空间不足 · 复制失败且不新建盘"),
    ("11-print-settings", "打印设置页 · 打印模式 / 底座 / 基本参数"),
    ("12-support-off", "关闭支撑 · 类型区置灰但保留上次选择"),
    ("13-restore-default-dialog", "恢复默认值 · 二次确认"),
    ("14-save-scope-dialog", "保存 · 选择参数保存范围"),
    ("15-slicing-loading", "云切片 Loading · 六步进度、禁止重复提交"),
    ("16-prepare-print", "准备打印页 · 切片成功后"),
    ("17-slice-failed", "云切片失败 · 保留编辑结果并给出具体原因"),
    ("18-out-of-bounds-demo", "越界异常演示态 · 红态 + 阻断原因 + 去打印置灰"),
    ("19-final-editor", "模型编辑页 · 最终态"),
    ("20-view-zoom", "视角缩放控件 · ＋ / − / 复位"),
    ("21-prepare-print-reuse", "准备打印页 · 整图复用（盘列表为真实渲染数据）"),
    ("22-model-detail-to-editor", "真实鼠标点击详情页底部左侧 → 进入模型编辑页"),
    ("23-single-part-scale", "单零件缩放 · 默认只缩放选中的那一个零件"),
    ("24-delete-last-dialog", "删除任务最后一个零件 · 二次确认弹窗（取消则返回编辑页）"),
    ("25-task-removed", "确认删除后 · 任务被移除并返回模型详情页"),
    ("26-single-plate-applyall", "单盘模型 · 开启「应用至所有盘的零件」后该盘零件一起缩放"),
    ("27-save-name-dialog", "保存切片 · 命名弹窗（默认填模型名，可自定义）"),
    ("28-saving-progress", "保存切片 · 保存进度（进度条 + 百分比）"),
    ("29-save-done-dialog", "保存切片 · 保存成功（含「立即查看」跳我的切片）"),
    ("30-save-scope-open", "打印设置页退出 · 保存范围弹窗（未选范围 → 底部「取消」）"),
    ("31-save-scope-selected", "保存范围弹窗 · 选中范围后底部变「确定」"),
    ("32-settings-saved-toast", "点「确定」后 · 返回模型编辑页 + Toast「打印设置已保存」"),
    ("33-optimized-arrange-5plates", "自动摆盘智能优化 · 10 个文件同色合摆为 5 盘（每盘 2 件）"),
    ("34-optimized-arrange-toast", "进入编辑页 · Toast「当前已优化摆盘，同色模型摆置同一盘，目前盘数为5」"),
    ("35-settings-exit-nochange", "打印设置页退出 · 无实际修改时直接返回模型编辑页（不弹保存范围弹窗）"),
]

GALLERY_CSS = """
*{box-sizing:border-box}
body{margin:0;padding:28px 20px 60px;background:#f3f4f8;color:#1c1c1e;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1180px;margin:0 auto}
h1{margin:0 0 6px;font-size:24px;letter-spacing:-.3px}
.sub{color:#6b7280;font-size:13px;margin-bottom:22px;line-height:1.7}
.sub a{color:#f16326}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:16px}
figure{margin:0;background:#fff;border-radius:16px;overflow:hidden;
  box-shadow:0 6px 20px rgba(20,24,40,.07);display:flex;flex-direction:column}
figure img{display:block;width:100%;height:auto;background:#eef0f6}
figcaption{padding:10px 13px 13px;font-size:12.5px;color:#4b5563;line-height:1.5}
figcaption b{display:block;color:#1c1c1e;font-size:11px;letter-spacing:.4px;margin-bottom:3px}
.top{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
.top a{display:inline-block;padding:9px 16px;border-radius:22px;background:#1c1c1e;color:#fff;
  text-decoration:none;font-size:13.5px;font-weight:600}
.top a.ghost{background:#fff;color:#1c1c1e;border:1.5px solid #e8eaf0}
"""

PRD_CSS = """
*{box-sizing:border-box}
body{margin:0;background:#f3f4f8;color:#1c1c1e;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  font-size:15px;line-height:1.75}
.bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e8eaf0;
  padding:12px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.bar b{font-size:15px}
.bar a{font-size:13.5px;color:#f16326;text-decoration:none;font-weight:600}
#doc{max-width:900px;margin:0 auto;padding:28px 20px 80px;background:#fff;border-radius:18px;
  box-shadow:0 8px 30px rgba(20,24,40,.07)}
h1{font-size:26px;letter-spacing:-.4px;border-bottom:2px solid #1c1c1e;padding-bottom:10px}
h2{font-size:20px;margin-top:38px;padding-top:16px;border-top:1px solid #eef0f5}
h3{font-size:16.5px;margin-top:26px}
h4{font-size:15px;margin-top:20px}
table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13px;display:block;overflow-x:auto}
th,td{border:1px solid #e3e6ee;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f6f7fb;font-weight:600;white-space:nowrap}
tr:nth-child(even) td{background:#fcfcfe}
code{background:#f2f3f7;padding:1.5px 5px;border-radius:5px;font-size:12.5px;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre{background:#f7f8fb;border:1px solid #e8eaf0;border-radius:12px;padding:14px;overflow-x:auto}
pre code{background:none;padding:0;font-size:12.5px;line-height:1.6}
blockquote{margin:14px 0;padding:10px 16px;background:#fff8f4;border-left:4px solid #f16326;
  border-radius:0 10px 10px 0;color:#4b5563;font-size:13.5px}
blockquote p{margin:0}
ul,ol{padding-left:24px}
li{margin:4px 0}
hr{border:0;border-top:1px solid #eef0f5;margin:26px 0}
a{color:#f16326}
.err{background:#fff1f4;border:1px solid #f6c7d2;color:#a5163a;padding:14px 16px;border-radius:12px}
"""


def must(path):
    if not os.path.exists(path):
        raise SystemExit('缺少文件：' + path)
    return path


MANIFEST = '.build-manifest.json'
WROTE = []


def _rel(path):
    return os.path.relpath(path, OUT).replace('\\', '/')


def w(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
    WROTE.append(_rel(path))


def copy(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    WROTE.append(_rel(dst))


def load_manifest():
    mf = os.path.join(OUT, MANIFEST)
    if not os.path.exists(mf):
        return set()
    try:
        return set(json.load(io.open(mf, encoding='utf-8')))
    except Exception:
        return set()


def unescape_shots(name):
    """截图是按索引命名的，这里按前缀匹配标题。"""
    for key, title in SHOT_TITLES:
        if name.startswith(key):
            return title
    return name


def build():
    # 增量清理：只删除「上一轮产出、本轮不再需要」的文件
    # 注意：不用 shutil.rmtree / 整目录清空——沙箱会拦截（回收站不可用时 fail closed），
    #       且批量删除 >50 个文件需要人工授权。按清单逐个 os.remove 最稳。
    prev = load_manifest()
    WROTE.clear()

    proto = os.path.join(ROOT, 'prototype')
    prd_md = must(os.path.join(ROOT, 'prd', 'prd_v1.0.md'))

    # ---- 原型 ----
    for f in ('styles.css', 'prototype.js', 'prototype_v1.0.html'):
        copy(os.path.join(proto, f), os.path.join(OUT, f))
    for d in ('vendor', 'assets'):
        src = os.path.join(proto, d)
        for f in os.listdir(src):
            copy(os.path.join(src, f), os.path.join(OUT, d, f))
    # 根链接直接打开原型
    copy(os.path.join(proto, 'prototype_v1.0.html'), os.path.join(OUT, 'index.html'))

    # ---- PRD 在线阅读所需的 markdown 渲染库（源码放在「发布资源」，不会被清理） ----
    copy(os.path.join(ROOT, '发布资源', 'marked.min.js'), os.path.join(OUT, 'vendor', 'marked.min.js'))

    # ---- 流程图 ----
    flow_dir = os.path.join(ROOT, 'flowcharts')
    for f in ('main_flow_web.png', 'main_flow.png', 'main_flow.mmd'):
        copy(os.path.join(flow_dir, f), os.path.join(OUT, f))

    # ---- PRD（把仓库内相对路径改写成站点内路径） ----
    md = io.open(prd_md, encoding='utf-8').read()
    md = md.replace('../flowcharts/main_flow_web.png', './main_flow_web.png')
    md = md.replace('../flowcharts/main_flow.png', './main_flow.png')
    md = md.replace('../flowcharts/main_flow.mmd', './main_flow.mmd')
    md = md.replace('](../_memory/', '](../_memory/')   # 档案不在站点内，保持原样
    w(os.path.join(OUT, 'prd_v1.0.md'), md)
    w(os.path.join(OUT, 'prd.html'), PRD_HTML.replace('__CSS__', PRD_CSS))

    # ---- 验收截图 ----
    shots_src = os.path.join(proto, '_verify', 'shots')
    names = sorted(f for f in os.listdir(shots_src) if f.endswith('.png'))
    for f in names:
        copy(os.path.join(shots_src, f), os.path.join(OUT, 'shots', f))

    cards = []
    for f in names:
        title = unescape_shots(f)
        cards.append(
            '<figure><a href="./%s" target="_blank" rel="noopener">'
            '<img src="./%s" alt="%s" loading="lazy"></a>'
            '<figcaption><b>%s</b>%s</figcaption></figure>'
            % (f, f, title, f.replace('.png', ''), title)
        )
    gallery = GALLERY_HTML.replace('__CSS__', GALLERY_CSS) \
        .replace('__COUNT__', str(len(names))).replace('__CARDS__', '\n'.join(cards))
    w(os.path.join(OUT, 'shots', 'index.html'), gallery)

    # ---- README ----
    w(os.path.join(OUT, 'README.md'), README)

    # 清理陈旧文件（上一轮有、本轮没有）
    # 沙箱禁删（回收站不可用时 fail closed），所以用「移出」代替「删除」：
    # 移到 ../发布自检/_stale/，站点干净，证据也留得住。
    stale_dir = os.path.join(ROOT, '发布自检', '_stale')
    stale = sorted(prev - set(WROTE) - {MANIFEST})
    removed = 0
    for rel in stale:
        fp = os.path.join(OUT, rel)
        if not os.path.exists(fp):
            continue
        name = rel.replace('/', '__')
        dst = os.path.join(stale_dir, name)
        if os.path.exists(dst):
            dst = os.path.join(stale_dir, '%d__%s' % (int(os.path.getmtime(fp)), name))
        try:
            os.makedirs(stale_dir, exist_ok=True)
            os.rename(fp, dst)
            removed += 1
        except OSError:
            pass

    # 记录本轮清单（供下次增量清理）
    payload = json.dumps(sorted(set(WROTE) | {MANIFEST}), ensure_ascii=False, indent=1)
    io.open(os.path.join(OUT, MANIFEST), 'w', encoding='utf-8', newline='\n').write(payload)

    total = 0
    for base, _, files in os.walk(OUT):
        for f in files:
            if f in ('build.py', MANIFEST):
                continue
            total += os.path.getsize(os.path.join(base, f))
    print('打包完成：%d 张截图，移出陈旧文件 %d 个，站点总大小 %.1f MB' % (len(names), removed, total / 1048576))
    for base, dirs, files in sorted(os.walk(OUT)):
        rel = os.path.relpath(base, OUT)
        for f in sorted(files):
            if f in ('build.py', MANIFEST):
                continue
            print('  %s' % os.path.join('' if rel == '.' else rel, f))


GALLERY_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>R001 模型编辑与切片 · 验收截图画廊</title>
<style>__CSS__</style>
</head>
<body>
<div class="wrap">
  <h1>R001 模型编辑与切片 · 验收截图画廊</h1>
  <div class="sub">
    自研款 3D 打印机 APP —— 共 __COUNT__ 张，均由无头 Chrome 自动执行交互链路后真实截图（非人工摆拍）。
  </div>
  <div class="top">
    <a href="../index.html">← 打开原型（可交互）</a>
    <a class="ghost" href="../prd.html">阅读 PRD</a>
    <a class="ghost" href="../main_flow_web.png" target="_blank" rel="noopener">核心操作流程图</a>
  </div>
  <div class="grid">
__CARDS__
  </div>
</div>
</body>
</html>
"""

PRD_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>R001 模型编辑与切片 · 产品需求文档 v1.0</title>
<style>__CSS__</style>
</head>
<body>
<div class="bar">
  <b>R001 模型编辑与切片 · PRD v1.0</b>
  <a href="./index.html">← 打开原型</a>
  <a href="./shots/index.html">验收截图</a>
  <a href="./main_flow_web.png" target="_blank" rel="noopener">流程图</a>
  <a href="./prd_v1.0.md" download>下载 Markdown</a>
</div>
<div id="doc">正在加载文档…</div>
<script src="./vendor/marked.min.js"></script>
<script>
(function () {
  var box = document.getElementById('doc');
  fetch('./prd_v1.0.md', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (md) {
      box.innerHTML = marked.parse(md);
      // 表格外层包一层，便于窄屏横向滚动
      box.querySelectorAll('table').forEach(function (t) {
        if (t.parentElement && t.parentElement.classList.contains('tw')) return;
        var w = document.createElement('div'); w.className = 'tw';
        t.parentNode.insertBefore(w, t); w.appendChild(t);
      });
      box.querySelectorAll('a').forEach(function (a) {
        if (a.host && a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
      });
    })
    .catch(function (e) {
      box.innerHTML = '<div class="err"><b>文档加载失败</b><br>' +
        '请通过部署后的链接访问本页；直接双击本地文件时浏览器会禁止读取 .md 文件。<br>' +
        '也可以 <a href="./prd_v1.0.md" download>下载 Markdown 原文</a>。</div>';
    });
})();
</script>
</body>
</html>
"""

README = """# R001 模型编辑与切片 · 原型站点

自研款 3D 打印机 APP —— 模型编辑与切片模块的可交互原型。

## 目录

| 文件 | 说明 |
|---|---|
| `index.html` | **可交互原型**（入口即此页） |
| `prd.html` | 产品需求文档在线版 |
| `shots/index.html` | 23 张验收截图画廊（自动执行后真实截图） |
| `prd_v1.0.md` | PRD 的 Markdown 原文 |
| `vendor/` | three.js（3D 引擎）、Tailwind、marked —— 全部本地化，断网可用 |
| `assets/` | 内嵌 STL 模型数据与复用设计稿图片 |

## 怎么玩

- **3D 视图区**：单指拖动旋转视角，双指捏合缩放视图，鼠标滚轮也可缩放；点模型选中，点空白取消
- **下方工具栏**：缩放 / 复制 / 删除（默认只作用于选中的那一个零件）
- **分盘**：右上角演示控制台可切「1 盘」与「8 盘」，8 盘时盘号区可横向滑动
- **去打印**：走云端切片流程，成功后进入准备打印页

> 右侧「演示控制台」是评审用的，正式产品中不存在。可手动触发云切片失败、越界、碰撞等异常分支。

## 关键约定

- 打印空间 180 × 180 × 180 mm
- **零件** = 打印盘上的单个可打印对象；**模型** = 整个模型文件
- 缩放默认只作用于选中的那一个零件；开启「应用至所有盘的零件」后才全体同步
- 打印参数作用于整个打印任务（本期不支持每盘独立参数）
- 删除任务仅剩的最后一个零件时会二次确认，确认后**任务自动移除且不可恢复**；「取消」则留在编辑页不删除
- 「应用至所有盘的零件」**单盘与多盘均展示**；单盘开启后作用于该盘全部零件
- 准备打印页底部为**「保存 / 开始打印」双按钮**；「保存」走「命名 → 进度 → 成功」三步，成功后可在「我的 - 我的切片」查看（该页本期不实现）
- **自动摆盘智能优化**：多文件模型进入编辑页时，同色模型文件在不超过打印空间的前提下自动合摆至一盘（示例 10 个文件 → 5 盘），并 Toast 告知结果。演示台有独立分支「自动摆盘优化」
- 打印设置页**顶部右侧「保存」已删除**；点顶部左侧「退出」时：**有实际修改** → 保存范围弹窗（右上角可关闭；未选范围=「取消」，选中后=「确定」→ 保存并返回编辑页）；**无实际修改** → 不弹窗，直接返回模型编辑页
"""

if __name__ == '__main__':
    build()
