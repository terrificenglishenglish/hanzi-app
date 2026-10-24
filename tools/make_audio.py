"""Озвучка: делает mp3 для всех слов, предложений и иероглифов, которых ещё нет в audio/.
Запуск:  pip install edge-tts  &&  python3 tools/make_audio.py
"""
import asyncio, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.environ.get('VOICE', 'zh-CN-XiaoxiaoNeural')

def js_const(path, name):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'const ' + name + r'=(.*?);\n', src, re.S)
    return json.loads(m.group(1))

def clean(h): return h.replace('…', '').split(' / ')[0]
def fnv(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b; h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h

def all_texts():
    W = js_const(ROOT + '/data/words.js', 'WORDS')
    T = js_const(ROOT + '/data/texts.js', 'TEXTS')
    CP = js_const(ROOT + '/data/chars.js', 'CHARPY')
    out = set()
    for w in W:
        out.add(clean(w[0]))
        if w[4]: out.add(clean(w[4]))
    for t in T:
        for s in t['s']:
            out.add(s['zh'])
            for tok in s['t']:
                if re.search('[一-鿿]', tok[0]): out.add(clean(tok[0]))
    out |= set(CP)
    return sorted(x for x in out if x.strip())

async def main():
    import edge_tts
    todo = [t for t in all_texts() if not os.path.exists(f'{ROOT}/audio/{fnv(t)}.mp3')]
    print('нужно озвучить:', len(todo))
    sem = asyncio.Semaphore(6)
    async def one(t):
        async with sem:
            for attempt in range(3):
                try:
                    rate = '-15%' if len(t) <= 2 else '-5%'
                    await edge_tts.Communicate(t, VOICE, rate=rate).save(f'{ROOT}/audio/{fnv(t)}.mp3')
                    return
                except Exception as e:
                    await asyncio.sleep(2)
            print('не вышло:', t)
    done = 0
    for i in range(0, len(todo), 50):
        await asyncio.gather(*(one(t) for t in todo[i:i+50])); done += len(todo[i:i+50]); print(done, '/', len(todo))
    have = sorted(f[:-4] for f in os.listdir(ROOT + '/audio') if f.endswith('.mp3') and os.path.getsize(f'{ROOT}/audio/{f}') > 0)
    open(ROOT + '/data/audio.js', 'w').write('const AUDIO=new Set(' + json.dumps(have) + ');\n')
    print('готово, файлов:', len(have))

if __name__ == '__main__':
    asyncio.run(main())
