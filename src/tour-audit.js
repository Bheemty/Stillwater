import { filmTarget, sourceToFilm } from './video-timeline.js';
import { journeyLength } from './data.js';
// Opt-in browser lab only. No panel, observers or measurements on normal visits.
export function mountAudit(journey){
 const panel=document.createElement('aside');panel.id='tour-audit';
 panel.style.cssText='position:fixed;right:12px;top:90px;z-index:99999;background:#fff;color:#111;padding:10px;width:300px;font:12px monospace;max-height:65vh;overflow:auto';
 panel.innerHTML='<button id="tour-audit-run">Run forward/reverse test</button><pre id="tour-audit-result">Ready</pre>';
 document.body.append(panel);
 const button=panel.querySelector('button'),output=panel.querySelector('pre');
 button.onclick=()=>{
  button.disabled=true;
  const section=document.querySelector('#journey'),stage=section.firstElementChild;
  const range=section.offsetHeight-stage.offsetHeight,top=section.offsetTop;
  const started=performance.now(),errors=[],intervals=[];
  let previous=started,lastShown=-1,lastChange=started,longest=0,stallCount=0,stallActive=false,moving=0;
  function step(now){
   const elapsed=(now-started)/1000;
   const progress=elapsed<20?elapsed/20:elapsed<21?1:elapsed<33?1-(elapsed-21)/12:0;
   scrollTo({top:top+range*progress,behavior:'instant'});
   const stats=journey.stats(),wanted=filmTarget(stats.target);
   const shown=stats.displayedTime??(stats.displayed?sourceToFilm(stats.displayed.clip,stats.displayed.frame):0);
   const active=elapsed>1&&elapsed<33&&!(elapsed>20&&elapsed<21);
   if(active){
    const error=Math.abs(wanted-shown);errors.push(error);intervals.push(now-previous);
    if(Math.abs(shown-lastShown)>.015){lastChange=now;stallActive=false;}
    const stalled=now-lastChange;
    // Intentional still seating zones are excluded from media-stall counts.
    if(Math.abs(filmTarget(Math.min(journeyLength,stats.target+.015))-wanted)>.01){
     moving++;longest=Math.max(longest,stalled);
     if(stalled>250&&!stallActive){stallCount++;stallActive=true;}
    }else{lastChange=now;stallActive=false;}
   }else lastChange=now;
   previous=now;lastShown=shown;
   if(elapsed<35){requestAnimationFrame(step);return;}
   const resources=performance.getEntriesByType('resource').filter(r=>r.name.includes('/media/'));
   const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return +(s[Math.floor(s.length*p)]||0).toFixed(3);};
   const result={engine:stats.engine||'legacy-frames',viewport:[innerWidth,innerHeight],durationSeconds:+elapsed.toFixed(2),samples:errors.length,movingSamples:moving,positionErrorP50Seconds:percentile(errors,.5),positionErrorP95Seconds:percentile(errors,.95),frameIntervalP95Ms:percentile(intervals,.95),stallsOver250ms:stallCount,longestStallMs:Math.round(longest),mediaResourceEntries:resources.length,completedMediaTransferBytes:resources.reduce((n,r)=>n+r.transferSize,0),stats:journey.stats(),conditions:'Actual browser, localhost, no CPU/network throttling; cache not forced cold'};
   output.textContent=JSON.stringify(result,null,2);panel.dataset.complete='true';button.disabled=false;
  }
  requestAnimationFrame(step);
 };
}
