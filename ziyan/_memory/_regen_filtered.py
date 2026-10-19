# -*- coding: utf-8 -*-
"""
重新生成 _memory 下的「开发核对版（删选版）」RULES.md / DECISIONS.md。

删选标准（两条同时满足）：
  ① 在两篇飞书文档中被实际引用：
     - wiki VgecwTI1eiGd7JkR1Dwcazekneg（docx ECnFdC19sodiGtxtVjWcE8ConSb）
     - wiki OdsJwaINKiiB4Kk9NzEctuo7nmb（该文档用行内编号，通常不贡献 BR-/DEC-）
 ② 适用于开发查看核对（可实现的规则 / 决策；纯文档编纂过程类条目剔除，如 DEC-017）。

用法：
  python _regen_filtered.py            # 用当前 RULES.full.bak / DECISIONS.full.bak 重新生成
  python _regen_filtered.py --refresh  # 先用 lark-cli 抓取飞书文档，重算「被引用编号集合」

注意：完整历史保留在 RULES.full.bak / DECISIONS.full.bak；新增条目请先写入 .full.bak，再跑本脚本。
"""
import json, os, re, subprocess, sys, datetime, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
DOC = 'https://v1uw36mubro.feishu.cn/wiki/VgecwTI1eiGd7JkR1Dwcazekneg'
DOC2 = 'https://v1uw36mubro.feishu.cn/wiki/OdsJwaINKiiB4Kk9NzEctuo7nmb'
# 适用于开发核对标准剔除：纯 PRD 编纂过程决策（仅对 DEC 生效）
DROP_DEC = {17}


def lark_cli():
    """定位 lark-cli：优先 PATH，其次 WorkBuddy 内置 cli-connector-packages"""
    p = shutil.which('lark-cli') or shutil.which('lark-cli.cmd')
    if p:
        return p
    for base in (os.environ.get('APPDATA', ''), os.path.expanduser('~')):
        for d in (os.path.join(base, 'npm'),):
            for name in ('lark-cli.cmd', 'lark-cli'):
                fp = os.path.join(d, name)
                if os.path.exists(fp):
                    return fp
    wb = os.path.expanduser('~/.workbuddy/binaries/node/cli-connector-packages')
    for name in ('lark-cli.cmd', 'lark-cli'):
        fp = os.path.join(wb, name)
        if os.path.exists(fp):
            return fp
    return 'lark-cli'


def lark_fetch(url):
    exe = lark_cli()
    if exe.endswith('.cmd') and os.name == 'nt':
        cmd = [os.environ.get('COMSPEC', 'cmd.exe'), '/c', exe, 'docs', '+fetch', '--doc', url]
    else:
        cmd = [exe, 'docs', '+fetch', '--doc', url]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=True).stdout
    return json.loads(out)['data']['document']['content']


def fetch_refs():
    """抓两篇飞书文档全文，返回被引用的 BR/DEC 编号集合"""
    refs = {'BR': set(), 'DEC': set()}
    for url in (DOC, DOC2):
        try:
            content = lark_fetch(url)
        except Exception as e:
            print('  ! 抓取失败（跳过该篇）：%s —— %s' % (url, e))
            continue
        for pre in refs:
            refs[pre] |= set(re.findall(pre + r'-(\d{3})', content))
        print('  · %s → 累计 BR %d 条 / DEC %d 条' % (url.rsplit('/', 1)[-1][:14],
              len(refs['BR']), len(refs['DEC'])))
    return refs


def entries(path, prefix):
    txt = open(path, encoding='utf-8').read()
    parts = re.split(r'(?m)^(### ' + prefix + r'-\d+[^\n]*)$', txt)
    out = {}
    for i in range(1, len(parts), 2):
        head = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ''
        # 清洗：原档案里 `## 模块` 标题与 `---` 分隔线会粘在上一条正文尾部，删选版按模块分组后应去掉
        keep = []
        for ln in body.split('\n'):
            if re.match(r'^##\s', ln) or re.match(r'^---\s*$', ln) or re.match(r'^>\s*来源说明', ln):
                continue
            keep.append(ln)
        body = '\n'.join(keep)
        body = re.sub(r'\n{3,}', '\n\n', body).strip()
        m = re.match(r'### ' + prefix + r'-(\d+)', head)
        if m:
            out[int(m.group(1))] = (head.strip(), body)
    return out


def anchors(refs_br, refs_dec):
    """每个编号在飞书文档中被引用的最近章节（用于「文档锚点」行）"""
    try:
        c = lark_fetch(DOC)
    except Exception as e:
        print('  ! 锚点抓取失败（不写锚点行）：%s' % e)
        return {}
    heads = [(m.start(), re.sub(r'<[^>]+>', '', m.group(0))) for m in re.finditer(r'<h[234][^>]*>[^<]+</h[234]>', c)]
    def anchor(idx):
        best = ''
        for pos, h in heads:
            if pos < idx:
                best = h
            else:
                break
        return best
    res = {}
    for pre, ids in (('BR', refs_br), ('DEC', refs_dec)):
        for n in ids:
            tag = '%s-%03d' % (pre, n)
            ms = [m.start() for m in re.finditer(re.escape(tag), c)]
            vals = sorted(set(anchor(p) for p in ms if anchor(p) and anchor(p) != '版本记录'))
            res[tag] = ' / '.join(vals)
    return res


def build(prefix, full_file, out_file, ids, anc, groups, title, note_lines):
    ents = entries(os.path.join(HERE, full_file), prefix)
    drop = DROP_DEC if prefix == 'DEC' else set()   # 剔除名单只作用于 DEC（BR-017 是有效规则）
    lines = ['# ' + title, '']
    lines += note_lines
    lines.append('')
    used = set()
    for gname, gids in groups:
        lines += ['## ' + gname, '']
        for n in gids:
            if n not in ents or n in drop:
                continue
            used.add(n)
            head, body = ents[n]
            lines += [head, body.rstrip()]
            a = anc.get('%s-%03d' % (prefix, n), '')
            if a:
                lines.append('- **文档锚点**：飞书 ' + a)
            lines.append('')
    missing = [n for n in ids if n not in used and n not in drop]
    writable = [n for n in missing if n in ents]      # 档案里根本没有的（如并发新增尚未入 .full.bak）不落盘
    if writable:
        lines += ['## 其他（未归组）', '']
        for n in writable:
            used.add(n)
            head, body = ents[n]
            lines += [head, body.rstrip()]
            a = anc.get('%s-%03d' % (prefix, n), '')
            if a:
                lines.append('- **文档锚点**：飞书 ' + a)
            lines.append('')
    open(os.path.join(HERE, out_file), 'w', encoding='utf-8').write('\n'.join(lines).rstrip() + '\n')
    print('  ✓ %s：%d 条%s' % (out_file, len(used), ('（缺 %s，见 .full.bak）' % missing) if missing else ''))


def main():
    today = datetime.date.today().isoformat()
    if '--refresh' in sys.argv:
        print('抓取飞书文档引用集合…')
        refs = fetch_refs()
        ids_br, ids_dec = sorted(int(x) for x in refs['BR']), sorted(int(x) for x in refs['DEC'])
        json.dump({'BR': ids_br, 'DEC': ids_dec},
                  open(os.path.join(HERE, '_ref_ids.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('  引用集合：BR %d 条 / DEC %d 条 → _ref_ids.json' % (len(ids_br), len(ids_dec)))
    else:
        data = json.load(open(os.path.join(HERE, '_ref_ids.json'), encoding='utf-8'))
        ids_br, ids_dec = [int(x) for x in data['BR']], [int(x) for x in data['DEC']]
        print('使用 _ref_ids.json：BR %d 条 / DEC %d 条' % (len(ids_br), len(ids_dec)))

    anc = anchors(ids_br, ids_dec)
    br_note = [
        '> **本文件为删选版**：仅保留在以下两篇飞书文档中被**实际引用**、且**适用于开发查看核对**的规则（共 %d 条）。' % len(ids_br),
        '> - 《3D 打印机 APP｜模型编辑与切片 + 模型导入》wiki `VgecwTI1eiGd7JkR1Dwcazekneg`（docx `ECnFdC19sodiGtxtVjWcE8ConSb`）',
        '> - 《P2-1 工作台及其功能权限体系需求文档》wiki `OdsJwaINKiiB4Kk9NzEctuo7nmb`（该文档使用行内编号，未引用 BR-/DEC-，故删选基准主要来自上一篇）',
        '>',
        '> 未入选项与完整历史记录见 **`RULES.full.bak`**。新增规则请先写入 `.full.bak`，再跑 `_regen_filtered.py --refresh`。',
        '> 每条规则附「文档锚点」= 该规则在飞书文档中被引用的章节，开发核对时以飞书文档为准。',
        '> 生成日期：%s｜ID 一经分配永不复用；修订用「标废弃 + 指向替代者」，不删除。' % today,
    ]
    dec_note = [
        '> **本文件为删选版**：仅保留在两篇飞书文档中被**实际引用**、且**适用于开发查看核对**的决策（共 %d 条）。' % (len(ids_dec) - len(DROP_DEC)),
        '> - 《3D 打印机 APP｜模型编辑与切片 + 模型导入》wiki `VgecwTI1eiGd7JkR1Dwcazekneg`',
        '> - 《P2-1 工作台及其功能权限体系需求文档》wiki `OdsJwaINKiiB4Kk9NzEctuo7nmb`',
        '>',
        '> **剔除说明**：`DEC-017`（授权 AI 按文档风格补齐文案）为 PRD 编纂过程决策，非产品行为，不适用于开发核对。',
        '> 未入选项与完整历史记录见 **`DECISIONS.full.bak`**；新增决策请先写入 `.full.bak`，再跑 `_regen_filtered.py --refresh`。',
        '> 生成日期：%s' % today,
    ]
    build('BR', 'RULES.full.bak', 'RULES.md', ids_br, anc, [
        ('A · R001 模型编辑与切片（编辑 / 参数 / 打印盘）', [n for n in ids_br if n <= 20]),
        ('B · R002 模型导入（校验 / 弹窗 / 分盘 / 无网）', [n for n in ids_br if 21 <= n <= 61]),
        ('C · 自动摆盘智能优化（M16）', [n for n in ids_br if n >= 62]),
    ], '业务规则（开发核对版 · 删选版）', br_note)
    build('DEC', 'DECISIONS.full.bak', 'DECISIONS.md', ids_dec, anc, [
        ('A · 原型实现约定（技术栈 / 复用 / 单文件自洽）', [1, 2, 12, 18]),
        ('B · R001 模型编辑与切片', [n for n in ids_dec if 3 <= n <= 26]),
        ('C · R002 模型导入', [n for n in ids_dec if 27 <= n <= 68]),
        ('D · 切片预览页（v1.1）与混入闸门（v1.1.3）', [n for n in ids_dec if n >= 69]),
    ], '决策记录（开发核对版 · 删选版）', dec_note)


if __name__ == '__main__':
    main()