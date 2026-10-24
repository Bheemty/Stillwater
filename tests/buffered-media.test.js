import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createScrollDecoder } from '../src/scroll-decoder.js';

test('tour fetches only the needed piece and aligns its local buffer before display',async()=>{
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 const videos=[],frames=[],fetched=[],signals=[];
 globalThis.document={createElement:()=>{
  const events=new Map();
  const video={events,style:{},currentTime:0,readyState:2,setAttribute(){},removeAttribute(){},load(){},remove(){},pause(){},
   requestVideoFrameCallback(){return 1;},cancelVideoFrameCallback(){},addEventListener:(type,fn)=>events.set(type,fn)};
  videos.push(video);return video;
 }};
 globalThis.fetch=async(url,options)=>{fetched.push(url);signals.push(options.signal);return {ok:true,blob:async()=>new Blob(['sample'],{type:'video/mp4'})};};
 let decoder;
 try{
  decoder=createScrollDecoder({parent:{prepend(){}},variant:'432',base:'/',onFrame:(_v,t)=>frames.push(t),onError:()=>assert.fail('Unexpected media failure')});
  decoder.update(42.5);decoder.start();await setImmediate();
  assert.deepEqual(fetched,['/media/tour-432/042.mp4']);
  decoder.update(42.5);const video=videos.find(v=>v.src);
  assert.ok(video.src.startsWith('blob:'));
  video.events.get('loadeddata')();assert.equal(video.currentTime,.5);
  assert.deepEqual(frames,[],'An unaligned opening frame must not replace the current loading image');
  video.events.get('seeked')();assert.deepEqual(frames,[42.5]);
  assert.equal(decoder.waiting,false);assert.equal(decoder.stats().loadedBytes,6);
  decoder.update(59.5);assert.equal(decoder.waiting,true);await setImmediate();
  assert.deepEqual(fetched,['/media/tour-432/042.mp4','/media/tour-432/059.mp4']);
  decoder.dispose();decoder=null;
 }finally{decoder?.dispose();globalThis.document=originalDocument;globalThis.fetch=originalFetch;}
});
