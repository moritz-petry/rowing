import {createRace, input, advance, STEP, VERSION} from './engine.js';
import {CONFIG} from './config.js';
import {drawRace} from './render.js';
const root=document.getElementById('scull-pov'),q=s=>root.querySelector(s);
const canvas=q('canvas'),pull=q('.pull'),feedback=q('.feedback');
let race=createRace(123),started=false,ranked=false,credentials=null,events=[],last=0,budget=0;
let pointerSteer=0,keys={a:false,d:false},token='',widgetId=null,busy=false,page=0;
let runGeneration=0,pendingCheck=null;
function failCheck(message){if(pendingCheck){clearTimeout(pendingCheck.timer);const pending=pendingCheck;pendingCheck=null;pending.reject(Error(message));}}
function verifyInvisible(){return new Promise((resolve,reject)=>{
  if(widgetId===null||!window.turnstile){reject(Error('Bot-Prüfung wird noch geladen.'));return;}
  failCheck('Prüfung neu gestartet.');window.turnstile.reset(widgetId);
  const timer=setTimeout(()=>{failCheck('Bot-Prüfung dauert zu lange. Bitte erneut starten.');window.turnstile?.reset(widgetId);},25000);
  pendingCheck={resolve,reject,timer};window.turnstile.execute(widgetId);
});}
const issue=text=>{feedback.textContent=text;};
const editable=e=>e.target.closest?.('input,textarea,select,[contenteditable=true]');
async function api(body){
  const response=await fetch(CONFIG.api,{method:'POST',headers:{'Content-Type':'application/json',apikey:CONFIG.publishableKey},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Rangliste nicht erreichbar.');return data;
}
function action(type){
  if(!started||race.finish!==null)return;if(!events.length&&type!=='down')return;
  if(events.length>=4000){started=false;issue('Zu viele Eingaben. Bitte ein neues Rennen starten.');return;}
  // Apply and record at the same deterministic simulation step.
  events.push([race.step,type]);input(race,type);
}
function syncSteer(){const value=keys.a||keys.d?(keys.a?1:0)-(keys.d?1:0):pointerSteer;
  if(value!==race.steer)action(value===1?'left':value===-1?'right':'neutral');}
function down(){if(!started||race.holding||race.finish!==null)return;if(!events.length){last=performance.now();budget=0;}action('down');syncSteer();}
function up(){if(race.holding)action('up');}
function reset(){failCheck('Rennstart abgebrochen.');runGeneration++;started=false;ranked=false;credentials=null;race=createRace(123);events=[];keys={a:false,d:false};pointerSteer=0;budget=0;
  q('.save').disabled=true;pull.disabled=true;q('.mode-status').textContent='Kein Rennen gestartet';issue('Üben oder Ranglistenrennen wählen.');render();}
async function begin(isRanked){
  if(busy)return;
  if(isRanked&&(!CONFIG.turnstileSiteKey||widgetId===null)){issue('Bot-Prüfung wird noch geladen. Bitte kurz warten.');return;}
  reset();const generation=runGeneration;busy=true;setButtons();
  try{
    let session=null;
    if(isRanked){issue('Ranglistenrennen wird vorbereitet …');const checkedToken=await verifyInvisible();if(generation!==runGeneration)return;session=await api({action:'start',token:checkedToken});}
    if(generation!==runGeneration)return;
    if(session&&session.version!==VERSION)throw Error('Spielversion veraltet. Bitte Seite neu laden.');
    credentials=session;ranked=isRanked;race=createRace(session?session.seed:123);
    started=true;budget=0;last=performance.now();pull.disabled=false;
    q('.mode-status').textContent=isRanked?'Ranglistenrennen · Eingaben werden zur Prüfung aufgezeichnet':'Übungsrennen · keine Veröffentlichung';
    issue('Los! Leertaste oder Ruderbutton halten.');
  }catch(e){if(generation===runGeneration)issue(e.message||'Rennstart fehlgeschlagen.');}
  finally{busy=false;if(isRanked){token='';if(widgetId!==null)window.turnstile?.reset(widgetId);}setButtons();}
}
function setButtons(){q('.ranked-start').disabled=busy||widgetId===null||!CONFIG.turnstileSiteKey;q('.practice-start').disabled=busy;}
function render(){
  const now=race.step*STEP;
  q('.distance').textContent=Math.ceil(200-race.dist)+' m';q('.time').textContent=(now/1000).toFixed(1)+' s';q('.speed').textContent=(race.speed*3.6).toFixed(1);
  q('.combo').textContent='Saubere Serie: '+race.combo;
  q('.quality').textContent=race.driveQuality===undefined?'Einsatz — · Durchzug —':'Einsatz '+Math.round(race.catchQuality*100)+' % · Durchzug '+Math.round(race.driveQuality*100)+' %';
  let center=race.recovery?race.recoveryCenter:race.driveCenter;
  q('.zone').style.left=(center*100-5)+'%';q('.zone').style.width='10%';
  const marker=race.holding?race.progress:race.recovery?(now-race.recoveryAt)/1400:0;
  q('.fill').style.left=Math.min(99,marker*100)+'%';
  q('.meter-label').textContent=race.recovery?'Vorrollen · nicht halten':'Durchzug · halten';
  q('.meter-target').textContent=race.recovery?'Goldfenster: wieder einsetzen':'Goldfenster: loslassen';
  q('.phase').textContent=race.finish!==null?'IM ZIEL':race.holding?'DURCHZUG · BEIDE SKULLS':race.recovery?'VORROLLEN · BLÄTTER FLACH':'BEREIT AM EINSATZ';
  pull.textContent=race.holding?'Ziehen … dann loslassen':race.recovery?'Einsatz vorbereiten':'Halten & ziehen';
  q('.course-dot').style.left=(50+Math.max(-1,Math.min(1,race.lateral))*44)+'%';
  q('.course-value').textContent=(Math.abs(race.lateral)<.12?'Mitte':race.lateral>0?'Rechts versetzt':'Links versetzt')+' · '+race.hits+' Kontakte';
  q('.over-left').setAttribute('aria-pressed',String(race.steer===1));q('.over-right').setAttribute('aria-pressed',String(race.steer===-1));
  const waveAge=race.wave?now-race.wave.born:0;
  q('.wave').classList.toggle('wave-ready',!!race.wave&&!race.wave.handled&&waveAge>=100&&waveAge<=700);
  let status='Kurs gerade';
  if(Math.abs(race.lateral)>.12||Math.abs(race.yaw)>.1){const side=Math.abs(race.lateral)>.12?race.lateral:race.yaw;status=(Math.abs(race.lateral)>.8?'BOJENWARNUNG! ':'Korrigieren: ')+(side>0?'A · Links stärker':'D · Rechts stärker');}
  else if(race.steer)status='Kurs gerade – Korrektur wieder ausschalten.';
  if(race.wave)status+=' · '+(race.wave.handled?'Welle abgefangen':waveAge>=100&&waveAge<=700?'WELLE · JETZT W!':'Welle passiert');
  if(q('.event-status').textContent!==status)q('.event-status').textContent=status;
  drawRace(canvas,race);
}
let seenMessage='';
function tick(now){
  if(started&&events.length&&race.finish===null){budget+=now-last;
    // Never drop simulated time; the same engine is replayed on the server.
    let iterations=0;while(budget>=STEP&&iterations++<500){advance(race);budget-=STEP;if(race.finish!==null)break;}
    if(race.message!==seenMessage){seenMessage=race.message;issue(seenMessage);}
    if(race.step>=60000&&race.finish===null){started=false;pull.disabled=true;issue('Rennen nach zehn Minuten beendet. Bitte neu starten.');}
    if(race.finish!==null){pull.disabled=true;q('.save').disabled=!ranked;issue('Im Ziel: '+(race.finish/1000).toFixed(2)+' s. '+(ranked?'Spitznamen eingeben und Ergebnis prüfen lassen.':'Übungszeit – starte ein Ranglistenrennen für eine Veröffentlichung.'));}
  }
  last=now;render();requestAnimationFrame(tick);
}
pull.addEventListener('pointerdown',e=>{e.preventDefault();pull.setPointerCapture(e.pointerId);down();});
pull.addEventListener('pointerup',up);pull.addEventListener('pointercancel',up);
for(const [selector,value] of [['.over-left',1],['.over-right',-1]])q(selector).addEventListener('click',()=>{pointerSteer=pointerSteer===value?0:value;syncSteer();});
q('.wave').addEventListener('click',()=>action('wave'));
document.addEventListener('keydown',e=>{if(editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(!['Space','KeyA','KeyD','KeyW'].includes(e.code))return;e.preventDefault();if(e.repeat)return;
  if(e.code==='Space')down();if(e.code==='KeyW')action('wave');
  if(e.code==='KeyA'||e.code==='KeyD'){keys[e.code==='KeyA'?'a':'d']=true;pointerSteer=0;syncSteer();}
});
document.addEventListener('keyup',e=>{if(editable(e))return;if(e.code==='Space'){e.preventDefault();up();}if(e.code==='KeyA'||e.code==='KeyD'){keys[e.code==='KeyA'?'a':'d']=false;syncSteer();}});
window.addEventListener('blur',()=>{up();keys.a=keys.d=false;pointerSteer=0;syncSteer();});
q('.restart').addEventListener('click',reset);q('.practice-start').addEventListener('click',()=>begin(false));q('.ranked-start').addEventListener('click',()=>begin(true));
async function leaderboard(){q('.board-status').textContent='Rangliste wird geladen …';
  try{const data=await api({action:'leaderboard',page});const tb=q('tbody');tb.replaceChildren();
    data.rows.forEach((row,i)=>{const tr=document.createElement('tr');for(const value of [page*25+i+1,row.nickname,(row.time_ms/1000).toFixed(2)+' s']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}tb.append(tr);});
    q('.board-status').textContent=data.rows.length?'Geprüfte Rennen · Seite '+(page+1):'Noch keine Ergebnisse auf dieser Seite.';
    q('.previous').disabled=page===0;q('.next-page').disabled=!data.more;
  }catch{q('.board-status').textContent='Die Online-Rangliste ist noch nicht eingerichtet oder momentan nicht erreichbar.';}
}
q('.refresh').addEventListener('click',leaderboard);q('.previous').addEventListener('click',()=>{page=Math.max(0,page-1);leaderboard();});q('.next-page').addEventListener('click',()=>{page++;leaderboard();});
q('.save').addEventListener('click',async()=>{
  if(!ranked||race.finish===null||!credentials||busy)return;
  const name=q('.nickname').value.normalize('NFKC').trim();if(!/^[\p{L}\p{N} _.-]{1,16}$/u.test(name)){issue('Spitzname: 1–16 Buchstaben oder Zahlen; Punkt, _ und - sind erlaubt.');return;}
  busy=true;q('.save').disabled=true;const generation=runGeneration,submission={...credentials,events:events.map(e=>[...e])};
  try{const data=await api({action:'finish',id:submission.id,nonce:submission.nonce,events:submission.events,nickname:name});
    if(generation!==runGeneration)return;issue('Gespeichert! Bestätigte Zeit: '+(data.time_ms/1000).toFixed(2)+' s.');credentials=null;page=0;await leaderboard();
  }catch(e){if(generation===runGeneration){issue(e.message||'Speichern fehlgeschlagen.');q('.save').disabled=false;}}
  finally{busy=false;setButtons();}
});
if(CONFIG.turnstileSiteKey){
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
  script.onload=()=>{try{widgetId=window.turnstile.render(q('.captcha'),{
    sitekey:CONFIG.turnstileSiteKey,action:'scull-start',execution:'execute',retry:'never',
    callback:t=>{if(pendingCheck){const pending=pendingCheck;pendingCheck=null;clearTimeout(pending.timer);pending.resolve(t);}},
    'expired-callback':()=>failCheck('Prüfung abgelaufen. Bitte neu starten.'),
    'error-callback':()=>{failCheck('Bot-Prüfung fehlgeschlagen. Bitte erneut starten.');return true;}
  });setButtons();}catch{issue('Bot-Prüfung konnte nicht eingerichtet werden.');}};
  script.onerror=()=>issue('Bot-Prüfung konnte nicht geladen werden. Übungsmodus bleibt verfügbar.');document.head.append(script);
}else q('.captcha-status').textContent='Ranglistenrennen noch gesperrt: Turnstile-Site-Key fehlt. Üben ist bereits möglich.';
new ResizeObserver(()=>drawRace(canvas,race)).observe(canvas);
reset();leaderboard();requestAnimationFrame(tick);
