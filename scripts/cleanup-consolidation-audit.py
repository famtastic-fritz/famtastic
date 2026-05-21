#!/usr/bin/env python3
"""Read-only cleanup/consolidation audit for FAMtastic Phase 1/Phase 2 transition."""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path('/Users/famtasticfritz/famtastic')
OBS = ROOT / 'shay-shay' / 'observations'
RUN_ID = dt.datetime.now().strftime('%Y-%m-%d_%H%M%S')
AUDIT = OBS / 'CLEANUP-CONSOLIDATION-AUDIT-2026-05-21.md'
COMMIT_PLAN = OBS / 'CLEANUP-CONSOLIDATION-COMMIT-PLAN-2026-05-21.md'
JSON_OUT = OBS / 'CLEANUP-CONSOLIDATION-AUDIT-2026-05-21.json'

SKIP_DIRS = {'.git', 'node_modules', '.venv', 'venv', 'dist', 'build', '.next', '.cache', '__pycache__'}
TEXT_EXTS = {'.md', '.txt', '.json', '.js', '.ts', '.tsx', '.py', '.sh', '.yml', '.yaml', '.toml', '.html', '.css'}
SECRET_PATTERNS = [
    re.compile(r'pplx-[A-Za-z0-9]{20,}'),
    re.compile(r'sk-[A-Za-z0-9_-]{20,}'),
    re.compile(r'(?i)(api[_-]?key|secret|token)\s*[:=]\s*["\']?[A-Za-z0-9_./+:-]{16,}'),
]


def run(cmd: list[str], cwd: Path = ROOT, timeout: int = 120) -> dict:
    try:
        p = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True, timeout=timeout)
        return {'cmd': ' '.join(cmd), 'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr}
    except Exception as e:
        return {'cmd': ' '.join(cmd), 'exit': 999, 'stdout': '', 'stderr': repr(e)}


def lines(s: str) -> list[str]:
    return [x for x in s.splitlines() if x.strip()]


def parse_status(short: str) -> list[dict]:
    out = []
    for line in short.splitlines():
        if not line.strip():
            continue
        status = line[:2]
        path = line[3:]
        out.append({'status': status, 'path': path, 'top': path.split('/', 1)[0]})
    return out


def read_text(path: Path, limit: int = 200_000) -> str | None:
    try:
        if path.stat().st_size > limit:
            return None
        if path.suffix.lower() not in TEXT_EXTS and path.name not in {'AGENTS.md', 'CLAUDE.md'}:
            return None
        return path.read_text(errors='replace')
    except Exception:
        return None


def walk_candidate_files(base: Path):
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not (d == 'repos' and '_tool-probes' in root)]
        rootp = Path(root)
        for f in files:
            p = rootp / f
            try:
                rel = p.relative_to(ROOT)
            except Exception:
                rel = p
            yield p, rel


def find_role_docs() -> list[str]:
    hits = []
    names = {'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'CODEX.md', 'COWORK.md', 'COWORKER.md', '.cursorrules'}
    for p, rel in walk_candidate_files(ROOT):
        if p.name in names or 'agent' in p.name.lower() and p.suffix.lower() == '.md':
            hits.append(str(rel))
    return sorted(set(hits))[:200]


def find_plan_files() -> list[dict]:
    hits = []
    for p, rel in walk_candidate_files(ROOT):
        rels = str(rel)
        if not (('/plans/' in rels) or rels.startswith('plans/') or '/.shay/plans/' in rels or rels.endswith('PLAN.md') or 'plan' in p.name.lower()):
            continue
        text = read_text(p, limit=120_000)
        if text is None:
            continue
        status = None
        m = re.search(r'(?im)^status\s*[:=]\s*([A-Za-z_ -]+)', text)
        if m:
            status = m.group(1).strip()
        if 'Phase 2' in text or 'Visual Workflows' in text or 'Brand Systems' in text:
            tag = 'phase2-related'
        elif 'Phase 1' in text or 'Waves 1' in text or 'Wave 7' in text:
            tag = 'phase1-related'
        else:
            tag = 'legacy-or-unclassified'
        hits.append({'path': rels, 'status': status, 'tag': tag})
    return hits[:500]


def search_refs(patterns: list[str], limit: int = 200) -> list[dict]:
    regexes = [re.compile(p, re.I) for p in patterns]
    hits = []
    for p, rel in walk_candidate_files(ROOT):
        text = read_text(p, limit=180_000)
        if not text:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if any(r.search(line) for r in regexes):
                hits.append({'path': str(rel), 'line': i, 'text': line.strip()[:240]})
                break
        if len(hits) >= limit:
            break
    return hits


def scan_secret_paths(changed_paths: list[str]) -> list[str]:
    findings = []
    for rels in changed_paths:
        p = ROOT / rels
        if not p.exists() or p.is_dir():
            continue
        text = read_text(p, limit=500_000)
        if not text:
            continue
        if any(r.search(text) for r in SECRET_PATTERNS):
            findings.append(rels)
    return findings


def classify_changed(items: list[dict]) -> dict[str, list[str]]:
    buckets = {
        'phase1_foundation_likely_commit': [],
        'phase2_active_plan_likely_commit': [],
        'agent_role_docs_review_before_commit': [],
        'legacy_pre_shay_shay_preserve_or_archive': [],
        'tool_probes_or_vendor_review_before_commit': [],
        'captures_preserve_review_before_commit': [],
        'desktop_or_large_app_review_before_commit': [],
        'unknown_review_before_commit': [],
    }
    for it in items:
        path = it['path']
        if path.startswith(('lib/famtastic/', 'tests/', 'scripts/research-job.js', 'scripts/data-center-ingest.js', 'scripts/mission-control-report.js', 'scripts/media-studio-plan.js', 'scripts/component-studio-search.js', 'scripts/post-eval-phase1.js', 'scripts/witness-check.js', 'site-studio/lib/research-', 'site-studio/tests/', 'media-studio/', 'data-center/', 'second-brain/', 'specs/00')) or path in {'SITE-LEARNINGS.md', 'CHANGELOG.md', 'FAMTASTIC-STATE.md'}:
            buckets['phase1_foundation_likely_commit'].append(path)
        elif 'phase2' in path.lower() or 'visual-workflows' in path.lower() or 'brand' in path.lower():
            buckets['phase2_active_plan_likely_commit'].append(path)
        elif path in {'AGENTS.md', 'CLAUDE.md', 'AGENT-COORDINATION.md'} or path.endswith('/AGENTS.md') or path.endswith('/CLAUDE.md'):
            buckets['agent_role_docs_review_before_commit'].append(path)
        elif path.startswith(('plans/', 'docs/platform-refresh/', 'memory/do-not-repeat/', '.wolf/')):
            buckets['legacy_pre_shay_shay_preserve_or_archive'].append(path)
        elif path.startswith(('_tool-probes/', 'skills/', '.claude/skills/', 'remotion/', 'mbsh-recipe-test/')):
            buckets['tool_probes_or_vendor_review_before_commit'].append(path)
        elif path.startswith('captures/') or path.startswith('memory/'):
            buckets['captures_preserve_review_before_commit'].append(path)
        elif path.startswith(('shay-desktop', 'shay-shay/')):
            buckets['desktop_or_large_app_review_before_commit'].append(path)
        else:
            buckets['unknown_review_before_commit'].append(path)
    return buckets


def main() -> None:
    OBS.mkdir(parents=True, exist_ok=True)
    commands = {
        'branch': run(['git', 'branch', '--show-current']),
        'head': run(['git', 'rev-parse', '--short', 'HEAD']),
        'status_short': run(['git', 'status', '--short']),
        'diff_stat': run(['git', 'diff', '--stat']),
        'diff_name_only': run(['git', 'diff', '--name-only']),
        'untracked': run(['git', 'ls-files', '--others', '--exclude-standard']),
        'worktrees': run(['git', 'worktree', 'list', '--porcelain']),
        'recent_log': run(['git', 'log', '--oneline', '--decorate', '-20']),
        'plan_audit': run(['node', 'scripts/plans/audit.js'], timeout=180),
    }
    status_items = parse_status(commands['status_short']['stdout'])
    changed_paths = [i['path'] for i in status_items]
    buckets = classify_changed(status_items)
    role_docs = find_role_docs()
    plans = find_plan_files()
    server_mod_refs = search_refs(['server\\.js.*(modul|split|decompos|extract)', '(modul|split|decompos|extract).*server\\.js', 'server modular', 'reduce.*server'], 200)
    cowork_refs = search_refs(['cowork', 'codex', 'gemini', 'claude code', 'role at start', 'agent role'], 200)
    secret_paths = scan_secret_paths(changed_paths)

    # Worktree summaries
    worktree_paths = []
    for line in commands['worktrees']['stdout'].splitlines():
        if line.startswith('worktree '):
            worktree_paths.append(Path(line.split(' ', 1)[1]))
    worktree_summaries = []
    for wt in worktree_paths:
        if wt == ROOT:
            continue
        worktree_summaries.append({
            'path': str(wt),
            'branch': run(['git', 'branch', '--show-current'], wt).get('stdout', '').strip(),
            'head': run(['git', 'rev-parse', '--short', 'HEAD'], wt).get('stdout', '').strip(),
            'status_short': run(['git', 'status', '--short'], wt).get('stdout', '')[:4000],
            'diff_stat': run(['git', 'diff', '--stat'], wt).get('stdout', '')[:4000],
            'last_commit': run(['git', 'log', '-1', '--oneline'], wt).get('stdout', '').strip(),
        })

    data = {
        'run_id': RUN_ID,
        'commands': commands,
        'status_items': status_items,
        'buckets': buckets,
        'role_docs': role_docs,
        'plans': plans,
        'server_mod_refs': server_mod_refs,
        'cowork_refs': cowork_refs,
        'secret_paths': secret_paths,
        'worktree_summaries': worktree_summaries,
    }
    JSON_OUT.write_text(json.dumps(data, indent=2))

    def section(title: str, body: str = '') -> str:
        return f"\n## {title}\n{body}\n"

    md = [f"# Cleanup & Consolidation Audit — 2026-05-21\n\nRun ID: `{RUN_ID}`\n"]
    md.append(section('Repository State', f"Branch: `{commands['branch']['stdout'].strip()}`\n\nHEAD: `{commands['head']['stdout'].strip()}`\n\nChanged entries: {len(status_items)}\n\nPlan audit exit: {commands['plan_audit']['exit']}\n"))
    md.append(section('Safety Flags', '\n'.join([f"- Potential secret-looking content path: `{p}`" for p in secret_paths]) if secret_paths else '- No secret-looking patterns found in changed text files scanned.'))
    md.append(section('Changed File Classification', '\n'.join(f"### {k}\n" + ('\n'.join(f"- `{p}`" for p in v[:120]) if v else '- none') for k, v in buckets.items())))
    md.append(section('Plan Inventory Snapshot', '\n'.join(f"- `{p['path']}` — status: `{p['status']}` — {p['tag']}" for p in plans[:200]) or '- none'))
    md.append(section('Agent Role Docs Found', '\n'.join(f"- `{p}`" for p in role_docs) or '- none'))
    md.append(section('Server Modularization / Refactor References', '\n'.join(f"- `{h['path']}:{h['line']}` — {h['text']}" for h in server_mod_refs[:120]) or '- none'))
    md.append(section('Cowork / Agent Role References', '\n'.join(f"- `{h['path']}:{h['line']}` — {h['text']}" for h in cowork_refs[:120]) or '- none'))
    wt_md = []
    for wt in worktree_summaries:
        wt_md.append(f"### {wt['path']}\n- branch: `{wt['branch']}`\n- head: `{wt['head']}`\n- last commit: `{wt['last_commit']}`\n- status:\n```\n{wt['status_short'] or '(clean)'}\n```\n- diff stat:\n```\n{wt['diff_stat'] or '(none)'}\n```\n")
    md.append(section('Worktree Summaries', '\n'.join(wt_md) or '- none'))
    md.append(section('Raw Git Status', f"```\n{commands['status_short']['stdout'][:20000]}\n```"))
    md.append(section('Plan Audit Output', f"```\n{commands['plan_audit']['stdout'][:12000]}\n{commands['plan_audit']['stderr'][:4000]}\n```"))
    AUDIT.write_text('\n'.join(md))

    cp = ["# Cleanup & Consolidation Commit Plan — 2026-05-21\n"]
    cp.append("## Rule\nDo not run `git add .`. Stage only reviewed paths. Do not delete old work; park/index it.\n")
    cp.append("## Recommended Commit Sequence\n")
    cp.append("1. `docs: capture Phase 1 foundation and Phase 2 direction` — docs/specs/observations/plan files only after review.\n")
    cp.append("2. `feat: add research and post-evaluation foundation` — Data Center, research router, second brain, post-eval, mission control, tests.\n")
    cp.append("3. `feat: add media and component planning substrates` — media-studio, component-studio, related scripts/tests/specs.\n")
    cp.append("4. `feat: add Site Studio quality-flow context` — server hook, quality-flow module/tests.\n")
    cp.append("5. `docs: archive pre-Shay-Shay plan backlog` — only after creating an index/parking doc; no deletions.\n")
    cp.append("\n## Hold / Review Before Commit\n")
    cp.append("- `_tool-probes/repos/` and other cloned third-party repos: keep as local probes or convert to URLs/ledger before committing.\n")
    cp.append("- `captures/inbox/` and `captures/review/`: preserve, but review whether raw capture files belong in repo or Data Center ingestion only.\n")
    cp.append("- `shay-shay/`, `shay-desktop*`: large/untracked app directories need separate review before staging.\n")
    cp.append("- agent role docs need a dedicated rewrite pass for the new research-first/post-eval/Phase 2 doctrine.\n")
    cp.append("\n## Safe Next Command Pattern\nUse `git add <explicit paths>` only after reading this audit. Run focused tests before each commit.\n")
    COMMIT_PLAN.write_text('\n'.join(cp))

    print(f"Audit written: {AUDIT}")
    print(f"Commit plan written: {COMMIT_PLAN}")
    print(f"JSON written: {JSON_OUT}")
    print(f"Changed entries: {len(status_items)}")
    print(f"Potential secret paths: {len(secret_paths)}")


if __name__ == '__main__':
    main()
