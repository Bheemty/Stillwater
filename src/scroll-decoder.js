import { LatestSeek } from './video-seek.js';
import { lastFilmTime } from './video-timeline.js';
export function createScrollDecoder({parent,variant,base,onFrame,onError}){
 let started=false,disposed=false,paused=false,wanted=0,direction=1,active=null,pending=null,requests=0,loadedBytes=0;
 const cache=new Map(),failed=new Map();
 const chunkAt=t=>Math.min(60,Math.max(0,Math.floor(t)));
 function emit(s){
  if(disposed||paused||s.chunk!==chunkAt(wanted)||!s.aligned||s.video.readyState<2)return;
  active=s;onFrame(s.video,Math.min(lastFilmTime,s.chunk+s.video.currentTime));
 }
 function slot(){
  const video=document.createElement('video');video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.className='tour-native-video';parent.prepend(video);
  const s={video,chunk:-1,ready:false,aligned:false,url:null,callback:null};
  s.seek=new LatestSeek({read:()=>video.currentTime,write:t=>video.currentTime=t,now:()=>performance.now()});
  const align=()=>{
   if(paused||s.chunk!==chunkAt(wanted)||!s.ready)return;
   s.seek.request(wanted-s.chunk);
   if(Math.abs(video.currentTime-s.seek.target)<1/48&&!s.seek.busy){s.aligned=true;emit(s);}else s.seek.flush(true);
  };
  video.addEventListener('loadeddata',()=>{s.ready=true;align();});
  video.addEventListener('seeked',()=>{s.seek.complete();s.aligned=true;emit(s);});
  video.addEventListener('error',()=>{s.ready=false;failed.set(s.chunk,performance.now());onError();});
  const frame=()=>{emit(s);if(!disposed)s.callback=video.requestVideoFrameCallback(frame);};
  if(video.requestVideoFrameCallback)s.callback=video.requestVideoFrameCallback(frame);
  s.align=align;return s;
 }
 const slots=[slot(),slot()];
 function attach(s,index){
  if(s.chunk===index)return;
  s.video.style.visibility='hidden';s.video.removeAttribute('src');s.video.load();if(s.url)URL.revokeObjectURL(s.url);
  s.seek.complete();s.chunk=index;s.ready=s.aligned=false;s.url=URL.createObjectURL(cache.get(index));s.video.src=s.url;s.video.load();
 }
 function fetchChunk(index,priority){
  if(index<0||index>60||cache.has(index)||disposed||paused)return;
  if(failed.has(index)&&performance.now()-failed.get(index)<3000)return;
  if(pending){if(pending.index===index||!priority)return;pending.controller.abort();}
  const task={index,controller:new AbortController()};pending=task;
  fetch(`${base}media/tour-${variant}/${String(index).padStart(3,'0')}.mp4`,{signal:task.controller.signal})
   .then(r=>{if(!r.ok)throw Error(`Tour HTTP ${r.status}`);return r.blob();})
   .then(blob=>{
    if(disposed)return;cache.set(index,blob);loadedBytes+=blob.size;requests++;failed.delete(index);
   }).catch(error=>{if(error.name!=='AbortError'){failed.set(index,performance.now());onError();}})
   .finally(()=>{if(pending===task)pending=null;});
 }
 function update(time){
  direction=time<wanted?-1:time>wanted?1:direction;wanted=Math.max(0,Math.min(lastFilmTime,time));paused=false;
  if(!started||disposed)return;
  const current=chunkAt(wanted);
  if(!cache.has(current)){fetchChunk(current,true);return;}
  let s=slots.find(s=>s.chunk===current);
  if(!s){s=slots.find(s=>s!==active)||slots[0];attach(s,current);}
  s.align();
  if(active===s&&s.ready&&s.aligned){
   const neighbour=current+direction;
   if(neighbour>=0&&neighbour<=60){
    if(cache.has(neighbour)){
     if(!slots.some(s=>s.chunk===neighbour))attach(slots.find(other=>other!==s),neighbour);
     fetchChunk(neighbour+direction,false);
    }else fetchChunk(neighbour,false);
   }
  }
 }
 return {start(){started=true;fetchChunk(chunkAt(wanted),true);},update,
  get waiting(){return !slots.some(s=>s.chunk===chunkAt(wanted)&&s.ready&&s.aligned);},
  pause(){paused=true;pending?.controller.abort();slots.forEach(s=>s.video.pause());},
  stats(){const stats=slots.map(s=>s.seek.stats());return {decoder:'native-buffered-segments',ready:!this.waiting,loadedBytes,requests,cachedSegments:cache.size,seeks:stats.reduce((n,s)=>n+s.seeks,0),pendingSeeks:stats.reduce((n,s)=>n+s.pendingSeeks,0),seekP95Ms:Math.max(...stats.map(s=>s.seekP95Ms))};},
  dispose(){disposed=true;pending?.controller.abort();cache.clear();slots.forEach(s=>{if(s.callback!==null)s.video.cancelVideoFrameCallback(s.callback);s.video.removeAttribute('src');s.video.load();s.video.remove();if(s.url)URL.revokeObjectURL(s.url);});}
 };
}
