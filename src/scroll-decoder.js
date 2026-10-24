import { LatestSeek } from './video-seek.js';
export function createScrollDecoder({parent,variant,base,onFrame,onError}){
 const video=document.createElement('video');
 video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';
 video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
 video.className='tour-native-video';parent.prepend(video);
 let started=false,disposed=false,ready=false,callback=null;
 const seek=new LatestSeek({read:()=>video.currentTime,write:t=>video.currentTime=t,now:()=>performance.now()});
 const emit=t=>{if(!disposed&&video.readyState>=2)onFrame(video,t);};
 const frame=(_now,meta)=>{emit(meta.mediaTime);if(!disposed)callback=video.requestVideoFrameCallback(frame);};
 if(video.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(frame);
 video.addEventListener('loadeddata',()=>{ready=true;emit(video.currentTime);});
 video.addEventListener('seeked',()=>{seek.complete();emit(video.currentTime);});
 video.addEventListener('error',onError);
 return {start(){if(started)return;started=true;video.src=`${base}media/journey-keyframes-${variant}.mp4`;video.load();},
 update(wanted){seek.request(wanted);seek.flush(ready);},pause(){video.pause();},
 stats:()=>({decoder:'native-all-keyframe',ready,...seek.stats()}),
 dispose(){disposed=true;if(callback!==null)video.cancelVideoFrameCallback(callback);video.removeAttribute('src');video.load();video.remove();}
 };
}
