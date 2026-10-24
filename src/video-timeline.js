import { locate, segments, journeyLength } from './data.js';
export const filmFrames = 1444;
export const filmFPS = 24;
export const clipOffsets = [0,480,720,912,1063,1252];
export const clipFirstFrames = [1,1,1,1,4,1];
export const lastFilmTime = (filmFrames - 1) / filmFPS;
export function sourceToFilm(clip, frame) {
  return Math.max(0, Math.min(lastFilmTime,
    (clipOffsets[clip-1] + frame - clipFirstFrames[clip-1]) / filmFPS));
}
export function filmTarget(progress) {
  const pos=locate(progress);
  return sourceToFilm(pos.clip, Math.round(pos.time*filmFPS)+1);
}
export function continuousFilmTarget(progress) {
 const pos=locate(progress);
 return Math.max(0,Math.min(lastFilmTime,clipOffsets[pos.clip-1]/filmFPS + pos.time - (clipFirstFrames[pos.clip-1]-1)/filmFPS));
}
export function filmToSource(time) {
  const index=Math.max(0,Math.min(filmFrames-1,Math.round(time*filmFPS)));
  let clip=6;
  while(clip>1 && index<clipOffsets[clip-1])clip--;
  return {clip,frame:index-clipOffsets[clip-1]+clipFirstFrames[clip-1]};
}
export function progressForFilm(time, preferred) {
  // Preserve intentional holds, including front/middle/rear booking pauses.
  if(Math.abs(filmTarget(preferred)-time)<1.5/filmFPS)return preferred;
  const source=filmToSource(time), t=(source.frame-1)/filmFPS;
  const options=segments.filter(s=>s.clip===source.clip);
  const s=options.find(s=>t>=s.from-1/filmFPS && t<=s.to+1/filmFPS) || options.at(-1);
  if(!s)return 0;
  const fraction=s.to===s.from?0:Math.max(0,Math.min(1,(t-s.from)/(s.to-s.from)));
  return Math.max(0,Math.min(journeyLength,s.start+fraction*s.weight));
}
