/* ---------- GAMES ---------- */
const LOOKALIKE=['买卖','人入八','大太天夫','日目白自百','本末未木术','午牛年','问间门们','今令会冷','休体','见贝现','喝渴','王主玉','子字学','明朋','说读','饭板','钱浅','千干于','几儿九','办为力','爸吧把','妈吗码','也他地她','很得行','东乐','多名岁','土士'];
const HOMO=(()=>{ // characters from your words that sound exactly the same (same syllable and tone)
  const m={};for(const [c,p] of Object.entries(CHARPY))(m[p]=m[p]||[]).push(c);
  return Object.entries(m).filter(([,v])=>v.length>1);
})();
// a puzzle = a word of yours with one character blanked; options = the confusable group
function gapItems(groups){
  const out=[];
  groups.forEach((g,gi)=>{
    const chars=typeof g==='string'?[...g]:g[1];
    WORDS.forEach((w,i)=>{const h=clean(w[0]);if(h.length<1||h.length>4||h==='他们')return;
      [...h].forEach((c,k)=>{if(chars.includes(c)) out.push({i,k,c,opts:chars,sound:typeof g==='string'?null:g[0]})})});
  });
  return out;
}
let G=null;
function poolIds(){
  const v=C.pool||'mine';
  let ids=WORDS.map((w,i)=>i);
  if(v==='mine'){const m=ids.filter(i=>C.cards[i]&&C.cards[i].iv<LEARNED_DAYS||(!C.cards[i]&&S.results[i]!==undefined));if(m.length>=12)ids=m}
  else if(v!=='all'){ids=ids.filter(i=>WORDS[i][3]===+v)}
  return ids;
}
const GAMES=[
  {id:'pairs',zh:'配对',name:'Пары на время',d:'Соедини иероглиф с переводом. Три поля по 6 пар.'},
  {id:'gap',zh:'填空',name:'Вставь слово',d:'Предложение с пропуском: выбери, какое слово туда подходит.'},
  {id:'tone',zh:'声调',name:'Угадай тон',d:'Слушаешь слог и выбираешь тон: 1, 2, 3 или 4.'},
  {id:'homo',zh:'同音',name:'Омофоны',d:`Звучат одинаково, пишутся по-разному. ${HOMO.length} групп из твоих слов: 是/事, 前/钱, 他/她…`},
  {id:'look',zh:'形近',name:'Не перепутай',d:'Похожие иероглифы: 买/卖, 大/太/天, 问/间/门…'},
  {id:'sprint',zh:'快速',name:'Спринт',d:'60 секунд: перевод верный или нет?'},
  {id:'write',zh:'书写',name:'Пропиши',d:'Напиши пропущенный иероглиф пальцем или мышкой.'},
];
function gamesHome(){
  cur='games';showTabs(true);
  const v=C.pool||'mine';
  app.innerHTML=`
    <div><div class="eyebrow">7 игр · ошибки возвращаются в карточки</div><h1 style="margin-top:6px">Игры</h1></div>
    <label class="panel toggle" for="pool"><span>Слова для игр<br><span class="small muted">${poolIds().length} сл. · кроме «Омофонов» и «Не перепутай»</span></span>
      <select id="pool" class="sel">
        <option value="mine" ${v==='mine'?'selected':''}>Которые учу</option>
        <option value="all" ${v==='all'?'selected':''}>Все слова</option>
        ${LESSONS.map(([n,t])=>`<option value="${n}" ${v==n?'selected':''}>Урок ${n} · ${esc(t)}</option>`).join('')}
      </select></label>
    <div class="ggrid">${GAMES.map(g=>`<button class="gcard" data-g="${g.id}"><span class="gzh">${g.zh}</span><b>${g.name}</b><span class="small muted">${esc(g.d)}</span>${C.best&&C.best[g.id]!=null?`<span class="pill">рекорд: ${C.best[g.id]}</span>`:''}</button>`).join('')}</div>
    <p class="small muted">Если ошибаешься в слове, которое уже есть в карточках, оно вернётся на повторение сегодня. Пары иероглифов, которые ты путаешь, будут попадаться в «Не перепутай» чаще.</p>`;
  $('#pool').onchange=e=>{C.pool=e.target.value;saveC();gamesHome()};
  app.querySelectorAll('.gcard').forEach(b=>b.onclick=()=>startGame(b.dataset.g));
}
function gTop(title,prog){return `<div class="top"><div class="grow"><div class="eyebrow">${title}</div><div class="prog"><i style="width:${prog*100}%"></i></div></div><button class="btn plain" id="quit" style="width:auto;padding:8px">Выйти</button></div>`}
function bindQuit(){$('#quit').onclick=()=>{G=null;clearInterval(gTimer);setTab('games')}}
function missed(i){ // a mistake brings the word back into today's cards
  if(i==null)return;G.wrong.add(i);
  const c=C.cards[i];if(c&&c.due>Date.now()){c.due=Date.now();saveC()}
}
function gameOver(score,label){
  clearInterval(gTimer);
  C.best=C.best||{};const prev=C.best[G.id];const better=prev==null||(G.id==='pairs'?score<prev:score>prev);
  if(better)C.best[G.id]=score;saveC();
  const wr=[...G.wrong];
  app.innerHTML=`
    <div><div class="eyebrow">${esc(GAMES.find(g=>g.id===G.id).name)}</div><h1 style="margin-top:6px">${label}</h1></div>
    ${better?`<p class="note">Новый рекорд!</p>`:`<p class="muted">Рекорд: ${prev}</p>`}
    ${wr.length?`<div class="panel"><h2 style="margin-bottom:10px">Ошибки</h2><div class="chips">${wr.map(i=>`<button class="chip" data-i="${i}" title="${esc(WORDS[i][1]+' — '+WORDS[i][2])}">${esc(WORDS[i][0])}</button>`).join('')}</div><p class="small muted" style="margin-top:10px">Слова из карточек вернутся на повторение сегодня. Нажми, чтобы послушать.</p></div>`:'<p class="muted">Без ошибок!</p>'}
    <button class="btn" id="again">Ещё раз</button>
    <button class="btn ghost" id="toG">Все игры</button>`;
  app.querySelectorAll('.chip').forEach(b=>b.onclick=()=>say(WORDS[+b.dataset.i][0]));
  $('#again').onclick=()=>startGame(G.id);$('#toG').onclick=()=>setTab('games');
}
let gTimer=0;
function startGame(id){
  clearInterval(gTimer);showTabs(false);
  G={id,round:0,score:0,wrong:new Set(),t0:Date.now()};
  ({pairs:pairsInit,gap:gapNext,tone:toneNext,homo:homoNext,look:lookNext,sprint:sprintInit,write:writeNext})[id]();
}
/* Pairs */
function pairsInit(){G.boards=3;G.board=0;G.miss=0;pairsBoard()}
function pairsBoard(){
  cur='game';
  if(G.board>=G.boards){const sec=Math.round((Date.now()-G.t0)/1000)+G.miss*3;return gameOver(sec,`${sec} сек. (ошибок: ${G.miss}, +3 сек. за каждую)`)}
  const ids=shuffle(poolIds()).filter((i,k,a)=>a.findIndex(j=>WORDS[j][2]===WORDS[i][2])===k).slice(0,6);
  const L=shuffle(ids),R=shuffle(ids);let sel=null,left=ids.length;
  app.innerHTML=`${gTop(`Пары · поле ${G.board+1} из ${G.boards}`,G.board/G.boards)}
    <div class="pairs"><div class="pcol">${L.map(i=>`<button class="pt hzp" data-i="${i}" data-s="l">${esc(WORDS[i][0])}</button>`).join('')}</div>
    <div class="pcol">${R.map(i=>`<button class="pt" data-i="${i}" data-s="r">${esc(WORDS[i][2])}</button>`).join('')}</div></div>
    <p class="small muted" style="text-align:center" id="clock">0 сек.</p>`;
  bindQuit();
  gTimer=setInterval(()=>{const c=$('#clock');if(c)c.textContent=Math.round((Date.now()-G.t0)/1000)+' сек.'},500);
  app.querySelectorAll('.pt').forEach(b=>b.onclick=()=>{
    if(b.classList.contains('ok'))return;
    if(b.dataset.s==='l')say(WORDS[+b.dataset.i][0]);
    if(!sel||sel.dataset.s===b.dataset.s){if(sel)sel.classList.remove('sel');sel=b;b.classList.add('sel');return}
    if(sel.dataset.i===b.dataset.i){[sel,b].forEach(x=>{x.classList.remove('sel');x.classList.add('ok');x.disabled=true});sel=null;
      if(--left===0){clearInterval(gTimer);G.board++;setTimeout(pairsBoard,400)}}
    else{G.miss++;missed(+(sel.dataset.s==='l'?sel.dataset.i:b.dataset.i));const a=sel;[a,b].forEach(x=>x.classList.add('bad'));setTimeout(()=>[a,b].forEach(x=>x.classList.remove('bad','sel')),450);sel=null}
  });
}
/* shared multiple-choice round */
function mcRound({title,body,opts,correct,hz,after,i}){
  cur='game';
  app.innerHTML=`${gTop(`${title} · ${G.round+1} из 10 · очки ${G.score}`,G.round/10)}
    <div class="card">${body}<div id="rev"></div></div>
    <div class="opts ${hz?'grid2':''}">${opts.map((o,k)=>`<button class="opt ${hz?'hzopt':''}" data-k="${k}">${esc(o)}</button>`).join('')}</div>
    <div id="nx"></div>`;
  bindQuit();
  app.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>say(b.dataset.play));
  app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    const k=+b.dataset.k,ok=k===correct;
    app.querySelectorAll('.opt').forEach(x=>{x.disabled=true;if(+x.dataset.k===correct)x.classList.add('right');else if(+x.dataset.k===k)x.classList.add('wrong')});
    if(ok)G.score++;else missed(i);
    if(!ok&&G.onWrong)G.onWrong(opts[k],opts[correct]);
    $('#rev').innerHTML=after;
    app.querySelectorAll('#rev [data-play]').forEach(b=>b.onclick=()=>say(b.dataset.play));
    $('#nx').innerHTML=`<button class="btn" id="nxt">${G.round>=9?'Итог':'Дальше'}</button>`;
    $('#nxt').onclick=()=>{G.round++;if(G.round>=10)return gameOver(G.score,`${G.score} из 10`);G.next()};
  });
}
const spk=(t,label)=>`<button class="speak sm" data-play="${esc(t)}">${ICON}${label?' '+label:''}</button>`;
/* Gap fill */
function gapNext(){
  G.next=gapNext;
  const pool=poolIds().filter(i=>WORDS[i][5]&&WORDS[i][5].includes('＿'));
  const i=pool[Math.random()*pool.length|0],w=WORDS[i];
  const len=clean(w[0]).length;
  const others=shuffle(WORDS.map((x,j)=>j).filter(j=>j!==i&&WORDS[j][0]!==w[0]&&!w[4].includes(clean(WORDS[j][0]))))
    .sort((a,b)=>(Math.abs(clean(WORDS[a][0]).length-len)+(WORDS[a][3]===w[3]?0:.5))-(Math.abs(clean(WORDS[b][0]).length-len)+(WORDS[b][3]===w[3]?0:.5))).slice(0,3);
  const opts=shuffle([i,...others]);
  mcRound({title:'Вставь слово',i,hz:true,opts:opts.map(j=>WORDS[j][0]),correct:opts.indexOf(i),
    body:`<div class="szh">${esc(w[5])}</div><div class="sru">${esc(w[7])}</div>`,
    after:`<div class="szh" style="margin-top:8px">${esc(w[4])}</div><div class="spy">${esc(w[6])}</div>${spk(w[4],'предложение')}`});
}
/* Tones */
const TM={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};
function untone(s){let t=0,b='';for(const ch of s){let f=false;for(const [v,m] of Object.entries(TM)){const k=m.indexOf(ch);if(k>=0){b+=v;t=k+1;f=true;break}}if(!f)b+=ch}return [b,t]}
function retone(b,t){const v=b.includes('a')?'a':b.includes('e')?'e':b.includes('ou')?'o':[...b].reverse().find(c=>'iouü'.includes(c));if(!v)return b;const k=b.lastIndexOf(v);return b.slice(0,k)+TM[v][t-1]+b.slice(k+1)}
const TONE_ITEMS=WORDS.map((w,i)=>[w,i]).filter(([w])=>clean(w[0]).length===1&&/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+r?$/i.test(w[1])&&untone(w[1].toLowerCase())[1]>0).map(([,i])=>i);
function toneNext(){
  G.next=toneNext;
  const i=TONE_ITEMS[Math.random()*TONE_ITEMS.length|0],w=WORDS[i];
  const [b,t]=untone(w[1].toLowerCase());
  mcRound({title:'Угадай тон',i,opts:[1,2,3,4].map(k=>`${k} · ${retone(b,k)}`),correct:t-1,
    body:`<div class="hz">${esc(w[0])}</div><div class="py">${esc(b)} · ?</div>${spk(w[0],'слушать')}<span class="small muted">${canSpeak()?'Послушай и выбери тон':'Без звука: вспомни тон по иероглифу'}</span>`,
    after:`<div class="py" style="margin-top:6px">${esc(w[1])}</div><div>${esc(w[2])}</div>`});
}
/* Homophones & lookalikes share one round type */
function blankRound(title,items,soundHint){
  // personal traps first: pairs you have confused before
  const conf=C.conf||{};
  const weighted=items.map(x=>[x,1+(x.opts.reduce((s,o)=>s+(conf[[x.c,o].sort().join('')]||0),0))*3]);
  let r=Math.random()*weighted.reduce((s,[,w])=>s+w,0),it=items[0];
  for(const [x,w] of weighted){r-=w;if(r<=0){it=x;break}}
  const w=WORDS[it.i],h=clean(w[0]);
  const shown=h.slice(0,it.k)+'＿'+h.slice(it.k+1);
  const opts=shuffle(it.opts);
  G.onWrong=(a,b)=>{C.conf=C.conf||{};const key=[a,b].sort().join('');C.conf[key]=(C.conf[key]||0)+1;saveC()};
  mcRound({title,i:it.i,hz:true,opts,correct:opts.indexOf(it.c),
    body:`<div class="hz ${shown.length>3?'long':''}">${esc(shown)}</div><div class="py">${esc(w[1])}</div><div>${esc(w[2])}</div>${soundHint&&it.sound?`<span class="small muted">все варианты читаются как <b>${esc(it.sound)}</b></span>`:''}`,
    after:`<div class="hz mid" style="margin-top:6px">${esc(w[0])}</div>${spk(w[0])}
      <div class="cmeans">${opts.map(c=>`<div class="cm ${c===it.c?'ok':''}"><span class="cz">${esc(c)}</span><span class="cp">${esc(CHARPY[c]||'')}</span><span class="cr">${esc(charMeaning(c))}</span>${spk(c)}</div>`).join('')}</div>`});
}
function charMeaning(c){const w=WORDS.find(x=>x[0]===c);return CHARRU[c]||(w?w[2]:'')}
const HOMO_ITEMS=gapItems(HOMO), LOOK_ITEMS=gapItems(LOOKALIKE);
function homoNext(){G.next=homoNext;blankRound('Омофоны',HOMO_ITEMS,true)}
function lookNext(){G.next=lookNext;blankRound('Не перепутай',LOOK_ITEMS,false)}
/* Sprint */
function sprintInit(){G.end=Date.now()+60000;G.n=0;sprintNext();
  gTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((G.end-Date.now())/1000));const c=$('#clock');if(c)c.textContent=left+' сек.';
    const p=$('.prog i');if(p)p.style.width=(100-left/60*100)+'%';
    if(left<=0){clearInterval(gTimer);gameOver(G.score,`${G.score} верных из ${G.n}`)}},250)}
function sprintNext(){
  cur='game';
  const pool=poolIds(),i=pool[Math.random()*pool.length|0];
  const truth=Math.random()<.5;
  let j=i;if(!truth){const alt=pool.filter(x=>x!==i&&WORDS[x][2]!==WORDS[i][2]);j=alt[Math.random()*alt.length|0]??i}
  app.innerHTML=`${gTop('Спринт · очки '+G.score,0)}
    <div class="card"><div class="hz ${clean(WORDS[i][0]).length>3?'long':''}">${esc(WORDS[i][0])}</div><div class="tr">${esc(WORDS[j][2])}</div><p class="small muted" id="clock">60 сек.</p></div>
    <div class="grades" style="grid-template-columns:1fr 1fr"><button class="grade g0" data-a="0">Неверно</button><button class="grade g2" data-a="1">Верно</button></div>`;
  bindQuit();
  app.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
    const ok=(b.dataset.a==='1')===(i===j);G.n++;
    if(ok)G.score++;else missed(i);
    const card=$('.card');card.classList.add(ok?'flash-ok':'flash-bad');
    setTimeout(()=>{if(cur==='game'&&G&&G.id==='sprint'&&Date.now()<G.end)sprintNext()},ok?250:700);
  });
}

