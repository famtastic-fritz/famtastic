#!/usr/bin/env python3
"""Nightly memory reflection / consolidation pass for the Shay-Memory vault.

Implements the L0 -> L1 -> L2 -> L3 condensation described in
``_system/MEMORY-SCHEMA-L0-L3.md``. It is intentionally dependency-free
(stdlib only) so it can run from a bare launchd entry or by hand. No network,
no config read, no gateway touch.

Behaviour (idempotent):
  * Scan the vault for L0/L1 notes modified in the last ``--window-hours`` hours
    (default 24), excluding the ``reflections/`` and ``_system/`` trees so the
    pass never feeds on its own output.
  * Write one dated note per layer into ``reflections/{episodic,semantic,reflective}/``.
    Re-running for the same date overwrites only that single dated note.
  * Never edits or moves a pre-existing note outside ``reflections/``.

This pass now performs *generative* consolidation when an auxiliary model is
reachable, falling back to the original *extractive* behaviour (headings +
links, zero LLM) when it is not — so it remains safe to run unattended.

Generative pipeline (the documented swap point — ``summarise_episode`` is now
LLM-backed): replay episodic -> distill semantic (ADD/UPDATE/NOOP, annotate
only, never hard-delete) -> propose cross-note [[wikilink]] edges -> score
candidates by recency x importance -> synthesise L3 reflective candidates
(human-ratified). See ``research/memory-lifecycle-design-2026-05-31.md`` §3(c).

Aux model resolution order (best-effort, all optional):
  1. ``SHAY_AUX_CMD`` env — a shell command that reads the prompt on stdin and
     writes the completion to stdout (e.g. ``ollama run gemma2``). Zero repo
     dependency; preferred for the standalone launchd entry.
  2. The shay-shay auxiliary client, if the repo is importable on sys.path
     (``agent.auxiliary_client.call_llm``).
  3. Extractive fallback (the original behaviour) when neither is available.

``--dry-run`` prints what it would write, touches nothing, makes NO model
call, and always exits 0.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import subprocess
import sys
import traceback
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from proactive_os import (
    append_jsonl,
    build_behavior_steering,
    build_brief_payload,
    build_private_context_record,
    build_private_review_payload,
    build_reinforcement_payload,
    build_source_registry,
    discover_repo_root_captures,
    load_jsonl,
    normalize_intake,
    overwrite_json,
    reflect_items,
    select_private_items,
    source_class_for_path,
    split_atomic_items,
    action_forces_from_items,
)

VAULT = Path(__file__).resolve().parent.parent  # .../Shay-Memory
REFLECT_DIR = VAULT / "reflections"
EPISODIC = REFLECT_DIR / "episodic"
SEMANTIC = REFLECT_DIR / "semantic"
REFLECTIVE = REFLECT_DIR / "reflective"
STATUS_DIR = VAULT / "_system" / "runtime"
STATUS_FILE = STATUS_DIR / "memory-reflect-status.json"
REPO_ROOT = Path(__file__).resolve().parents[3]
PROACTIVE_DIR = STATUS_DIR / "proactive"
SOURCE_REGISTRY_FILE = PROACTIVE_DIR / "source-registry.json"
INTAKE_LEDGER = PROACTIVE_DIR / "intake.jsonl"
ATOMIC_LEDGER = PROACTIVE_DIR / "atomic-items.jsonl"
PRIVATE_LEDGER = PROACTIVE_DIR / "private-context.jsonl"
ACTION_LEDGER = PROACTIVE_DIR / "action-forces.jsonl"
REINFORCEMENT_FILE = PROACTIVE_DIR / "reinforcement.json"
BRIEFING_FILE = PROACTIVE_DIR / "briefing-context.json"
STEERING_FILE = PROACTIVE_DIR / "behavior-steering.json"
PRIVATE_REVIEW_FILE = PROACTIVE_DIR / "private-review.json"
PRIVATE_ACTIONS_FILE = PROACTIVE_DIR / "private-review-actions.json"

# Trees the pass must never read FROM (its own dated output) or recurse into.
# NOTE: ``reflections`` is excluded so the pass never feeds on its own dated
# episodic/semantic/reflective notes — but the per-session memos written by
# the compressor live under ``reflections/episodic/sessions/`` and ARE real
# L1 source material. They are pulled in explicitly via ``SESSIONS_DIR`` in
# ``_iter_source_notes`` so the dreamer sees them without re-consuming its own
# dated reflections.
EXCLUDE_DIRS = {"reflections", "_system", ".git", ".obsidian", ".trash"}

# The session-memo subtree (written by ContextCompressor.on_session_end). It
# lives under the otherwise-excluded ``reflections/`` tree, so it is sourced
# explicitly. See memory-lifecycle-design §6 (the EXCLUDE_DIRS gap).
SESSIONS_DIR = EPISODIC / "sessions"


def _parse_frontmatter(text: str) -> dict:
    """Minimal YAML-ish front-matter reader (key: value + simple lists)."""
    fm: dict = {}
    if not text.startswith("---"):
        return fm
    end = text.find("\n---", 3)
    if end == -1:
        return fm
    block = text[3:end].strip().splitlines()
    key = None
    for line in block:
        if line.startswith("  - ") or line.startswith("- "):
            if key:
                fm.setdefault(key, [])
                if isinstance(fm[key], list):
                    fm[key].append(line.split("-", 1)[1].strip())
            continue
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            fm[key] = val if val else []
    return fm


def _iter_source_notes(window_hours: int):
    """Yield (path, mtime) for L0/L1 notes modified within the window.

    Walks the whole vault except ``EXCLUDE_DIRS`` (which skips the
    ``reflections/`` dated-output tree), then ADDITIONALLY pulls in the
    per-session memos under ``reflections/episodic/sessions/`` — those are
    real L1 source material the compressor wrote, not the dreamer's own
    output, so they must not be skipped along with the rest of
    ``reflections/``.
    """
    cutoff = _dt.datetime.now().timestamp() - window_hours * 3600
    seen: set = set()

    def _emit(p: Path):
        try:
            mtime = p.stat().st_mtime
        except OSError:
            return None
        if mtime < cutoff:
            return None
        rp = p.resolve()
        if rp in seen:
            return None
        seen.add(rp)
        return (p, mtime)

    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for name in files:
            if not name.endswith(".md"):
                continue
            res = _emit(Path(root) / name)
            if res:
                yield res

    # Explicitly include session memos under the otherwise-excluded
    # reflections/ tree.
    if SESSIONS_DIR.is_dir():
        for name in os.listdir(SESSIONS_DIR):
            if not name.endswith(".md"):
                continue
            res = _emit(SESSIONS_DIR / name)
            if res:
                yield res


# ---------------------------------------------------------------------------
# Auxiliary-model bridge — the generative swap point. All optional / best
# effort; every path degrades to extractive so unattended runs never fail.
# ---------------------------------------------------------------------------

# Module-level cache so we resolve the backend once per process.
_AUX_BACKEND = None  # None=unresolved, False=none-available, callable=ready


def _resolve_aux():
    """Resolve an aux-model callable ``fn(prompt: str) -> Optional[str]``.

    Order: SHAY_AUX_CMD shell command -> shay-shay client -> None.
    Cached. Returns ``None`` when no model is reachable (extractive mode).
    """
    global _AUX_BACKEND
    if _AUX_BACKEND is not None:
        return _AUX_BACKEND or None

    cmd = os.environ.get("SHAY_AUX_CMD", "").strip()
    if cmd:
        def _via_cmd(prompt: str):
            try:
                proc = subprocess.run(
                    cmd, shell=True, input=prompt, text=True,
                    capture_output=True, timeout=180,
                )
                if proc.returncode == 0 and proc.stdout.strip():
                    return proc.stdout.strip()
            except Exception:
                return None
            return None
        _AUX_BACKEND = _via_cmd
        return _via_cmd

    # Try the in-repo client only when explicitly allowed (importing it pulls
    # the whole shay-shay package — keep it opt-in so the standalone launchd
    # entry stays dependency-free by default).
    if os.environ.get("SHAY_AUX_USE_CLIENT", "").strip() in ("1", "true", "yes"):
        try:
            from agent.auxiliary_client import call_llm  # type: ignore

            model = os.environ.get("SHAY_AUX_MODEL") or None

            def _via_client(prompt: str):
                try:
                    resp = call_llm(
                        messages=[{"role": "user", "content": prompt}],
                        model=model,
                        temperature=0.3,
                        max_tokens=1200,
                        timeout=180,
                    )
                    if isinstance(resp, str):
                        return resp.strip() or None
                    # call_llm may return an OpenAI-style object.
                    choice = getattr(resp, "choices", [None])[0]
                    if choice is not None:
                        msg = getattr(choice, "message", None)
                        content = getattr(msg, "content", None)
                        if content:
                            return content.strip()
                except Exception:
                    return None
                return None
            _AUX_BACKEND = _via_client
            return _via_client
        except Exception:
            pass

    _AUX_BACKEND = False
    return None


def _read_body(path: Path) -> tuple[str, str]:
    """Return (title, body) for a note. Body excludes front-matter."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return (path.stem, "")
    fm = _parse_frontmatter(text)
    title = fm.get("title") or path.stem
    if isinstance(title, list):
        title = " ".join(title)
    body = text
    if text.startswith("---"):
        e = text.find("\n---", 3)
        if e != -1:
            body = text[e + 4:]
    return (str(title), body)


def _display_rel(path: Path) -> str:
    try:
        return path.relative_to(VAULT).as_posix()
    except ValueError:
        try:
            return path.relative_to(REPO_ROOT).as_posix()
        except ValueError:
            return str(path)


def _extractive_episode(path: Path, title: str, body: str) -> str:
    """Original headings-only extractive summary (LLM-free fallback)."""
    headings = [l.strip() for l in body.splitlines() if l.lstrip().startswith("#")][:6]
    rel = _display_rel(path)
    source_class = _source_class(path)
    lines = [f"### {title}", f"- source: `{rel}`", f"- source_class: `{source_class}`"]
    if headings:
        lines.append("- sections: " + "; ".join(h.lstrip("# ") for h in headings))
    return "\n".join(lines)


def _source_class(path: Path) -> str:
    return source_class_for_path(path, VAULT, REPO_ROOT)


def _note_signal_profile(path: Path, body: str) -> dict:
    """Return a deterministic signal profile for promotion gating."""
    source_class = _source_class(path)
    lowered = body.lower()
    sections = {
        "active_task": "## active task" in lowered,
        "assistant_state": "## final assistant state" in lowered,
        "tool_activity": "## recent tool activity" in lowered,
        "handoff_context": "## compression handoff context" in lowered,
    }
    return {
        "source_class": source_class,
        "char_count": len(body.strip()),
        "line_count": len([line for line in body.splitlines() if line.strip()]),
        "sections": sections,
    }


def _promotion_block_reason(path: Path, body: str) -> str | None:
    """Return a skip reason when a note is too weak for reflection input."""
    profile = _note_signal_profile(path, body)
    if profile["source_class"] == "reflection-output":
        return "reflection-output"
    if profile["source_class"] == "system-doc":
        return "system-doc"
    if profile["source_class"] != "runtime-session":
        return None

    sections = profile["sections"]
    has_session_signal = any(sections.values())
    if not has_session_signal and profile["char_count"] < 220:
        return "runtime-session-low-signal"
    if not sections["active_task"] and not sections["assistant_state"] and profile["line_count"] < 6:
        return "runtime-session-no-task-state"
    return None


def summarise_episode(path: Path, generative: bool = True) -> str:
    """Summary of a single source note.

    Generative (aux model) when one is reachable and ``generative`` is set;
    otherwise the original extractive summary. The contract is unchanged:
    returns a markdown block, or "" when the note can't be read.
    """
    title, body = _read_body(path)
    if not body:
        return ""
    if _promotion_block_reason(path, body):
        return ""
    rel = _display_rel(path)

    if generative:
        aux = _resolve_aux()
        if aux is not None:
            prompt = (
                "You are Shay's offline memory-consolidation agent (a 'dream' "
                "pass). Read the session/source note below and write a tight "
                "episodic narrative in 3-6 sentences: what happened, what was "
                "decided, and what is still open. Separate observation from "
                "interpretation: report what happened, do not speculate beyond "
                "the note. Ignore operational noise like bare timestamps, file "
                "counts, or command chatter unless they materially changed a "
                "decision. Do not invent facts. Never include secrets/keys/tokens — write [REDACTED]. Output only "
                "the narrative, no preamble.\n\n"
                f"# {title}\n\n{body[:8000]}"
            )
            out = aux(prompt)
            if out:
                return f"### {title}\n- source: `{rel}`\n- source_class: `{_source_class(path)}`\n\n{out.strip()}"
    return _extractive_episode(path, title, body)


def _write_status(payload: dict) -> None:
    STATUS_DIR.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _write(path: Path, content: str, dry: bool) -> None:
    if dry:
        print(f"[dry-run] would write {path} ({len(content)} bytes)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"wrote {path}")


def _load_private_review_actions() -> dict[str, dict]:
    if not PRIVATE_ACTIONS_FILE.exists():
        return {}
    try:
        payload = json.loads(PRIVATE_ACTIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}
    entries = payload.get("entries") if isinstance(payload, dict) else None
    if not isinstance(entries, list):
        return {}
    action_map: dict[str, dict] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        item_id = str(entry.get("item_id") or "").strip()
        action = str(entry.get("action") or "review").strip().lower()
        if not item_id or action not in {"review", "approve", "suppress"}:
            continue
        action_map[item_id] = {
            "action": action,
            "note": entry.get("note"),
            "acted_at": entry.get("acted_at"),
        }
    return action_map


def _score_candidate(path: Path, mtime: float, window_hours: int) -> float:
    """recency x importance heuristic (Generative-Agents triad, LLM-free).

    recency: linear decay across the window. importance: session memos and
    notes that mention decisions / constraints score higher. Bounded [0,1].
    """
    now = _dt.datetime.now().timestamp()
    span = max(window_hours * 3600, 1)
    recency = max(0.0, min(1.0, 1.0 - (now - mtime) / span))
    importance = 0.4
    try:
        head = path.read_text(encoding="utf-8", errors="replace")[:2000].lower()
    except OSError:
        head = ""
    if "session-memo" in head or "memo_schema" in head:
        importance = 0.9
    for kw in ("decision", "constraint", "do-not-repeat", "blocked", "pending"):
        if kw in head:
            importance = min(1.0, importance + 0.1)
    return round(0.5 * recency + 0.5 * importance, 3)


def _distill_semantic(episodes_text: str, dry: bool) -> str:
    """Generative L2 distillation (aux model). Returns markdown candidates.

    Annotate-only: proposes ADD/UPDATE/NOOP facts; never hard-deletes.
    Falls back to a stub line when no model is available.
    """
    if dry:
        return "_(dry-run: distillation skipped — no model call)_"
    aux = _resolve_aux()
    if aux is None:
        return "_(extractive mode: no aux model — promote facts by hand)_"
    prompt = (
        "You are Shay's memory dreamer distilling DURABLE semantic facts from "
        "today's episodic narratives. For each durable fact about Fritz, the "
        "projects, decisions, or standing methods, emit one bullet prefixed "
        "with its operation: [ADD] new fact, [UPDATE] refines an existing one, "
        "or [NOOP] already known. Annotate only — never propose deletion. Be "
        "terse and de-duplicated. Promote only facts that are explicit durable "
        "preferences, recurring constraints, standing architecture rules, or "
        "decisions likely to matter beyond this week. Mark one-off task status, "
        "ephemeral command output, timestamps, file counts, and transient "
        "debug chatter as [NOOP]. Never include secrets — write [REDACTED]. "
        "Output only the bullet list.\n\n"
        f"{episodes_text[:9000]}"
    )
    out = aux(prompt)
    return out.strip() if out else "_(aux model returned nothing — review by hand)_"


def _synthesise_reflective(semantic_text: str, dry: bool) -> str:
    """Generative L3 reflective synthesis (aux model). Human-ratified."""
    if dry:
        return "_(dry-run: reflective synthesis skipped — no model call)_"
    aux = _resolve_aux()
    if aux is None:
        return "_(extractive mode: no aux model — author standing patterns by hand)_"
    prompt = (
        "From the semantic candidates below, surface at most 3 STANDING "
        "patterns: recurring mistakes, durable preferences, or identity-level "
        "constraints worth promoting to L3 (SOUL/cerebrum). These REQUIRE human "
        "ratification. Only surface a candidate when it is backed by repeated "
        "signals or an explicit always/never-style directive. Reject one-off "
        "task details, temporary blockers, and execution logs. One terse bullet "
        "each, marked [L3-CANDIDATE]. Never include secrets. Output only the bullets.\n\n"
        f"{semantic_text[:8000]}"
    )
    out = aux(prompt)
    return out.strip() if out else "_(aux model returned nothing — review by hand)_"


def _collect_source_audit(sources: list[tuple[Path, float]]) -> dict:
    by_class: dict[str, int] = {}
    skipped: dict[str, int] = {}
    eligible: list[tuple[Path, float]] = []
    for path, mtime in sources:
        _title, body = _read_body(path)
        if not body:
            skipped["empty-body"] = skipped.get("empty-body", 0) + 1
            continue
        source_class = _source_class(path)
        by_class[source_class] = by_class.get(source_class, 0) + 1
        reason = _promotion_block_reason(path, body)
        if reason:
            skipped[reason] = skipped.get(reason, 0) + 1
            continue
        eligible.append((path, mtime))
    return {
        "eligible": eligible,
        "source_classes": by_class,
        "skipped": skipped,
    }


def run(window_hours: int, dry: bool) -> int:
    today = _dt.date.today().isoformat()
    now_iso = _dt.datetime.now().isoformat(timespec="seconds")
    aux = _resolve_aux() if not dry else None
    aux_mode = "dry-run" if dry else ("generative" if aux is not None else "extractive")
    _write_status({
        "status": "running",
        "started_at": now_iso,
        "window_hours": window_hours,
        "dry_run": dry,
        "mode": aux_mode,
        "status_file": str(STATUS_FILE),
    })
    discovered_sources = sorted(_iter_source_notes(window_hours), key=lambda t: t[1], reverse=True)
    repo_root_sources = discover_repo_root_captures(REPO_ROOT, window_hours)
    discovered_sources = sorted(discovered_sources + repo_root_sources, key=lambda t: t[1], reverse=True)
    audit = _collect_source_audit(discovered_sources)
    sources = sorted(audit["eligible"], key=lambda t: t[1], reverse=True)
    overwrite_json(SOURCE_REGISTRY_FILE, build_source_registry(discovered_sources, VAULT, REPO_ROOT))

    if not sources:
        _write_status({
            "status": "idle",
            "started_at": now_iso,
            "finished_at": _dt.datetime.now().isoformat(timespec="seconds"),
            "window_hours": window_hours,
            "dry_run": dry,
            "mode": aux_mode,
            "discovered_source_count": len(discovered_sources),
            "source_count": 0,
            "source_classes": audit["source_classes"],
            "skipped": audit["skipped"],
        })
        print(f"reflect: no L0/L1 notes modified in the last {window_hours}h — nothing to do.")
        return 0

    # In dry-run we never call the model (must exit 0 with no network);
    # generative episode summaries are produced only on a real run.
    episodes = [summarise_episode(p, generative=not dry) for p, _ in sources]
    episodes = [e for e in episodes if e]
    # Score + rank candidates (recency x importance).
    scored = sorted(
        ((p, _score_candidate(p, m, window_hours)) for p, m in sources),
        key=lambda t: t[1], reverse=True,
    )
    src_links = [
        f"- [[{_display_rel(p.with_suffix(''))}]] (score {s})"
        for p, s in scored
    ]
    episodes_joined = "\n\n".join(episodes)

    capture_rows = []
    atomic_rows = []
    for idx, (path, mtime) in enumerate(sources, start=1):
        title, body = _read_body(path)
        if not body:
            continue
        capture_id = f"capture-{today}-{idx:04d}-{path.stem.lower().replace(' ', '-')[:48]}"
        captured_at = _dt.datetime.fromtimestamp(mtime).isoformat(timespec="seconds")
        capture = normalize_intake(path, body, _source_class(path), captured_at, capture_id)
        capture_rows.append(capture)
        atomic_rows.extend(split_atomic_items(capture))

    private_items = select_private_items(atomic_rows)
    private_record = build_private_context_record(private_items, [row["capture_id"] for row in capture_rows])
    reflections = reflect_items(atomic_rows, private_record)
    action_rows = action_forces_from_items(atomic_rows, reflections)
    reinforcement = build_reinforcement_payload(reflections, action_rows)
    private_action_map = _load_private_review_actions()
    brief_payload = build_brief_payload(reflections, action_rows, private_record, private_action_map)
    steering_payload = build_behavior_steering(reflections, private_record)
    private_review_payload = build_private_review_payload(private_record, atomic_rows, private_action_map)

    if not dry:
        append_jsonl(INTAKE_LEDGER, capture_rows)
        append_jsonl(ATOMIC_LEDGER, atomic_rows)
        if private_record:
            append_jsonl(PRIVATE_LEDGER, [private_record])
        append_jsonl(ACTION_LEDGER, action_rows)
        overwrite_json(REINFORCEMENT_FILE, reinforcement)
        overwrite_json(BRIEFING_FILE, brief_payload)
        overwrite_json(STEERING_FILE, steering_payload)
        overwrite_json(PRIVATE_REVIEW_FILE, private_review_payload)

    # L1 episodic
    l1 = (
        f"---\ntitle: Episodic reflection — {today}\ndate: {today}\n"
        f"memory_layer: L1\nmemory_reflected_at: {now_iso}\n"
        f"tags:\n- memory/l1\n- reflection\n---\n\n"
        f"# Episodic reflection — {today}\n\n"
        f"Auto-generated from {len(sources)} source note(s) modified in the last "
        f"{window_hours}h. Mode: {aux_mode}. Ratify into L2/L3 as needed.\n\n"
        + "\n\n".join(episodes)
        + "\n\n## Sources\n"
        + "\n".join(src_links)
        + "\n"
    )
    _write(EPISODIC / f"{today}.md", l1, dry)

    # L2 semantic — generative distillation (ADD/UPDATE/NOOP, annotate-only).
    semantic_body = _distill_semantic(episodes_joined, dry)
    l2 = (
        f"---\ntitle: Semantic candidates — {today}\ndate: {today}\n"
        f"memory_layer: L2\nmemory_source:\n- shay-memory/reflections/episodic/{today}\n"
        f"memory_reflected_at: {now_iso}\ntags:\n- memory/l2\n- reflection\n---\n\n"
        f"# Semantic candidates — {today}\n\n"
        "Durable-fact candidates distilled from today's episodic note. Review for "
        "duplicates against existing `learnings/` and `reflections/semantic/` notes "
        "before promoting. This pass annotates; it never auto-deletes.\n\n"
        f"{semantic_body}\n\n"
        f"## Provenance\n- {len(episodes)} episode(s) processed; "
        f"see [[reflections/episodic/{today}]].\n"
    )
    _write(SEMANTIC / f"{today}.md", l2, dry)

    # L3 reflective — generative standing-pattern synthesis (human-ratified).
    reflective_body = _synthesise_reflective(semantic_body, dry)
    l3 = (
        f"---\ntitle: Reflective candidates — {today}\ndate: {today}\n"
        f"memory_layer: L3\nmemory_source:\n- shay-memory/reflections/semantic/{today}\n"
        f"memory_reflected_at: {now_iso}\ntags:\n- memory/l3\n- reflection\n---\n\n"
        f"# Reflective candidates — {today}\n\n"
        "Recurring patterns / standing-constraint candidates. **Requires human "
        "ratification** before being treated as identity-level (L3) truth.\n\n"
        f"{reflective_body}\n\n"
        f"## Provenance\n- Derived from [[reflections/semantic/{today}]].\n"
    )
    _write(REFLECTIVE / f"{today}.md", l3, dry)

    finished_at = _dt.datetime.now().isoformat(timespec="seconds")
    _write_status({
        "status": "ok",
        "started_at": now_iso,
        "finished_at": finished_at,
        "window_hours": window_hours,
        "dry_run": dry,
        "mode": aux_mode,
        "discovered_source_count": len(discovered_sources),
        "source_count": len(sources),
        "episode_count": len(episodes),
        "capture_count": len(capture_rows),
        "atomic_item_count": len(atomic_rows),
        "private_context_count": (len(load_jsonl(PRIVATE_LEDGER)) if PRIVATE_LEDGER.exists() else 0) + (1 if (dry and private_record) else 0),
        "action_force_count": len(action_rows),
        "source_classes": audit["source_classes"],
        "skipped": audit["skipped"],
        "outputs": {
            "episodic": str(EPISODIC / f"{today}.md"),
            "semantic": str(SEMANTIC / f"{today}.md"),
            "reflective": str(REFLECTIVE / f"{today}.md"),
            "source_registry": str(SOURCE_REGISTRY_FILE),
            "briefing_context": str(BRIEFING_FILE),
            "behavior_steering": str(STEERING_FILE),
            "reinforcement": str(REINFORCEMENT_FILE),
            "private_review": str(PRIVATE_REVIEW_FILE),
            "private_review_actions": str(PRIVATE_ACTIONS_FILE),
        },
    })
    print(f"reflect: processed {len(sources)} source note(s) for {today}{' (dry-run)' if dry else ''}.")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Shay-Memory L0->L3 reflection pass.")
    ap.add_argument("--window-hours", type=int, default=24)
    ap.add_argument("--dry-run", action="store_true", help="print actions, write nothing")
    args = ap.parse_args(argv)
    try:
        return run(args.window_hours, args.dry_run)
    except Exception as exc:
        _write_status({
            "status": "error",
            "failed_at": _dt.datetime.now().isoformat(timespec="seconds"),
            "window_hours": args.window_hours,
            "dry_run": args.dry_run,
            "error": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        })
        raise


if __name__ == "__main__":
    raise SystemExit(main())
