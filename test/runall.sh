#!/bin/bash
# Baut alle mk*-Proben neu aus index.html und lässt sie headless laufen.
# Ausgabe: eine Zeile pro Probe (GRUEN/ROT + Detail). Aufruf: bash test/runall.sh
# Timing-Flakes (z. B. mkreveal): bis zu 3 Versuche pro Probe — ROT erst,
# wenn alle Versuche fehlschlagen. NICHT parallel zu Balance-Sims laufen
# lassen (CPU-Druck macht die Proben flaky).
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
BASE="file://C:/Users/Fahad/OneDrive/Desktop/Naruto%20TGC/test"
cd "$(dirname "$0")/.." || exit 1
pass=0; fail=0
for name in smoke story map reveal win log hit defpos formation deck stats shop qol board; do
  if ! node "test/mk$name.js" >/dev/null 2>&1; then echo "$name | BUILD-FEHLER"; fail=$((fail+1)); continue; fi
  marker=$(echo "$name" | tr '[:lower:]' '[:upper:]')
  [ "$name" = "formation" ] && marker=FORM # Marker der Probe ist FORM|, nicht FORMATION|
  budget=32000; [ "$name" = "formation" ] && budget=48000 # Worst-Case ~31 s
  ok=0; detail=''
  for try in 1 2 3; do
    out=$("$CHROME" --headless --disable-gpu --user-data-dir=$(mktemp -d) --virtual-time-budget=$budget --dump-dom "$BASE/$name.gen.html" 2>/dev/null)
    if echo "$out" | grep -q "$marker|OK\|$marker|CLEAN"; then ok=1; break; fi
    detail=$(echo "$out" | grep -o "$marker|FAIL[^<]*" | head -c 500)
    [ -z "$detail" ] && detail="(kein Marker im DOM, $(echo "$out" | wc -c) Bytes)"
  done
  if [ "$ok" = 1 ]; then echo "$name | GRUEN"; pass=$((pass+1));
  else echo "$name | ROT: $detail"; fail=$((fail+1)); fi
done
echo "== $pass gruen, $fail rot =="
