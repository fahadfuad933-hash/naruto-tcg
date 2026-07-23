#!/usr/bin/env bash
# Generiert alle UI-Bilder per Gemini (Nano Banana 2) nach assets/ui/raw/
# Aufruf: bash tools/genui.sh
set -u
SRV="$HOME/.kimi-code/mcp/gemini-image/server.js"
OUT="assets/ui/raw"
mkdir -p "$OUT"

STYLE="plain anime illustration, cel-shaded Naruto lineart, high detail, no text, no letters, no logo, no watermark, no card frame, no border"
PORTRAIT="head-and-shoulders portrait, facing slightly toward viewer, dark dojo background with soft orange rim light, centered composition"

gen() { # gen <name> <aspect> <size> <prompt> [refs]
  local name="$1" aspect="$2" size="$3" prompt="$4" refs="${5:-}"
  if [ -s "$OUT/$name.png" ]; then echo "SKIP $name"; return 0; fi
  echo "=== GEN $name ($aspect $size)"
  if [ -n "$refs" ]; then
    node "$SRV" --prompt "$prompt" --out "$OUT/$name.png" --aspect "$aspect" --size "$size" --refs "$refs" 2>&1 | tail -2
  else
    node "$SRV" --prompt "$prompt" --out "$OUT/$name.png" --aspect "$aspect" --size "$size" 2>&1 | tail -2
  fi
  [ -s "$OUT/$name.png" ] && echo "OK   $name" || echo "FAIL $name"
}

# ---------- Avatare: bekannte Naruto-Charaktere ----------
gen av-iruka 1:1 1K "Iruka Umino from Naruto: friendly man with brown hair tied in a high ponytail, a horizontal scar across the bridge of his nose, wearing a green Konoha flak jacket over a blue outfit, $PORTRAIT, $STYLE"
gen av-sasuke 1:1 1K "Sasuke Uchiha from Naruto: pale teenager with spiky black hair tinted dark blue, onyx eyes, high-collared blue shirt, brooding expression, $PORTRAIT, $STYLE"
gen av-gaara 1:1 1K "Gaara from Naruto: teenager with messy crimson-red hair, jade-green eyes with dark eyeliner rings, calm cold expression, brown high-collared desert outfit, $PORTRAIT, $STYLE"
gen av-kakashi 1:1 1K "Kakashi Hatake from Naruto: tall ninja with spiky silver hair, lower face hidden by a dark mask, black forehead protector tilted over his left eye, green flak jacket, relaxed visible eye, $PORTRAIT, $STYLE"
gen av-orochimaru 1:1 1K "Orochimaru from Naruto: very pale man with long straight black hair, golden snake eyes with vertical slits, purple eyeshadow, pale kimono with thick purple rope belt, sinister smile, $PORTRAIT, $STYLE"
gen av-itachi 1:1 1K "Itachi Uchiha from Naruto: young man with long black hair in a low ponytail, tired onyx eyes, black Akatsuki cloak with red cloud pattern, scratched forehead protector, calm expression, $PORTRAIT, $STYLE"

# ---------- Avatare: Original-Charaktere ----------
gen av-genji 1:1 1K "middle-aged muscular ninja trainer with short spiky black hair, grey temples, green forehead protector, teal training gi, whistle on a cord around his neck, encouraging grin, $PORTRAIT, $STYLE"
gen av-aya 1:1 1K "athletic young woman ninja trainer with auburn hair in a high bun, amber eyes, confident smirk, dark green flak jacket, shuriken earrings, $PORTRAIT, $STYLE"
gen av-daigo 1:1 1K "stern veteran ninja master with a grey-streaked black topknot and short beard, sharp dark eyes, orange-red robe with subtle flame embroidery, $PORTRAIT, $STYLE"
gen av-kotei 1:1 1K "burly cheerful ramen cook turned brawler, round friendly face, white bandana, rolled-up sleeves, stained apron, chopsticks tucked behind one ear, big grin, $PORTRAIT, $STYLE"
gen av-kurogane 1:1 1K "head-and-shoulders portrait of exactly the character shown in the reference image, facing slightly toward viewer, dark arena background with orange rim light, $STYLE" "assets/story/15-kurogane.jpg"
gen av-player 1:1 1K "head-and-shoulders portrait of exactly the young ninja shown in the reference character sheet, facing slightly toward viewer, dark dojo background with soft orange rim light, $STYLE" "assets/story/ref-protagonist.png"

# ---------- Duell-Flächen ----------
gen card-back 2:3 1K "glossy game card sleeve back artwork, vertical composition, deep midnight indigo background, one large glowing orange swirl spiral in the center, faint etched leaf motif around it, subtle diagonal light streaks, clean flat anime style, no text, no letters, no logo, no watermark"
gen arena-bg 16:9 2K "ancient dark stone arena floor viewed from a low angle, wide engraved circular chakra seal glowing faintly orange in the center, thin blue chakra veins running between the stone slabs, light mist, night atmosphere, no characters, no creatures, $STYLE"
gen arena-emblem 1:1 1K "single glowing orange spiral chakra seal emblem, intricate concentric etched rings and small rune-like marks around the spiral, perfectly centered on a very dark navy background, symmetrical, no text, no letters, no watermark, flat anime style"

# ---------- Screens ----------
gen title-bg 16:9 2K "futuristic hidden leaf village at night, traditional pagoda towers between dark skyscrapers with faint neon signs, dramatic lightning bolts splitting the sky, orange and teal city glow, cinematic ultra-wide establishing shot, no characters, $STYLE"
gen menu-bg 16:9 1K "very dark blurred anime backdrop, hidden leaf village rooftops at dusk, warm paper lantern bokeh lights, extremely subdued and low contrast so interface text stays readable, no characters, no text, no watermark, cel-shaded Naruto style"
gen win-banner 16:9 1K "victory burst in a ninja arena at night, golden sparks and glowing orange chakra petals exploding upward, warm triumphant light rays, dark background, no characters, $STYLE"
gen lose-banner 16:9 1K "somber battlefield after defeat, one broken kunai stuck in scorched cracked ground, cold blue rain and drifting smoke, dim moonlight, melancholic mood, no characters, $STYLE"

echo "=== FERTIG ==="
ls -la "$OUT"
