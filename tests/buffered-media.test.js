import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollDecoder } from '../src/scroll-decoder.js';

test('tour seeks a fetched local buffer and aligns before replacing the loading image',async()=>{
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 const events=new Map(),frames=[];let fetched,signal;
 const video={currentTime:0,readyState:2,setAttribute(){},removeAttribute(){},load(){},remove(){},pause(){},
  requestVideoFrameCallback(){return 1;},cancelVideoFrameCallback(){},addEventListener:(type,fn)=>events.set(type,fn)};
 globalThis.document={createElement:()=>video};
 globalThis.fetch=async(url,options)=>{fetched=url;signal=options.signal;return {ok:true,blob:async()=>new Blob(['sample'],{type:'video/mp4'})};};
 let decoder;
 try{
  decoder=createScrollDecoder({parent:{prepend(){}},variant:'432',base:'/',onFrame:(_v,t)=>frames.push(t),onError:()=>assert.fail('Unexpected media failure')});
  decoder.update(42);await decoder.start();
  assert.equal(fetched,'/media/journey-keyframes-432.mp4');
  assert.ok(video.src.startsWith('blob:'));
  events.get('loadeddata')();assert.equal(video.currentTime,42);
  assert.deepEqual(frames,[],'The opening video frame must not replace a later loading image');
  events.get('seeked')();assert.deepEqual(frames,[42]);
  assert.equal(decoder.stats().loadedBytes,6);
  decoder.dispose();assert.equal(signal.aborted,true);decoder=null;
 }finally{decoder?.dispose();globalThis.document=originalDocument;globalThis.fetch=originalFetch;}
});
