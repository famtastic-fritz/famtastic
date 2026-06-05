#!/usr/bin/env bash
#
# logo-transparent.sh — make a logo's background transparent and clean it up.
#
# Runs on Fritz's Mac (where the image + tools live). Best quality uses rembg
# (ML-based, handles any background); falls back to ImageMagick for solid-color
# (e.g. white) backgrounds. Always does a final trim of empty margins.
#
# Usage:
#   scripts/logo-transparent.sh ~/Downloads/famdlogo.png
#   scripts/logo-transparent.sh ~/Downloads/famdlogo.png ~/Downloads/famd-clean.png
#
# First rembg run downloads a ~170MB model once. Install either tool:
#   pip install rembg           # best
#   brew install imagemagick    # solid-background fallback
#
set -euo pipefail

IN="${1:-}"
[ -n "$IN" ] || { echo "usage: logo-transparent.sh <input-image> [output.png]" >&2; exit 2; }
[ -f "$IN" ] || { echo "not found: $IN" >&2; exit 1; }
OUT="${2:-${IN%.*}-transparent.png}"

have(){ command -v "$1" >/dev/null 2>&1; }
mg(){ have magick && echo magick || echo convert; }

method=""
if have rembg; then
  rembg i "$IN" "$OUT"; method="rembg (ML)"
elif python3 -c "import rembg" 2>/dev/null; then
  python3 -m rembg i "$IN" "$OUT"; method="rembg (ML, python -m)"
elif have magick || have convert; then
  MG="$(mg)"
  # Auto-detect the background color from the top-left corner, so this works for
  # black, white, or any solid background — not just white.
  BG="$("$MG" "$IN" -format '%[pixel:p{0,0}]' info: 2>/dev/null || echo white)"
  # Floodfill from a corner removes ONLY the contiguous background of that color,
  # preserving same-color pixels inside the artwork (e.g. black outlines in letters).
  "$MG" "$IN" -alpha set -bordercolor "$BG" -border 1 \
    -fuzz 12% -fill none -draw "alpha 0,0 floodfill" \
    -shave 1x1 -trim +repage "$OUT"
  method="ImageMagick floodfill (solid bg: $BG)"
  echo "[logo-transparent] removed solid background '$BG'. For soft glows/shadows," >&2
  echo "[logo-transparent] rembg (pip install rembg) gives cleaner edges." >&2
else
  cat >&2 <<EOF
No background-removal tool found. Install one:
  pip install rembg          # best, works on any background
  brew install imagemagick   # quick fallback for solid-color backgrounds
EOF
  exit 1
fi

# Cleanup pass: trim transparent margins (only if ImageMagick is around).
if have magick || have convert; then
  "$(mg)" "$OUT" -trim +repage "$OUT" 2>/dev/null || true
fi

echo "✓ wrote $OUT  (method: $method)"
echo "  Tip: open it on a dark AND light background to check edges before shipping."
