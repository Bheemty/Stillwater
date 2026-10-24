import test from 'node:test';
import assert from 'node:assert/strict';
import { LatestSeek } from '../src/video-seek.js';
import { filmTarget,filmToSource,sourceToFilm,lastFilmTime,progressForFilm } from '../src/video-timeline.js';
import { segments,journeyLength } from '../src/data.js';
import fs from 'node:fs';
import { parseVideoIndex } from '../src/mp4-index.js';
test('one seek remains in flight and completion services the latest target only',()=>{
 let time=0,clock=0;const writes=[];
 const seek=new LatestSeek({read:()=>time,write:t=>{time=t;writes.push(t);},now:()=>clock});
 seek.request(1);assert.equal(seek.flush(true),true);
 seek.request(2);seek.request(4);assert.equal(seek.flush(true),false);
 clock=10;seek.complete();assert.equal(seek.flush(true),true);assert.deepEqual(writes,[1,4]);
 seek.complete();assert.equal(seek.flush(true),false);
 seek.request(5);assert.equal(seek.flush(false),false);
});
test('continuous film maps every approved cut and trimmed endpoint',()=>{
 assert.equal(sourceToFilm(4,151),1062/24);
 assert.equal(sourceToFilm(5,4),1063/24);
 assert.deepEqual(filmToSource(1063/24),{clip:5,frame:4});
 assert.deepEqual(filmToSource(lastFilmTime),{clip:6,frame:192});
 assert.equal(filmTarget(journeyLength),lastFilmTime);
});
test('forward and reverse mapping is deterministic and preserves intentional holds',()=>{
 let last=-1;
 for(let p=0;p<=journeyLength;p+=.001){const t=filmTarget(p);assert.ok(t>=last);last=t;assert.ok(t>=0&&t<=lastFilmTime);}
 for(const s of segments.filter(s=>s.from===s.to)){
  const p=s.start+s.weight*.6;assert.equal(progressForFilm(filmTarget(p),p),p);
 }
});
test('delivery movies contain independently seekable frames and complete sample offsets',()=>{
 for(const variant of ['720','432']){
  const bytes=fs.readFileSync(new URL(`../public/media/journey-keyframes-${variant}.mp4`,import.meta.url));
  const index=parseVideoIndex(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+65536));
  assert.equal(index.samples.length,1444);assert.equal(index.keys.length,1444);
  assert.equal(index.width,variant==='720'?1280:768);
  assert.equal(index.samples.at(-1).offset+index.samples.at(-1).size,bytes.length);
  index.samples.forEach((s,i)=>{assert.equal(index.keys[i],i);assert.ok(s.size>0);assert.ok(s.offset+s.size<=bytes.length);});
 }
});
