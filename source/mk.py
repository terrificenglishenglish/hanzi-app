import json,re,jieba,logging
jieba.setLogLevel(logging.ERROR)
from pypinyin import lazy_pinyin, Style
d=json.load(open('/mnt/user-data/uploads/Chinese/app/words.json'))
ex={int(a):(b,c) for a,b,c in (l.rstrip('\n').split('\t') for l in open('examples.tsv') if l.strip())}
P={'。':'.','，':',','！':'!','？':'?','：':':','、':','}
PROPER={'汉语':'Hànyǔ','中文':'Zhōngwén','中国':'Zhōngguó','北京':'Běijīng','上海':'Shànghǎi','俄罗斯':'Éluósī','德国':'Déguó','美国':'Měiguó','英国':'Yīngguó','日本':'Rìběn','莫斯科':'Mòsīkē','娜斯佳':'Nàsījiā','迪拜':'Díbài','微信':'Wēixìn','俄语':'Éyǔ','英语':'Yīngyǔ','中国菜':'Zhōngguó cài'}
LEAD=set('我你他她它太很不也都没一二三四五六七八九十两几这那每')
TONE='āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'
def tone_of(p):
    for c in p:
        k=TONE.find(c)
        if k>=0: return k%4+1
    return 5
def syl(s):
    ps=lazy_pinyin(s,style=Style.TONE,tone_sandhi=True)
    for k,ch in enumerate(s):
        if ch=='一' and k+1<len(s) and s[k+1] not in '一二三四五六七八九十百千万' and (k==0 or s[k-1] not in '第十'):
            ps[k]='yí' if tone_of(ps[k+1])==4 else 'yì'
        if ch=='过' and k>0: ps[k]='guo'
    return ps
def toks(s):
    for t in jieba.cut(s,HMM=False):
        while len(t)>1 and t not in PROPER and t[0] in LEAD and not t.startswith(('一点','这儿','那儿','这个','那个','这些','那些','每天','几点','几号','没有','没事','不错','不太','太太','一起','几口','十一','一共')):
            yield t[0]; t=t[1:]
        yield t
def py(s):
    out=[];chars=syl(s);idx=0;
    for tok in toks(s):
        if tok in P:
            idx+=len(tok)
            if out: out[-1]+=P[tok]
            continue
        if re.match('[一-鿿]',tok):
            pp=chars[idx:idx+len(tok)]
            out.append(PROPER.get(tok) or ''.join(pp))
        else: out.append(tok)
        idx+=len(tok)
    r=' '.join(out); return r[:1].upper()+r[1:]
def blank(s,h):
    parts=[p for p in h.split('…') if p]; pos=0; res=s
    for p in parts:
        k=res.find(p,pos)
        if k<0: return None
        res=res[:k]+'＿＿'+res[k+len(p):]; pos=k+2
    return res
for w in d['words']:
    h=w['hanzi']
    if len(h)>1 and '…' not in h and '/' not in h and re.fullmatch('[\u4e00-\u9fff]+',h):
        jieba.add_word(h,freq=200000); PROPER.setdefault(h,w['pinyin'].replace('…',''))
for k,v in {'朋友':'péngyou','多少':'duōshao','衣服':'yīfu','名字':'míngzi','奶奶':'nǎinai','时候':'shíhou','意思':'yìsi','娜斯佳':'Nàsījiā'}.items(): PROPER[k]=v; jieba.add_word(k,freq=200000)
L=[[l['n'],l['title'].split(' · ',1)[1]] for l in d['lessons']]
W=[];bad=[]
for i,w in enumerate(d['words']):
    zh,ru=ex[i]; b=blank(zh,w['hanzi'])
    if b is None: bad.append((i,w['hanzi'],zh))
    W.append([w['hanzi'],w['pinyin'],w['ru'],w['lesson'],zh,b or zh,py(zh),ru])
print('bad',bad,len(ex))
# lessons added later (from lesson photos): append-only, so card indices never shift
for line in open('lessons_extra.tsv'):
    line=line.rstrip('\n')
    if not line.strip(): continue
    if line.startswith('# '):
        n,t=line[2:].split('\t'); L.append([int(n),t]); continue
    n,h,p,ru,zh,zru=line.split('\t')
    jieba.add_word(h,freq=200000); PROPER.setdefault(h,p)
    b=blank(zh,h)
    W.append([h,p,ru,int(n),zh,b or zh,py(zh),zru])
open('data.js','w').write('const LESSONS='+json.dumps(L,ensure_ascii=False)+';\nconst WORDS='+json.dumps(W,ensure_ascii=False)+';\n')
for i in [3,25,139,168,190,254,284,305]: print(W[i][5],'|',W[i][6])

# ---------- texts ----------
jieba.add_word('中文',freq=10**7); jieba.del_word('文书')
def cn(s):
    D={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
    total=0;sec=0;num=0
    for ch in s:
        if ch in D: num=D[ch]
        elif ch=='十': sec+=(num or 1)*10; num=0
        elif ch=='百': sec+=num*100; num=0
        elif ch=='千': sec+=num*1000; num=0
        elif ch=='万': total+=(sec+num)*10000; sec=0; num=0
    return total+sec+num
import os
idx={w[0]:k for k,w in enumerate(W)}
GL={}
if os.path.exists('gloss.tsv'):
    for l in open('gloss.tsv'):
        if l.strip(): a,b,c=l.rstrip('\n').split('\t'); GL[a]=(b,c)
texts=[];cur=None;unk={}
for line in open('texts.txt'):
    line=line.rstrip('\n')
    if not line: continue
    if line.startswith('# '):
        t,r,ls=[x.strip() for x in line[2:].split('|')]; cur={'zh':t,'ru':r,'lesson':int(ls),'s':[]}; texts.append(cur); continue
    zh,ru=line.split('\t'); chars=syl(zh); toks_out=[]; pos=0
    def known(x): return x in idx or x in GL or re.fullmatch('[零一二三四五六七八九十百千万两]+',x)
    def split(tok):
        if known(tok) or not re.match('[\u4e00-\u9fff]',tok): return [tok]
        out=[];k=0
        while k<len(tok):
            for L in range(len(tok)-k,0,-1):
                if known(tok[k:k+L]) or L==1: out.append(tok[k:k+L]); k+=L; break
        return out
    NUMS=[]
    for t0 in toks(zh): NUMS+=split(t0)
    # glue numerals together: 一百九十 -> one token
    merged=[]
    for t0 in NUMS:
        if merged and re.fullmatch('[零一二三四五六七八九十百千万两]+',t0) and re.fullmatch('[零一二三四五六七八九十百千万两]+',merged[-1]): merged[-1]+=t0
        else: merged.append(t0)
    for tok in merged:
        p=''.join(chars[pos:pos+len(tok)]) if re.match('[一-鿿]',tok) else ''
        if tok in idx: toks_out.append([tok,p,idx[tok]])
        elif re.fullmatch('[零一二三四五六七八九十百千万两]+',tok): toks_out.append([tok,p,'n:'+str(cn(tok))])
        elif re.match('[一-鿿]',tok):
            if tok in GL: toks_out.append([tok,p,'g:'+tok])
            else: unk[tok]=unk.get(tok,0)+1; toks_out.append([tok,p,None])
        else: toks_out.append([tok,p,None])
        pos+=len(tok)
    cur['s'].append({'zh':zh,'py':py(zh),'ru':ru,'t':toks_out})
gl={k:[v[0],v[1]] for k,v in GL.items()}
open('texts.js','w').write('const TEXTS='+json.dumps(texts,ensure_ascii=False)+';\nconst GLOSS='+json.dumps(gl,ensure_ascii=False)+';\n')
print('UNKNOWN',len(unk)); print(' '.join(unk))
