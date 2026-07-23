# Generiert die 8 Story-Bilder des Zeitreise-Bogens per gemini-image-CLI + PIL.
# Szenen -> Breite 1536 px (JPG q85), Map -> exakt 1408x768. Idempotent.
import os
import subprocess
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRV = os.path.join(os.path.expanduser('~'), '.kimi-code', 'mcp', 'gemini-image', 'server.js')
RAW = os.path.join(ROOT, 'assets', 'story', 'raw_zeitreise')
OUT = os.path.join(ROOT, 'assets', 'story')
os.makedirs(RAW, exist_ok=True)

JOBS = [
    ('30-rinnegan-himmel',
     'giant glowing purple Rinnegan eye with concentric ripple rings in dark night sky above a futuristic neon ninja city, dramatic clouds, plain anime screencap illustration, cel-shaded Naruto style, no text, no logo, no watermark',
     'scene'),
    ('31-zeitsog',
     'swirling chakra time vortex, purple and cyan energy spiral in night sky pulling two small silhouettes upward, dramatic, anime screencap, cel-shaded Naruto style, no text',
     'scene'),
    ('32-konoha-past',
     'Konoha Hidden Leaf Village panorama at daylight, Hokage Rock with four carved faces, wooden houses, green cliffs, blue sky, Naruto anime screencap, cel-shaded, no text',
     'scene'),
    ('33-bruecke',
     'huge suspension bridge over foggy sea at dawn, thick mist, wooden planks and steel cables, moody blue-grey atmosphere, Naruto anime screencap, cel-shaded, no text',
     'scene'),
    ('34-pruefungswald',
     'gigantic ancient forest with colossal trees, hanging vines, eerie green light rays, Forest of Death, Naruto anime screencap, cel-shaded, no text',
     'scene'),
    ('35-amegakure',
     'rain-soaked industrial ninja village of tall steel towers and pipes, endless rain, grey-blue gloom, Amegakure, Naruto anime screencap, cel-shaded, no text',
     'scene'),
    ('37-roter-mond',
     'blood-red full moon with purple Rinnegan ripple pattern in dark cloudy sky over a ruined battlefield crater, ominous glow, Naruto anime screencap, cel-shaded, no text',
     'scene'),
    ('24-map-past',
     'illustrated fantasy game map of a hidden leaf ninja village region: central village with cliff of carved faces, big bridge over water, dense forest, village gates, rainy steel towers in the distance, parchment-style map illustration, muted colors, no text, no labels',
     'map'),
]

fails = []
for name, prompt, kind in JOBS:
    dst = os.path.join(OUT, name + '.jpg')
    if os.path.exists(dst):
        print('SKIP', name)
        continue
    png = os.path.join(RAW, name + '.png')
    if not os.path.exists(png) or os.path.getsize(png) < 30000:
        r = subprocess.run(['node', SRV, '--prompt', prompt, '--out', png,
                            '--aspect', '16:9', '--size', '1K'],
                           capture_output=True, text=True, timeout=180)
        if r.returncode != 0 or not os.path.exists(png):
            print('FAIL', name, (r.stderr or r.stdout or '')[:160])
            fails.append(name)
            continue
        print('GEN ', name)
    im = Image.open(png).convert('RGB')
    if kind == 'map':
        # exakt 1408x768: erst auf Ziel-Seitenverhaeltnis center-croppen, dann resizen
        tw, th = 1408, 768
        src_ar = im.width / im.height
        dst_ar = tw / th
        if src_ar > dst_ar:
            nw = int(im.height * dst_ar)
            x = (im.width - nw) // 2
            im = im.crop((x, 0, x + nw, im.height))
        else:
            nh = int(im.width / dst_ar)
            y = (im.height - nh) // 2
            im = im.crop((0, y, im.width, y + nh))
        im = im.resize((tw, th), Image.LANCZOS)
    else:
        if im.width != 1536:
            im = im.resize((1536, int(im.height * 1536 / im.width)), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=85)
    print('JPG ', name, im.size)

print('FERTIG, fails:', len(fails), fails)
sys.exit(1 if fails else 0)
