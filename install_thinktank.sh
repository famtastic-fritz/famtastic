#!/usr/bin/env bash
# ==========================================================
# 🧪 FAMtastic Think-Tank — install_thinktank.sh
# Sets up Think-Tank repo at ~/famtastic-think-tank,
# installs OCR/Whisper/CSV viz dependencies, creates fam-idea shortcut.
# ==========================================================

set -euo pipefail

REPO_DIR="$HOME/famtastic-think-tank"
PROFILE="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && PROFILE="$HOME/.bashrc"

# ---------- Clone / Update Repo ----------
echo "[+] Installing Think-Tank repo at $REPO_DIR"
# The remote repository does not exist yet. We are building it locally.
# if [ -d "$REPO_DIR/.git" ]; then
#   git -C "$REPO_DIR" pull --rebase
# else
#   git clone https://github.com/famtastic-dev/famtastic-think-tank.git "$REPO_DIR"
# fi

# ---------- Python Virtual Environment ----------
echo "[+] Setting up Python virtual environment"
python3 -m venv "$REPO_DIR/.venv"
source "$REPO_DIR/.venv/bin/activate"
python3 -m pip install --upgrade pip
python3 -m pip install whisper pdfplumber pymupdf pandas matplotlib

# ---------- Node / NPM deps (for diagrams) ----------
echo "[+] Installing Node.js dependencies"
npm install -g mermaid-cli

# ---------- Think-Tank CLI shortcut ----------
echo "[+] Creating Think-Tank CLI shortcut"
mkdir -p "$HOME/.famtastic-bin"

cat > "$REPO_DIR/scripts/idea.sh" <<'EOF'
#!/usr/bin/env bash
# Wrapper for Think-Tank idea lifecycle commands
case "$1" in
  capture)   shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/capture.py" "$@" ;;
  triage)    shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/triage.py" "$@" ;;
  blueprint) shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/blueprint.py" "$@" ;;
  proto)     shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/prototype.py" "$@" ;;
  validate)  shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/validate.py" "$@" ;;
  learn)     shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/learn.py" "$@" ;;
  digest)    shift; "$HOME/famtastic-think-tank/.venv/bin/python3" "$HOME/famtastic-think-tank/cli/digest.py" "$@" ;;
  *)
    echo "Usage: fam-idea {capture|triage|blueprint|proto|validate|learn|digest}"
    exit 1
    ;;
esac
EOF

chmod +x "$REPO_DIR/scripts/idea.sh"
ln -sf "$REPO_DIR/scripts/idea.sh" "$HOME/.famtastic-bin/fam-idea"

# ---------- PATH Integration ----------
grep -q "famtastic-bin" "$PROFILE" || {
  echo "export PATH="$HOME/.famtastic-bin:$PATH"" >> "$PROFILE"
  echo "export PATH="$HOME/.local/bin:$PATH"" >> "$PROFILE"
  echo "[+] Added ~/.famtastic-bin and ~/.local/bin to PATH in $PROFILE"
}

# ---------- Verification ----------
echo "[+] Verifying Think-Tank install"
fam-idea || true

echo "[✓] Think-Tank installation complete — restart your shell to use fam-idea."