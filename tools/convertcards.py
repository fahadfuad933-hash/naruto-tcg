# Konvertiert assets/cards/raw/* -> assets/cards/<id>.jpg
# (RGB auf dunklem Grund, max. 512 px, q82). Aufruf: python tools/convertcards.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'cards', 'raw')
OUT = os.path.join(ROOT, 'assets', 'cards')
BG = (16, 20, 42)

os.makedirs(OUT, exist_ok=True)
n = 0
for f in sorted(os.listdir(RAW)):
    src = os.path.join(RAW, f)
    cid, ext = os.path.splitext(f)
    if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        continue
    try:
        im = Image.open(src)
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, BG)
        bg.paste(im, mask=im.split()[3])
        im = bg
        im.thumbnail((512, 512), Image.LANCZOS)
        im.save(os.path.join(OUT, cid + '.jpg'), 'JPEG', quality=82)
        n += 1
    except Exception as e:
        print('FEHLER', f, e)
print('konvertiert:', n)
