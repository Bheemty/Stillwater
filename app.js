const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>'$'+n;
/* ---------- tour ---------- */
const CHAPTERS=[
 {t:'The arrival',segs:[0],still:['01_Exterior','02_Entrance_Doors'],
  html:`<p class="eyebrow">A place for live music.</p><h1>The night begins<br>before the<br>first note.</h1><p class="sup">Step inside. Find your place.<br>Make it a night to remember.</p><div class="acts"><button class="light" data-go="1">Explore the venue <span aria-hidden="true">&#8595;</span></button><button class="txt" data-book>Choose your seat</button></div>`},
 {t:'Inside Stillwater',segs:[1,2],still:['02_Entrance_Doors','03_Lobby','04_Auditorium_Threshold'],
  html:`<p class="eyebrow">Chapter two</p><h2>Warm light.<br>Quiet anticipation.</h2><p class="sup">Cross the lobby, and the doors to the auditorium open.</p>`},
 {t:'The stage',segs:[3],still:['04_Auditorium_Threshold','05_Full_Stage'],
  html:`<p class="eyebrow">Chapter three</p><h2>Every seat<br>faces the music.</h2><p class="sup">The whole stage comes into view as you walk the aisle.</p>`},
 {t:'Front seats',segs:[4],still:['05_Full_Stage','06_Front_Seating'],zone:'F',
  html:`<p class="eyebrow">Front &middot; from $120</p><h2>Close enough<br>to feel it.</h2><p class="sup">Turn to face the room from the front rows.</p><div class="acts"><button class="light" data-zone="F">Choose front seats <span aria-hidden="true">&#8599;</span></button></div>`},
 {t:'Middle seats',segs:[5],still:['06_Front_Seating','07_Middle_Seating'],zone:'M',
  html:`<p class="eyebrow">Middle &middot; from $90</p><h2>The balanced<br>centre of the room.</h2><p class="sup">Even sound, an open view, room to settle.</p><div class="acts"><button class="light" data-zone="M">Choose middle seats <span aria-hidden="true">&#8599;</span></button></div>`},
 {t:'Rear seats',segs:[6],still:['08_Rear_Seating'],zone:'R',
  html:`<p class="eyebrow">Rear &middot; from $65</p><h2>The whole room,<br>all at once.</h2><p class="sup">Take in the full hall from the back.</p><div class="acts"><button class="light" data-zone="R">Choose rear seats <span aria-hidden="true">&#8599;</span></button></div>`}];
const NSEG=7,segChap=s=>CHAPTERS.findIndex(c=>c.segs.includes(s));
const films=$('#films'),vids=[];
for(let i=1;i<=6;i++){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=i+'.mp4';v.setAttribute('aria-hidden','true');films.append(v);vids.push(v)}
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
let still=reduce,curChap=-1,seg=0,frac=0,target=0,ticking=false;
$('#stillMode').setAttribute('aria-pressed',still);
$('#cnav').innerHTML=CHAPTERS.map((c,i)=>`<button data-go="${i}">${String(i+1).padStart(2,'0')} ${c.t}</button>`).join('');
$('#strip').innerHTML=['01_Exterior','03_Lobby','05_Full_Stage','07_Middle_Seating'].map(f=>`<figure><img loading="lazy" src="${f}.png" alt="${f.slice(3).replace(/_/g,' ')}"><figcaption>${f.slice(3).replace(/_/g,' ')}</figcaption></figure>`).join('');
function setChapter(i){
 if(i===curChap)return;curChap=i;const c=CHAPTERS[i],el=$('#copy');
 el.classList.add('out');
 setTimeout(()=>{el.innerHTML=c.html;el.classList.remove('out')},curChap<0?0:220);
 $('#ci').textContent=String(i+1).padStart(2,'0');$('#ct').textContent=c.t;
 $$('#cnav button').forEach((b,j)=>b.setAttribute('aria-current',j===i));
}
function scrollInfo(){
 const j=$('#journey'),range=j.offsetHeight-innerHeight;
 return Math.min(1,Math.max(0,(scrollY-j.offsetTop)/range));
}
/* Smooth playhead: the raw scroll position is eased every frame so video
   and copy glide instead of stepping with the wheel. */
let raw=0,smooth=0,seeking=false,lastSeg=-1;
function onScroll(){raw=scrollInfo();$('#hdr').classList.toggle('solid',scrollY>innerHeight*.5);if(!running){running=true;requestAnimationFrame(loop)}}
let running=false;
function loop(){
 const d=raw-smooth;smooth=Math.abs(d)<.00003?raw:smooth+d*(reduce?1:.085);
 const x=Math.min(smooth*NSEG,NSEG-1e-6);seg=Math.floor(x);frac=x-seg;
 $('#bar').style.width=(smooth*100)+'%';$('#hint').style.opacity=smooth>.01?0:1;
 setChapter(segChap(seg));draw();
 if(smooth!==raw)requestAnimationFrame(loop);else running=false;
}
function draw(){
 const c=CHAPTERS[segChap(seg)],img=$('#still');
 if(still){
  vids.forEach(v=>v.classList.remove('on'));img.hidden=false;
  const n=c.still,idx=c.segs.length>1?Math.min(n.length-1,Math.floor(((seg-c.segs[0])+frac)/c.segs.length*n.length)):Math.min(n.length-1,Math.floor(frac*n.length));
  const f=n[idx]+'.png';if(!img.src.endsWith(f))img.src=f;return;
 }
 if(seg>=6){img.hidden=false;if(!img.src.endsWith('08_Rear_Seating.png'))img.src='08_Rear_Seating.png';vids.forEach(v=>v.classList.remove('on'));return}
 img.hidden=true;
 vids.forEach((v,i)=>v.classList.toggle('on',i===seg));
 const v=vids[seg];
 if(v.readyState>0&&v.duration&&!v._busy){
  const t=Math.min(v.duration-.05,frac*v.duration);
  if(Math.abs(v.currentTime-t)>.02){v._busy=true;v.currentTime=t}
 }
}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);
vids.forEach((v,i)=>{v.addEventListener('loadedmetadata',()=>{if(i===seg)draw()});v.addEventListener('seeked',()=>{v._busy=false;if(i===seg)draw()})});
$('#stillMode').onclick=()=>{still=!still;$('#stillMode').setAttribute('aria-pressed',still);if(!still)$('#still').hidden=true;draw()};
let anim=0;
function goChapter(i){
 const j=$('#journey'),range=j.offsetHeight-innerHeight,to=j.offsetTop+range*(CHAPTERS[i].segs[0]+.5)/NSEG;
 cancelAnimationFrame(anim);if(reduce){scrollTo(0,to);return}
 const from=scrollY,dist=to-from,dur=Math.min(2600,700+Math.abs(dist)*.35),t0=performance.now();
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const stop=()=>cancelAnimationFrame(anim);addEventListener('wheel',stop,{once:true,passive:true});addEventListener('touchstart',stop,{once:true,passive:true});
 (function step(n){const t=Math.min(1,(n-t0)/dur);scrollTo(0,from+dist*ease(t));if(t<1)anim=requestAnimationFrame(step)})(t0);
}
document.addEventListener('click',e=>{
 const g=e.target.closest('[data-go]');if(g){goChapter(+g.dataset.go);return}
 const z=e.target.closest('[data-zone]');if(z){openSheet(z.dataset.zone);return}
 if(e.target.closest('[data-book]')){openSheet();return}
 if(e.target.closest('[data-ticket]')){openTicket();return}
});
/* ---------- seats ---------- */
const ZONES={F:{n:'Front',price:120,rows:4,img:'06_Front_Seating'},M:{n:'Middle',price:90,rows:4,img:'07_Middle_Seating'},R:{n:'Rear',price:65,rows:4,img:'08_Rear_Seating'}};
const BLOCKS=[['L',4],['C',6],['R',4]],FEE=4,MAX=8,KEY='stillwater.demo.v1';
const store=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{booked:[],ticket:null}}catch{return{booked:[],ticket:null}}};
const put=s=>localStorage.setItem(KEY,JSON.stringify(s));
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const id=(z,r,b,n)=>`${z}${r}${b}${n}`;
const label=i=>{const z=ZONES[i[0]],b={L:'Left',C:'Centre',R:'Right'}[i[2]];return `${z.n}, row ${i[1]}, ${b} ${i.slice(3)}`};
const price=i=>ZONES[i[0]].price;
const isAcc=i=>(i[0]==='F'||i[0]==='R')&&i[1]==='4'&&(i.slice(2)==='L1'||i.slice(2)==='R4');
const takenBase=i=>hash('sw'+i)%100<({F:55,M:40,R:25}[i[0]])&&!isAcc(i);
const taken=i=>takenBase(i)||store().booked.includes(i);
let sel=new Set(),zone='F',step=1,order=null;
const sheet=$('#sheet'),body=$('#sbody');
function openSheet(z){if(z)zone=z;step=1;sheet.hidden=false;document.body.style.overflow='hidden';render()}
function closeSheet(){sheet.hidden=true;document.body.style.overflow='';updateBar()}
$('#sx').onclick=closeSheet;sheet.onclick=e=>{if(e.target===sheet)closeSheet()};addEventListener('keydown',e=>e.key==='Escape'&&!sheet.hidden&&closeSheet());
function steps(n){return `<div class="steps">${['Seats','Details','Payment','Ticket'].map((s,i)=>`<span class="${i+1===n?'cur':''}"><b>0${i+1}</b> ${s}</span>`).join('')}</div>`}
const ids=()=>[...sel].sort();
const totals=()=>{const a=ids(),sub=a.reduce((s,i)=>s+price(i),0),fee=a.length*FEE;return{sub,fee,tot:sub+fee}};
function render(){step===1?seatsView():step===2?detailsView():step===3?payView():ticketView(store().ticket)}
function seatsView(){
 const z=ZONES[zone];let rows='';
 for(let r=1;r<=z.rows;r++){rows+=`<div class="mr"><span class="rl">${r}</span>`+BLOCKS.map(([b,n],bi)=>(bi?'<span class="gap"></span>':'')+`<div class="mb">`+Array.from({length:n},(_,k)=>{const i=id(zone,r,b,k+1),t=taken(i);return `<button class="seat${sel.has(i)?' on':''}${isAcc(i)?' acc':''}" data-s="${i}" ${t?'disabled':''} aria-pressed="${sel.has(i)}" aria-label="${label(i)}, ${money(price(i))}${isAcc(i)?', accessible':''}${t?', unavailable':''}"></button>`}).join('')+`</div>`).join('')+`<span class="rl">${r}</span></div>`}
 const a=ids(),T=totals();
 body.innerHTML=`${steps(1)}<p class="eyebrow">Stillwater Sessions &middot; 20 June 2026</p><h2 id="st">Choose your seats</h2><p class="sub">Select up to ${MAX} seats. Demo availability; nothing is reserved.</p>
 <div class="zones" role="group" aria-label="Zone">${Object.entries(ZONES).map(([k,v])=>`<button data-z="${k}" aria-pressed="${k===zone}">${v.n} &middot; ${money(v.price)}</button>`).join('')}</div>
 <div class="zv"><img src="${z.img}.png" alt="View from the ${z.n.toLowerCase()} seats"><div><div class="map"><div class="mstage">Stage</div><div class="mrows">${rows}</div></div>
 <div class="leg"><span><i></i>Available</span><span><i class="c"></i>Selected</span><span><i class="s"></i>Unavailable (crossed)</span><span><i class="a"></i>Accessible</span></div></div></div>
 <div class="sumbox"><ul>${a.length?a.map(i=>`<li><span>${label(i)}</span><span>${money(price(i))}</span></li>`).join(''):'<li><span>No seats selected yet.</span></li>'}</ul>
 ${a.length?`<div class="tot"><span>Total</span><span>${money(T.tot)}</span></div><p class="sub" style="font-size:.8rem;margin-top:-10px">Includes ${money(T.fee)} sample service fee.</p>`:''}
 <button class="dark" id="next" ${a.length?'':'disabled'}>Continue <span aria-hidden="true">&#8599;</span></button>${a.length?'<button class="link" id="clr">Clear</button>':''}</div>`;
 $$('[data-z]').forEach(b=>b.onclick=()=>{zone=b.dataset.z;render()});
 $$('[data-s]').forEach(b=>b.onclick=()=>{const i=b.dataset.s;if(sel.has(i))sel.delete(i);else{if(sel.size>=MAX)return;sel.add(i)}render();$(`[data-s="${i}"]`)?.focus()});
 $('#next').onclick=()=>{step=2;render()};if($('#clr'))$('#clr').onclick=()=>{sel.clear();render()};
}
function detailsView(){
 body.innerHTML=`${steps(2)}<h2 id="st">Who is coming?</h2><p class="sub">Sample attendee details. Stored only in this browser.</p>
 <form id="f" novalidate><label for="n">Full name</label><input id="n" autocomplete="name"><label for="e">Email</label><input id="e" type="email" autocomplete="email"><div class="err" id="er" role="alert"></div><br><button class="dark" type="submit">Continue to payment</button><button type="button" class="link" id="bk">Back</button></form>`;
 const o=order||{};$('#n').value=o.name||'';$('#e').value=o.email||'';
 $('#bk').onclick=()=>{step=1;render()};
 $('#f').onsubmit=ev=>{ev.preventDefault();const n=$('#n').value.trim(),e=$('#e').value.trim();
  if(!n||!/^\S+@\S+\.\S+$/.test(e)){$('#er').textContent='Please enter a name and a valid email.';return}
  order={name:n,email:e};step=3;render()};
}
function payView(){
 const T=totals();
 body.innerHTML=`${steps(3)}<h2 id="st">Simulated payment</h2><p class="sub">No payment is processed. Do not enter real card details.</p>
 <div class="sumbox ord"><ul>${ids().map(i=>`<li><span>${label(i)}</span><span>${money(price(i))}</span></li>`).join('')}<li><span>Service fee</span><span>${money(T.fee)}</span></li></ul><div class="tot"><span>Total</span><span>${money(T.tot)}</span></div></div>
 <form id="f"><label for="c">Sample card number</label><input id="c" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="off"><div class="row2"><div><label for="x">Expiry</label><input id="x" placeholder="MM/YY" autocomplete="off"></div><div><label for="v">CVC</label><input id="v" placeholder="000" autocomplete="off"></div></div>
 <br><button class="dark" type="submit">Simulate payment of ${money(T.tot)}</button><button type="button" class="link" id="bk">Back</button></form>`;
 $('#bk').onclick=()=>{step=2;render()};
 $('#f').onsubmit=ev=>{ev.preventDefault();
  const s=store(),a=ids();if(a.some(i=>taken(i))){alert('Some seats are no longer available.');step=1;render();return}
  const ticket={ref:'SW-'+Math.random().toString(36).slice(2,8).toUpperCase(),seats:a,name:order.name,email:order.email,total:T.tot};
  s.booked.push(...a);s.ticket=ticket;put(s);sel.clear();step=4;render();updateBar();
 };
}
async function qr(text){try{const m=await import('https://esm.sh/qrcode@1.5.4');return await m.default.toString(text,{type:'svg',margin:0,color:{dark:'#1b1f1a',light:'#ece7dc'}})}catch{return `<p style="font-size:.7rem;color:#1b1f1a">${text}</p>`}}
async function ticketView(t){
 if(!t){body.innerHTML=`${steps(4)}<h2 id="st">No ticket yet</h2><p class="sub">Choose your seats to create a demo ticket.</p><button class="dark" id="go">Choose seats</button>`;$('#go').onclick=()=>{step=1;render()};return}
 body.innerHTML=`${steps(4)}<p class="eyebrow">Demo ticket &middot; not valid for entry</p><h2 id="st">See you inside.</h2>
 <div class="ticket"><div class="l"><p class="watermark">Stillwater Sessions</p><h3>${t.name.replace(/[<>&]/g,'')}</h3><p style="color:#eee9dfaa;margin:0">${t.seats.length} seat${t.seats.length>1?'s':''} &middot; ${money(t.total)}</p>
 <dl><div><dt>Date</dt><dd>Sat 20 June 2026</dd></div><div><dt>Doors</dt><dd>18:30</dd></div><div><dt>Venue</dt><dd>Stillwater Hall</dd></div><div><dt>Reference</dt><dd>${t.ref}</dd></div><div style="grid-column:1/-1"><dt>Seats</dt><dd>${t.seats.map(label).join('<br>')}</dd></div></dl></div>
 <div class="q" id="qr" aria-label="Demo QR code"></div></div>
 <button class="dark" id="dn">Done</button><button class="link" id="cx">Cancel this demo booking</button>`;
 $('#dn').onclick=closeSheet;
 $('#cx').onclick=()=>{const s=store();s.booked=s.booked.filter(i=>!t.seats.includes(i));s.ticket=null;put(s);render()};
 $('#qr').innerHTML=await qr('STILLWATER-DEMO:'+t.ref);
}
function openTicket(){step=4;sheet.hidden=false;document.body.style.overflow='hidden';render()}
function updateBar(){const a=ids(),b=$('#bar2');b.hidden=!a.length||!sheet.hidden;$('#barTxt').textContent=`${a.length} seat${a.length>1?'s':''} selected · ${money(totals().tot)}`}
$('#reset').onclick=()=>{localStorage.removeItem(KEY);sel.clear();updateBar();alert('Sample seats and ticket reset.')};
raw=smooth=scrollInfo();onScroll();
