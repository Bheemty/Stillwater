// Latest-only seeking: one decoder operation at a time, never a backlog.
export class LatestSeek {
 constructor({read,write,now}){Object.assign(this,{read,write,now});this.target=0;this.busy=false;this.count=0;this.samples=[];this.started=0;}
 request(time){this.target=time;}
 flush(ready){
  if(!ready||this.busy||Math.abs(this.read()-this.target)<1/48)return false;
  this.busy=true;this.started=this.now();
  try{this.write(this.target);this.count++;return true;}catch{this.busy=false;return false;}
 }
 complete(){
  if(this.busy){this.samples.push(this.now()-this.started);if(this.samples.length>240)this.samples.shift();}
  this.busy=false;
 }
 stats(){const sorted=[...this.samples].sort((a,b)=>a-b);return {seeks:this.count,seekP95Ms:sorted[Math.floor(sorted.length*.95)]||0,pendingSeeks:Number(this.busy)};}
}
