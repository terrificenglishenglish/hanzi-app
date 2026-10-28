/* ---------- PLATFORM: Telegram, cloud sync, recorded audio ---------- */
const tg=(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData)?Telegram.WebApp:null;
if(tg){
  try{tg.ready();tg.expand();if(tg.disableVerticalSwipes)tg.disableVerticalSwipes()}catch(e){}
  const applyTheme=()=>{document.documentElement.dataset.theme=tg.colorScheme==='dark'?'dark':'light';
    try{const bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();tg.setHeaderColor(bg);tg.setBackgroundColor(bg);tg.setBottomBarColor&&tg.setBottomBarColor(bg)}catch(e){}};
  applyTheme();tg.onEvent('themeChanged',applyTheme);
}
const haptic=t=>{try{tg&&tg.HapticFeedback&&(t==='ok'?tg.HapticFeedback.notificationOccurred('success'):t==='bad'?tg.HapticFeedback.notificationOccurred('error'):tg.HapticFeedback.impactOccurred('light'))}catch(e){}};

// Progress lives in this browser and, inside Telegram, in Telegram's cloud storage,
// so it follows you between phone and computer.
const CS=tg&&tg.CloudStorage&&tg.isVersionAtLeast&&tg.isVersionAtLeast('6.9')?tg.CloudStorage:null;
const CHUNK=3800;
const Store={
  get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},
  stamp(k){try{return +localStorage.getItem(k+'@t')||0}catch(e){return 0}},
  set(k,v){const t=Date.now();try{localStorage.setItem(k,JSON.stringify(v));localStorage.setItem(k+'@t',String(t))}catch(e){}
    if(CS){Cloud.pending[k]={t,v};clearTimeout(Cloud.timer);Cloud.timer=setTimeout(Cloud.flush,1500)}}
};
const Cloud={pending:{},timer:0,
  flush(){
    for(const [k,{t,v}] of Object.entries(Cloud.pending)){
      const s=JSON.stringify({t,v}),n=Math.ceil(s.length/CHUNK);
      for(let i=0;i<n;i++)CS.setItem(k+'_'+i,s.slice(i*CHUNK,(i+1)*CHUNK),()=>{});
      CS.setItem(k+'_n',String(n),()=>{});
    }
    Cloud.pending={};
  },
  pull(keys,done){
    if(!CS)return done({});
    CS.getItems(keys.map(k=>k+'_n'),(err,ns)=>{
      if(err||!ns)return done({});
      const want=[];keys.forEach(k=>{const n=+ns[k+'_n']||0;for(let i=0;i<n;i++)want.push(k+'_'+i)});
      if(!want.length)return done({});
      CS.getItems(want,(e2,parts)=>{
        if(e2||!parts)return done({});
        const out={};
        keys.forEach(k=>{const n=+ns[k+'_n']||0;if(!n)return;let s='';for(let i=0;i<n;i++)s+=parts[k+'_'+i]||'';
          try{out[k]=JSON.parse(s)}catch(e){}});
        done(out);
      });
    });
  }
};
// after start: if another device saved newer progress, take it
setTimeout(()=>Cloud.pull(['hz-placement','hz-srs','hz-reader'],res=>{
  let newer=false;
  for(const [k,{t,v}] of Object.entries(res)){if(t>Store.stamp(k)){try{localStorage.setItem(k,JSON.stringify(v));localStorage.setItem(k+'@t',String(t))}catch(e){}newer=true}}
  if(newer)location.reload();
}),300);

