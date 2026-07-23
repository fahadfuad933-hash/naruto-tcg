#!/usr/bin/env bash
# Kapitel 3: Talk-Porträts (Dialog-Sprites) + Szenenbilder per Gemini generieren
set -u
SRV="$HOME/.kimi-code/mcp/gemini-image/server.js"
mkdir -p assets/story/raw

STYLE="plain anime illustration, cel-shaded Naruto lineart, high detail, no text, no letters, no logo, no watermark, no card frame, no border"
TALK="waist-up portrait, facing the viewer directly as if talking to them, mouth slightly open mid-speech, expressive eyes, dark blurred background with soft rim light, centered"

gen() { # gen <out> <aspect> <size> <prompt> [refs]
  local out="$1" aspect="$2" size="$3" prompt="$4" refs="${5:-}"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  echo "=== GEN $out"
  if [ -n "$refs" ]; then
    node "$SRV" --prompt "$prompt" --out "$out" --aspect "$aspect" --size "$size" --refs "$refs" 2>&1 | tail -2
  else
    node "$SRV" --prompt "$prompt" --out "$out" --aspect "$aspect" --size "$size" 2>&1 | tail -2
  fi
  [ -s "$out" ] && echo "OK   $out" || echo "FAIL $out"
}

R=assets/story/raw

# ---------- Talk-Porträts (Dialog-Sprites, 2:3) ----------
gen $R/talk-kaito.png 2:3 1K "exactly the boy from the reference character sheet (blonde spiky hair, goggles on forehead, oversized neon jacket), $TALK, cocky grin, $STYLE" "assets/story/ref-kaito.png"
gen $R/talk-iruka.png 2:3 1K "exactly the man from the reference portrait (Iruka Umino from Naruto: brown hair in a high ponytail, scar across the nose bridge, green flak jacket), $TALK, warm encouraging expression, $STYLE" "assets/ui/av-iruka.jpg"
gen $R/talk-aya.png 2:3 1K "exactly the woman from the reference portrait (athletic ninja trainer, auburn hair in a high bun, amber eyes, dark green flak jacket), $TALK, challenging smirk, $STYLE" "assets/ui/av-aya.jpg"
gen $R/talk-kotei.png 2:3 1K "exactly the burly man from the reference portrait (ramen cook brawler, white bandana, stained apron, chopsticks behind one ear), $TALK, loud boastful grin, $STYLE" "assets/ui/av-kotei.jpg"
gen $R/talk-teuchi.png 2:3 1K "elderly friendly ramen shop owner, round wrinkled face, grey hair under a white chef bandana, white chef robe, kind warm smile, $TALK, $STYLE"
gen $R/talk-kurogane.png 2:3 1K "exactly the champion from the reference image (tall figure in black-chrome armor, half face half visor, cold eyes), $TALK, intimidating calm, $STYLE" "assets/story/15-kurogane.jpg"
gen $R/talk-shizuka.png 2:3 1K "elegant corporate receptionist woman of the Kagaa-Corp, sleek black bob haircut, thin holographic glasses, dark violet business suit with subtle circuit patterns, polite but icy smile, $TALK, $STYLE"
gen $R/talk-raiga.png 2:3 1K "massive corporate security chief, buzz cut with a lightning-shaped shaved stripe, stern scarred face, dark tactical suit with glowing blue shoulder plates, arms crossed, $TALK, $STYLE"
gen $R/talk-kagaa.png 2:3 1K "tall elderly corporate director, slicked-back silver hair, thin silver goatee, black high-collar suit with glowing silver chakra lines running through the fabric, cold calculating eyes, arrogant thin smile, $TALK, $STYLE"

# ---------- Szenenbilder (16:9) ----------
gen $R/16-kagaa-turm.png 16:9 2K "massive black glass skyscraper of the Kagaa-Corp at night in a futuristic japanese megacity, holographic adverts, flying vehicle light trails, ominous elegant corporate architecture, low angle wide shot, no people in focus, $STYLE"
gen $R/17-echo-archiv.png 16:9 2K "vast dark hall inside a corporate tower: hundreds of floating trading cards inside glass containment cylinders glowing faintly orange, metal catwalks, two small silhouettes of teenagers in the foreground (one boy with an orange hair streak, one blonde boy with goggles), cinematic scale, $STYLE" "assets/story/ref-protagonist.png,assets/story/ref-kaito.png"
gen $R/18-direktor.png 16:9 2K "top-floor executive office at night: huge window front overlooking a neon megacity with a glowing crack in the sky, dark conference table, a tall elderly director with slicked-back silver hair and black high-collar suit with glowing silver lines standing with his back half turned, menacing elegance, $STYLE" "$R/talk-kagaa.png"
gen $R/19-riss-ende.png 16:9 2K "the glowing crack in the night sky above a futuristic megacity slowly calming down and dimming, small luminous card-shaped particles rising from the city into the rift, hopeful cinematic mood, wide shot, no people, $STYLE"

echo "=== FERTIG ==="
ls -la $R
