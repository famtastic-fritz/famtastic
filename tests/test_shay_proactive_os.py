from __future__ import annotations

import importlib.util
from pathlib import Path

PROACTIVE_PATH = Path("/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/_system/proactive_os.py")
spec = importlib.util.spec_from_file_location("shay_proactive_os", PROACTIVE_PATH)
proactive = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(proactive)


def test_alias_forms_normalize_number_words_and_variants():
    forms = proactive.alias_forms("deep dive convo agent two")
    assert "deep-dive convo agent 2" in forms or "deep-dive convo agent2" in forms
    assert any("conversation" in form for form in forms)
    assert any("agent2" in form or "agent 2" in form for form in forms)


def test_discover_repo_root_captures_finds_root_transcripts(tmp_path):
    transcript = tmp_path / "deep dive convo agent2.md"
    transcript.write_text("hello", encoding="utf-8")
    note = tmp_path / "random-note.md"
    note.write_text("nope", encoding="utf-8")

    found = proactive.discover_repo_root_captures(tmp_path, 24)

    assert [p.name for p, _ in found] == ["deep dive convo agent2.md"]


def test_private_context_and_brief_payload_flow():
    capture = proactive.normalize_intake(
        Path("session.md"),
        "I am stressed about income and silence with my partner.\n\nNeed to follow up on reseller today.",
        "runtime-session",
        "2026-06-16T09:00:00",
        "capture-1",
    )
    items = proactive.split_atomic_items(capture)
    private_items = proactive.select_private_items(items)
    private_record = proactive.build_private_context_record(private_items, [capture["capture_id"]])
    reflections = proactive.reflect_items(items, private_record)
    action_forces = proactive.action_forces_from_items(items, reflections)
    brief = proactive.build_brief_payload(reflections, action_forces, private_record)
    steering = proactive.build_behavior_steering(reflections, private_record)
    reinforce = proactive.build_reinforcement_payload(reflections, action_forces)
    private_review = proactive.build_private_review_payload(private_record, items)

    assert private_record is not None
    assert private_record["theme"] in {"income", "relationship", "stress"}
    assert reflections["R3_identity"]["must_not_flatten"] is True
    assert any(force["force"] == "push" for force in action_forces)
    assert brief["momentum_move"]
    assert brief["ranked_focus"]
    assert brief["brief_window"]["ranked_count"] >= 1
    assert steering["protect_source"] is True
    assert reinforce["outcome_ledger_needed"] is True
    assert private_review["entries"]
    assert all(entry["default_visibility"] == "private_only" for entry in private_review["entries"])


def test_select_brief_items_prefers_recent_runtime_signal_over_stale_docs():
    items = [
        {
            "item_id": "doc-1",
            "captured_at": "2026-06-10T09:00:00",
            "source_class": "repo-doc",
            "kind": "task_signal",
            "weight": "medium",
            "primary_lane": "shay_platform",
            "sensitivity": "internal",
            "body": "Long-standing doc note that should not outrank live work.",
        },
        {
            "item_id": "live-1",
            "captured_at": "2026-06-16T09:30:00",
            "source_class": "runtime-session",
            "kind": "task_signal",
            "weight": "urgent",
            "primary_lane": "income",
            "sensitivity": "internal",
            "body": "Need to follow up on reseller this morning.",
        },
    ]

    ranked = proactive.select_brief_items(items, limit=2)

    assert ranked[0]["item_id"] == "live-1"
