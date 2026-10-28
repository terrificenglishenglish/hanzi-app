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
// Learning ladder: watch → trace with the next stroke lit → trace → from memory (×2).
// A memory round with more than 2 mistakes or a hint is repeated, so the character is
// written correctly from memory at least twice before it counts as done.
const LADDER=[
  {k:'watch', name:'Смотрим',             tip:'Смотри, в каком порядке идут черты. Анимация покажется два раза.'},
  {k:'guide', name:'По контуру с подсказкой', tip:'Обводи по серому контуру. Следующая черта подсвечивается.'},
  {k:'guide', name:'По контуру с подсказкой', tip:'Ещё раз по контуру с подсказкой.'},
  {k:'trace', name:'По контуру',          tip:'Контур остался, а подсказок больше нет. Вспомни порядок черт.'},
  {k:'memory',name:'По памяти',           tip:'Контура нет. Напиши иероглиф сам. После трёх ошибок в черте появится подсказка.'},
  {k:'memory',name:'По памяти',           tip:'Ещё раз по памяти, чтобы закрепить.'},
];
let WV=null;
function writeView(word,meta,opts){ // overlay; works on top of cards, lessons, texts, games
  closeWrite();
  const chars=[...new Set([...clean(word)].filter(hasStrokes))];
  if(!chars.length){toast('Для этого слова нет данных о чертах.');return}
  const ov=document.createElement('div');ov.className='wov';ov.id='wov';
  document.body.appendChild(ov);document.body.classList.add('noscroll');
  WV={chars,k:0,writer:null,meta:meta||{},onClose:opts&&opts.onClose};
  if(opts&&opts.ladder){WV.k=Math.max(0,chars.indexOf(opts.ladder));startLadder()}else renderWrite();
}
function closeWrite(){const o=$('#wov');const cb=WV&&WV.onClose;if(o)o.remove();document.body.classList.remove('noscroll');WV=null;cb&&cb()}
function wHead(c){
  const m=WV.meta,n=STROKES[c].strokes.length,done=(C.wr||{})[c];
  return `<div class="top"><div class="grow"><div class="eyebrow">Как писать${m.word&&m.word!==c?' · '+esc(m.word):''}</div></div><button class="btn plain" id="wx" style="width:auto;padding:8px">Закрыть</button></div>
    ${WV.chars.length>1?`<div class="wchars">${WV.chars.map((x,k)=>`<button class="${k===WV.k?'on':''} ${(C.wr||{})[x]?'done':''}" data-k="${k}">${esc(x)}</button>`).join('')}</div>`:''}
    <div class="wbox">${GRID}<div id="wtarget" class="wtarget"></div></div>
    <div class="winfo"><span class="py">${esc(CHARPY[c]||m.py||'')}</span><button class="speak sm" id="wsay">${ICON}</button><span class="muted small">${n} ${plural(n,'черта','черты','черт')}</span>${done?`<span class="pill k">✓ прописан ${done} ${plural(done,'раз','раза','раз')}</span>`:''}</div>
    <p class="wmean">${esc(charMeaning(c)||m.ru||'')}</p>`;
}
function wBind(c){
  $('#wx').onclick=closeWrite;
  $('#wsay').onclick=()=>say(c);
  $('#wov').querySelectorAll('.wchars button').forEach(b=>b.onclick=()=>{WV.k=+b.dataset.k;renderWrite()});
}
function renderWrite(){
  const ov=$('#wov');if(!ov||!WV)return;
  const c=WV.chars[WV.k];
  ov.innerHTML=`<div class="wov-in">${wHead(c)}
    <button class="btn" id="wlearn">✍ Учить писать · 6 шагов</button>
    <div class="row"><button class="btn ghost" id="wplay">▶ Порядок черт</button><button class="btn ghost" id="wtest">🧠 Проверить себя</button></div>
    <p class="small muted" id="wmsg">«Учить писать»: сначала смотришь, потом обводишь по контуру с подсказками, потом пишешь сам. «Проверить себя»: сразу по памяти.</p>
    <p class="small muted" style="opacity:.7">Анимация: Hanzi Writer, данные о чертах: Make Me a Hanzi (Arphic Public License).</p>
  </div>`;
  wBind(c);
  requestAnimationFrame(()=>{
    WV.writer=makeWriter($('#wtarget'),c);
    if(!WV.writer)return;
    $('#wplay').onclick=()=>{WV.writer.cancelQuiz();WV.writer.animateCharacter();$('#wmsg').textContent='Смотри порядок: черты рисуются по одной.'};
    $('#wlearn').onclick=startLadder;
    $('#wtest').onclick=()=>{
      $('#wtarget').innerHTML='';
      WV.writer=makeWriter($('#wtarget'),c,{showOutline:false,showCharacter:false});
      $('#wmsg').textContent='Напиши по памяти. После трёх ошибок в черте появится подсказка.';
      WV.writer.quiz({showHintAfterMisses:3,highlightOnComplete:true,onComplete:s=>{
        const n=s.totalMistakes;
        $('#wmsg').innerHTML=n<=1?'<b style="color:var(--known)">Отлично, ты его помнишь!</b>':`Ошибок: ${n}. Лучше пройти «Учить писать».`;
      }});
    };
  });
}
function startLadder(){WV.step=0;WV.extra=0;ladderStep()}
function ladderStep(){
  const ov=$('#wov');if(!ov||!WV)return;
  const c=WV.chars[WV.k],steps=LADDER.length+WV.extra;
  const st=WV.step<LADDER.length?LADDER[WV.step]:LADDER[LADDER.length-1];
  const dots=[...Array(steps)].map((_,i)=>{const s=i<LADDER.length?LADDER[i]:LADDER[LADDER.length-1];
    return `<span class="ld ${i<WV.step?'ok':i===WV.step?'now':''}" title="${esc(s.name)}">${s.k==='watch'?'👀':s.k==='memory'?'🧠':'✍'}</span>`}).join('');
  ov.innerHTML=`<div class="wov-in">${wHead(c)}
    <div class="ladder">${dots}</div>
    <div class="ltitle"><b>Шаг ${WV.step+1} из ${steps}: ${esc(st.name)}</b><span class="small muted" id="wmsg">${esc(st.tip)}</span></div>
    <div id="wact"></div>
  </div>`;
  wBind(c);
  requestAnimationFrame(()=>{
    const t=$('#wtarget');
    if(st.k==='watch'){
      WV.writer=makeWriter(t,c,{showCharacter:false});if(!WV.writer)return;
      const my=WV.writer,live=()=>WV&&WV.writer===my;   // ignore callbacks from a step already left
      let times=0;const play=()=>live()&&my.animateCharacter({onComplete:()=>{if(!live())return;times++;
        if(times<2)setTimeout(play,600);
        else{$('#wact').innerHTML=`<button class="btn" id="wgo">Понятно, дальше</button><button class="btn plain" id="wagain">Показать ещё раз</button>`;bindAct()}}});
      const bindAct=()=>{$('#wgo')?.addEventListener('click',()=>{WV.step++;ladderStep()});$('#wagain')?.addEventListener('click',()=>{times=1;$('#wact').innerHTML='';play()})};
      $('#wact').innerHTML=`<button class="btn ghost" id="wgo">Пропустить</button>`;$('#wgo').onclick=()=>{WV.step++;ladderStep()};
      play();
      return;
    }
    const memory=st.k==='memory';
    WV.writer=makeWriter(t,c,{showOutline:!memory,showCharacter:false});if(!WV.writer)return;
    const wr=WV.writer;
    let hinted=false;
    if(st.k==='guide') wr.highlightStroke(0);
    $('#wact').innerHTML=memory?`<button class="btn plain" id="whint">Подсмотреть контур</button>`:'';
    $('#whint')?.addEventListener('click',()=>{hinted=true;wr.showOutline();$('#whint').remove()});
    wr.quiz({showHintAfterMisses:st.k==='guide'?1:3,highlightOnComplete:true,
      onCorrectStroke:d=>{typeof haptic==='function'&&haptic();if(st.k==='guide'&&d.strokesRemaining>0)setTimeout(()=>WV&&WV.writer===wr&&wr.highlightStroke(d.strokeNum+1),250)},
      onMistake:d=>{if(st.k==='guide')wr.highlightStroke(d.strokeNum)},
      onComplete:s=>{
        if(!WV||WV.writer!==wr)return;
        const n=s.totalMistakes,ok=!memory||(n<=2&&!hinted);
        const last=WV.step>=steps-1;
        let msg;
        if(!memory) msg=n===0?'<b style="color:var(--known)">Отлично!</b>':`Готово, ошибок: ${n}.`;
        else if(ok) msg=`<b style="color:var(--known)">Верно по памяти!</b>${n?` Ошибок: ${n}.`:''}`;
        else {msg=`Ошибок: ${n}${hinted?', был контур':''}. Давай ещё раз по памяти.`; if(WV.extra<3)WV.extra++;}
        $('#wmsg').innerHTML=msg;
        if(WV.step>=LADDER.length+WV.extra-1&&ok){ladderDone(c);return}
        $('#wact').innerHTML=`<button class="btn" id="wgo">Дальше</button>`;
        $('#wgo').onclick=()=>{WV.step++;ladderStep()};
      }});
  });
}
function ladderDone(c){
  C.wr=C.wr||{};C.wr[c]=(C.wr[c]||0)+1;saveC();
  const next=WV.chars.findIndex((x,k)=>k>WV.k&&!(C.wr||{})[x]);
  $('.ladder').querySelectorAll('.ld').forEach(d=>{d.classList.remove('now');d.classList.add('ok')});
  $('#wact').innerHTML=`<p class="note" style="text-align:center"><span><b>${esc(c)}</b> прописан ${LADDER.length-1+WV.extra} раз, два последних по памяти. Завтра проверь себя ещё раз!</span></p>
    ${next>=0?`<button class="btn" id="wnext">Следующий иероглиф: ${esc(WV.chars[next])} →</button>`:''}
    <div class="row"><button class="btn ghost" id="wre">Пройти ещё раз</button><button class="btn ghost" id="wend">Закрыть</button></div>`;
  $('#wnext')?.addEventListener('click',()=>{WV.k=next;startLadder()});
  $('#wre').onclick=startLadder;$('#wend').onclick=closeWrite;
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
      $('#nx').innerHTML=`<div class="row"><button class="speak" id="ws">${ICON} ${esc(w[0])}</button></div>${ok?'':`<button class="btn ghost" id="wtrain" style="margin-top:8px">✍ Потренировать ${esc(c)} (6 шагов)</button>`}<button class="btn" id="nxt" style="margin-top:8px">${G.round>=9?'Итог':'Дальше'}</button>`;
      $('#ws').onclick=()=>say(w[0]);
      $('#wtrain')?.addEventListener('click',()=>writeView(c,{word:w[0],py:w[1],ru:w[2]},{ladder:c}));
      $('#nxt').onclick=()=>{G.round++;if(G.round>=10)return gameOver(G.score,`${G.score} из 10`);writeNext()};
    };
    wr.quiz({showHintAfterMisses:3,highlightOnComplete:true,
      onComplete:s=>{const ok=s.totalMistakes<=2&&!hinted;finish(ok,ok?`<b style="color:var(--known)">Верно!</b> Ошибок: ${s.totalMistakes}.`:`Готово, но с подсказками (ошибок: ${s.totalMistakes}). Это слово ещё повторим.`)}});
    $('#whint').onclick=()=>{hinted=true;wr.showOutline()};
    $('#wskip').onclick=()=>{wr.cancelQuiz();wr.showCharacter();wr.hideCharacter({duration:0});wr.animateCharacter();finish(false,'Смотри, как он пишется.')};
  });
}

