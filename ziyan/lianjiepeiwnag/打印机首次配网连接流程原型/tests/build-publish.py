# -*- coding: utf-8 -*-
"""构建可发布的站点目录。

关键点：两个原型之间是用 ../../ 相对路径互跳的（配网流程 → 打印页面原型、
打印页面原型 → 配网流程 ?screen=printer-select），所以必须把它们放进**同一个站点**、
并且保持相对目录结构不变，否则跨原型跳转会 404。

做法：扫描两个原型里所有本地引用，只把这些引用到的资源复制出来，
连同两个原型目录一起放进 ziyan/_publish-prototypes/。
可重复执行（先清空再复制）。
"""
import os
import re
import shutil
import sys

# 脚本在 <ziyan/ziyan>/lianjiepeiwnag/打印机首次配网连接流程原型/tests/ 下：
# ../.. 回到 lianjiepeiwnag，../../.. 回到 ziyan/ziyan（两个原型的公共根）
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
# 输出目录：默认 ziyan/_publish-prototypes；可用第一个命令行参数指定其他目录
# （例如构建不改动线上发布快照的新版本：build-publish.py <ziyan>/_publish-prototypes-r007）
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(ROOT, '..', '_publish-prototypes'))

PROTOS = [
    'lianjiepeiwnag/打印机首次配网连接流程原型',
    'dayinji/自研款打印机打印页面原型',
]

# 原型自带目录里不随发布一起走的东西
# shots-* 是各校验脚本落的验收截图目录，属于测试产物，不进发布目录
SKIP_DIRS = {'tests', '.tmp_prototype_verify', '.tmp_figwright_prepare_review', '.tmp_connect_audit', 'shots-help', 'shots-help-online'}
SKIP_FILES = re.compile(r'^(prototype-.*\.png|_shot_.*\.png|_tools_make_share_assets\.py)$')

# src/href/url()/JS 字符串常量里的相对引用
REF_PATTERN = re.compile(
    r'(?:src|href)\s*=\s*"([^"]+)"'
    r'|url\(\s*["\']?([^)"\']+)["\']?\s*\)'
    r'|[\'"]((?:\.\./)+[^"\']+)[\'"]'
)


def collect_references(proto_dir):
    base = os.path.join(ROOT, proto_dir)
    found = set()
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in ('.html', '.css', '.js'):
                continue
            text = open(os.path.join(dirpath, name), encoding='utf-8').read()
            for match in REF_PATTERN.finditer(text):
                for group in match.groups():
                    if group and not group.startswith(('http', '#', 'data:')) and '+' not in group:
                        # JS 里常把目录前缀单独存成字符串（如 '../../src/dayinji'），
                        # 只收看起来带扩展名的引用，避免把目录当文件复制
                        # 含 ${...} 的是模板字面量（如 src="${model.thumb}"），
                        # 那是占位符不是真实路径，跳掉以免误报断链；
                        # 同一批资源的真实字面量（thumb: 'assets/xxx.png'）仍会被收集到。
                        if '${' in group:
                            continue
                        tail = group.split('?')[0].split('#')[0].rsplit('/', 1)[-1]
                        if '.' not in tail or not (1 <= len(tail.rsplit('.', 1)[-1]) <= 6):
                            continue
                        found.add(group)
    return found


def main():
    # 不做整目录删除（安全策略会拦 rmtree）：直接覆盖写，同名文件会被 copy2 覆盖
    os.makedirs(OUT, exist_ok=True)

    # 1) 复制两个原型目录本体
    for proto in PROTOS:
        source = os.path.join(ROOT, proto)
        target = os.path.join(OUT, proto)
        os.makedirs(target, exist_ok=True)
        copied = 0
        for dirpath, dirnames, filenames in os.walk(source):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            rel_dir = os.path.relpath(dirpath, source)
            for name in filenames:
                if SKIP_FILES.match(name):
                    continue
                src_file = os.path.join(dirpath, name)
                dst_dir = target if rel_dir == '.' else os.path.join(target, rel_dir)
                os.makedirs(dst_dir, exist_ok=True)
                shutil.copy2(src_file, os.path.join(dst_dir, name))
                copied += 1
        print('%-46s %3d 个文件' % (proto, copied))

    # 2) 复制被引用到的外部资源（保持相对结构）
    external = {}
    for proto in PROTOS:
        base = os.path.join(ROOT, proto)
        for rel in collect_references(proto):
            abs_path = os.path.normpath(os.path.join(base, rel.split('?')[0].split('#')[0]))
            rel_root = os.path.relpath(abs_path, ROOT).replace('\\', '/')
            if rel_root.startswith('..') or not os.path.exists(abs_path):
                continue
            if not rel_root.split('/')[0] in ('src', '原型修改复用图片资源', 'ugee'):
                continue
            external.setdefault(rel_root, set()).add(proto)

    for rel_root in sorted(external):
        dst = os.path.join(OUT, *rel_root.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel_root), dst)
    print('外部资源复制 %d 个' % len(external))

    # 3) 发布根页：两个原型的入口清单
    launcher = '''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>趣打印 · 原型发布</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 40px 20px 60px; background: #f7f9fc; color: #1f242c;
           font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    .sub { margin: 0 0 28px; color: #98a2b3; font-size: 14px; line-height: 1.7; }
    .card { margin-bottom: 18px; padding: 20px; border-radius: 16px; background: #fff;
            box-shadow: 0 1px 2px rgb(31 36 44 / 4%), 0 8px 22px rgb(31 36 44 / 6%); }
    .card h2 { margin: 0 0 4px; font-size: 18px; }
    .card p { margin: 0 0 14px; color: #5b6474; font-size: 13px; line-height: 1.7; }
    .links { display: grid; gap: 9px; }
    a { display: flex; align-items: center; justify-content: space-between; gap: 10px;
        min-height: 44px; padding: 0 16px; border: 1px solid #e3e8f0; border-radius: 12px;
        color: #2f6fe0; background: #f9fbfe; font-size: 14px; font-weight: 600; text-decoration: none; }
    a:hover { border-color: rgb(67 136 245 / 55%); background: #eaf2fe; }
    a span { color: #98a2b3; font-size: 11.5px; font-weight: 400; }
    .note { margin-top: 26px; padding: 14px 16px; border-radius: 12px; background: #eef4ff;
            color: #5b6474; font-size: 12.5px; line-height: 1.8; }
    code { padding: 1px 5px; border-radius: 5px; background: #e6ecf7; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>趣打印 · 原型发布</h1>
    <p class="sub">两套原型发布在同一个站点里，互相跳转用的是原始相对路径，点与点之间的链路与本地离线版完全一致。</p>

    <section class="card">
      <h2>打印机首次配网连接流程</h2>
      <p>起始页 → 选择打印机 → 打印机准备 → 连接热点 → 网络配置 →（连接等待）→ 打印前准备。起始页右上角「帮助」可打开连接配网常见问题弹窗；另含「演示台」，可切换家长 / 儿童账号、起始页版本（v1 / v2）等情况。</p>
      <div class="links">
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html">打开配网流程<span>起始页 · 家长账号</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=demo">演示台<span>切换账号类型 / 起始页版本 / 邀请异常态</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=help">帮助 · 连接配网常见问题<span>自下而上弹出的解决方案弹层 + FAQ 外链</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=home-wifi">网络配置 → 连接等待<span>蓝色圆圈 + 水波纹动效 · 正常 / 60s 超时两分支</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?account=child">儿童受限账号起始页<span>前往认证 / 家长授权</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?account=child&version=v2">儿童受限账号起始页v2<span>家长授权先判断家庭群组</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?account=child&screen=join-scan">加入共享打印机<span>三页链路入口</span></a>
      </div>
    </section>

    <section class="card">
      <h2>打印机无网打印</h2>
      <p>连接配网首页 → 打印机无网打印 → 两步连接热点引导 → 连接等待 / 超时重试 → 导入文件。支持我的AI创作、我的切片，以及仅限 gcode 的模拟手机文件选择。</p>
      <div class="links">
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?flow=offline">打开无网打印完整链路<span>首页「购买打印机」下方新增入口</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=offline-guide">连接打印机热点页<span>两步图文指引 · 成功 / 超时演示</span></a>
        <a href="lianjiepeiwnag/打印机首次配网连接流程原型/index.html?screen=offline-library">导入文件页<span>AI创作 / 我的切片 · 上传等待与成功提示</span></a>
      </div>
    </section>

    <section class="card">
      <h2>自研款打印机打印页面原型</h2>
      <p>设备页、打印任务、耗材、设备设置、固件升级、添加打印机与分享打印机；离线工作台支持账号切换、重连成功与超时失败演示。</p>
      <div class="links">
        <a href="dayinji/自研款打印机打印页面原型/index.html">打开打印页面原型<span>设备首页</span></a>
        <a href="dayinji/自研款打印机打印页面原型/index.html?share=normal">分享打印机<span>二维码 + 邀请码 + 异常态</span></a>
        <a href="dayinji/自研款打印机打印页面原型/index-offline.html">打印机离线状态<span>超管 / 受限共享成员 · 10s 超时分支</span></a>
      </div>
    </section>

    <p class="note">
      两个原型之间的跳转：打印页面原型点「添加打印机 → 配置新的打印机」会跳到配网流程的「选择要设置的打印机」；
      配网流程终页点「已完成，取消」会回到打印页面原型；输入分享页生成的邀请码也能一路走回配网流程演示台。
      深链参数：<code>?screen=</code>（配网流程页面名）、<code>?account=parent|child</code>、<code>?share=</code>、<code>?status=</code>。
    </p>
  </div>
</body>
</html>
'''
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(launcher)

    # 4) 复核：发布目录里再扫一遍，确认没有断链
    broken = []
    for proto in PROTOS:
        base = os.path.join(OUT, proto)
        for rel in collect_references(proto):
            abs_path = os.path.normpath(os.path.join(base, rel.split('?')[0].split('#')[0]))
            if os.path.relpath(abs_path, OUT).startswith('..'):
                continue
            if not os.path.exists(abs_path):
                broken.append((proto, rel))
    print('断链:', broken if broken else '无')

    total = sum(
        os.path.getsize(os.path.join(dirpath, name))
        for dirpath, _, filenames in os.walk(OUT)
        for name in filenames
    )
    print('发布目录:', OUT)
    print('总大小: %.1f MB' % (total / 1048576))


if __name__ == '__main__':
    main()
