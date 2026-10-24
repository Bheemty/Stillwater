from pathlib import Path
import subprocess,json,sys
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
src=Path(sys.argv[1])
dest=Path(__file__).resolve().parents[1]/'public/media';dest.mkdir(exist_ok=True,parents=True)
clips=[(0,480),(0,240),(0,192),(0,151),(3,192),(0,192)]
filters=[]
for i,(start,end) in enumerate(clips):filters.append(f'[{i}:v]trim=start_frame={start}:end_frame={end},setpts=PTS-STARTPTS[v{i}]')
filters.append(''.join(f'[v{i}]' for i in range(6))+'concat=n=6:v=1:a=0,scale=WIDTH:-2,setsar=1[out]')
version='keyframes'
gop=1
crf=22
report={'fps':24,'frames':1444,'sourceStarts':[0,480,720,912,1063,1252],'sourceFirstFrames':[1,1,1,1,4,1],'files':[]}
for width,label in [(1280,'720'),(768,'432')]:
 out=dest/f'journey-{version}-{label}.mp4'
 cmd=[str(ff),'-hide_banner','-v','warning']
 for n in range(1,7):cmd+=['-threads','1','-i',str(src/f'{n}.mp4')]
 cmd+=['-filter_complex_threads','1','-filter_complex',';'.join(filters).replace('WIDTH',str(width)),'-map','[out]','-an','-c:v','libx264','-threads','4','-preset','fast','-crf',str(crf),'-g',str(gop),'-keyint_min',str(gop),'-sc_threshold','0','-bf','0','-pix_fmt','yuv420p','-movflags','+faststart','-fps_mode','cfr','-r','24','-y',str(out)]
 print('ENCODING',out,flush=True);subprocess.run(cmd,check=True)
 report['files'].append({'file':out.name,'width':width,'height':width*9//16,'bytes':out.stat().st_size,'crf':crf,'gop':gop})
 print(report['files'][-1],flush=True)
(dest/f'journey-{version}.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)

