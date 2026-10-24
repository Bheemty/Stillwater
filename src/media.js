import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { journeyLength, locate, chapters } from './data.js';
import { createFilmRenderer } from './film-renderer.js';
import { filmTarget, continuousFilmTarget, filmToSource, progressForFilm, lastFilmTime } from './video-timeline.js';
import { createScrollDecoder } from './scroll-decoder.js';
gsap.registerPlugin(ScrollTrigger);
const base=import.meta.env.BASE_URL;

export function startJourney(onScene){
 const params=new URLSearchParams(location.search);
 const canvas=document.querySelector('#cinema'),section=document.querySelector('#journey');
 const stage=section.firstElementChild,state=document.querySelector('.media-state');
 const progressBar=document.querySelector('#journey-bar'),chapterIndex=document.querySelector('#chapter-index'),chapterTitle=document.querySelector('#chapter-title');
 const nav=document.querySelector('#chapter-nav'),mode=document.querySelector('#still-mode');
 const retry=document.querySelector('#media-retry'),message=document.querySelector('#media-message');
 const display=createFilmRenderer(canvas,{forceCanvas:params.get('renderer')==='canvas'});
 const nativeDisplay=params.get('renderer')!=='three'&&params.get('renderer')!=='canvas';
 const variant=innerWidth<700?'432':'720';
 let video=null;
 let target=0,current=0,shownProgress=0,decodedTime=0,hasVideoFrame=false;
 let dirty=false,needsPaint=true,disposed=false,trigger;
 let still=matchMedia('(prefers-reduced-motion:reduce)').matches;
 let width=0,height=0,dpr=0,sectionTop=0,sectionBottom=0,resizePending=true;
 let scene='',lastChapter='',lastFrame=-1,framesDrawn=0;
 let poster=null,posterKey='',staticRequest=0,posterProgress=0,pendingPoster=false,lastFallbackRequest=0;
 const decoder=createScrollDecoder({parent:stage,variant,base,onFrame:(element,time)=>{video=element;decoded(time);},onError:failed});
 function updateCopy(p){
  const pos=locate(p);
  if(scene!==pos.scene){scene=pos.scene;stage.dataset.scene=scene;onScene(scene);}
  const ch=[...chapters].reverse().find(c=>p>=c.progress-.3)||chapters[0];
  if(ch.key===lastChapter)return;
  lastChapter=ch.key;chapterIndex.textContent=String(chapters.indexOf(ch)+1).padStart(2,'0');chapterTitle.textContent=ch.name;
  nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.chapter===ch.key)));
 }
 function loadStill(p){
  const pos=locate(p),frame=Math.max(1,Math.round(pos.time*24)+1),key=`${pos.clip}/${frame}`;
  if(key===posterKey)return;
  posterKey=key;pendingPoster=true;const request=++staticRequest,img=new Image();img.decoding='async';
  img.onload=async()=>{
   try{await img.decode();}catch{}
   if(disposed||request!==staticRequest)return;
   poster=img;posterProgress=p;pendingPoster=false;needsPaint=true;state.classList.add('ready');
  };
  img.onerror=()=>{if(request===staticRequest){pendingPoster=false;posterKey='';}};
  img.src=p===0?`${base}media/1-start.webp`:`${base}media/${pos.clip}/${variant==='432'?'mobile':'desktop'}/${String(frame).padStart(4,'0')}.webp`;
 }
 function startVideo(){
  if(!disposed&&!still)decoder.start();
 }
 function decoded(time){
  if(disposed||!video||(video.tagName==='VIDEO'&&video.readyState<2))return;
  decodedTime=Math.max(0,Math.min(lastFilmTime,time));hasVideoFrame=true;dirty=true;
 }
 function failed(){
  state.classList.remove('ready');
  message.textContent='The tour could not load. Retry, or use Still views and the seat map.';retry.hidden=false;
 }
 function resize(){
  sectionTop=section.offsetTop;sectionBottom=sectionTop+section.offsetHeight;
  const w=stage.clientWidth,h=stage.clientHeight,p=Math.min(devicePixelRatio||1,w<700?2:1.5);
  if(w===width&&h===height&&p===dpr)return;
  width=w;height=h;dpr=p;display.resize(w,h,p);needsPaint=true;
 }
 function tick(){
  if(disposed)return;
  if(resizePending){resizePending=false;resize();}
  if(document.hidden||document.querySelector('dialog[open]')||scrollY>sectionBottom||scrollY+innerHeight<sectionTop){decoder.pause();return;}
  // Follow native scroll directly; one decoder request, never a seek backlog.
  current=target;
  const wanted=continuousFilmTarget(current);
  if(!still&&!hasVideoFrame&&!pendingPoster&&performance.now()-lastFallbackRequest>120){
   lastFallbackRequest=performance.now();loadStill(current);
  }
  if(!still)decoder.update(wanted);
  if(!still&&hasVideoFrame){
   const frame=Math.round(decodedTime*24);
   if((dirty&&frame!==lastFrame)||needsPaint){
    canvas.style.visibility=nativeDisplay?'hidden':'visible';
    video.style.visibility=nativeDisplay?'visible':'hidden';
    if(!nativeDisplay)display.draw(video);framesDrawn++;lastFrame=frame;dirty=false;needsPaint=false;
    shownProgress=progressForFilm(decodedTime,current);
    const source=filmToSource(decodedTime);stage.dataset.clip=source.clip;stage.dataset.frame=source.frame;
    state.classList.add('ready');
   }else if(Math.abs(decodedTime-wanted)<1.5/24)shownProgress=current;
  }else if(poster&&needsPaint){
   canvas.style.visibility='visible';if(video)video.style.visibility='hidden';
   display.draw(poster);framesDrawn++;needsPaint=false;shownProgress=still?current:posterProgress;
   const source=locate(shownProgress);stage.dataset.clip=source.clip;stage.dataset.frame=Math.round(source.time*24)+1;
  }
  stage.dataset.exact=String(still||Math.abs(decodedTime-wanted)<1.5/24);
  stage.dataset.mediaEngine='continuous-video';
  progressBar.style.transform=`scaleX(${Math.max(0,Math.min(1,current/journeyLength))})`;
  updateCopy(shownProgress);
 }
 function setup(){
  trigger?.kill();section.classList.toggle('is-still',still);
  section.style.height=still?'100svh':`calc(100svh + ${journeyLength*(innerWidth<700?410:530)}px)`;
  if(!still)trigger=ScrollTrigger.create({trigger:section,start:'top top',end:'bottom bottom',onUpdate:s=>target=s.progress*journeyLength,onRefresh:s=>target=s.progress*journeyLength});
  mode.setAttribute('aria-pressed',String(still));mode.textContent=still?'Enable motion':'Still views';document.querySelector('#scene-hint').hidden=still;
  resize();ScrollTrigger.refresh();
 }
 function go(key){
  const ch=chapters.find(c=>c.key===key);if(!ch)return;
  target=current=ch.progress;
  if(still){loadStill(current);shownProgress=current;updateCopy(current);}
  window.scrollTo({top:section.offsetTop+(still?0:(ch.progress/journeyLength)*(section.offsetHeight-stage.offsetHeight)),behavior:'instant'});
 }
 nav.innerHTML=chapters.map(c=>`<button data-chapter="${c.key}" aria-label="Go to ${c.name}" title="${c.name}"><span>${c.name}</span></button>`).join('');
 const navClick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.chapter);};nav.addEventListener('click',navClick);
 function setMode(next){
  const p=current;still=next;setup();target=current=p;needsPaint=true;
  if(still){decoder.pause();loadStill(p);shownProgress=p;updateCopy(p);}else startVideo();
  window.scrollTo({top:section.offsetTop+(still?0:(p/journeyLength)*(section.offsetHeight-stage.offsetHeight)),behavior:'instant'});
 }
 mode.onclick=()=>setMode(!still);
 retry.onclick=()=>location.reload();
 const scheduleResize=()=>resizePending=true;
 const motion=matchMedia('(prefers-reduced-motion:reduce)'),motionChange=e=>setMode(e.matches);
 motion.addEventListener('change',motionChange);window.addEventListener('resize',scheduleResize);ScrollTrigger.addEventListener('refresh',resize);
 const visibility=()=>{decoder.pause();if(!document.hidden)needsPaint=true;};document.addEventListener('visibilitychange',visibility);
 function dispose(){
  if(disposed)return;disposed=true;gsap.ticker.remove(tick);trigger?.kill();
  decoder.dispose();display.dispose();
  nav.removeEventListener('click',navClick);motion.removeEventListener('change',motionChange);
  document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',scheduleResize);ScrollTrigger.removeEventListener('refresh',resize);
 }
 window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
 window.addEventListener('pageshow',e=>{if(e.persisted){resizePending=true;needsPaint=true;ScrollTrigger.refresh();}});
 setup();loadStill(0);startVideo();updateCopy(0);gsap.ticker.add(tick);
 return {go,get still(){return still;},stats:()=>({
  ...display.stats(),renderer:nativeDisplay?'native-video':display.stats().renderer,engine:'continuous-video',target,current,scene,variant,framesDrawn,
  displayed:filmToSource(decodedTime),displayedTime:decodedTime,wantedTime:filmTarget(target),
  ...decoder.stats(),
 })};
}
