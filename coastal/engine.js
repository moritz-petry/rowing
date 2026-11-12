export const outbound=[{x:210,y:520},{x:330,y:400},{x:210,y:280},{x:235,y:160}];
export const turn=[{x:235,y:110},{x:254,y:64},{x:300,y:45},{x:346,y:64},{x:365,y:110},{x:365,y:160}];
export const inbound=[{x:390,y:280},{x:270,y:400},{x:390,y:520},{x:340,y:650}];
export const obstacles=[{x:180,y:785,r:20},{x:245,y:730,r:22},{x:340,y:780,r:20},{x:395,y:710,r:22}];
export function create(){return {phase:0,x:180,y:855,a:0,speed:0,time:0,index:0,holding:false,held:0,recovery:0,progress:0,target:.7,strokes:0,combo:0,hits:0,cooldown:0,jump:0,wave:0,nextWave:12,message:'Halte Laufen und weiche dem Treibholz aus.',done:false};}
export function waypoint(s){return (s.phase===1?outbound:s.phase===2?turn:s.phase===3?inbound:[])[s.index];}
export function release(s){if(!s.holding)return;s.holding=false;if(s.phase===0||s.phase===4)return;const quality=Math.exp(-Math.pow((s.held-s.target*.82)/.18,2));s.combo=quality>.65?s.combo+1:0;s.speed=Math.min(75,s.speed+9+quality*(27+Math.min(s.combo,6)*3));s.recovery=.65;s.message=quality>.65?'Sauberer Schlag. Nächstes Tor ansteuern.':'Im Goldfenster loslassen für mehr Tempo.';}
export function update(s,dt,c){if(s.done)return;s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.jump=Math.max(0,s.jump-dt);const running=s.phase===0||s.phase===4,drive=c.drive||c.left||c.right,side=(c.left?1:0)-(c.right?1:0);
if(c.action){if(running)s.jump=.85;else if(s.wave>0){s.wave=0;s.message='Welle abgefangen.';}}
if(drive&&!s.holding){s.holding=true;s.held=0;s.target=.58+.25*(.5+.5*Math.sin(++s.strokes*2.13));}if(!drive&&s.holding)release(s);
if(s.holding){s.held+=dt;s.progress=Math.min(1,s.held/.82);}else{s.recovery=Math.max(0,s.recovery-dt);s.progress=s.recovery/.65;}
if(running){s.x=Math.max(115,Math.min(485,s.x-side*125*dt));s.speed+=(drive?100:0)*dt;s.speed*=Math.exp(-1.7*dt);s.speed=Math.min(65,s.speed);s.y+=(s.phase===0?-1:1)*s.speed*dt;
for(const o of obstacles)if(Math.hypot(s.x-o.x,s.y-o.y)<o.r+10&&s.jump<=0&&s.cooldown<=0){s.speed*=.25;s.cooldown=1.2;s.hits++;s.message='Treibholz! Seitlich ausweichen oder mit W springen.';}
if(s.phase===0&&s.y<=655){s.phase=1;s.x=210;s.y=645;s.a=0;s.speed=20;s.holding=false;s.message='Im Boot: Goldfenster treffen und die goldenen Tore durchfahren.';}
if(s.phase===4&&s.y>=855){s.done=true;s.speed=0;s.message='Im Ziel!';}return;}
if(s.holding&&side){s.a+=side*(s.phase===2?2.5:1.8)*dt;s.speed*=Math.exp(-.85*dt);}
s.speed*=Math.exp(-.32*dt);s.x+=Math.sin(s.a)*s.speed*dt;s.y-=Math.cos(s.a)*s.speed*dt;
if(s.x<85||s.x>515||s.y<15||s.y>680){s.x=Math.max(85,Math.min(515,s.x));s.y=Math.max(15,Math.min(680,s.y));s.speed*=.8;}
const target=waypoint(s);if(target&&Math.hypot(s.x-target.x,s.y-target.y)<32){s.index++;s.message=s.phase===2?'Weiter um die Wendeboje – eine halbe Runde.':'Tor geschafft! Nächstes goldenes Tor ansteuern.';const count=s.phase===1?outbound.length:s.phase===2?turn.length:inbound.length;if(s.index>=count){s.phase++;s.index=0;if(s.phase===4){s.x=340;s.y=665;s.speed=25;s.holding=false;s.message='An Land! Noch einmal laufen bis zur Ziellinie.';}else if(s.phase===2)s.message='180°-Wende: links stärker halten und um die grosse Boje rudern.';else s.message='Zurück zum Strand: rechten Slalom durchfahren.';}}
for(const p of [...outbound,...inbound])for(const offset of [-45,45])if(Math.hypot(s.x-(p.x+offset),s.y-p.y)<17&&s.cooldown<=0){s.speed*=.45;s.cooldown=1;s.hits++;s.message='Bojenkontakt – Tempo verloren.';}
if(s.time>=s.nextWave&&!s.wave){s.wave=1.6;s.nextWave=s.time+14;s.message='Welle! Jetzt W oder Wellentaste.';}if(s.wave){s.wave-=dt;if(s.wave<=0){s.wave=0;s.speed*=.6;s.message='Welle verpasst – nächstes Mal W tippen.';}}
}
