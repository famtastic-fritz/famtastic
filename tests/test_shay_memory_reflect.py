from __future__ import annotations

import importlib.util
from pathlib import Path


REFLECT_PATH = Path("/Users/famtasticfritz/famtastic/obsidian/Shay-Memory/_system/reflect.py")


spec = importlib.util.spec_from_file_location("shay_memory_reflect", REFLECT_PATH)
reflect = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(reflect)


def _session_note(root: Path, name: str, body: str) -> Path:
    path = root / "reflections" / "episodic" / "sessions" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    return path


def test_promotion_block_reason_filters_low_signal_runtime_session(tmp_path, monkeypatch):
    monkeypatch.setattr(reflect, "VAULT", tmp_path)
    path = _session_note(tmp_path, "tiny.md", "just a tiny crumb\n")

    reason = reflect._promotion_block_reason(path, path.read_text(encoding="utf-8"))

    assert reason == "runtime-session-low-signal"
    assert reflect.summarise_episode(path, generative=False) == ""


def test_collect_source_audit_counts_skips_and_eligible_sources(tmp_path, monkeypatch):
    monkeypatch.setattr(reflect, "VAULT", tmp_path)
    weak = _session_note(tmp_path, "weak.md", "tiny\n")
    strong = _session_note(
        tmp_path,
        "strong.md",
        "## Active Task\nHarden reflection loop\n\n## Final Assistant State\nClosed the gap.\n",
    )
    lesson = tmp_path / "lessons-mirror" / "lesson.md"
    lesson.parent.mkdir(parents=True, exist_ok=True)
    lesson.write_text("Durable lesson about standing workflow constraints.\n", encoding="utf-8")

    audit = reflect._collect_source_audit([
        (weak, 1.0),
        (strong, 2.0),
        (lesson, 3.0),
    ])

    eligible_names = [path.name for path, _mtime in audit["eligible"]]
    assert eligible_names == ["strong.md", "lesson.md"]
    assert audit["source_classes"] == {
        "runtime-session": 2,
        "lessons-mirror": 1,
    }
    assert audit["skipped"] == {
        "runtime-session-low-signal": 1,
    }
