// Small ISO-BMFF index reader for our video-only, constant-rate, no-B-frame AVC
// delivery files. Sample offsets are validated before any decoder input is used.
export function parseVideoIndex(buffer){
 const view=new DataView(buffer),bytes=new Uint8Array(buffer),text=(o,n)=>String.fromCharCode(...bytes.subarray(o,o+n));
 function boxes(start,end){const out=[];for(let p=start;p+8<=end;){let size=view.getUint32(p),header=8;if(size===1){size=Number(view.getBigUint64(p+8));header=16;}if(!size)size=end-p;if(size<header||p+size>end)break;out.push({type:text(p+4,4),start:p,data:p+header,end:p+size});p+=size;}return out;}
 const child=(box,type)=>boxes(box.data,box.end).find(b=>b.type===type);
 const moov=boxes(0,buffer.byteLength).find(b=>b.type==='moov');
 if(!moov)throw Error('Movie index is not in the first header range');
 let stbl;
 for(const trak of boxes(moov.data,moov.end).filter(b=>b.type==='trak')){
  const mdia=child(trak,'mdia'),minf=mdia&&child(mdia,'minf');const candidate=minf&&child(minf,'stbl');
  if(candidate&&child(candidate,'stsd')){stbl=candidate;break;}
 }
 if(!stbl)throw Error('Video sample table missing');
 const table=type=>{const b=child(stbl,type);if(!b)throw Error(`Missing ${type}`);return b.data;};
 const stsd=table('stsd'),entry=boxes(stsd+8,stbl.end)[0];
 if(!entry||entry.type!=='avc1')throw Error('Expected AVC video');
 const avcC=boxes(entry.data+78,entry.end).find(b=>b.type==='avcC');
 if(!avcC)throw Error('AVC decoder configuration missing');
 const description=buffer.slice(avcC.data,avcC.end),avc=new Uint8Array(description);
 const codec='avc1.'+[avc[1],avc[2],avc[3]].map(b=>b.toString(16).padStart(2,'0')).join('');
 const sz=table('stsz'),fixed=view.getUint32(sz+4),count=view.getUint32(sz+8);
 const sizes=Array.from({length:count},(_,i)=>fixed||view.getUint32(sz+12+i*4));
 const chunkBox=child(stbl,'stco')||child(stbl,'co64');if(!chunkBox)throw Error('Chunk offsets missing');
 const n=view.getUint32(chunkBox.data+4),wide=chunkBox.type==='co64';
 const chunks=Array.from({length:n},(_,i)=>wide?Number(view.getBigUint64(chunkBox.data+8+i*8)):view.getUint32(chunkBox.data+8+i*4));
 const sc=table('stsc'),entries=Array.from({length:view.getUint32(sc+4)},(_,i)=>({first:view.getUint32(sc+8+i*12),samples:view.getUint32(sc+12+i*12)}));
 const samples=[];let group=0,index=0;
 for(let c=0;c<chunks.length;c++){
  while(group+1<entries.length&&c+1>=entries[group+1].first)group++;
  let offset=chunks[c];for(let j=0;j<entries[group].samples&&index<count;j++,index++){samples.push({offset,size:sizes[index]});offset+=sizes[index];}
 }
 if(samples.length!==count)throw Error('Incomplete sample index');
 const ss=child(stbl,'stss'),keys=ss?Array.from({length:view.getUint32(ss.data+4)},(_,i)=>view.getUint32(ss.data+8+i*4)-1):samples.map((_,i)=>i);
 return {codec,description,width:view.getUint16(entry.data+24),height:view.getUint16(entry.data+26),samples,keys};
}
