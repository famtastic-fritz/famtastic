#!/usr/bin/env bash
# site/add-site.sh — orchestrate "add a new FAMtastic site"
# Per Recommendation G.4: deploy repo at ~/famtastic-sites/<tag>/, NOT inside Studio repo.
#
# Usage: platform site add <tag> [--from-template <template>] [--github]

set -euo pipefail
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITES_ROOT="${HOME}/famtastic-sites"

TAG="${1:?Usage: site add <tag>}"
shift || true
TEMPLATE=""
PUSH_GITHUB=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-template) TEMPLATE="$2"; shift 2 ;;
    --github)        PUSH_GITHUB=true; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# Validate tag
if [[ ! "$TAG" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Invalid tag: must be lowercase alphanumeric + hyphens (got: $TAG)"; exit 1
fi

DEPLOY_REPO="$SITES_ROOT/$TAG"
SANDBOX="$HOME/famtastic/sites/site-$TAG"

if [[ -d "$DEPLOY_REPO" ]]; then
  echo "site: $DEPLOY_REPO already exists — refusing to overwrite"
  exit 1
fi

echo "site.add: creating $DEPLOY_REPO (deploy repo, sibling of ~/famtastic/)"
mkdir -p "$DEPLOY_REPO"
cd "$DEPLOY_REPO"

# Init git
git init -q -b main

# Apply template
if [[ -n "$TEMPLATE" ]] && [[ -d "$HOME/famtastic/config/site-templates/$TEMPLATE" ]]; then
  cp -r "$HOME/famtastic/config/site-templates/$TEMPLATE/." .
  echo "site.add: applied template $TEMPLATE"
else
  # Default scaffold
  mkdir -p frontend/{css,js,assets/{mascot,backgrounds,brand-mark,icons}} backend/{lib,admin,cron,uploads/approved} config scripts docs
  cat > .gitignore <<'EOF'
.env
.env.*
!.env.example
node_modules/
vendor/
*.log
.DS_Store
EOF
  cat > README.md <<EOF
# $TAG

FAMtastic site. Deploy repo (sibling to ~/famtastic/, NOT nested).
Per repo-separation rule (Recommendation 0.9 + G.4).

Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
fi

# Create the asset workshop sandbox in the hub
mkdir -p "$SANDBOX/assets"
cat > "$SANDBOX/SANDBOX.md" <<EOF
# Asset workshop sandbox for $TAG

This directory is NOT a deploy target. It's where Studio runs media generation
and asset triage. The deploy repo is at: $DEPLOY_REPO

Generated assets get promoted to $DEPLOY_REPO/frontend/assets/ via the asset
workshop pipeline (Recommendation B.3 — fl-003 in the worker queue).
EOF

# Optionally push to GitHub
if $PUSH_GITHUB; then
  if command -v gh >/dev/null; then
    gh repo create "famtastic-fritz/$TAG" --private --source=. --push
    echo "site.add: pushed to github.com/famtastic-fritz/$TAG"
  else
    echo "site.add: gh CLI not installed — skipping GitHub push"
  fi
fi

# Initial commit
git add . && git commit -q -m "Initial scaffold for $TAG" || true

# Write minimal spec.json into the sandbox so Studio knows about the site
SPEC="$SANDBOX/spec.json"
cat > "$SPEC" <<EOF
{
  "tag": "$TAG",
  "site_name": "$TAG",
  "state": "scaffolded",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "site_repo": {
    "path": "$DEPLOY_REPO",
    "remote": "$(git -C "$DEPLOY_REPO" remote get-url origin 2>/dev/null || echo null)"
  },
  "_provenance": "Created via platform site add"
}
EOF

# Log invocation
DAY=$(date +%Y-%m-%d)
mkdir -p "$PLATFORM_ROOT/invocations"
printf '{"ts":"%s","capability":"site.add","args":{"tag":"%s","template":"%s"},"result":"ok"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TAG" "$TEMPLATE" >> "$PLATFORM_ROOT/invocations/$DAY.jsonl"

echo ""
echo "site.add: complete"
echo "  Deploy repo: $DEPLOY_REPO"
echo "  Sandbox:     $SANDBOX"
echo "  Spec:        $SPEC"
echo ""
echo "Next steps:"
echo "  platform db add $TAG dev"
echo "  platform email verify-resend-domain $TAG"
echo "  platform deploy connect-netlify $TAG"
