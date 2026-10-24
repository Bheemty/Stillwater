import { LatestSeek } from './video-seek.js';
export function createScrollDecoder({parent,variant,base,onFrame,onError}){
 const video=document.createElement('video');
 video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';
 video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
 video.className='tour-native-video';parent.prepend(video);
 let started=false,disposed=false,ready=false,aligned=false,callback=null,objectURL=null,loadedBytes=0;
 const controller=new AbortController();
 const seek=new LatestSeek({read:()=>video.currentTime,write:t=>video.currentTime=t,now:()=>performance.now()});
 const emit=t=>{if(!disposed&&aligned&&video.readyState>=2)onFrame(video,t);};
 const frame=(_now,meta)=>{emit(meta.mediaTime);if(!disposed)callback=video.requestVideoFrameCallback(frame);};
 if(video.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(frame);
 video.addEventListener('loadeddata',()=>{ready=true;aligned=Math.abs(video.currentTime-seek.target)<1/24;if(aligned)emit(video.currentTime);else seek.flush(true);});
 video.addEventListener('canplay',()=>{ready=true;seek.flush(true);});
 video.addEventListener('seeked',()=>{seek.complete();aligned=true;emit(video.currentTime);});
 video.addEventListener('error',onError);
 return {async start(){
  if(started)return;started=true;
  try{
   // Browser media-range loading stalled on the live CDN. A fetched Blob is
   // complete and locally seekable; no network request can block a later seek.
   const response=await fetch(`${base}media/journey-keyframes-${variant}.mp4`,{signal:controller.signal});
   if(!response.ok)throw Error(`Tour HTTP ${response.status}`);
   const blob=await response.blob();if(disposed)return;
   loadedBytes=blob.size;objectURL=URL.createObjectURL(blob);video.src=objectURL;video.load();
  }catch(error){if(error.name!=='AbortError')onError();}
 },
 update(wanted){seek.request(wanted);seek.flush(ready);},pause(){video.pause();},
 stats:()=>({decoder:'native-buffered-keyframe',ready,loadedBytes,...seek.stats()}),
 dispose(){disposed=true;controller.abort();if(callback!==null)video.cancelVideoFrameCallback(callback);video.removeAttribute('src');video.load();video.remove();if(objectURL)URL.revokeObjectURL(objectURL);}
 };
}
