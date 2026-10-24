import { filmRect } from './film-layout.js';
export function createFilmRenderer(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});let width=1,height=1;
 return {
  resize(w,h,dpr){width=w;height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);},
  draw(image){const r=filmRect(width,height);ctx.fillStyle='#20251f';ctx.fillRect(0,0,width,height);ctx.drawImage(image,r.x,r.y,r.width,r.height);},
  stats:()=>({renderer:'native-video',gpuTextures:0,drawCalls:0}),dispose(){}
 };
}
