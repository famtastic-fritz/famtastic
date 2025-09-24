#!/usr/bin/env bash
# ==========================================================
# 🌟 FAMtastic Hub — install_all.sh
# Installs + configures all 8 agent groups (A–H),
# creates ~/.famtastic-bin with global shortcuts,
# and verifies setup via fam-hub test suite.
# ==========================================================

set -euo pipefail

# ---------- Prep Directories ----------
echo "[+] Preparing directories"
mkdir -p "$HOME/.famtastic-bin"
mkdir -p "$HOME/.local/bin"

PROFILE="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && PROFILE="$HOME/.bashrc"

# Ensure PATH additions are present
grep -q "famtastic-bin" "$PROFILE" || {
  echo "export PATH=\"$HOME/.famtastic-bin:$PATH\"" >> "$PROFILE"
  echo "export PATH=\"$HOME/.local/bin:$PATH\"" >> "$PROFILE"
  echo "[+] Added ~/.famtastic-bin and ~/.local/bin to PATH in $PROFILE"
}

# ---------- Install Group A: Core LLMs ----------
echo "[+] Installing Group A: Core LLMs"

# Ensure Python and pip are available
if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    brew install python3 || true
fi

# Use python3 -m pip for better compatibility
if command -v python3 &> /dev/null; then
    python3 -m python3 -m pip install --upgrade litellm || true
else
    echo "Warning: Python 3 not available, skipping pip packages"
fi

brew install ollama || true

# ---------- Group B: Creative ----------
echo "[+] Installing Group B: Creative"
brew install --cask comfyui || true
python3 -m python3 -m pip install realesrgan || true
brew install inkscape potrace || true

# ---------- Group C: Speech & Audio ----------
echo "[+] Installing Group C: Speech & Audio"
python3 -m pip install git+https://github.com/openai/whisper.git || true
python3 -m pip install git+https://github.com/m-bain/whisperX.git || true
python3 -m pip install coqui-tts || true

# ---------- Group D: OCR / PDF ----------
echo "[+] Installing Group D: OCR / PDF"
brew install tesseract || true
python3 -m pip install paddleocr pymupdf pdfplumber || true

# ---------- Group E: Data & Viz ----------
echo "[+] Installing Group E: Data & Viz"
python3 -m pip install pandas matplotlib mermaid-js plantuml graphviz || true

# ---------- Group F: Memory / Search ----------
echo "[+] Installing Group F: Memory / Search"
python3 -m pip install sqlite-vss || true
brew install qdrant || true
npm install -g playwright || true

# ---------- Group G: Recon ----------
echo "[+] Installing Group G: Recon"
python3 -m pip install feedparser || true

# ---------- Group H: Guardrails ----------
echo "[+] Installing Group H: Guardrails"
python3 -m pip install semgrep trufflehog || true

# ---------- Global Shortcuts ----------
echo "[+] Creating global Famtastic shortcuts"

function link_cmd() {
  local target=$1
  local name=$2
  ln -sf "$PWD/scripts/agents/$target" "$HOME/.famtastic-bin/$name"
  chmod +x "$PWD/scripts/agents/$target"
}

mkdir -p scripts/agents

# Sample wrappers (extend as needed)
cat > scripts/agents/ocr.sh <<'EOF'
#!/usr/bin/env bash
tesseract "$1" "$2" --psm 3
EOF

cat > scripts/agents/pdf.sh <<'EOF'
#!/usr/bin/env bash
python -m pdfplumber "$1"
EOF

cat > scripts/agents/viz.sh <<'EOF'
#!/usr/bin/env bash
python - <<'PY'
import pandas as pd, matplotlib.pyplot as plt, sys
csv = sys.argv[1]
df = pd.read_csv(csv)
df.hist()
plt.show()
PY
EOF

cat > scripts/agents/audio.sh <<'EOF'
#!/usr/bin/env bash
whisper "$1" --model base --output_dir .
EOF

link_cmd ocr.sh fam-ocr
link_cmd pdf.sh fam-pdf
link_cmd viz.sh fam-viz
link_cmd audio.sh fam-audio

# ---------- Verification ----------
echo "[+] Running fam-hub test suite"
if command -v fam-hub &> /dev/null; then
    fam-hub test suite || echo "Warning: fam-hub test suite failed"
else
    echo "Warning: fam-hub command not found, skipping test suite"
fi

echo "[✓] install_all.sh complete — restart your shell to use global shortcuts."
echo "[i] If you encountered disk space issues, free up space and re-run the installer."