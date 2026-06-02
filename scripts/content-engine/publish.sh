#!/usr/bin/env bash
#
# publish.sh — DEPLOY step for the FAMtastic content engine.
#
# HONEST STUB. This script does NOT deploy from this firewalled cloud container
# (no outbound network, no deploy token). It runs the build, then prints the
# EXACT deploy command for the target configured in config.json. The real deploy
# happens on Fritz's Mac, where his deploy token lives in the FAMtastic vault.
#
# It reads the deploy target from config.json and supports two targets:
#   - netlify       (netlify deploy --prod)
#   - github-pages  (git push of dist/ to a Pages branch)
#
# Usage:
#   ./publish.sh            # build + print the deploy command for your target
#   ./publish.sh --deploy   # additionally ATTEMPT the deploy (only works on a
#                           # machine with the CLI + token; refuses if missing)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$DIR/config.json"

# --- tiny JSON readers (no jq dependency) -----------------------------------
json_get() {
  # json_get <dot.path> — naive extractor for top-level/one-level string values.
  node -e "const c=require('$CONFIG');const p='$1'.split('.');let v=c;for(const k of p){v=v?.[k]}process.stdout.write(String(v??''))"
}

DEPLOY_TARGET="$(json_get deploy.target)"
OUTPUT_DIR="$(json_get output_dir)"
NETLIFY_SITE="$(json_get deploy.netlify_site_name)"
PAGES_REPO="$(json_get deploy.github_pages_repo)"
BASE_URL="$(json_get base_url)"
DIST="$DIR/${OUTPUT_DIR:-dist}"

DO_DEPLOY=0
[ "${1:-}" = "--deploy" ] && DO_DEPLOY=1

echo "============================================================"
echo " FAMtastic Content Engine — publish"
echo "============================================================"
echo " Deploy target : ${DEPLOY_TARGET:-<unset>}"
echo " Output dir    : $DIST"
echo " Base URL      : ${BASE_URL:-<unset>}"
echo "------------------------------------------------------------"

# 1. Build (generate + assemble). Always safe — runs fully offline.
echo "Building site (node run.js) ..."
node "$DIR/run.js"

if [ ! -d "$DIST" ]; then
  echo "ERROR: $DIST does not exist after build. Aborting." >&2
  exit 1
fi

echo "------------------------------------------------------------"
echo " DEPLOY COMMAND for target: ${DEPLOY_TARGET:-<unset>}"
echo "------------------------------------------------------------"

case "$DEPLOY_TARGET" in
  netlify)
    cat <<EOF
# Run this on Fritz's Mac (Netlify CLI + auth token required):

  npm install -g netlify-cli          # one-time
  netlify login                       # one-time, opens browser
  netlify deploy --prod \\
    --dir "$DIST" \\
    --site "${NETLIFY_SITE:-<your-netlify-site-name>}"

# Token source: the FAMtastic vault (NETLIFY_AUTH_TOKEN). Export it before
# running in a non-interactive/cron context:
#   export NETLIFY_AUTH_TOKEN="\$(platform/vault/vault.sh get netlify_auth_token)"
EOF
    ;;
  github-pages)
    cat <<EOF
# Run this on Fritz's Mac (gh CLI authed, or an SSH deploy key configured):

  cd "$DIST"
  git init -q
  git checkout -q -B gh-pages
  git add -A
  git commit -q -m "Publish content engine build (\$(date +%F))"
  git remote add origin "git@github.com:${PAGES_REPO:-<owner/repo>}.git" 2>/dev/null || true
  git push -f origin gh-pages

# Then enable Pages once in the repo settings (Branch: gh-pages, /root).
# Token/auth source: the FAMtastic vault (GitHub PAT or SSH deploy key).
EOF
    ;;
  *)
    echo "Unknown deploy target '${DEPLOY_TARGET}'. Set deploy.target in config.json"
    echo "to one of: netlify | github-pages."
    ;;
esac

echo "------------------------------------------------------------"

if [ "$DO_DEPLOY" -eq 1 ]; then
  echo "--deploy requested. Checking prerequisites ..."
  case "$DEPLOY_TARGET" in
    netlify)
      if ! command -v netlify >/dev/null 2>&1; then
        echo "REFUSING: netlify CLI not found. Install it and authenticate first." >&2
        exit 2
      fi
      netlify deploy --prod --dir "$DIST" --site "${NETLIFY_SITE}"
      ;;
    github-pages)
      if ! command -v git >/dev/null 2>&1; then
        echo "REFUSING: git not found." >&2
        exit 2
      fi
      echo "NOTE: review the printed git commands above and run them deliberately."
      echo "Auto-push is intentionally NOT performed to avoid force-pushing by accident."
      ;;
    *)
      echo "No deployable target configured." >&2
      exit 2
      ;;
  esac
else
  echo "Dry run only. Re-run with --deploy on a machine that has the CLI + vault token."
fi

echo "============================================================"
echo
echo "# ---- Sample crontab line (publish 3x/week, 7am, on Fritz's Mac) ----"
echo "# Edit with: crontab -e"
echo "0 7 * * 1,3,5 cd $DIR && /bin/bash ./publish.sh --deploy >> /tmp/content-engine.log 2>&1"
echo
echo "# Tip: keep the cron cadence modest. Publishing a flood of thin pages is"
echo "# exactly what Google's 'scaled content abuse' policy penalizes. Quality"
echo "# and human editing per article beat volume every time."
