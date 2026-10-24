/* ---------- WRITING (stroke order) ---------- */
const hasStrokes=c=>!!STROKES[c];
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'}
function makeWriter(el,ch,opts){
  if(!window.HanziWriter){el.innerHTML='<p class="small muted" style="padding:20px">Не удалось загрузить анимацию черт. Проверь интернет и обнови страницу.</p>';return null}
  const size=el.clientWidth||260;
  return HanziWriter.create(el,ch,Object.assign({
    width:size,height:size,padding:12,showOutline:true,
    strokeColor:cssVar('--ink'),outlineColor:cssVar('--line'),drawingColor:cssVar('--accent'),
    highlightColor:cssVar('--known'),radicalColor:cssVar('--accent'),
    strokeAnimationSpeed:1,delayBetweenStrokes:250,drawingWidth:22,
    charDataLoader:(c,done)=>done(STROKES[c])
  },opts||{}));
}
const GRID=`<svg class="grid" viewBox="0 0 100 100" aria-hidden="true"><rect x="1" y="1" width="98" height="98" fill="none" stroke="currentColor" stroke-width="1"/><path d="M50 1V99M1 50H99" stroke="currentColor" stroke-width=".6" stroke-dasharray="3 3"/><path d="M1 1L99 99M99 1L1 99" stroke="currentColor" stroke-width=".5" stroke-dasharray="2 3" opacity=".7"/></svg>`;
let WV=null;
function writeView(word,meta){ // overlay; works on top of cards, lessons, texts
  closeWrite();
  const chars=[...new Set([...clean(word)].filter(hasStrokes))];
  if(!chars.length){toast('Для этого слова нет данных о чертах.');return}
  const ov=document.createElement('div');ov.className='wov';ov.id='wov';
  document.body.appendChild(ov);document.body.classList.add('noscroll');
  WV={chars,k:0,writer:null,meta:meta||{}};
  renderWrite();
}
function closeWrite(){const o=$('#wov');if(o)o.remove();document.body.classList.remove('noscroll');WV=null}
function renderWrite(){
  const ov=$('#wov');if(!ov||!WV)return;
  const c=WV.chars[WV.k],m=WV.meta;
  ov.innerHTML=`<div class="wov-in">
    <div class="top"><div class="grow"><div class="eyebrow">Как писать${m.word&&m.word!==c?' · '+esc(m.word):''}</div></div><button class="btn plain" id="wx" style="width:auto;padding:8px">Закрыть</button></div>
    ${WV.chars.length>1?`<div class="wchars">${WV.chars.map((x,k)=>`<button class="${k===WV.k?'on':''}" data-k="${k}">${esc(x)}</button>`).join('')}</div>`:''}
    <div class="wbox">${GRID}<div id="wtarget" class="wtarget"></div></div>
    <div class="winfo"><span class="py">${esc(CHARPY[c]||m.py||'')}</span><button class="speak sm" id="wsay">${ICON}</button><span class="muted small">${STROKES[c].strokes.length} ${plural(STROKES[c].strokes.length,'черта','черты','черт')}</span></div>
    <p class="wmean">${esc(charMeaning(c)||m.ru||'')}</p>
    <div class="row"><button class="btn ghost" id="wplay">▶ Порядок черт</button><button class="btn" id="wquiz">✍ Пропиши сам</button></div>
    <p class="small muted" id="wmsg">Нажми «Порядок черт», чтобы посмотреть, или «Пропиши сам» и рисуй по клеткам пальцем или мышкой.</p>
    <p class="small muted" style="opacity:.7">Анимация: Hanzi Writer, данные о чертах: Make Me a Hanzi (Arphic Public License).</p>
  </div>`;
  $('#wx').onclick=closeWrite;
  $('#wsay').onclick=()=>say(c);
  ov.querySelectorAll('.wchars button').forEach(b=>b.onclick=()=>{WV.k=+b.dataset.k;renderWrite()});
  const t=$('#wtarget');
  requestAnimationFrame(()=>{
    WV.writer=makeWriter(t,c);
    if(!WV.writer)return;
    $('#wplay').onclick=()=>{WV.writer.cancelQuiz();WV.writer.showCharacter();WV.writer.hideCharacter({duration:0});WV.writer.animateCharacter();$('#wmsg').textContent='Смотри порядок: черты рисуются по одной.'};
    $('#wquiz').onclick=()=>{
      $('#wmsg').textContent='Рисуй черты по порядку. После трёх ошибок появится подсказка.';
      WV.writer.quiz({showHintAfterMisses:3,highlightOnComplete:true,
        onMistake:()=>{},
        onComplete:s=>{const n=s.totalMistakes;$('#wmsg').innerHTML=n===0?'<b style="color:var(--known)">Отлично, без ошибок!</b>':`Готово. Ошибок: ${n}. Попробуй ещё раз.`;
          if(WV.k<WV.chars.length-1)$('#wmsg').innerHTML+=` <button class="peek" id="wnext">Следующий иероглиф →</button>`;
          $('#wnext')?.addEventListener('click',()=>{WV.k++;renderWrite()})}});
    };
  });
}
/* writing game */
function writeNext(){
  cur='game';G.next=writeNext;
  const pool=poolIds().filter(i=>[...clean(WORDS[i][0])].some(hasStrokes));
  const i=pool[Math.random()*pool.length|0],w=WORDS[i],h=clean(w[0]);
  const ks=[...h].map((c,k)=>k).filter(k=>hasStrokes(h[k]));
  const k=ks[Math.random()*ks.length|0],c=h[k];
  const shown=h.length>1?h.slice(0,k)+'＿'+h.slice(k+1):'＿';
  app.innerHTML=`${gTop(`Пропиши · ${G.round+1} из 10 · очки ${G.score}`,G.round/10)}
    <div class="card" style="min-height:0;padding:18px 16px">
      <div class="hz long">${esc(shown)}</div><div class="py">${esc(w[1])}</div><div>${esc(w[2])}</div>
    </div>
    <div class="wbox">${GRID}<div id="wtarget" class="wtarget"></div></div>
    <p class="small muted" id="wmsg" style="text-align:center">Напиши пропущенный иероглиф. После трёх ошибок в черте появится подсказка.</p>
    <div class="row"><button class="btn ghost" id="whint">Показать контур</button><button class="btn plain" id="wskip">Не помню</button></div>
    <div id="nx"></div>`;
  bindQuit();
  requestAnimationFrame(()=>{
    const wr=makeWriter($('#wtarget'),c,{showOutline:false,showCharacter:false});
    if(!wr)return;
    let hinted=false;
    const finish=(ok,txt)=>{
      $('#wmsg').innerHTML=txt;$('#whint').parentElement.hidden=true;
      if(ok)G.score++;else missed(i);
      $('#nx').innerHTML=`<div class="row"><button class="speak" id="ws">${ICON} ${esc(w[0])}</button></div><button class="btn" id="nxt" style="margin-top:8px">${G.round>=9?'Итог':'Дальше'}</button>`;
      $('#ws').onclick=()=>say(w[0]);
      $('#nxt').onclick=()=>{G.round++;if(G.round>=10)return gameOver(G.score,`${G.score} из 10`);writeNext()};
    };
    wr.quiz({showHintAfterMisses:3,highlightOnComplete:true,
      onComplete:s=>{const ok=s.totalMistakes<=2&&!hinted;finish(ok,ok?`<b style="color:var(--known)">Верно!</b> Ошибок: ${s.totalMistakes}.`:`Готово, но с подсказками (ошибок: ${s.totalMistakes}). Это слово ещё повторим.`)}});
    $('#whint').onclick=()=>{hinted=true;wr.showOutline()};
    $('#wskip').onclick=()=>{wr.cancelQuiz();wr.showCharacter();wr.hideCharacter({duration:0});wr.animateCharacter();finish(false,'Смотри, как он пишется.')};
  });
}

