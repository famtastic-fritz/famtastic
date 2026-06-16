from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path
from typing import Iterable

WORD_NUMBER_MAP = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
}

PRIVATE_SIGNAL_WORDS = {
    "relationship", "family", "mother", "father", "wife", "partner", "sha",
    "shalique", "promise", "silence", "stress", "stressed", "pressure",
    "overload", "tired", "exhausted", "hurt", "grief", "spiritual", "faith",
    "god", "church", "health", "mental", "physic", "physical",
}

PROJECT_HINTS = {
    "shay": "shay",
    "site studio": "site-studio",
    "media studio": "media-studio",
    "component studio": "component-studio",
    "thoughts": "famtastic-thoughts",
    "reseller": "reseller-account",
    "cruise": "famu-cruise",
    "income": "income",
}

PRIMARY_LANES = ["shay_platform", "income", "research", "metaphysical", "fritz"]


def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "item"


def alias_forms(text: str) -> list[str]:
    raw = text.strip().lower()
    forms = {raw}
    spaced = re.sub(r"[-_]+", " ", raw)
    forms.add(spaced)
    squashed = re.sub(r"[^a-z0-9]", "", raw)
    if squashed:
        forms.add(squashed)
    for word, digit in WORD_NUMBER_MAP.items():
        forms.update({
            re.sub(rf"\b{word}\b", digit, raw),
            re.sub(rf"\b{word}\b", digit, spaced),
        })
        forms.update({
            re.sub(rf"\b{digit}\b", word, raw),
            re.sub(rf"\b{digit}\b", word, spaced),
        })
    expanded = set()
    for form in forms:
        expanded.add(form)
        expanded.add(form.replace("conversation", "convo"))
        expanded.add(form.replace("convo", "conversation"))
        expanded.add(form.replace("deep dive", "deep-dive"))
        expanded.add(form.replace("deep-dive", "deep dive"))
        expanded.add(form.replace("agent two", "agent2"))
        expanded.add(form.replace("agent2", "agent two"))
    return sorted({f.strip() for f in expanded if f.strip()})


def source_class_for_path(path: Path, vault_root: Path, repo_root: Path | None = None) -> str:
    try:
        rel = path.resolve().relative_to(vault_root.resolve()).as_posix()
        if rel.startswith("reflections/episodic/sessions/"):
            return "runtime-session"
        if rel.startswith("lessons-mirror/"):
            return "lessons-mirror"
        if rel.startswith("reflections/"):
            return "reflection-output"
        if rel.startswith("repo-docs/"):
            return "repo-doc"
        if rel.startswith("research/"):
            return "research-note"
        if rel.startswith("_system/"):
            return "system-doc"
        return "vault-note"
    except Exception:
        pass
    if repo_root is not None:
        try:
            rel = path.resolve().relative_to(repo_root.resolve()).as_posix().lower()
            if rel.startswith("obsidian/"):
                return "obsidian-export"
            if any(token in rel for token in ("transcript", "conversation", "convo", "chat")):
                return "repo-transcript"
            if any(token in rel for token in ("bookmark", "bookmarks")):
                return "bookmark-capture"
            if any(token in rel for token in ("brief", "report", "ledger")):
                return "artifact"
        except Exception:
            pass
    return "external-artifact"


def discover_repo_root_captures(repo_root: Path, window_hours: int, now: _dt.datetime | None = None) -> list[tuple[Path, float]]:
    now = now or _dt.datetime.now()
    cutoff = now.timestamp() - window_hours * 3600
    out: list[tuple[Path, float]] = []
    for child in repo_root.iterdir():
        if not child.is_file() or child.suffix.lower() not in {".md", ".txt", ".json"}:
            continue
        name = child.name.lower()
        if not any(token in name for token in ("transcript", "conversation", "convo", "chat", "deep-dive", "deep dive")):
            continue
        try:
            mtime = child.stat().st_mtime
        except OSError:
            continue
        if mtime >= cutoff:
            out.append((child, mtime))
    return sorted(out, key=lambda item: item[1], reverse=True)


def build_source_registry(sources: Iterable[tuple[Path, float]], vault_root: Path, repo_root: Path) -> dict:
    records = []
    for path, mtime in sources:
        records.append({
            "path": str(path),
            "mtime": mtime,
            "source_class": source_class_for_path(path, vault_root, repo_root),
            "aliases": alias_forms(path.stem),
        })
    return {
        "generated_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "count": len(records),
        "records": records,
    }


def normalize_intake(path: Path, body: str, source_class: str, captured_at: str, capture_id: str) -> dict:
    lowered = body.lower()
    sensitivity = "internal"
    if any(word in lowered for word in PRIVATE_SIGNAL_WORDS):
        sensitivity = "private"
    if any(word in lowered for word in ("shalique", "therapy", "trauma", "god told me", "deeply going on")):
        sensitivity = "highly_private"
    raw_type = "note"
    if source_class in {"runtime-session", "repo-transcript"}:
        raw_type = "transcript"
    elif "bookmark" in source_class:
        raw_type = "bookmark"
    elif source_class == "artifact":
        raw_type = "artifact"
    return {
        "capture_id": capture_id,
        "source_class": source_class,
        "source_path": str(path),
        "source_pointer": path.stem,
        "captured_at": captured_at,
        "sensitivity": sensitivity,
        "raw_type": raw_type,
        "ingest_status": "new",
        "title": path.stem,
        "body": body,
    }


def split_atomic_items(capture: dict) -> list[dict]:
    body = capture.get("body", "")
    parts = [p.strip() for p in re.split(r"\n\s*\n+", body) if p.strip()]
    if not parts:
        return []
    items = []
    for idx, part in enumerate(parts, start=1):
        lowered = part.lower()
        kind = "observation"
        if any(k in lowered for k in ("i think", "might mean", "probably", "feels like", "seems like")):
            kind = "interpretation"
        if any(k in lowered for k in ("need to", "must", "next:", "todo", "follow up", "do this")):
            kind = "task_signal"
        if any(k in lowered for k in ("blocked", "stuck", "can't", "cannot", "waiting on")):
            kind = "blocker"
        if any(k in lowered for k in ("promised", "promise", "said i would", "owe")):
            kind = "promise"
        if any(k in lowered for k in ("decision", "decide", "chose", "we will")):
            kind = "decision"
        if any(k in lowered for k in ("stress", "pressure", "hurt", "tired", "energy", "overwhelmed")):
            kind = "emotional_weight"
        if any(k in lowered for k in ("faith", "spiritual", "god", "pray", "church", "metaphysical")):
            kind = "metaphysical_signal"
        lane = infer_lane(part)
        weight = infer_weight(kind, part)
        actionability = infer_actionability(kind)
        project_hint = infer_project_hint(part)
        items.append({
            "item_id": f"{capture['capture_id']}::{idx}",
            "capture_id": capture["capture_id"],
            "captured_at": capture.get("captured_at"),
            "source_class": capture.get("source_class"),
            "source_pointer": capture.get("source_pointer"),
            "kind": kind,
            "primary_lane": lane,
            "secondary_tags": derive_tags(part),
            "weight": weight,
            "sensitivity": capture["sensitivity"],
            "project_hint": project_hint,
            "actionability": actionability,
            "body": part,
            "source_excerpt": part[:240],
        })
    return items


def infer_lane(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ("money", "income", "revenue", "customer", "reseller", "cash")):
        return "income"
    if any(k in lowered for k in ("research", "study", "investigate", "compare")):
        return "research"
    if any(k in lowered for k in ("faith", "god", "spiritual", "metaphysical")):
        return "metaphysical"
    if any(k in lowered for k in ("health", "stress", "family", "relationship", "sleep", "energy", "fritz")):
        return "fritz"
    return "shay_platform"


def infer_project_hint(text: str) -> str | None:
    lowered = text.lower()
    for needle, hint in PROJECT_HINTS.items():
        if needle in lowered:
            return hint
    return None


def infer_weight(kind: str, text: str) -> str:
    lowered = text.lower()
    if "urgent" in lowered or "asap" in lowered or "immediately" in lowered:
        return "urgent"
    if kind in {"promise", "blocker", "decision"}:
        return "high"
    if kind in {"emotional_weight", "metaphysical_signal"}:
        return "recurring" if any(k in lowered for k in ("again", "keep", "always", "every")) else "medium"
    if kind == "task_signal":
        return "medium"
    return "ambient"


def infer_actionability(kind: str) -> str:
    return {
        "task_signal": "taskable",
        "blocker": "decision_required",
        "promise": "watch",
        "decision": "decision_required",
        "emotional_weight": "watch",
        "metaphysical_signal": "seed",
    }.get(kind, "context_only")


def derive_tags(text: str) -> list[str]:
    tags = []
    lowered = text.lower()
    for word in ("income", "revenue", "stress", "relationship", "faith", "reseller", "cruise", "brief", "shays", "site"):
        if word in lowered:
            tags.append(word)
    return sorted(set(tags))


def select_private_items(items: Iterable[dict]) -> list[dict]:
    selected = []
    for item in items:
        body = item["body"].lower()
        if item["sensitivity"] in {"private", "highly_private"}:
            selected.append(item)
            continue
        if item["primary_lane"] == "fritz":
            selected.append(item)
            continue
        if any(word in body for word in PRIVATE_SIGNAL_WORDS):
            selected.append(item)
    return selected


def build_private_context_record(items: list[dict], source_capture_ids: list[str]) -> dict | None:
    if not items:
        return None
    items = sorted(items, key=_item_sort_key, reverse=True)[:12]
    theme_counts: dict[str, int] = {}
    for item in items:
        for tag in item.get("secondary_tags", []):
            theme_counts[tag] = theme_counts.get(tag, 0) + 1
    theme = sorted(theme_counts.items(), key=lambda kv: (-kv[1], kv[0]))[0][0] if theme_counts else "human-state"
    obs = [f"- {item['source_excerpt']}" for item in items if item["kind"] != "interpretation"][:6]
    interpretations = [f"- {item['source_excerpt']}" for item in items if item["kind"] == "interpretation"][:4]
    pressures = sorted({tag for item in items for tag in item.get("secondary_tags", []) if tag in {"stress", "income", "relationship", "faith", "cruise", "reseller"}})
    return {
        "private_context_id": f"private-{_dt.datetime.now().strftime('%Y%m%d%H%M%S')}-{_slug(theme)}",
        "created_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "source_capture_ids": source_capture_ids,
        "primary_lane": "fritz",
        "theme": theme,
        "observation_block": obs,
        "interpretation_block": interpretations,
        "active_pressures": pressures,
        "helpful_response_pattern": infer_helpful_response(items),
        "harmful_response_pattern": infer_harmful_response(items),
        "linked_projects": sorted({item["project_hint"] for item in items if item.get("project_hint")}),
        "review_state": "active",
        "source_count": len(items),
    }


def _timestamp_score(value: str | None) -> float:
    if not value:
        return 0.0
    try:
        dt = _dt.datetime.fromisoformat(value)
    except ValueError:
        return 0.0
    age_hours = max((_dt.datetime.now() - dt).total_seconds() / 3600.0, 0.0)
    if age_hours <= 3:
        return 6.0
    if age_hours <= 12:
        return 5.0
    if age_hours <= 24:
        return 4.0
    if age_hours <= 72:
        return 3.0
    if age_hours <= 168:
        return 2.0
    return 1.0


def _source_pointer_age_penalty(source_pointer: str | None) -> float:
    if not source_pointer:
        return 0.0
    match = re.search(r"(20\d{6})", source_pointer)
    if not match:
        return 0.0
    try:
        stamp = _dt.datetime.strptime(match.group(1), "%Y%m%d")
    except ValueError:
        return 0.0
    age_days = max((_dt.datetime.now() - stamp).total_seconds() / 86400.0, 0.0)
    if age_days <= 1:
        return 0.0
    if age_days <= 3:
        return -1.5
    if age_days <= 7:
        return -3.0
    return -4.5


def _item_priority_score(item: dict) -> float:
    score = _timestamp_score(item.get("captured_at"))
    score += {
        "urgent": 6.0,
        "high": 4.0,
        "recurring": 3.0,
        "medium": 2.0,
        "ambient": 0.5,
    }.get(item.get("weight"), 0.0)
    score += {
        "blocker": 5.0,
        "promise": 4.5,
        "decision": 4.0,
        "task_signal": 3.5,
        "emotional_weight": 3.0,
        "metaphysical_signal": 2.0,
        "interpretation": 0.5,
        "observation": 1.0,
    }.get(item.get("kind"), 0.0)
    if item.get("primary_lane") == "income":
        score += 2.5
    if item.get("primary_lane") == "fritz":
        score += 2.0
    score += {
        "runtime-session": 2.0,
        "repo-transcript": 1.5,
        "vault-note": 1.0,
        "repo-doc": -2.0,
        "lessons-mirror": -2.5,
        "reflection-output": -3.0,
        "system-doc": -3.0,
    }.get(item.get("source_class"), 0.0)
    if item.get("sensitivity") == "highly_private":
        score += 1.5
    score += _source_pointer_age_penalty(item.get("source_pointer"))
    body = item.get("body", "").lower()
    if any(token in body for token in ("reseller", "income", "revenue", "cash", "customer")):
        score += 1.5
    if any(token in body for token in ("today", "this morning", "now", "right now")):
        score += 1.0
    if body.startswith(("key decisions", "completed actions", "resolved questions")):
        score -= 3.5
    if item.get("kind") == "decision" and item.get("source_class") == "runtime-session":
        score -= 1.5
    return score


def _item_sort_key(item: dict) -> tuple[float, str]:
    return (_item_priority_score(item), item.get("captured_at") or "")


def _dedupe_items(items: Iterable[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for item in items:
        key = re.sub(r"\s+", " ", item.get("body", "").strip().lower())[:180]
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _diversify_ranked_items(items: list[dict], per_source_limit: int = 1, per_project_limit: int = 2, per_kind_limit: int = 3) -> list[dict]:
    source_counts: dict[str, int] = {}
    project_counts: dict[str, int] = {}
    kind_counts: dict[str, int] = {}
    out = []
    overflow = []
    for item in items:
        source_key = item.get("source_pointer") or item.get("item_id") or "unknown"
        project_key = item.get("project_hint") or "none"
        kind_key = item.get("kind") or "unknown"
        if source_counts.get(source_key, 0) >= per_source_limit:
            overflow.append(item)
            continue
        if project_counts.get(project_key, 0) >= per_project_limit and item.get("primary_lane") != "fritz":
            overflow.append(item)
            continue
        if kind_counts.get(kind_key, 0) >= per_kind_limit and kind_key == "decision":
            overflow.append(item)
            continue
        source_counts[source_key] = source_counts.get(source_key, 0) + 1
        project_counts[project_key] = project_counts.get(project_key, 0) + 1
        kind_counts[kind_key] = kind_counts.get(kind_key, 0) + 1
        out.append(item)
    out.extend(overflow)
    return out


def _trim_excerpt(text: str, limit: int = 160) -> str:
    cleaned = re.sub(r"^#+\s*", "", text.strip())
    cleaned = re.sub(r"\|", " ", cleaned)
    cleaned = re.sub(r"`", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "…"


def _is_noise_block(text: str) -> bool:
    lowered = text.strip().lower()
    if not lowered:
        return True
    if lowered.startswith(("## active state", "## constraints & preferences", "## resolved questions", "## pending user asks", "## relevant files")):
        return True
    if lowered.count("|") >= 6:
        return True
    if lowered.startswith("[context compaction"):
        return True
    return False


def select_brief_items(items: list[dict], limit: int = 12) -> list[dict]:
    ranked = sorted(items, key=_item_sort_key, reverse=True)
    ranked = _dedupe_items(ranked)
    ranked = _diversify_ranked_items(ranked, per_source_limit=1, per_project_limit=1, per_kind_limit=3)
    briefable = []
    for item in ranked:
        if item.get("source_class") in {"reflection-output", "system-doc"}:
            continue
        if _is_noise_block(item.get("body", "")):
            continue
        briefable.append(item)
        if len(briefable) >= limit:
            break
    return briefable


def build_private_review_payload(private_record: dict | None, items: list[dict], action_map: dict[str, dict] | None = None) -> dict:
    action_map = action_map or {}
    ranked = [
        item for item in sorted(items, key=_item_sort_key, reverse=True)
        if (item.get("sensitivity") in {"private", "highly_private"} or item.get("primary_lane") == "fritz")
        and not _is_noise_block(item.get("body", ""))
    ]
    ranked = _diversify_ranked_items(ranked, per_source_limit=1, per_project_limit=3, per_kind_limit=4)
    entries = []
    for item in ranked[:8]:
        action = action_map.get(item.get("item_id"), {})
        entries.append({
            "item_id": item.get("item_id"),
            "captured_at": item.get("captured_at"),
            "kind": item.get("kind"),
            "lane": item.get("primary_lane"),
            "sensitivity": item.get("sensitivity"),
            "source_class": item.get("source_class"),
            "source_pointer": item.get("source_pointer"),
            "excerpt": _trim_excerpt(item.get("body", ""), 140),
            "default_visibility": "private_only",
            "current_action": action.get("action", "review"),
            "action_note": action.get("note"),
            "acted_at": action.get("acted_at"),
            "available_actions": ["review", "approve", "suppress"],
        })
    approved_count = sum(1 for entry in entries if entry.get("current_action") == "approve")
    suppressed_count = sum(1 for entry in entries if entry.get("current_action") == "suppress")
    return {
        "generated_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "private_context_id": private_record.get("private_context_id") if private_record else None,
        "review_state": private_record.get("review_state") if private_record else "none",
        "theme": private_record.get("theme") if private_record else None,
        "active_pressures": private_record.get("active_pressures", []) if private_record else [],
        "action_summary": {
            "approved": approved_count,
            "suppressed": suppressed_count,
            "review": max(len(entries) - approved_count - suppressed_count, 0),
        },
        "entries": entries,
    }


def infer_helpful_response(items: list[dict]) -> str:
    if any(item["kind"] == "emotional_weight" for item in items):
        return "ultra_brief_truth_first"
    if any(item["kind"] == "decision" for item in items):
        return "direct_ranked_options"
    return "contextual_support"


def infer_harmful_response(items: list[dict]) -> str:
    if any(item["kind"] == "emotional_weight" for item in items):
        return "verbose_meta_roadmaps"
    return "generic_flattening"


def reflect_items(items: list[dict], private_record: dict | None = None) -> dict:
    lane_counts: dict[str, int] = {lane: 0 for lane in PRIMARY_LANES}
    kind_counts: dict[str, int] = {}
    for item in items:
        lane_counts[item["primary_lane"]] = lane_counts.get(item["primary_lane"], 0) + 1
        kind_counts[item["kind"]] = kind_counts.get(item["kind"], 0) + 1
    dominant_lane = sorted(lane_counts.items(), key=lambda kv: (-kv[1], kv[0]))[0][0] if items else "shay_platform"
    top_pressures = []
    if private_record:
        top_pressures.extend(private_record.get("active_pressures", []))
    recurring = [k for k, v in kind_counts.items() if v > 1]
    state = {
        "dominant_lane": dominant_lane,
        "active_pressure_count": len(top_pressures),
        "top_pressures": top_pressures[:5],
        "support_mode": "ultra_brief" if private_record and private_record.get("helpful_response_pattern") == "ultra_brief_truth_first" else "normal",
    }
    pattern = {
        "recurring_kinds": recurring,
        "promise_weight_present": kind_counts.get("promise", 0) > 0,
        "blocker_count": kind_counts.get("blocker", 0),
    }
    identity = {
        "response_mode": state["support_mode"],
        "ask_threshold": "high" if state["support_mode"] == "ultra_brief" else "medium",
        "pushback_level": "direct",
        "prioritization_bias": "protect_source" if dominant_lane == "fritz" else ("revenue" if dominant_lane == "income" else "execution"),
        "must_not_flatten": bool(private_record),
    }
    action = {
        "top_push": next((item["body"] for item in items if item["actionability"] == "taskable"), None),
        "top_watch": next((item["body"] for item in items if item["actionability"] == "watch"), None),
        "top_decision": next((item["body"] for item in items if item["actionability"] == "decision_required"), None),
    }
    return {"R1_state": state, "R2_pattern": pattern, "R3_identity": identity, "R4_action": action, "_source_items": items}


def action_forces_from_items(items: list[dict], reflections: dict) -> list[dict]:
    forces = []
    for item in items:
        force = "seed"
        if item["actionability"] == "taskable":
            force = "push"
        elif item["actionability"] == "decision_required":
            force = "pull"
        elif item["actionability"] == "watch":
            force = "watch"
        elif item["sensitivity"] in {"private", "highly_private"}:
            force = "protect"
        forces.append({
            "item_id": item["item_id"],
            "force": force,
            "lane": item["primary_lane"],
            "project_hint": item.get("project_hint"),
            "body": item["source_excerpt"],
        })
    if reflections.get("R3_identity", {}).get("must_not_flatten"):
        forces.append({
            "item_id": "behavior-steering",
            "force": "protect",
            "lane": "fritz",
            "project_hint": None,
            "body": "Sensitive human-state context requires protective response mode.",
        })
    return forces


def build_behavior_steering(reflections: dict, private_record: dict | None = None) -> dict:
    identity = reflections.get("R3_identity", {})
    return {
        "generated_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "response_mode": identity.get("response_mode", "normal"),
        "ask_threshold": identity.get("ask_threshold", "medium"),
        "pushback_level": identity.get("pushback_level", "direct"),
        "prioritization_bias": identity.get("prioritization_bias", "execution"),
        "protect_source": bool(private_record),
        "must_not_flatten": bool(identity.get("must_not_flatten")),
        "private_context_id": private_record.get("private_context_id") if private_record else None,
    }


def build_brief_payload(reflections: dict, action_forces: list[dict], private_record: dict | None = None, action_map: dict[str, dict] | None = None) -> dict:
    action_map = action_map or {}
    ranked_items = select_brief_items(reflections.get("_source_items", []), limit=12)
    force_by_id = {
        f.get("item_id"): f
        for f in action_forces
        if f.get("item_id") != "behavior-steering"
    }
    pushes = [item for item in ranked_items if force_by_id.get(item.get("item_id"), {}).get("force") == "push"]
    pulls = [item for item in ranked_items if force_by_id.get(item.get("item_id"), {}).get("force") == "pull"]
    watches = [item for item in ranked_items if force_by_id.get(item.get("item_id"), {}).get("force") == "watch"]
    approved_private = [
        item for item in ranked_items
        if action_map.get(item.get("item_id"), {}).get("action") == "approve"
    ]
    protect = None
    if private_record:
        protect = f"Private human-state pressure around {private_record.get('theme', 'current context')}"
    return {
        "generated_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "top_fires": [_trim_excerpt(item["body"]) for item in pushes[:3]],
        "top_unresolved_decisions": [_trim_excerpt(item["body"]) for item in pulls[:3]],
        "top_silence_weight": [_trim_excerpt(item["body"]) for item in watches[:2] if "promise" in item["body"].lower() or "silence" in item["body"].lower()],
        "protect_the_source": protect,
        "momentum_move": _trim_excerpt(pushes[0]["body"]) if pushes else (_trim_excerpt(ranked_items[0]["body"]) if ranked_items else reflections.get("R4_action", {}).get("top_push")),
        "seed_watch_item": _trim_excerpt(watches[0]["body"]) if watches else None,
        "approved_private_carry_forward": [_trim_excerpt(item.get("body", ""), 120) for item in approved_private[:3]],
        "behavior_steering": reflections.get("R3_identity", {}),
        "ranked_focus": [
            {
                "item_id": item.get("item_id"),
                "kind": item.get("kind"),
                "lane": item.get("primary_lane"),
                "project_hint": item.get("project_hint"),
                "captured_at": item.get("captured_at"),
                "score": round(_item_priority_score(item), 2),
                "excerpt": _trim_excerpt(item.get("body", ""), 120),
            }
            for item in ranked_items[:6]
        ],
        "brief_window": {
            "candidate_count": len(reflections.get("_source_items", [])),
            "ranked_count": len(ranked_items),
        },
    }


def build_reinforcement_payload(reflections: dict, action_forces: list[dict]) -> dict:
    counts: dict[str, int] = {}
    for force in action_forces:
        counts[force["force"]] = counts.get(force["force"], 0) + 1
    return {
        "generated_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "action_force_counts": counts,
        "support_mode": reflections.get("R1_state", {}).get("support_mode", "normal"),
        "false_positive_suppression": [],
        "outcome_ledger_needed": True,
    }


def append_jsonl(path: Path, rows: Iterable[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("a", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1
    return count


def overwrite_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows
