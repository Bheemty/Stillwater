import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as data from '../src/data.js';
import * as policy from '../src/frame-policy.js';

// Deterministic loader lab, not a browser FPS/network benchmark.
const input = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'src/media-frames-legacy.js';
let source = fs.readFileSync(input, 'utf8').replace(/^import [\s\S]*?;\r?\n/gm, '')
  .replace('import.meta.env.BASE_URL', '"/"').replace('export function', 'function');
const runs=[];
for (const mobile of [false,true]) {
  let now=0,tick,trigger,drawn=null,draws=0,redundant=0,requests=0,open=false,backsteps=0,coveredDraws=0;
  const jobs=[], nodes=new Map(), errors=[], frameErrors=[];
  function node(k) {
    if(!nodes.has(k)) nodes.set(k,{dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},
      setAttribute(){},addEventListener(){},removeEventListener(){},querySelectorAll(){return[]},
      offsetTop:0,offsetHeight:8000,clientWidth:mobile?390:1440,clientHeight:mobile?844:900});
    return nodes.get(k);
  }
  const section=node('#journey'); section.firstElementChild=node('.stage');
  class FakeImage {
    decoding=''; naturalWidth=mobile?768:1280; naturalHeight=mobile?432:720;
    set src(v){this._src=v; if(!v)return; requests++; jobs.push({at:now+120,done:()=>this.onload?.()});}
    get src(){return this._src;}
    decode(){return Promise.resolve();}
  }
  const sandbox={...data,...policy,console,Image:FakeImage,URLSearchParams,location:{search:''},devicePixelRatio:1,
    innerWidth:mobile?390:1440,innerHeight:mobile?844:900,scrollY:0,
    performance:{now:()=>now},matchMedia:q=>({matches:q.includes('max-width')&&mobile,addEventListener(){},removeEventListener(){}}),
    document:{hidden:false,querySelector:k=>k==='dialog[open]'?(open?{}:null):node(k),querySelectorAll:()=>[]},
    window:{addEventListener(){},removeEventListener(){},scrollTo(){}},
    gsap:{registerPlugin(){},ticker:{add:f=>tick=f,remove(){}}},
    ScrollTrigger:{create:t=>(trigger=t,{kill(){}}),refresh(){},addEventListener(){},removeEventListener(){}},
    createFilmRenderer:()=>({draw(img){draws++;if(open)coveredDraws++;if(drawn===img.src)redundant++;
      const a=drawn?.match(/\/(\d+)\/(?:desktop|mobile)\/(\d+)\.webp/),b=img.src.match(/\/(\d+)\/(?:desktop|mobile)\/(\d+)\.webp/);
      if(a&&b&&a[1]===b[1]&&((now<32000&&+b[2]<+a[2])||(now>34000&&+b[2]>+a[2])))backsteps++;
      drawn=img.src;},resize(){},dispose(){},stats:()=>({})})};
  vm.createContext(sandbox);vm.runInContext(source+'\nglobalThis.journey=startJourney(()=>{});',sandbox);
  for(let n=0;n<60*68;n++) {
    now=n*1000/60;
    // 30s forward, 2s rear hold, 30s reverse; 2s booking pause.
    const sec=now/1000;
    const progress=sec<2?0:sec<32?(sec-2)/30:sec<34?1:sec<64?1-(sec-34)/30:0;
    open=sec>=18&&sec<20;
    trigger.onUpdate({progress});
    for(let i=jobs.length-1;i>=0;i--)if(jobs[i].at<=now){jobs.splice(i,1)[0].done();}
    await Promise.resolve(); await Promise.resolve();
    tick();
    if(!open&&sec>2&&sec<64){
      const s=sandbox.journey.stats(),p=data.locate(s.current);
      const match=drawn?.match(/\/(\d+)\/(?:desktop|mobile)\/(\d+)\.webp/);
      if(match&&+match[1]===p.clip)frameErrors.push(Math.abs(+match[2]-(Math.round(p.time*24)+1)));
      else frameErrors.push(192);
    }
  }
  frameErrors.sort((a,b)=>a-b);
  runs.push({profile:mobile?'mobile':'desktop',latencyMs:120,routeSeconds:68,requests,draws,redundant,backsteps,coveredDraws,
    meanFrameError:+(frameErrors.reduce((a,b)=>a+b,0)/frameErrors.length).toFixed(2),
    p95FrameError:frameErrors[Math.floor(frameErrors.length*.95)],stats:sandbox.journey.stats()});
}
if(process.argv.includes('--check')) for(const run of runs) {
  assert.equal(run.redundant,0,'No duplicate image draws');
  assert.equal(run.coveredDraws,0,'No drawing behind the booking dialog');
  assert.ok(run.backsteps<=1,'No repeated backward fallback jumps during forward scrolling');
  assert.ok(run.p95FrameError<=10,'Loader position error stays within the lab budget');
  assert.ok(run.stats.cached<=(run.profile==='mobile'?26:38),'Decoded frame cache remains bounded');
}
console.log(JSON.stringify(runs,null,2));
