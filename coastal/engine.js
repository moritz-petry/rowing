export const outbound=[{x:250,y:520},{x:350,y:370},{x:250,y:220}];
export const buoys=[{x:300,y:520},{x:300,y:370},{x:300,y:220}];
export const turn=[{x:235,y:110},{x:254,y:64},{x:300,y:45},{x:346,y:64},{x:365,y:110},{x:365,y:160}];
export const inbound=[{x:390,y:650}];
export const obstacles=[{x:180,y:785,r:20},{x:245,y:730,r:22},{x:340,y:780,r:20},{x:395,y:710,r:22}];
export function create(){return {phase:0,x:180,y:855,a:0,speed:0,time:0,index:0,holding:false,held:0,recovery:0,progress:0,target:.7,strokes:0,combo:0,hits:0,cooldown:0,jump:0,wave:0,nextWave:12,penalty:0,buoyHits:0,contacts:[],waveIndex:0,waveHandled:false,waveDirection:1,message:'Mit den Pfeiltasten zum Boot laufen. W springt über Treibholz.',done:false};}
export function waypoint(s){return (s.phase===1?outbound:s.phase===2?turn:s.phase===3?inbound:[])[s.index];}
export function release(s){if(!s.holding)return;s.holding=false;if(s.phase===0||s.phase===4)return;const quality=Math.exp(-Math.pow((s.held-s.target*.82)/.18,2));s.combo=quality>.65?s.combo+1:0;s.speed=Math.min(75,s.speed+9+quality*(27+Math.min(s.combo,6)*3));s.recovery=.65;s.message=quality>.65?'Sauberer Schlag. Nächstes Tor ansteuern.':'Im Goldfenster loslassen für mehr Tempo.';}
export function update(s,dt,c){if(s.done)return;s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.jump=Math.max(0,s.jump-dt);const running=s.phase===0||s.phase===4,drive=c.drive||c.left||c.right,side=(c.left?1:0)-(c.right?1:0);
if(c.action){if(running&&s.jump<=0){s.jump=.85;s.speed=Math.max(45,s.speed);}else if(!running&&s.wave>0&&!s.waveHandled){s.waveHandled=true;s.message='Welle abgefangen – Kurs weiter korrigieren.';}}
if(drive&&!s.holding){s.holding=true;s.held=0;s.target=.58+.25*(.5+.5*Math.sin(++s.strokes*2.13));}if(!drive&&s.holding)release(s);
if(s.holding){s.held+=dt;s.progress=Math.min(1,s.held/.82);}else{s.recovery=Math.max(0,s.recovery-dt);s.progress=s.recovery/.65;}
if(running){const moveY=c.up?-1:c.down?1:c.drive?(s.phase===0?-1:1):0;s.x=Math.max(115,Math.min(485,s.x-side*65*dt));s.speed+=(moveY?100:0)*dt;s.speed*=Math.exp(-1.7*dt);s.speed=Math.min(65,s.speed);s.y+=moveY*s.speed*dt;
if(s.jump<=0)for(const o of obstacles){const dx=s.x-o.x,dy=s.y-o.y,d=Math.hypot(dx,dy),r=o.r+11;if(d<r){const nx=d?dx/d:0,ny=d?dy/d:1;s.x=o.x+nx*r;s.y=o.y+ny*r;s.speed=0;if(s.cooldown<=0){s.hits++;s.cooldown=.8;}s.message='Treibholz blockiert den Weg. Mit W überspringen oder seitlich umgehen.';}}
if(s.phase===0&&s.y<=655){s.phase=1;s.x=210;s.y=645;s.a=0;s.speed=20;s.holding=false;s.nextWave=s.time+2.5;s.message='Im Boot: Goldfenster treffen und die goldenen Tore durchfahren.';}
if(s.phase===4&&s.y>=855){s.done=true;s.speed=0;s.message='Im Ziel!';}return;}
if(s.holding&&side){s.a+=side*(s.phase===2?2.5:1.8)*dt;s.speed*=Math.exp(-.85*dt);}
s.speed*=Math.exp(-.32*dt);s.x+=Math.sin(s.a)*s.speed*dt;s.y-=Math.cos(s.a)*s.speed*dt;
if(s.x<85||s.x>515||s.y<15||s.y>680){s.x=Math.max(85,Math.min(515,s.x));s.y=Math.max(15,Math.min(680,s.y));s.speed*=.8;}
if(s.time>=s.nextWave&&!s.wave){s.wave=1.3;s.nextWave=s.time+4;s.waveHandled=false;s.waveDirection=++s.waveIndex%2?1:-1;s.a+=s.waveDirection*.16;s.message='Querwelle! W abfangen und den Kurs korrigieren.';}
if(s.wave){s.x+=s.waveDirection*(s.waveHandled?5:18)*dt;s.a+=s.waveDirection*(s.waveHandled?.03:.14)*dt;s.wave=Math.max(0,s.wave-dt);if(!s.wave){s.speed*=s.waveHandled?.93:.75;s.message=s.waveHandled?'Welle abgefangen. Weiter auf Kurs bleiben.':'Welle hat das Boot versetzt – gegensteuern.';}}
// Resolve the hull capsule against every solid buoy, including the turning buoy.
const solids=[...buoys.map(p=>({...p,r:14})),{x:300,y:110,r:20}];
solids.forEach((p,i)=>{const fx=Math.sin(s.a),fy=-Math.cos(s.a),vx=p.x-s.x,vy=p.y-s.y,t=Math.max(-12,Math.min(22,vx*fx+vy*fy)),cx=s.x+fx*t,cy=s.y+fy*t,dx=cx-p.x,dy=cy-p.y,d=Math.hypot(dx,dy),r=p.r+11;
 if(d<r){const nx=d?dx/d:1,ny=d?dy/d:0;s.x+=nx*(r-d+.1);s.y+=ny*(r-d+.1);s.speed*=.22;if(!s.contacts.includes(i)){s.contacts.push(i);s.hits++;s.buoyHits++;s.penalty+=3;s.combo=0;s.message='Boje getroffen: +3 Sekunden. Boot abgebremst – freirudern.';}}
 else if(d>r+10)s.contacts=s.contacts.filter(id=>id!==i);
});
const target=waypoint(s);if(target&&Math.hypot(s.x-target.x,s.y-target.y)<32){s.index++;s.message=s.phase===2?'Weiter um die Wendeboje – eine halbe Runde.':'Tor geschafft! Nächstes goldenes Tor ansteuern.';const count=s.phase===1?outbound.length:s.phase===2?turn.length:inbound.length;if(s.index>=count){s.phase++;s.index=0;if(s.phase===4){s.x=340;s.y=665;s.speed=25;s.holding=false;s.message='An Land! Noch einmal laufen bis zur Ziellinie.';}else if(s.phase===2)s.message='180°-Wende: links stärker halten und um die grosse Boje rudern.';else s.message='Direkt zum Strand zurückrudern – ohne Slalom.';}}

}

export const COASTAL_VERSION="coastal-sprint-v2";
export function replayCoastal(events){if(!Array.isArray(events)||events.length<2||events.length>6000)throw Error("Invalid replay");let last=-1;for(const e of events){if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||e[0]<0||e[0]<=last||e[0]>30000||!Number.isInteger(e[1])||e[1]<0||e[1]>63)throw Error("Invalid input");last=e[0];}const s=create();let at=0,mask=0;for(let step=0;step<30000;step++){if(at<events.length&&events[at][0]===step)mask=events[at++][1];update(s,.02,{drive:!!(mask&1),left:!!(mask&2),right:!!(mask&4),up:!!(mask&8),down:!!(mask&16),action:!!(mask&32)});mask&=31;if(s.done){if(at!==events.length)throw Error("Trailing input");return {finish:Math.round((s.time+s.penalty)*1000),elapsed:Math.round(s.time*1000),penalty:Math.round(s.penalty*1000)};}}throw Error("Unfinished race");}
