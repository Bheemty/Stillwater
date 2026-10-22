"""Regenerate the included scroll assets. Originals are never modified.

pip install imageio-ffmpeg
python scripts/prepare_media.py "C:/path/to/folder/with/1.mp4-to-6.mp4"
"""
import argparse,json,shutil,subprocess
from pathlib import Path
import imageio_ffmpeg

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'public/media'
root.mkdir(parents=True,exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();manifest=[]
for clip in range(1,7):
    source=args.source/f'{clip}.mp4'
    if not source.is_file():raise FileNotFoundError(source)
    folder=root/str(clip)
    for width,variant in [(1280,'desktop'),(768,'mobile'),(640,'mobile640')]:
        dest=folder/variant;dest.mkdir(parents=True,exist_ok=True)
        subprocess.run([ffmpeg,'-y','-v','error','-i',str(source),'-an','-vf',f'fps=24,scale={width}:-2','-c:v','libwebp','-quality','80','-compression_level','4',str(dest/'%04d.webp')],check=True)
    files=list((folder/'desktop').glob('*.webp'))
    manifest.append({'clip':clip,'count':len(files),'fps':24,'desktopBytes':sum(p.stat().st_size for p in files),'mobileBytes':sum(p.stat().st_size for p in (folder/'mobile').glob('*.webp')),'mobile640Bytes':sum(p.stat().st_size for p in (folder/'mobile640').glob('*.webp')),'mobile640Count':len(list((folder/'mobile640').glob('*.webp')))})
    for label,n in [('start',1),('end',len(files))]:
        shutil.copyfile(folder/'desktop'/f'{n:04d}.webp',root/f'{clip}-{label}.webp')
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
