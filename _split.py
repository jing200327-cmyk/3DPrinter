import re, json, sys
sys.stdout.reconfigure(encoding='utf-8')

VOID = set()  # 依赖自闭合属性判断

def top_blocks(xml):
    """Split top-level blocks of docx XML."""
    blocks=[]; i=0; n=len(xml); depth=0; start=None; stack=[]
    tag_re=re.compile(r'<(/?)([a-zA-Z0-9-]+)((?:[^>"]|"[^"]*")*)(/?)>')
    while i < n:
        m=tag_re.search(xml, i)
        if not m: break
        closing, name, attrs, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if attrs.endswith('/'): selfclose='/'
        if closing:
            depth-=1; stack.pop()
            if depth==0:
                blocks.append(xml[start:m.end()]); start=None
            i=m.end(); continue
        if selfclose or name in VOID:
            if depth==0:
                blocks.append(xml[m.start():m.end()]); 
            i=m.end(); continue
        if depth==0: start=m.start()
        depth+=1; stack.append(name)
        i=m.end()
    return blocks

def strip_ids(x):
    x=re.sub(r'\sid="[^"]*"','',x)
    return x

def plain(x):
    x=re.sub(r'<[^>]+>',' ',x)
    x=re.sub(r'\s+',' ',x)
    return x.strip()

if __name__=='__main__':
    for f in ('_tgt_ids_ids.xml','_src_ids_ids.xml'):
        xml=open(f,encoding='utf-8').read()
        bs=top_blocks(xml)
        print('=====',f,'blocks=',len(bs),'total=',sum(len(b) for b in bs),'xml=',len(xml))
        for k,b in enumerate(bs):
            tag=re.match(r'<([a-zA-Z0-9-]+)',b).group(1)
            bid=re.search(r'\sid="([^"]+)"',b)
            print(f'{k:3d} {tag:10s} {(bid.group(1) if bid else "-"):22s} {plain(b)[:70]}')
