"""Build the Telegram Mini App folder (tg/) from the same sources as the claude.ai prototype."""
import os, re, shutil, json
os.chdir(os.path.dirname(os.path.abspath(__file__)))
OUT = 'tg'
os.makedirs(OUT + '/data', exist_ok=True)
os.makedirs(OUT + '/vendor', exist_ok=True)
os.makedirs(OUT + '/audio', exist_ok=True)

tpl = open('tpl.html').read()

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:80], s.count(a))
    return s.replace(a, b)

js_games = open('games.js').read()
js_games = rep(js_games, "    if(ok)G.score++;else missed(i);\n    if(!ok&&G.onWrong)", "    if(ok)G.score++;else missed(i);haptic(ok?'ok':'bad');\n    if(!ok&&G.onWrong)")
js_games = rep(js_games, "    const ok=(b.dataset.a==='1')===(i===j);G.n++;", "    const ok=(b.dataset.a==='1')===(i===j);G.n++;haptic(ok?'ok':'bad');")

s = tpl
s = rep(s, "function load(k,def){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x?Object.assign(def,x):def}catch(e){return def}}",
        "function load(k,def){const x=Store.get(k);return x?Object.assign(def,x):def}")
s = rep(s, "const saveS=()=>{try{localStorage.setItem('hz-placement',JSON.stringify(S))}catch(e){}};", "const saveS=()=>Store.set('hz-placement',S);")
s = rep(s, "const saveC=()=>{try{localStorage.setItem('hz-srs',JSON.stringify(C))}catch(e){}};", "const saveC=()=>Store.set('hz-srs',C);")
s = rep(s, "try{Object.assign(RS,JSON.parse(localStorage.getItem('hz-reader')||'{}'))}catch(e){}", "Object.assign(RS,Store.get('hz-reader')||{});")
s = rep(s, "function saveRS(){try{localStorage.setItem('hz-reader',JSON.stringify(RS))}catch(e){}}", "function saveRS(){Store.set('hz-reader',RS)}")
s = rep(s, '<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js"></script>\n<script>\n',
        '<script src="vendor/hanzi-writer.min.js"></script>\n<script src="data/words.js"></script>\n<script src="data/texts.js"></script>\n'
        '<script src="data/chars.js"></script>\n<script src="data/strokes.js"></script>\n<script>\n')
s = rep(s, '/*AUDIO*/\n', open('audio_block.js').read())
for k in ['DATA', 'TEXTS', 'CHARPY', 'CHARRU', 'STROKES']:
    s = rep(s, '/*' + k + '*/\n', '')
s = rep(s, "/*GAMES*/", js_games)
s = rep(s, "/*WRITING*/", open('writing.js').read())
# platform layer goes first in the main script
s = rep(s, "const ICON='", open('platform.js').read() + "const ICON='")
s = s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')

head, body = s.split('</style>', 1)
RESET = """*,*::before,*::after{box-sizing:border-box}
body{margin:0;-webkit-text-size-adjust:100%}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
img{max-width:100%}
"""
html = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">\n'
        '<script src="https://telegram.org/js/telegram-web-app.js"></script>\n'
        + head.replace('<style>', '<style>\n' + RESET, 1) + '</style>\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
open(OUT + '/index.html', 'w').write(html)

shutil.copy('data.js', OUT + '/data/words.js')
shutil.copy('texts.js', OUT + '/data/texts.js')
open(OUT + '/data/chars.js', 'w').write(open('charpy.js').read() + open('charru.js').read())
shutil.copy('strokes.js', OUT + '/data/strokes.js')
shutil.copy('hw/package/dist/hanzi-writer.min.js', OUT + '/vendor/hanzi-writer.min.js')

# recorded audio: the same packed clips the claude.ai page uses (audio/a0..af.json)
import glob
for f in glob.glob('artaudio/audio/a*.json'): shutil.copy(f, OUT + '/audio/')
for f in glob.glob(OUT + '/audio/*.mp3'): os.remove(f)
if os.path.exists(OUT + '/data/audio.js'): os.remove(OUT + '/data/audio.js')
print('index.html', len(html) // 1024, 'KB; audio packs:', len(glob.glob(OUT + '/audio/a*.json')))
