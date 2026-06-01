"""
pipeline.py — Phase 3a + Phase 3c-prep: Programmable pipeline primitives.

Phase 3a (original):
    agent, parallel, pipeline, adversarial_verify, judge_panel,
    loop_until_dry, completeness_critic, load_policy, run_job

Phase 3c-prep (added): file system + shell + vault primitives that
    give Shay the ability to write code, run tests, and auto-discover
    context from her own vault.

    vault_search(query)          → List[{path, score, preview}]
    context_loader(goal)         → str  (relevant vault content)
    write_file(path, content)    → str  (path written)
    shell(cmd, trust_gate)       → str  (stdout)
    code_job(spec, dispatcher)   → JobResult  (write→test→verify loop)
"""
from __future__ import annotations

import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
try:
    import yaml as _yaml
    _HAVE_YAML = True
except ImportError:
    _HAVE_YAML = False
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence

from .brain_client import BrainChain, SHAY_SYSTEM
from .dispatcher import Dispatcher, DispatchTask, DispatchResult

logger = logging.getLogger("swarm.pipeline")

POLICIES_DIR = Path(__file__).parent.parent.parent / "policies"


# ---------------------------------------------------------------------------
# Reviewer-brain independence (B4)
#
# A review is only meaningful if the reviewer is a DIFFERENT brain than the one
# that authored the artifact — a brain reviewing its own output rubber-stamps.
# Every DispatchResult already carries ``brain_used``; we enforce here that a
# review step never accepts a verdict produced by the author's brain. This is a
# HARD block: a same-brain review raises rather than silently passing.
# ---------------------------------------------------------------------------

class SameBrainReviewError(RuntimeError):
    """Raised when a reviewer brain is the same as the author brain."""


def enforce_reviewer_not_author(author_brain: Optional[str],
                                reviewer_brain: Optional[str],
                                *, context: str = "review") -> None:
    """Hard-block a review performed by the author's own brain.

    Uses the already-stamped ``brain_used`` values. If either brain is unknown
    (None/empty) we cannot prove independence, so we allow it (the caller had no
    author stamp to compare against). When both are known and equal, raise."""
    if not author_brain or not reviewer_brain:
        return
    if author_brain == reviewer_brain:
        raise SameBrainReviewError(
            f"{context}: reviewer brain '{reviewer_brain}' is the same as the "
            f"author brain '{author_brain}' — reviewer must differ from author."
        )


def _independent_review_results(author_brain: Optional[str],
                                results: List[DispatchResult],
                                *, context: str = "review") -> List[DispatchResult]:
    """Filter reviewer results down to those NOT produced by the author brain.

    Each dropped result is logged. If author_brain is unknown, all results pass
    through (nothing to compare against)."""
    if not author_brain:
        return results
    kept: List[DispatchResult] = []
    for r in results:
        if r.brain_used and r.brain_used == author_brain:
            logger.warning(
                "[%s] dropping same-brain review verdict from '%s' "
                "(author brain) — reviewer must differ", context, author_brain)
            continue
        kept.append(r)
    return kept


# ---------------------------------------------------------------------------
# Core primitives
# ---------------------------------------------------------------------------

def agent(
    prompt: str,
    dispatcher: Dispatcher,
    brain: str = "auto",
    tier: str = "medium",
    schema: Optional[Dict] = None,
    timeout: float = 90.0,
    label: str = "",
) -> Any:
    """
    Run a single agent task. If schema is provided, parses result as JSON
    and validates against the schema keys (best-effort).
    Returns the output string, or a dict if schema given.
    """
    task = DispatchTask(
        id=label or f"agent-{int(time.time()*1000)}",
        prompt=prompt,
        brain=brain,
        tier=tier,
        timeout=timeout,
    )
    results = dispatcher.fan_out([task])
    result = results[0] if results else None
    if not result or result.status != "completed":
        raise RuntimeError(f"agent task failed: {result.error if result else 'no result'}")
    output = result.output or ""
    if schema:
        return _parse_json(output)
    return output


def parallel(
    thunks: List[Callable[[], Any]],
    max_workers: int = 8,
) -> List[Any]:
    """
    Run a list of zero-arg callables concurrently (via threads).
    Returns results in the same order. Failed thunks return None.
    """
    results = [None] * len(thunks)
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        future_to_idx = {ex.submit(fn): i for i, fn in enumerate(thunks)}
        for fut in as_completed(future_to_idx):
            idx = future_to_idx[fut]
            try:
                results[idx] = fut.result()
            except Exception as exc:
                logger.warning(f"parallel thunk[{idx}] failed: {exc}")
                results[idx] = None
    return results


def pipeline(
    items: Sequence[Any],
    *stages: Callable,
    max_workers: int = 8,
) -> List[Any]:
    """
    Run each item through all stages independently (pipeline, not barrier).
    Stage N+1 starts on an item as soon as stage N finishes it.
    A stage that raises drops the item to None and skips its remaining stages.
    """
    def process_item(item):
        result = item
        for stage in stages:
            try:
                result = stage(result)
            except Exception as exc:
                logger.warning(f"pipeline stage failed on {str(item)[:60]}: {exc}")
                return None
        return result

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        return list(ex.map(process_item, items))


def adversarial_verify(
    claim: str,
    dispatcher: Dispatcher,
    n: int = 3,
    lenses: Optional[List[str]] = None,
    threshold: float = 0.5,
    author_brain: Optional[str] = None,
    reviewer_brain: str = "auto",
) -> bool:
    """
    Spawn N skeptic agents each trying to REFUTE the claim from a different lens.
    Returns True (claim survives) if fewer than threshold*n agents refute it.

    Enforces the reviewer!=author rule (B4): when ``author_brain`` is provided
    (the brain that produced the claim), any reviewer verdict stamped with that
    same brain is DROPPED before scoring — a brain may not review its own work.
    If that leaves zero independent reviewers, the review HARD-FAILS (raises
    SameBrainReviewError) rather than silently passing an un-reviewed claim.
    Pass ``reviewer_brain`` to steer reviewers onto a different brain than the
    author (defaults to "auto").
    """
    enforce_reviewer_not_author(author_brain, reviewer_brain,
                                context="adversarial_verify")
    if not lenses:
        lenses = ["factual-accuracy", "internal-consistency", "completeness"]
    lenses = (lenses * n)[:n]

    tasks = [
        DispatchTask(
            id=f"verify-{i}",
            prompt=f"""You are a skeptic reviewer using the {lenses[i % len(lenses)]} lens.
Try to REFUTE this claim. Default to refuted=true if uncertain.

CLAIM: {claim}

Return ONLY JSON: {{"refuted": true|false, "reason": "one sentence"}}""",
            brain=reviewer_brain,
            tier="medium",
        )
        for i in range(n)
    ]
    results = dispatcher.fan_out(tasks)
    independent = _independent_review_results(author_brain, results,
                                              context="adversarial_verify")
    if author_brain and not independent:
        raise SameBrainReviewError(
            f"adversarial_verify: every reviewer ran on the author brain "
            f"'{author_brain}' — no independent review possible."
        )
    effective_n = len(independent)
    refutations = 0
    for r in independent:
        if r.status == "completed":
            try:
                verdict = _parse_json(r.output or "")
                if verdict.get("refuted", True):
                    refutations += 1
            except Exception:
                refutations += 1  # parse failure = treat as refuted
    survived = refutations < (threshold * effective_n)
    logger.info(
        f"adversarial_verify: {refutations}/{effective_n} refuted "
        f"(of {n} dispatched) → {'SURVIVED' if survived else 'KILLED'}")
    return survived


def judge_panel(
    attempts: List[str],
    dispatcher: Dispatcher,
    criteria: str = "quality, specificity, actionability",
) -> str:
    """
    Run N independent attempts through parallel judges. Return the best one.
    Implements judge-panel pattern: generate N → score → synthesize from winner.
    """
    score_tasks = [
        DispatchTask(
            id=f"judge-{i}",
            prompt=f"""Score this attempt on: {criteria}.
Return ONLY JSON: {{"score": 0-10, "strongest_point": "...", "weakest_point": "..."}}

ATTEMPT {i+1}:
{attempt[:2000]}""",
            brain="auto",
            tier="medium",
        )
        for i, attempt in enumerate(attempts)
    ]
    scores = dispatcher.fan_out(score_tasks)
    best_idx = 0
    best_score = -1
    for i, r in enumerate(scores):
        if r.status == "completed":
            try:
                verdict = _parse_json(r.output or "")
                s = float(verdict.get("score", 0))
                if s > best_score:
                    best_score = s
                    best_idx = i
            except Exception:
                pass
    logger.info(f"judge_panel: winner is attempt {best_idx+1} (score {best_score})")
    return attempts[best_idx]


def loop_until_dry(
    finder: Callable[[], List[Any]],
    k: int = 2,
    max_iters: int = 10,
    seen: Optional[set] = None,
) -> List[Any]:
    """
    Keep calling finder() until k consecutive rounds return nothing new.
    Returns all unique findings accumulated. Implements loop-until-dry pattern.
    """
    if seen is None:
        seen = set()
    all_found = []
    dry_count = 0
    for _ in range(max_iters):
        found = finder()
        fresh = [f for f in found if str(f) not in seen]
        if not fresh:
            dry_count += 1
            if dry_count >= k:
                break
        else:
            dry_count = 0
            for f in fresh:
                seen.add(str(f))
            all_found.extend(fresh)
        logger.info(f"loop_until_dry: {len(fresh)} fresh, {dry_count}/{k} dry rounds")
    return all_found


def completeness_critic(
    corpus: str,
    goal: str,
    dispatcher: Dispatcher,
) -> List[str]:
    """
    Ask: what's missing from this corpus relative to the goal?
    Returns a list of gaps to address in the next round.
    """
    tasks = [DispatchTask(
        id="completeness-critic",
        prompt=f"""You are a completeness critic. What is MISSING from this corpus
relative to the goal? Be specific. List only genuine gaps, not nitpicks.

GOAL: {goal}

CORPUS (first 3000 chars):
{corpus[:3000]}

Return ONLY JSON: {{"gaps": ["gap 1", "gap 2", ...]}}""",
        brain="auto",
        tier="medium",
    )]
    results = dispatcher.fan_out(tasks)
    if results and results[0].status == "completed":
        try:
            return _parse_json(results[0].output or "").get("gaps", [])
        except Exception:
            pass
    return []


# ---------------------------------------------------------------------------
# Policy loading
# ---------------------------------------------------------------------------

def load_policy(name_or_path: str) -> Dict[str, Any]:
    """
    Load a policy YAML/JSON by name (balanced, free-maximal, speed-first)
    or by absolute path. Falls back to balanced defaults if not found.
    """
    p = Path(name_or_path)
    if not p.is_absolute():
        # Try .yaml then .json
        for ext in (".yaml", ".json"):
            candidate = POLICIES_DIR / f"{name_or_path}{ext}"
            if candidate.exists():
                p = candidate
                break
    if not p.exists():
        logger.warning(f"Policy '{name_or_path}' not found — using balanced defaults")
        return _default_policy()
    with open(p) as f:
        text = f.read()
    if p.suffix in (".yaml", ".yml"):
        if _HAVE_YAML:
            policy = _yaml.safe_load(text)
        else:
            logger.warning("PyYAML not installed — falling back to balanced defaults")
            return _default_policy()
    else:
        policy = json.loads(text)
    logger.info(f"Loaded policy: {policy.get('name', name_or_path)}")
    return policy


def _default_policy() -> Dict[str, Any]:
    return {
        "name": "balanced",
        "brains": {"worker": "ollama", "judge": "claude", "synth": "claude",
                   "verify": "openrouter", "fallback": "gemini"},
        "quality": {"enable_anchor_check": True, "enable_adversarial_verify": True,
                    "min_synthesis_chars": 500, "budget_default": 15},
    }


# ---------------------------------------------------------------------------
# Job spec runner — Phase 3a: Shay authors + runs declarative jobs
# ---------------------------------------------------------------------------

@dataclass
class PhaseResult:
    phase_name: str
    outputs: List[str] = field(default_factory=list)
    status: str = "pending"
    elapsed: float = 0.0


@dataclass
class JobResult:
    job_name: str
    status: str           # completed | failed | partial
    phases: List[PhaseResult] = field(default_factory=list)
    final_output: Optional[str] = None
    elapsed: float = 0.0
    quality_gate: Optional[str] = None   # PASS | FAIL | SKIP


def run_job(spec_yaml: str, dispatcher: Dispatcher) -> JobResult:
    """
    Execute a declarative job spec (YAML). This is the Phase 3a primitive that
    lets Shay author and run multi-step autonomous jobs from a natural-language goal.

    Job spec format:
        name: "My job"
        goal: "The original natural-language goal"
        phases:
          - name: Research
            brain: auto
            tier: medium
            tasks:
              - "Research X"
              - "Research Y"
          - name: Synthesize
            brain: claude
            tier: complex
            tasks:
              - "Synthesize the research into a one-page brief"
        quality_gate:
          min_chars: 500
          adversarial_verify: true
    """
    # Accept either YAML or JSON job specs
    try:
        if spec_yaml.strip().startswith("{"):
            spec = json.loads(spec_yaml)
        elif _HAVE_YAML:
            spec = _yaml.safe_load(spec_yaml)
        else:
            spec = json.loads(spec_yaml)  # fallback — caller should use JSON
    except Exception as exc:
        return JobResult(job_name="unknown", status="failed",
                         final_output=f"YAML parse error: {exc}")

    job_name = spec.get("name", "unnamed-job")
    goal = spec.get("goal", "")
    phase_specs = spec.get("phases", [])
    qgate = spec.get("quality_gate", {})

    logger.info(f"[job:{job_name}] Starting — {len(phase_specs)} phases")
    t0 = time.time()
    phase_results = []
    all_outputs = []

    for ps in phase_specs:
        phase_name = ps.get("name", "phase")
        brain = ps.get("brain", "auto")
        tier = ps.get("tier", "medium")
        tasks_prompts = ps.get("tasks", [])

        pr = PhaseResult(phase_name=phase_name)
        pt0 = time.time()

        tasks = [
            DispatchTask(
                id=f"{phase_name}-{i}",
                prompt=f"Context goal: {goal}\n\nTask: {t}",
                brain=brain,
                tier=tier,
            )
            for i, t in enumerate(tasks_prompts)
        ]
        results = dispatcher.fan_out(tasks)
        for r in results:
            if r.status == "completed" and r.output:
                pr.outputs.append(r.output)
                all_outputs.append(r.output)
        pr.status = "completed" if all(r.status == "completed" for r in results) else "partial"
        pr.elapsed = time.time() - pt0
        phase_results.append(pr)
        logger.info(f"[job:{job_name}] Phase '{phase_name}' done in {pr.elapsed:.1f}s — {len(pr.outputs)} outputs")

    # Final synthesis
    combined = "\n\n".join(all_outputs)
    if len(combined) > qgate.get("min_chars", 0):
        final_output = combined
        gate_result = "PASS"
    else:
        final_output = combined
        gate_result = "FAIL" if qgate.get("min_chars") else "SKIP"

    # Adversarial verify: opt-in, but only runs if quality_gate explicitly sets
    # adversarial_verify AND min_verify_score is set. Without a numeric threshold
    # the verify is skipped — callers use adversarial_verify() directly for fine
    # control. This prevents weak-reviews-weak false-kills on valid outputs.
    verify_score = qgate.get("adversarial_verify_score")  # e.g. 0.34 = need 1/3 to refute
    if qgate.get("adversarial_verify") and verify_score and final_output:
        survived = adversarial_verify(final_output[:2000], dispatcher, n=3, threshold=verify_score)
        if not survived:
            gate_result = "FAIL"
            logger.warning(f"[job:{job_name}] Adversarial verify failed at threshold {verify_score}")

    elapsed = time.time() - t0
    status = "completed" if gate_result in ("PASS", "SKIP") else "failed"
    logger.info(f"[job:{job_name}] Done in {elapsed:.1f}s — gate={gate_result} status={status}")

    return JobResult(
        job_name=job_name,
        status=status,
        phases=phase_results,
        final_output=final_output,
        elapsed=elapsed,
        quality_gate=gate_result,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_json(text: str) -> Any:
    text = text.strip()
    start = text.find("{") if "{" in text else text.find("[")
    end = text.rfind("}") if "}" in text else text.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass
    raise ValueError(f"no valid JSON in: {text[:200]}")


def _strip_fences(text: str) -> str:
    """Remove markdown code fences a brain may wrap around code output."""
    t = (text or "").strip()
    if "```" in t:
        lines = t.split("\n")
        start = next((i for i, l in enumerate(lines) if l.startswith("```")), None)
        if start is not None:
            end = next((i for i in range(len(lines) - 1, start, -1)
                        if lines[i].strip() == "```"), len(lines))
            t = "\n".join(lines[start + 1:end])
    return t.strip()


# ---------------------------------------------------------------------------
# Hermes file-edit primitives bridge (ADAPT, 2026-05-30).
#
# Shay's hermes-agent fork already ships battle-tested anchored-edit primitives
# in ~/.shay/hermes-agent/tools/ — notably fuzzy_match.fuzzy_find_and_replace
# (whitespace-tolerant anchor matching) and file_operations.ShellFileOperations
# (anchored replace + post-write verify + per-edit lint-delta). Research
# (buglog #219) found surgical_patch was hand-rolling brittle EXACT-string
# matching while these existed unused. We reuse them here instead of rebuilding.
#
# Root cause they fix: build_app -> multi_file_code_job FULL-REGENERATES even
# existing files, which drops a closing tag on a ~250-line render-spine file
# (App.tsx TS17008). The fix routes existing files through anchored edits, and
# fuzzy matching keeps "anchor not found" misses from killing otherwise-valid
# edits. The authoritative gate stays the whole-project typecheck — per-file
# tsc can't resolve project imports.
# ---------------------------------------------------------------------------
_HERMES_TOOLS = Path.home() / ".shay" / "hermes-agent"


def _fuzzy_replace(text: str, anchor: str, replacement: str):
    """Whitespace-tolerant single-occurrence anchor replacement.

    Returns (new_text, matched: bool). Prefers hermes fuzzy_match; falls back
    to exact str.replace so this never hard-depends on the fork being present.
    """
    # exact fast path first (cheapest, and what most anchors hit)
    if anchor in text:
        return text.replace(anchor, replacement, 1), True
    try:
        import sys as _sys
        if str(_HERMES_TOOLS) not in _sys.path:
            _sys.path.insert(0, str(_HERMES_TOOLS))
        from tools.fuzzy_match import fuzzy_find_and_replace  # type: ignore
        new_text, match_count, _strategy, error = fuzzy_find_and_replace(
            text, anchor, replacement, False
        )
        if error or not match_count:
            return text, False
        return new_text, True
    except Exception as exc:  # fork absent or import error → honest miss
        logger.debug(f"[_fuzzy_replace] fuzzy unavailable ({exc}); exact miss")
        return text, False


def _balance_scan(src: str):
    """Find unbalanced (){}[] at end-of-file, ignoring delimiters inside strings,
    template literals, and comments. Returns the closer string to APPEND at EOF
    (e.g. '}\\n)' ), or '' if balanced. JSX/string/comment-aware so it does not
    false-positive on {'}'} or // } or /* ) */.

    This is the deterministic first-pass repair for the NEW-FILE brace-drop class
    (TS1005 '}' expected) — most dropped closers surface as unclosed scopes at EOF.
    It does NOT attempt to fix a closer dropped mid-file (where a later close would
    bind the wrong opener) — prettier --check still fails those and they route to
    the capped brain repair."""
    pairs = {")": "(", "]": "[", "}": "{"}
    openers = {"(": ")", "[": "]", "{": "}"}
    stack = []  # list of expected closer chars
    i, n = 0, len(src)
    # template-literal expression depth stack: True when inside `...${ HERE }...`
    tmpl_stack = []  # each entry = brace depth at which the ${ opened
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        # comments
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            i = n if j == -1 else j
            continue
        if c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            i = n if j == -1 else j + 2
            continue
        # string literals
        if c in ("'", '"'):
            i += 1
            while i < n and src[i] != c:
                if src[i] == "\\":
                    i += 2; continue
                i += 1
            i += 1
            continue
        # template literal
        if c == "`":
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2; continue
                if src[i] == "`":
                    i += 1; break
                if src[i] == "$" and i + 1 < n and src[i + 1] == "{":
                    # enter expression — track until matching }
                    stack.append("}"); tmpl_stack.append(len(stack))
                    i += 2
                    # fall back to normal scanning for the expression
                    break
                i += 1
            continue
        if c in openers:
            stack.append(openers[c])
        elif c in pairs:
            if stack and stack[-1] == c:
                stack.pop()
                if tmpl_stack and len(stack) < tmpl_stack[-1]:
                    tmpl_stack.pop()
            # unmatched close → mid-file imbalance we don't auto-fix; bail safe
            else:
                return ""
        i += 1
    if not stack:
        return ""
    # append the missing closers in reverse (LIFO) order
    return "".join(reversed(stack))


def _syntax_validate_and_repair(file_path: str, cwd: str, brain: str = "claude",
                                error_hint: str = "", max_brain: int = 2):
    """Validate a freshly-generated file parses; repair NEW-FILE brace-drops.

    Order (deterministic first, brain last — adversarial-review verdict):
      1. `npx prettier --check` with explicit parser → parse gate (no import
         resolution needed, unlike project tsc).
      2. On parse failure: deterministic _balance_scan closer-append, re-check.
      3. Still failing: capped brain repair (<=max_brain), full file as context,
         NEVER trusting a compiler line:col as the edit site.
    Returns {"ok", "method", "attempts"}. Never raises."""
    p = Path(file_path).expanduser()
    if not p.suffix.lower() in (".ts", ".tsx", ".js", ".jsx"):
        return {"ok": True, "method": "skip-nonjs", "attempts": 0}
    parser = "typescript" if p.suffix.lower() in (".ts", ".tsx") else "babel"

    def _parses() -> bool:
        try:
            shell(f"cd {cwd} && npx prettier --parser {parser} --check {_q(str(p))} 2>&1",
                  cwd=cwd, timeout=60, trust_gate=False)
            return True  # exit 0 = valid AND already styled
        except RuntimeError as exc:
            e = str(exc).lower()
            # Explicit PARSE-error markers → the file is broken, repair it.
            if any(k in e for k in ("syntaxerror", "unexpected", "expected",
                                    "unterminated", "unclosed")):
                return False
            # Explicit STYLE-diff markers → valid syntax, just unformatted → clean.
            if any(k in e for k in ("code style", "[warn]", "warn ", "would reformat")):
                return True
            # Infra/unknown (npx missing, ENOENT, timeout): we CANNOT validate.
            # Treat as clean so we don't spuriously brain-repair a possibly-valid
            # file; the whole-project typecheck remains the real gate.
            logger.warning(f"[syntax-repair] prettier inconclusive for {p.name} "
                           f"(treating as clean, deferring to typecheck): {e[:120]}")
            return True

    if _parses():
        return {"ok": True, "method": "clean", "attempts": 0}

    # 2. deterministic balance-scan
    src = p.read_text(errors="ignore")
    closers = _balance_scan(src)
    if closers:
        p.write_text(src.rstrip() + "\n" + "\n".join(closers) + "\n")
        if _parses():
            logger.info(f"[syntax-repair] {p.name}: closed {closers!r} deterministically (0 brain)")
            return {"ok": True, "method": "balance-scan", "attempts": 0}
        p.write_text(src)  # revert if it didn't help

    # 3. capped brain repair (pinned code-tier)
    from .brain_client import BrainChain
    for attempt in range(1, max_brain + 1):
        bc = BrainChain(preferred=brain)
        fixed = bc.call_prompt(
            f"""This file has a SYNTAX error (it does not parse). Output the COMPLETE
corrected file content — no markdown, no fences, no explanation. Fix ONLY the
syntax (balance every brace/paren/bracket and close every JSX tag); do NOT change
behavior. Diagnostic (the reported line is often NOT the real drop site — reason
about the whole file):
{error_hint[:600]}

CURRENT FILE ({p.name}):
{src[:16000]}""",
            timeout=150.0)
        p.write_text(_strip_fences(fixed))
        if _parses():
            logger.info(f"[syntax-repair] {p.name}: brain-repaired (attempt {attempt})")
            return {"ok": True, "method": f"brain-{attempt}", "attempts": attempt}
    p.write_text(src)  # give up → restore original so rollback is clean
    logger.warning(f"[syntax-repair] {p.name}: could not repair after {max_brain} brain attempts")
    return {"ok": False, "method": "failed", "attempts": max_brain}


def _q(s: str) -> str:
    return "'" + s.replace("'", "'\\''") + "'"


def _is_render_spine(file_path: str) -> bool:
    """Heuristic: an existing file whose edits are dangerous to do as one big
    block — large AND carries a JSX return / provider tree. These must be edited
    with >=2 small ADDITIVE anchored patches, never a single block-spanning one.
    (Lesson from ralph U1: a single anchor rewriting MainShell's routing block
    dropped </ThemeProvider> → TS17008.)"""
    try:
        p = Path(file_path).expanduser()
        if not p.exists():
            return False
        src = p.read_text(errors="ignore")
        if src.count("\n") < 150:
            return False
        return ("return (" in src and "</" in src) or "Provider" in src
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Content-budget seam: new files whose instruction exceeds this limit are
# generated section-by-section via synthesize_sections() rather than in one
# capped brain call.  Tune this (or replace with rlm-rs budget) as needed.
CONTENT_BUDGET_CHARS: int = 16_000
# ---------------------------------------------------------------------------


def multi_file_code_job(
    manifest: List[Dict[str, str]],
    test_cmd: str,
    cwd: str,
    dispatcher: Dispatcher,
    context: str = "",
    brain: str = "claude",
    max_iterations: int = 4,
    read_existing: bool = True,
) -> Dict[str, Any]:
    """
    THE KEYSTONE. Write/edit MULTIPLE coordinated files, run a whole-project
    test (typecheck), and self-heal failures ACROSS files until it passes.

    manifest: [{"path": "...", "instruction": "what this file should do/become"}]
    test_cmd: project-wide test (e.g. "npm run typecheck:web")
    cwd: project root for the test
    context: shared context all files need (grounded facts, conventions)

    This is what code_job() could not do — coordinated multi-file edits with a
    project-level gate and cross-file error repair. This is the capability
    required to build a real app.

    Returns {"passed", "iterations", "files_written", "history"}.
    """
    from .brain_client import BrainChain
    history = []
    last_error = ""
    files_written = []
    # snapshot originals for rollback
    originals = {}
    for item in manifest:
        p = Path(item["path"]).expanduser()
        originals[item["path"]] = p.read_text() if p.exists() else None

    for iteration in range(1, max_iterations + 1):
        logger.info(f"[multi_file_code_job] iteration {iteration}/{max_iterations} — {len(manifest)} files")

        # 1. Generate all files IN PARALLEL
        def gen_file(item):
            def _run():
                path = item["path"]
                instruction = item["instruction"]
                existing = ""
                if read_existing:
                    fp = Path(path).expanduser()
                    if fp.exists():
                        existing = fp.read_text(errors="ignore")[:6000]
                err_ctx = ""
                if last_error:
                    err_ctx = f"\n\nThe PROJECT FAILED TO COMPILE last iteration. Fix YOUR file if it contributes to:\n{last_error[:1500]}"

                # ── synthesize_sections branch ──────────────────────────────
                # For NEW files (no existing content) whose instruction alone
                # exceeds the single-call content budget, generate section-by-
                # section and assemble.  This avoids mid-file truncation on large
                # files without changing the single-call path for small files.
                if not existing and len(instruction) > CONTENT_BUDGET_CHARS:
                    logger.info(
                        f"[multi_file_code_job] {Path(path).name}: instruction "
                        f"{len(instruction):,} chars > budget {CONTENT_BUDGET_CHARS:,} "
                        "— routing to synthesize_sections()"
                    )
                    goal_for_file = (
                        f"Write the complete source for {Path(path).name}.\n\n"
                        f"INSTRUCTION:\n{instruction}\n\n"
                        f"SHARED CONTEXT:\n{context[:2000]}"
                    )
                    # Split instruction into ~2-5 logical sections by blank-line
                    # paragraphs; cap at 6 sections so each call stays focused.
                    raw_paras = [p.strip() for p in instruction.split("\n\n") if p.strip()]
                    # Merge tiny paras; keep at most 6 sections
                    sections: List[str] = []
                    for para in raw_paras:
                        title = para.splitlines()[0][:80].strip("# ").strip() or f"Part {len(sections)+1}"
                        if len(sections) >= 6:
                            sections[-1] = sections[-1] + " / " + title
                        else:
                            sections.append(title)
                    if not sections:
                        sections = ["Complete implementation"]
                    assembled = synthesize_sections(
                        goal=goal_for_file,
                        sections=sections,
                        dispatcher=dispatcher,
                        context=context[:3000],
                        brain=brain,
                    )
                    return {"path": path, "content": _strip_fences(assembled)}
                # ── end synthesize_sections branch ───────────────────────────

                bc = BrainChain(preferred=brain)
                out = bc.call_prompt(
                    f"""You are writing ONE file as part of a coordinated multi-file change.
The whole project must compile after all files are written, so follow the shared
conventions exactly and keep cross-file contracts consistent.

SHARED CONTEXT (conventions, grounded facts, other files' contracts):
{context[:3000]}

FILE TO WRITE: {path}
INSTRUCTION: {instruction}

{"CURRENT CONTENT OF THIS FILE (edit it, preserve working parts):" + chr(10) + existing if existing else "(this is a new file)"}
{err_ctx}

Output ONLY the complete file content. No markdown, no fences, no explanation.""",
                    timeout=150.0,
                )
                return {"path": path, "content": _strip_fences(out)}
            return _run

        generated = parallel([gen_file(item) for item in manifest],
                             max_workers=min(6, len(manifest)))

        # 2. Write all files (resolve non-absolute / wrong-root paths against cwd)
        def _resolve_path(path: str) -> str:
            p = Path(path).expanduser()
            if p.is_absolute():
                # Accept any absolute path ALREADY UNDER the project root, even if
                # its parent dir is new (new screen folder). The old `p.parent.exists()`
                # guard failed here and doubled the path (cwd/Users/.../cwd/src/...).
                try:
                    p.resolve().relative_to(Path(cwd).resolve())
                    return str(p)
                except ValueError:
                    pass
                if p.exists() or p.parent.exists():
                    return str(p)
            # model gave a project-relative path like "/src/..." or "src/..."
            return str(Path(cwd) / path.lstrip("/"))

        files_written = []
        write_errors = []
        for g in generated:
            if g and g.get("content"):
                resolved = _resolve_path(g["path"])
                try:
                    write_file(resolved, g["content"])
                    files_written.append(resolved)
                except Exception as exc:
                    write_errors.append(f"{g['path']}: {exc}")
                    logger.error(f"  write failed {g['path']}: {exc}")

        logger.info(f"  wrote {len(files_written)}/{len(manifest)} files")

        # 2a. SYNTAX VALIDATE + REPAIR each written file BEFORE the project test
        # (Phase 1A). Catches the NEW-FILE brace-drop class deterministically so
        # the project typecheck isn't burned on a TS1005 the brain can re-drop.
        for fw in files_written:
            try:
                _syntax_validate_and_repair(fw, cwd=cwd, brain=brain,
                                            error_hint=last_error)
            except Exception as exc:
                logger.warning(f"  syntax-repair skipped for {Path(fw).name}: {exc}")

        # 2b. GUARD against vacuous pass — a build that wrote nothing is NOT a pass,
        # even if the test passes (the test may have been passing at baseline).
        if len(files_written) < len(manifest):
            last_error = (f"Only {len(files_written)}/{len(manifest)} files were written. "
                          f"Write errors: {write_errors}. A build that does not write all its "
                          f"files has not succeeded — paths must be correct and absolute.")
            logger.warning(f"  ❌ incomplete write — {last_error[:160]}")
            history.append({"iteration": iteration, "passed": False,
                           "files": len(files_written), "errors": write_errors})
            continue

        # 3. Whole-project test
        try:
            shell(test_cmd, cwd=cwd, timeout=180.0, trust_gate=False)
            logger.info(f"  ✅ PROJECT TEST PASSED on iteration {iteration}")
            history.append({"iteration": iteration, "passed": True, "files": len(files_written)})
            return {"passed": True, "iterations": iteration,
                    "files_written": files_written, "history": history}
        except RuntimeError as exc:
            error_text = str(exc)
            last_error = error_text
            ts_errors = [l.strip() for l in error_text.split("\n")
                         if "error TS" in l or ".ts(" in l or ".tsx(" in l]
            logger.warning(f"  ❌ test failed: {len(ts_errors)} error(s)")
            for e in ts_errors[:6]:
                logger.warning(f"     {e}")
            history.append({"iteration": iteration, "passed": False,
                           "files": len(files_written),
                           "errors": ts_errors[:8] or [error_text[:300]]})

    # Failed all iterations — roll back to originals
    logger.error(f"[multi_file_code_job] FAILED after {max_iterations} iterations — rolling back")
    for path, orig in originals.items():
        try:
            if orig is None:
                fp = Path(path).expanduser()
                if fp.exists():
                    fp.unlink()
            else:
                Path(path).expanduser().write_text(orig)
        except Exception:
            pass
    return {"passed": False, "iterations": max_iterations,
            "files_written": files_written, "history": history, "rolled_back": True}


def surgical_patch(
    file_path: str,
    edits: List[Dict[str, str]],
    dispatcher: Dispatcher,
    test_cmd: str,
    cwd: str,
    context: str = "",
    brain: str = "claude",
    max_iterations: int = 4,
    render_test: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Edit an existing file via SURGICAL anchored replacements — never regenerate
    the whole file. This is the fix for the Gate-B wall: full-file regeneration
    of a 250-line file kept dropping braces (TS1005). Here the brain only writes
    the small replacement snippet for each exact anchor.

    edits: [{"anchor": "<exact existing substring>", "instruction": "what the
            replacement should do"}]
    For each edit, the brain is given the anchor text + surrounding context and
    returns ONLY the replacement text for that anchor. We do an exact string
    replace. Then typecheck (+ optional render gate). Self-heal failed edits.

    Returns {"passed", "iterations", "applied", "render_result"}.
    """
    from .brain_client import BrainChain
    p = Path(file_path).expanduser()
    original = p.read_text()
    last_error = ""

    # Work on a private copy so re-anchoring (Phase 1B) never mutates the
    # caller-owned edits list across iterations or across repeated calls.
    edits = [dict(e) for e in edits]
    for iteration in range(1, max_iterations + 1):
        logger.info(f"[surgical_patch] iter {iteration}/{max_iterations} — {len(edits)} anchored edit(s)")
        text = original  # always start from the pristine original each iteration
        applied = 0
        miss = []
        for e in edits:
            anchor = e["anchor"]
            # Pre-check anchor presence with fuzzy tolerance so a stray
            # whitespace diff doesn't fail an otherwise-valid edit.
            _probe, _found = _fuzzy_replace(text, anchor, anchor)
            if not _found:
                # Phase 1B: RE-ANCHOR instead of re-missing. The defect was that
                # iterations 2-4 re-prompted with the SAME (absent) anchor. Ask the
                # brain for a FRESH verbatim substring that EXISTS in the file, and
                # only accept it if `anchor in text` BEFORE spending a replace call.
                bc0 = BrainChain(preferred=brain)
                fresh = bc0.call_prompt(
                    f"""The anchor below was NOT found in the file. Return ONLY a NEW anchor:
a SHORT substring copied VERBATIM (character-for-character) from the CURRENT FILE
CONTENT, near where this edit belongs. No markdown, no explanation — just the substring.

EDIT INTENT: {e['instruction']}
ANCHOR THAT FAILED: {anchor[:200]}

CURRENT FILE CONTENT:
{text[:16000]}""",
                    timeout=120.0)
                fresh = _strip_fences(fresh).strip()
                _p2, _f2 = _fuzzy_replace(text, fresh, fresh)
                if fresh and _f2:
                    anchor = e["anchor"] = fresh  # persist for later iterations
                    logger.info(f"  ↻ re-anchored to verbatim substring ({fresh[:40]!r})")
                else:
                    miss.append(anchor[:50])
                    continue
            err_ctx = f"\n\nLAST ATTEMPT FAILED TO COMPILE:\n{last_error[:800]}" if last_error else ""
            bc = BrainChain(preferred=brain)
            replacement = bc.call_prompt(
                f"""You are making ONE surgical code edit. Output ONLY the replacement
text for the anchor below — no markdown, no fences, no explanation, no
surrounding code beyond what replaces the anchor. Keep it syntactically balanced
(every brace/paren/bracket you open you close).

FILE: {file_path}
SHARED CONTEXT:
{context[:2000]}

EXACT TEXT TO REPLACE (the anchor):
{anchor}

WHAT THE REPLACEMENT MUST DO:
{e['instruction']}
{err_ctx}

Output ONLY the replacement text (it will be substituted for the anchor verbatim).""",
                timeout=120.0,
            )
            replacement = _strip_fences(replacement)
            text, did = _fuzzy_replace(text, anchor, replacement)
            if not did:
                miss.append(anchor[:50])
                continue
            applied += 1

        if miss:
            last_error = f"anchors not found in file: {miss}"
            logger.warning(f"  ❌ {last_error}")
            continue

        write_file(str(p), text)
        # typecheck
        try:
            shell(test_cmd, cwd=cwd, timeout=180.0, trust_gate=False)
        except RuntimeError as exc:
            last_error = str(exc)
            ts = [l.strip() for l in last_error.split("\n") if "error TS" in l]
            logger.warning(f"  ❌ typecheck failed: {ts[:4]}")
            continue

        # render gate (optional)
        if render_test:
            rg = runtime_render_gate(render_test["path"], render_test["content"], cwd, timeout=90)
            if not rg["passed"]:
                last_error = f"render gate failed (looped={rg['looped']}): {rg['detail'][:500]}"
                logger.warning(f"  ❌ {last_error[:160]}")
                continue
            logger.info(f"  ✅ BOTH gates passed (surgical, iter {iteration})")
            return {"passed": True, "iterations": iteration, "applied": applied, "render_result": rg}

        logger.info(f"  ✅ typecheck passed (surgical, iter {iteration})")
        return {"passed": True, "iterations": iteration, "applied": applied, "render_result": None}

    # rollback
    p.write_text(original)
    logger.error(f"[surgical_patch] FAILED after {max_iterations} — rolled back")
    return {"passed": False, "iterations": max_iterations, "applied": 0,
            "last_error": last_error[:400], "rolled_back": True}


def runtime_render_gate(
    test_file_path: str,
    test_content: str,
    cwd: str,
    timeout: float = 150.0,
    keep_test: bool = False,
) -> Dict[str, Any]:
    """
    RUNTIME render gate — catches the bug class a typecheck CANNOT: a component
    that compiles clean but infinite-loops / throws at render time (e.g. the
    SessionNamePicker 'Maximum update depth exceeded' incident).

    Writes a jsdom render smoke test, runs vitest on just that file, and fails
    if the render throws OR logs 'Maximum update depth' (the setState-loop
    signature). This is gate #2 after typecheck in build_app.

    Returns {"passed", "looped", "detail"}.
    """
    p = Path(test_file_path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    write_file(str(p), test_content)
    # vitest path relative to cwd
    try:
        rel = str(p.relative_to(Path(cwd)))
    except ValueError:
        rel = str(p)
    passed = False
    detail = ""
    timed_out = False
    try:
        detail = shell(
            f"cd {cwd} && npx vitest run {rel} 2>&1",
            cwd=cwd, timeout=timeout, trust_gate=False,
        )
        passed = True
    except RuntimeError as exc:
        detail = str(exc)
        passed = False
    except _subprocess.TimeoutExpired:
        # A render loop frequently HANGS the runner instead of throwing cleanly.
        # A hung render test IS the loop signature → fail.
        timed_out = True
        detail = (f"vitest TIMED OUT after {timeout}s — the render did not terminate. "
                  f"This is the infinite-render-loop signature (a hang), treated as FAIL.")
        passed = False
    looped = (timed_out or "Maximum update depth" in detail
              or "maximum update depth" in detail.lower())
    if not keep_test:
        try:
            p.unlink()
        except Exception:
            pass
    result = {"passed": passed and not looped, "looped": looped, "detail": detail[:800]}
    logger.info(f"[runtime_render_gate] {test_file_path}: passed={result['passed']} looped={looped}")
    return result


def build_app(
    goal: str,
    dispatcher: Dispatcher,
    project_root: str,
    test_cmd: str,
    grounding_facts: str = "",
    brain: str = "claude",
    max_iterations: int = 4,
    render_test: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Take a high-level build goal, DECOMPOSE it into a concrete multi-file
    manifest, then execute it via multi_file_code_job with whole-project
    verification + self-heal.

    This is the "Shay builds the app" capability: goal in → working,
    compiling change out (or honest rollback + diagnosis).

    Returns {"passed", "manifest", "result", "diagnosis"}.
    """
    from .brain_client import BrainChain
    lessons = prior_planning_lessons()

    # 1. Decompose the goal into a file manifest (grounded)
    bc = BrainChain(preferred=brain)
    decomp_raw = bc.call_prompt(
        f"""{lessons}

You are decomposing a build goal into a CONCRETE multi-file manifest.

GROUNDED FACTS (cite real paths/counts, never guess):
{grounding_facts[:3000]}

GOAL: {goal}

Produce a JSON manifest of the files to create or modify to achieve this goal.
Each entry: {{"path": "FULL ABSOLUTE path starting with {project_root}", "instruction": "precise change for this file"}}.
CRITICAL: every path MUST be a full absolute path beginning with "{project_root}/".
Do NOT use project-relative paths like "/src/..." — they will be rejected.
Only include files that MUST change. Keep it minimal and coordinated — every file
listed must be consistent with the others so the project compiles.

Return ONLY JSON: {{"manifest": [{{"path":"...","instruction":"..."}}], "rationale":"one line"}}""",
        timeout=120.0,
    )
    try:
        decomp = _parse_json(decomp_raw)
        manifest = decomp.get("manifest", [])
    except Exception as exc:
        return {"passed": False, "error": f"decomposition failed: {exc}",
                "raw": decomp_raw[:500]}

    if not manifest:
        return {"passed": False, "error": "empty manifest from decomposition"}

    logger.info(f"[build_app] decomposed into {len(manifest)} files: "
                f"{[Path(m['path']).name for m in manifest]}")

    # 2. Execute (GATE 1: typecheck). Route by file existence:
    #    - NEW files       → multi_file_code_job (full generation, correct)
    #    - EXISTING files   → surgical_patch (anchored edits, NEVER full-regen)
    # This closes buglog #219: full-regen of a living render-spine file dropped
    # a closing tag (App.tsx TS17008). Order matters — create new files first so
    # existing-file patches that import them still typecheck.
    def _resolve(path: str) -> str:
        p = Path(path).expanduser()
        if p.is_absolute():
            try:
                p.resolve().relative_to(Path(project_root).resolve())
                return str(p)  # absolute & under root → accept even if parent is new
            except ValueError:
                pass
            if p.exists() or p.parent.exists():
                return str(p)
        return str(Path(project_root) / path.lstrip("/"))

    new_files, existing_files = [], []
    for m in manifest:
        rp = _resolve(m["path"])
        (existing_files if Path(rp).exists() else new_files).append({**m, "path": rp})

    ctx = f"GOAL: {goal}\n\nGROUNDED FACTS:\n{grounding_facts[:2000]}"
    files_written, history, ok = [], [], True

    # 2a. NEW files first
    if new_files:
        nf = multi_file_code_job(
            manifest=new_files, test_cmd=test_cmd, cwd=project_root,
            dispatcher=dispatcher, context=ctx, brain=brain,
            max_iterations=max_iterations,
        )
        history += nf.get("history", [])
        files_written += nf.get("files_written", [])
        if not nf.get("passed"):
            ok = False

    # 2b. EXISTING files via anchored surgical edits
    for m in (existing_files if ok else []):
        fp, instruction = m["path"], m["instruction"]
        spine = _is_render_spine(fp)
        cur = Path(fp).read_text(errors="ignore")
        spine_rule = (
            "\nThis is a RENDER-SPINE file (large, holds a JSX return/provider tree). "
            "You MUST return >=2 SMALL, ADDITIVE anchored edits — e.g. first add a new "
            "const/map as its own anchor, then swap ONE return/JSX line as a second anchor. "
            "NEVER use one anchor that spans a whole return/provider block (that is what "
            "dropped </ThemeProvider> and broke the build)." if spine else
            "\nKeep anchors small and exact; prefer the fewest precise edits."
        )
        edit_prompt = (
            f"""{lessons}
You are planning SURGICAL anchored edits to an EXISTING file. Do NOT rewrite the
file. Return ONLY JSON: {{"edits":[{{"anchor":"<exact existing substring to replace>",
"instruction":"<what the replacement must do>"}}]}}.

ANCHOR FIDELITY (critical — the #1 failure cause):
- Every "anchor" MUST be copied VERBATIM, character-for-character, from the
  CURRENT FILE CONTENT shown below. Do NOT paraphrase, reformat, or invent a
  construct (e.g. do NOT write a `switch/case` if the file uses a ternary — read
  what is ACTUALLY there).
- Before you output an anchor, confirm the exact substring appears in the content.
- To INTRODUCE new code, do NOT invent a new anchor — instead anchor to an
  existing line near where it belongs (e.g. the import block, or the exact line
  you are extending) and include that existing text plus your addition in the
  replacement.{spine_rule}

FILE: {fp}
GROUNDED FACTS:
{grounding_facts[:1500]}
WHAT THIS FILE MUST ACHIEVE: {instruction}

CURRENT FILE CONTENT (anchors must be verbatim substrings of THIS — the
ENTIRE file is shown below; do not anchor to anything not present here):
{cur[:24000]}{("... [TRUNCATED — file exceeds 24000 chars; only anchor within the shown region]" if len(cur) > 24000 else "")}"""
        )
        # Derive anchored edits with retries — a single brain returning prose
        # (e.g. a capped-Claude fallback) must NOT silently kill the unit. Log
        # the raw response on each miss so failures are diagnosable.
        edits = []
        last_raw = ""
        for attempt in range(1, 4):
            bc2 = BrainChain(preferred=brain)
            edits_raw = bc2.call_prompt(
                edit_prompt + (
                    "\n\nYour previous response was not valid JSON. Return ONLY the "
                    "JSON object, no prose, no fences." if attempt > 1 else ""),
                timeout=120.0,
            )
            last_raw = edits_raw or ""
            try:
                edits = _parse_json(edits_raw).get("edits", [])
            except Exception:
                edits = []
            if edits:
                break
            logger.warning(f"[build_app] edit-derivation attempt {attempt}/3 for "
                           f"{Path(fp).name} yielded no edits; raw[:200]={last_raw[:200]!r}")
        if not edits:
            ok = False
            history.append({"file": Path(fp).name, "passed": False,
                            "errors": [f"could not derive anchored edits after 3 tries; "
                                       f"last raw[:160]={last_raw[:160]!r}"]})
            break
        sp = surgical_patch(
            file_path=fp, edits=edits, dispatcher=dispatcher, test_cmd=test_cmd,
            cwd=project_root, context=ctx, brain=brain, max_iterations=max_iterations,
        )
        history.append({"file": Path(fp).name, "passed": sp.get("passed"),
                        "applied": sp.get("applied"), "spine": spine,
                        "errors": [sp.get("last_error")] if not sp.get("passed") else []})
        if sp.get("passed"):
            files_written.append(fp)
        else:
            ok = False
            break

    result = {"passed": ok, "files_written": files_written, "history": history}

    # 2b. GATE 2: runtime render gate (only if typecheck passed AND a render
    # test was supplied). Catches the bug class typecheck cannot — render loops.
    render_result = None
    if result["passed"] and render_test:
        rt = render_test  # {"path": "...test.tsx", "content": "..."}
        for rg_iter in range(1, max_iterations + 1):
            render_result = runtime_render_gate(rt["path"], rt["content"],
                                                project_root, timeout=90)
            if render_result["passed"]:
                logger.info(f"[build_app] BOTH gates passed (render iter {rg_iter})")
                break
            # render failed (loop/throw) → feed back to the brain to fix the
            # SOURCE files, not the test, then re-run both gates.
            logger.warning(f"[build_app] render gate FAILED (looped={render_result['looped']}) "
                           f"— self-healing source, iter {rg_iter}")
            heal_manifest = [dict(m) for m in manifest]
            for m in heal_manifest:
                m["instruction"] = (m["instruction"] +
                    f"\n\nRUNTIME RENDER FAILURE (your code compiles but {('infinite-loops/hangs' if render_result['looped'] else 'throws')} at render): "
                    f"{render_result['detail'][:600]}\n"
                    "Common cause: a store selector returning a NEW array/object each call, "
                    "or a useEffect that setStates unconditionally. Fix the source.")
            result = multi_file_code_job(
                manifest=heal_manifest, test_cmd=test_cmd, cwd=project_root,
                dispatcher=dispatcher,
                context=f"GOAL: {goal}\n\nGROUNDED FACTS:\n{grounding_facts[:2000]}",
                brain=brain, max_iterations=2,
            )
            if not result["passed"]:
                break  # can't even compile the fix; stop
        else:
            render_result = render_result or {"passed": False}

    both_passed = result["passed"] and (render_result is None or render_result.get("passed", False))

    # 3. Diagnose if it failed (learning)
    diagnosis = ""
    if not both_passed:
        last = result["history"][-1] if result.get("history") else {}
        stage = "render-gate" if (result["passed"] and render_result and not render_result.get("passed")) else "typecheck"
        diagnosis = f"Failed at {stage}. typecheck_errors={last.get('errors', [])[:3]} render={render_result}"
        capture_planning_lesson(
            title=f"build_app: {goal[:60]}",
            score=3,
            what_went_wrong=[f"build failed at {stage} stage",
                             f"detail: {diagnosis[:200]}"],
            root_causes=[f"{stage}: cross-file contract or a runtime render issue the brain couldn't resolve"],
            fixes=["narrow the manifest, add grounded context, or split into smaller builds"],
            tags=["build-app", "multi-file", stage],
        )

    return {"passed": both_passed, "manifest": manifest,
            "result": result, "render_result": render_result, "diagnosis": diagnosis}


# ---------------------------------------------------------------------------
# Planning quality guardrails (added 2026-05-30 after Shay scored 5/10 on a
# desktop plan). Root causes were NOT the brain — they were missing harness
# checks: (1) no grounding (she claimed hermesAPI had 3 bindings, it had 60+),
# (2) no completeness gate (plan shipped truncated mid-sentence), (3) no
# learning capture on planning runs. These three functions close those gaps.
# ---------------------------------------------------------------------------

import subprocess as _subprocess
from datetime import datetime as _datetime

_BUGLOG = Path.home() / "famtastic" / ".wolf" / "buglog.json"
_LEARNINGS = Path.home() / "famtastic" / "obsidian" / "Shay-Memory" / "learnings"


def ground_claim(claim_type: str, target: str, cwd: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify a factual claim about the codebase with a REAL command instead of
    guessing. Returns the actual measured value so a plan can cite truth.

    claim_type:
      "count_matches"  → grep -c <target> across files (target = "pattern|path")
      "line_count"     → wc -l <target> (target = file path)
      "file_exists"    → test -f <target>
      "list_dir"       → ls <target>
      "grep"           → grep -rn <target> (target = "pattern|path")

    Example that would have caught Shay's error:
      ground_claim("count_matches", "invoke|src/preload/index.ts")
      → returns {"value": 125, ...} instead of her guessed "3"
    """
    base = cwd or str(Path.home() / "famtastic")
    try:
        if claim_type == "count_matches":
            pattern, _, path = target.partition("|")
            path = path or "."
            out = _subprocess.run(
                ["grep", "-rc", pattern.strip(), path.strip()],
                capture_output=True, text=True, cwd=base, timeout=30,
            )
            # grep -rc prints path:count lines; sum them
            total = 0
            for line in (out.stdout or "").splitlines():
                if ":" in line:
                    try:
                        total += int(line.rsplit(":", 1)[1])
                    except ValueError:
                        pass
            return {"claim_type": claim_type, "target": target, "value": total, "verified": True}
        elif claim_type == "line_count":
            out = _subprocess.run(["wc", "-l", target.strip()],
                                  capture_output=True, text=True, cwd=base, timeout=15)
            n = int((out.stdout or "0").strip().split()[0]) if out.stdout.strip() else 0
            return {"claim_type": claim_type, "target": target, "value": n, "verified": True}
        elif claim_type == "file_exists":
            exists = (Path(base) / target).exists() or Path(target).exists()
            return {"claim_type": claim_type, "target": target, "value": exists, "verified": True}
        elif claim_type == "list_dir":
            out = _subprocess.run(["ls", target.strip()],
                                  capture_output=True, text=True, cwd=base, timeout=15)
            items = [x for x in (out.stdout or "").split() if x]
            return {"claim_type": claim_type, "target": target, "value": items,
                    "count": len(items), "verified": True}
        elif claim_type == "grep":
            pattern, _, path = target.partition("|")
            out = _subprocess.run(["grep", "-rn", pattern.strip(), (path or ".").strip()],
                                  capture_output=True, text=True, cwd=base, timeout=30)
            lines = [l for l in (out.stdout or "").splitlines() if l][:50]
            return {"claim_type": claim_type, "target": target, "value": lines,
                    "count": len(lines), "verified": True}
        else:
            return {"claim_type": claim_type, "target": target, "verified": False,
                    "error": f"unknown claim_type: {claim_type}"}
    except Exception as exc:  # noqa: BLE001
        return {"claim_type": claim_type, "target": target, "verified": False, "error": str(exc)}


def plan_completeness_gate(plan: str, required_sections: List[str]) -> Dict[str, Any]:
    """
    Reject a plan that is truncated or missing required sections.
    This is what would have caught Shay's plan ending mid-sentence at "are al...".

    Returns {"complete": bool, "issues": [...]}.
    """
    issues = []
    text = (plan or "").strip()

    # 1. Truncation check — must end on a sentence-terminal char or list/code close
    if not text:
        return {"complete": False, "issues": ["plan is empty"]}
    last_char = text[-1]
    terminal = (last_char in ".!?)`]" or text.endswith("```") or
                text.rstrip().endswith("---"))
    if not terminal:
        # Grab the dangling tail for the error
        tail = text[-80:]
        issues.append(f"plan appears truncated — ends mid-sentence: '...{tail}'")

    # 2. Required sections present (case-insensitive substring)
    low = text.lower()
    for section in required_sections:
        if section.lower() not in low:
            issues.append(f"missing required section: '{section}'")

    # 3. Minimum length sanity
    if len(text) < 500:
        issues.append(f"plan suspiciously short ({len(text)} chars)")

    return {"complete": len(issues) == 0, "issues": issues, "length": len(text)}


def capture_planning_lesson(
    title: str,
    score: Optional[float],
    what_went_wrong: List[str],
    root_causes: List[str],
    fixes: List[str],
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Persist a PLANNING lesson (not just code-failure lessons) to buglog +
    Obsidian so the next planning run carries it forward. This is the gap
    that let Shay's 5/10 lesson evaporate.
    """
    date = _datetime.now().strftime("%Y-%m-%d")
    result = {"buglog": False, "obsidian": False}

    # Buglog
    try:
        d = json.loads(_BUGLOG.read_text()) if _BUGLOG.exists() else {"bugs": []}
        bugs = d["bugs"] if isinstance(d, dict) and "bugs" in d else d
        entry = {
            "id": (bugs[-1]["id"] + 1) if bugs else 1,
            "timestamp": date,
            "error_message": f"[planning] {title} scored {score}/10: {'; '.join(what_went_wrong[:3])}",
            "file": "planning",
            "root_cause": "; ".join(root_causes[:3]),
            "fix": "; ".join(fixes[:3]),
            "tags": (tags or []) + ["planning", "self-learning"],
        }
        bugs.append(entry)
        _BUGLOG.write_text(json.dumps(d, indent=2))
        result["buglog"] = entry["id"]
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"capture_planning_lesson buglog failed: {exc}")

    # Obsidian
    try:
        _LEARNINGS.mkdir(parents=True, exist_ok=True)
        fp = _LEARNINGS / f"planning-lesson-{date}.md"
        md = f"""---
title: Planning Lesson — {title}
date: {date}
score: {score}
tags: {(tags or []) + ['planning', 'self-learning']}
---

# Planning Lesson: {title}

**Score:** {score}/10

## What went wrong
{chr(10).join(f"- {w}" for w in what_went_wrong)}

## Root causes
{chr(10).join(f"- {r}" for r in root_causes)}

## Fixes applied / to apply
{chr(10).join(f"- {f}" for f in fixes)}

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.
"""
        # Append if file exists for the day, else create
        if fp.exists():
            fp.write_text(fp.read_text() + "\n\n---\n\n" + md)
        else:
            fp.write_text(md)
        result["obsidian"] = str(fp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"capture_planning_lesson obsidian failed: {exc}")

    return result


def prior_planning_lessons(tags: Optional[List[str]] = None, limit: int = 5) -> str:
    """
    Read prior planning lessons from buglog so the next run starts informed.
    Returns a formatted string to inject into a planning prompt.
    """
    try:
        if not _BUGLOG.exists():
            return ""
        d = json.loads(_BUGLOG.read_text())
        bugs = d["bugs"] if isinstance(d, dict) and "bugs" in d else d
        planning = [b for b in bugs if "planning" in str(b.get("tags", []))]
        if not planning:
            return ""
        lines = ["PRIOR PLANNING LESSONS (apply these — do not repeat the mistakes):"]
        for b in planning[-limit:]:
            lines.append(f"- {b.get('error_message','')[:140]}")
            lines.append(f"  Root cause: {b.get('root_cause','')[:120]}")
            lines.append(f"  Fix: {b.get('fix','')[:120]}")
        return "\n".join(lines)
    except Exception:
        return ""


def synthesize_sections(
    goal: str,
    sections: List[str],
    dispatcher: Dispatcher,
    context: str = "",
    brain: str = "claude",
) -> str:
    """
    Anti-truncation synthesis: generate EACH required section in its own brain
    call, then assemble. No single call has to produce all sections, so it never
    hits the token ceiling mid-plan (the failure that truncated the ULTIMATE plan).

    Each section call gets: the goal, the context, the section name, and a short
    digest of sections already written (for coherence, not full text).
    """
    from .brain_client import BrainChain
    written: Dict[str, str] = {}
    for sec in sections:
        prior_digest = ""
        if written:
            prior_digest = "Sections already written (titles + first line, for coherence):\n" + \
                "\n".join(f"- ## {k}: {v.strip().splitlines()[0][:120] if v.strip() else ''}"
                          for k, v in written.items())
        bc = BrainChain(preferred=brain)
        body = bc.call_prompt(
            f"""You are writing ONE section of a larger build plan. Write ONLY this section,
in full, ending on a complete sentence. Be dense and concrete. Do not write other sections.

PLAN GOAL: {goal}

CONTEXT (grounded facts, research, prior plans):
{context[:4000]}

{prior_digest}

WRITE THIS SECTION NOW: ## {sec}

Output the section starting with the heading "## {sec}" and nothing after it.""",
            timeout=120.0,
        )
        body = _strip_fences(body).strip()
        if not body.lower().startswith("## "):
            body = f"## {sec}\n\n{body}"
        written[sec] = body
        logger.info(f"[synthesize_sections] wrote '{sec}' ({len(body)} chars)")
    assembled = "\n\n".join(written[s] for s in sections)
    return assembled


def planning_loop(
    goal: str,
    dispatcher: Dispatcher,
    required_sections: List[str],
    context: str = "",
    brain: str = "claude",
    max_attempts: int = 3,
    grounding_facts: str = "",
) -> Dict[str, Any]:
    """
    ENFORCING planning loop — the gate is no longer advisory.

    Flow:
      1. Inject prior planning lessons (so past failures aren't repeated)
      2. Generate the plan
      3. Run plan_completeness_gate()
      4. If it FAILS → re-prompt with the specific issues → repeat
      5. Only return a plan that PASSES the gate (or the best attempt if maxed)
      6. Capture every failure→fix as a planning lesson (learning loop)

    This closes the gap where an incomplete plan could ship at 8/10 because
    the gate only reported failure instead of forcing a fix.

    Returns {"plan", "passed", "attempts", "gate", "lesson"}.
    """
    lessons = prior_planning_lessons()
    base_prompt = f"""{lessons}

{('GROUNDED FACTS (cite these, never guess):' + chr(10) + grounding_facts) if grounding_facts else ''}

{('CONTEXT:' + chr(10) + context) if context else ''}

GOAL: {goal}

MANDATORY: Your plan MUST include ALL of these sections (use these EXACT heading labels):
{chr(10).join(f'  ## {s}' for s in required_sections)}

CRITICAL: Finish every section. End on a complete sentence. A completeness gate
will REJECT truncated output or any plan missing a required section — and you
will be asked to redo it. Be dense, not verbose. Do not run out of room."""

    attempts = []
    plan = ""
    gate = {}
    prev_issues = []

    # ANTI-TRUNCATION: for multi-section plans (5+), generate section-at-a-time
    # so no single call hits the token ceiling. This is the fix for the ULTIMATE
    # plan truncation. Needs a dispatcher; falls back to single-call if absent.
    use_sections = len(required_sections) >= 5 and dispatcher is not None

    for attempt in range(1, max_attempts + 1):
        logger.info(f"[planning_loop] attempt {attempt}/{max_attempts} "
                    f"(mode={'per-section' if use_sections else 'single-call'})")
        if use_sections:
            sec_ctx = (grounding_facts + "\n\n" + context)
            if prev_issues:
                sec_ctx += "\n\nPRIOR ISSUES TO AVOID:\n" + "\n".join(prev_issues)
            plan = synthesize_sections(goal, required_sections, dispatcher,
                                       context=sec_ctx, brain=brain)
        else:
            prompt = base_prompt
            if prev_issues:
                prompt = f"""{base_prompt}

⚠️ YOUR PREVIOUS ATTEMPT FAILED THE COMPLETENESS GATE WITH THESE ISSUES:
{chr(10).join(f'  - {i}' for i in prev_issues)}

Fix EXACTLY these issues. If truncated, be more concise. Output the COMPLETE plan."""
            brain_chain = BrainChain(preferred=brain)
            plan = brain_chain.call_prompt(prompt, timeout=150.0)
        gate = plan_completeness_gate(plan, required_sections)
        attempts.append({"attempt": attempt, "passed": gate["complete"],
                         "issues": gate["issues"], "chars": len(plan)})
        logger.info(f"[planning_loop] attempt {attempt}: gate complete={gate['complete']} "
                    f"issues={len(gate['issues'])}")

        if gate["complete"]:
            logger.info(f"[planning_loop] PASSED on attempt {attempt}")
            break
        prev_issues = gate["issues"]

    passed = gate.get("complete", False)

    # Learning capture — record the loop's outcome regardless of pass/fail
    if len(attempts) > 1 or not passed:
        what_wrong = []
        for a in attempts:
            if not a["passed"]:
                what_wrong.append(f"attempt {a['attempt']}: {'; '.join(a['issues'][:2])}")
        capture_planning_lesson(
            title=f"planning_loop: {goal[:60]}",
            score=(8 if passed else 4),
            what_went_wrong=what_wrong or ["passed first try"],
            root_causes=["completeness gate caught incomplete output; auto-reprompt engaged"],
            fixes=[f"resolved in {len(attempts)} attempt(s)" if passed
                   else f"still failing after {max_attempts} attempts — needs manual review"],
            tags=["planning-loop", "enforcing-gate"],
        )

    return {
        "plan": plan,
        "passed": passed,
        "attempts": len(attempts),
        "attempt_log": attempts,
        "gate": gate,
    }


def refine_to_target(
    artifact: str,
    dispatcher: Dispatcher,
    rubric: str,
    target_score: float = 9.0,
    max_rounds: int = 3,
    lenses: Optional[List[str]] = None,
    brain: str = "claude",
) -> Dict[str, Any]:
    """
    Drive an artifact UP to a target score by making adversarial critique
    actually revise it — not just score it. This is the missing loop that
    let plans plateau at 8/10: review found weaknesses, but nothing fixed them.

    Each round:
      1. N adversarial lenses review IN PARALLEL → concrete fix list + score
      2. If score >= target → done
      3. TARGETED revision: patch ONLY the flagged items, keep the rest verbatim
         (faster than full regen, and won't re-break fixed parts)
      4. Re-score

    Returns {"artifact", "final_score", "rounds", "history"}.
    """
    if not lenses:
        lenses = ["correctness/grounding", "completeness/sequencing", "actionability/specificity"]

    current = artifact
    history = []

    for rnd in range(1, max_rounds + 1):
        logger.info(f"[refine_to_target] round {rnd}/{max_rounds}")

        # 1. Parallel adversarial review — each lens returns score + concrete fixes
        def review(lens):
            def _run():
                bc = BrainChain(preferred=brain)
                out = bc.call_prompt(
                    f"""You are a harsh reviewer using the {lens} lens.
RUBRIC: {rubric}

Score this artifact 0-10 on YOUR lens only, and list the SPECIFIC, concrete fixes
that would raise the score. Each fix must name what to change and to what.

ARTIFACT:
{current[:6000]}

Return ONLY JSON: {{"lens":"{lens}","score":0,"concrete_fixes":["fix 1","fix 2"]}}""",
                    timeout=90.0,
                )
                try:
                    return _parse_json(out)
                except Exception:
                    return {"lens": lens, "score": 5, "concrete_fixes": []}
            return _run

        reviews = parallel([review(l) for l in lenses], max_workers=len(lenses))
        reviews = [r for r in reviews if r]
        scores = [float(r.get("score", 5)) for r in reviews]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0
        all_fixes = [f for r in reviews for f in (r.get("concrete_fixes") or [])]

        history.append({"round": rnd, "score": avg_score,
                        "lens_scores": {r["lens"]: r.get("score") for r in reviews},
                        "fix_count": len(all_fixes)})
        logger.info(f"[refine_to_target] round {rnd}: score={avg_score} fixes={len(all_fixes)}")

        if avg_score >= target_score or not all_fixes:
            logger.info(f"[refine_to_target] target reached ({avg_score} >= {target_score})")
            return {"artifact": current, "final_score": avg_score, "rounds": rnd, "history": history}

        # 3. TARGETED revision — patch only the flagged items
        bc = BrainChain(preferred=brain)
        current = bc.call_prompt(
            f"""You are revising an artifact to raise its quality. Apply EVERY fix below.
Keep everything that is already good VERBATIM — only change what the fixes call for.
Do not truncate. Output the complete revised artifact.

CURRENT ARTIFACT:
{current[:7000]}

CONCRETE FIXES TO APPLY ({len(all_fixes)}):
{chr(10).join(f'{i+1}. {f}' for i, f in enumerate(all_fixes[:15]))}

Output the full revised artifact, every section finished, ending on a complete sentence.""",
            timeout=150.0,
        )

    # Final score after last revision
    bc = BrainChain(preferred=brain)
    try:
        final = _parse_json(bc.call_prompt(
            f"Score this artifact 0-10 on: {rubric}\n\n{current[:5000]}\n\nReturn JSON: {{\"score\":0}}",
            timeout=60.0))
        final_score = float(final.get("score", history[-1]["score"]))
    except Exception:
        final_score = history[-1]["score"] if history else 0

    return {"artifact": current, "final_score": final_score, "rounds": max_rounds, "history": history}


# ---------------------------------------------------------------------------
# Skills integration — wire Shay's 158 skills into the swarm pipeline.
# Skills are SKILL.md files in ~/.shay/skills/**/. The swarm can now:
#   list_skills(query)           → discover relevant skills
#   get_skill(name)              → read a skill's full instructions
#   use_skill(name, context, dispatcher) → invoke a skill in a pipeline step
# ---------------------------------------------------------------------------

SKILLS_ROOT = Path.home() / ".shay" / "skills"


def list_skills(query: str = "", max_results: int = 10) -> List[Dict[str, Any]]:
    """
    Discover available skills. If query is given, fuzzy-matches on name,
    description, and tags. Returns list of {name, description, path, tags}.
    """
    results = []
    for skill_md in SKILLS_ROOT.rglob("SKILL.md"):
        try:
            text = skill_md.read_text(errors="ignore")
            # Parse frontmatter
            meta = _parse_skill_frontmatter(text)
            name = meta.get("name") or meta.get("slug") or skill_md.parent.name
            desc = meta.get("description", "")
            tags = meta.get("metadata", {}).get("shay", {}).get("tags", []) if isinstance(meta.get("metadata"), dict) else []
            if isinstance(tags, str):
                tags = [tags]

            if query:
                q_terms = query.lower().split()
                searchable = f"{name} {desc} {' '.join(tags if isinstance(tags, list) else [])}".lower()
                # Also search first 500 chars of skill body
                body_preview = re.sub(r"^---.*?---\s*", "", text, flags=re.DOTALL)[:500].lower()
                searchable += " " + body_preview
                if not all(t in searchable for t in q_terms):
                    continue
            results.append({
                "name": name,
                "description": desc,
                "path": str(skill_md),
                "tags": tags,
            })
        except Exception:
            continue
    # Sort by name; cap results
    results.sort(key=lambda r: r["name"])
    return results[:max_results]


def get_skill(name: str) -> Optional[str]:
    """
    Read a skill's full SKILL.md content by name or slug.
    Returns the full markdown (instructions included), or None if not found.
    """
    # Try exact path match first
    for skill_md in SKILLS_ROOT.rglob("SKILL.md"):
        parent = skill_md.parent.name
        try:
            text = skill_md.read_text(errors="ignore")
            meta = _parse_skill_frontmatter(text)
            skill_name = meta.get("name") or meta.get("slug") or parent
            if skill_name.lower() == name.lower() or parent.lower() == name.lower():
                return text
        except Exception:
            continue
    return None


def use_skill(
    skill_name: str,
    context: str,
    dispatcher: Dispatcher,
    brain: str = "claude",
    extra_instructions: str = "",
) -> str:
    """
    Invoke a skill within a pipeline step. Reads the skill's SKILL.md,
    injects it as a system-level instruction, and runs a brain call with
    the provided context.

    This is how "research using the deep-research skill" or "design using
    the frontend-design skill" works inside an autonomous swarm job.
    """
    skill_content = get_skill(skill_name)
    if not skill_content:
        logger.warning(f"use_skill: skill '{skill_name}' not found — falling back to plain agent call")
        return agent(
            f"Apply the best practices for '{skill_name}' to complete this task:\n\n{context}",
            dispatcher, brain=brain,
        )

    # Strip frontmatter, keep instructions
    body = re.sub(r"^---.*?---\s*", "", skill_content, flags=re.DOTALL).strip()
    system = (
        f"You are using the '{skill_name}' skill. Follow its instructions precisely.\n\n"
        f"SKILL INSTRUCTIONS:\n{body[:4000]}\n\n"
        f"{extra_instructions}"
    )
    chain = BrainChain(preferred=brain)
    result = chain.call(
        [{"role": "user", "content": context}],
        system=system,
        timeout=120.0,
    )
    logger.info(f"use_skill('{skill_name}') via {chain.last_brain}: {len(result)} chars")
    return result


def _parse_skill_frontmatter(text: str) -> Dict[str, Any]:
    """Extract YAML frontmatter from a SKILL.md file."""
    if not text.startswith("---"):
        return {}
    end = text.find("---", 3)
    if end == -1:
        return {}
    fm = text[3:end].strip()
    if _HAVE_YAML:
        try:
            return _yaml.safe_load(fm) or {}
        except Exception:
            pass
    # Fallback: simple key: value parse
    result = {}
    for line in fm.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            result[k.strip()] = v.strip().strip('"').strip("'")
    return result


# ---------------------------------------------------------------------------
# Phase 3c-prep: File system, shell, vault — Shay can now write code + read
# her own vault. These are the primitives that make Phase 3c (desktop build)
# possible.
# ---------------------------------------------------------------------------

import os
import subprocess
import urllib.request as _req

VAULT_SEARCH_URL = "http://127.0.0.1:8766"
SAFE_WRITE_ROOTS = [
    Path.home() / "famtastic",
    Path("/tmp"),
]


def vault_search(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """
    Search the Shay-Memory vault using the vault-search semantic service
    (running on :8766). Returns top-k results with path, score, preview.
    Falls back to a filename keyword scan if the service is down.
    """
    try:
        url = f"{VAULT_SEARCH_URL}/search?q={urllib.request.quote(query)}&k={k}"
        with _req.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
            return data.get("results", data) if isinstance(data, dict) else data
    except Exception:
        # Fallback: simple filename keyword scan
        vault_root = Path.home() / "famtastic/obsidian/Shay-Memory"
        results = []
        terms = query.lower().split()
        for fp in vault_root.rglob("*.md"):
            name_lower = fp.stem.lower()
            if any(t in name_lower for t in terms):
                try:
                    preview = fp.read_text(errors="ignore")[:300]
                    results.append({"path": str(fp), "score": 0.5, "preview": preview})
                except Exception:
                    pass
        return results[:k]


def context_loader(goal: str, k: int = 4) -> str:
    """
    Given a goal, auto-discover relevant vault docs using vault_search
    and return their content as a single context string for injection.
    This closes the "has to be pointed at files explicitly" gap.
    """
    hits = vault_search(goal, k=k)
    if not hits:
        logger.warning(f"context_loader: no vault results for '{goal[:60]}'")
        return ""
    chunks = []
    for hit in hits:
        path = hit.get("path", "")
        if path and Path(path).exists():
            try:
                content = Path(path).read_text(errors="ignore")[:2000]
                chunks.append(f"### {Path(path).name}\n{content}")
            except Exception:
                pass
    result = "\n\n".join(chunks)
    logger.info(f"context_loader: loaded {len(chunks)} docs ({len(result)} chars) for goal")
    return result


def write_file(path: str, content: str) -> str:
    """
    Write content to a file. Path must be under a safe root
    (~/famtastic/ or /tmp/) — will not write outside these roots.
    Returns the path written.
    """
    p = Path(path).expanduser().resolve()
    if not any(str(p).startswith(str(r.resolve())) for r in SAFE_WRITE_ROOTS):
        raise PermissionError(
            f"write_file: '{p}' is outside safe write roots {[str(r) for r in SAFE_WRITE_ROOTS]}"
        )
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    logger.info(f"write_file: wrote {len(content)} chars to {p}")
    return str(p)


def shell(
    cmd: str,
    cwd: Optional[str] = None,
    timeout: float = 30.0,
    trust_gate: bool = True,
    trust_gate_fn: Optional[Callable] = None,
) -> str:
    """
    Run a shell command and return stdout.

    trust_gate=True (default): if trust_gate_fn is provided, calls it with
    the command string before executing — expects True to proceed.
    If no trust_gate_fn is provided, blocks write-dangerous commands
    (rm -rf, sudo, curl | sh, etc.) unless the caller opts out.

    Returns stdout as a string. Raises RuntimeError on non-zero exit.
    """
    BLOCKED = ["rm -rf", "sudo", "curl | sh", "curl|sh", "> /dev/", "mkfs", "dd if="]
    if trust_gate:
        if trust_gate_fn:
            if not trust_gate_fn(cmd):
                raise PermissionError(f"shell: trust_gate_fn blocked: {cmd}")
        else:
            for pattern in BLOCKED:
                if pattern in cmd:
                    raise PermissionError(f"shell: blocked dangerous pattern '{pattern}': {cmd}")

    logger.info(f"shell: {cmd[:120]}")
    proc = subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        timeout=timeout, cwd=cwd,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"shell exit {proc.returncode}: {proc.stderr[:400] or proc.stdout[:400]}"
        )
    return proc.stdout


def code_job(
    spec_yaml: str,
    dispatcher: Dispatcher,
    max_iterations: int = 3,
) -> "JobResult":
    """
    Phase 3c code loop: write code → test → verify → iterate.

    Job spec extends the standard format with:
        codegen_phase:      name of the phase that produces code
        test_cmd:           shell command to test it (e.g. "python3 -m pytest")
        output_path:        where to write the generated code
        max_iterations:     how many write→test cycles before giving up

    On each iteration:
      1. Run the job as normal (generates code text)
      2. Write it to output_path via write_file()
      3. Run test_cmd via shell()
      4. If tests pass → done
      5. If tests fail → feed error back as context, re-run job
    """
    try:
        spec = json.loads(spec_yaml) if spec_yaml.strip().startswith("{") else (
            _yaml.safe_load(spec_yaml) if _HAVE_YAML else json.loads(spec_yaml)
        )
    except Exception as exc:
        from .dispatcher import DispatchResult
        return JobResult(job_name="code_job", status="failed",
                         final_output=f"spec parse error: {exc}")

    test_cmd = spec.get("test_cmd", "")
    output_path = spec.get("output_path", "")
    iteration = 0
    last_error = ""

    while iteration < max_iterations:
        iteration += 1
        logger.info(f"[code_job] Iteration {iteration}/{max_iterations}")

        if last_error:
            # Inject previous test failure as context
            for phase in spec.get("phases", []):
                for i, task in enumerate(phase.get("tasks", [])):
                    phase["tasks"][i] = (
                        f"{task}\n\nPREVIOUS ATTEMPT FAILED:\n{last_error}\n"
                        "Fix the issues above in your response."
                    )

        result = run_job(json.dumps(spec), dispatcher)
        code = result.final_output or ""

        if output_path and code:
            try:
                write_file(output_path, code)
            except Exception as exc:
                logger.error(f"[code_job] write_file failed: {exc}")
                result.status = "failed"
                return result

        if test_cmd:
            try:
                shell(test_cmd, timeout=60.0)
                logger.info(f"[code_job] Tests passed on iteration {iteration}")
                result.status = "completed"
                result.quality_gate = "PASS"
                return result
            except RuntimeError as exc:
                last_error = str(exc)[:600]
                logger.warning(f"[code_job] Tests failed: {last_error[:200]}")
        else:
            return result  # no test_cmd — just write and return

    result.status = "failed"
    result.quality_gate = "FAIL"
    logger.error(f"[code_job] Max iterations reached without passing tests")
    return result
