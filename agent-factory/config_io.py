"""Load/save config.json safely, always inside the sandbox."""
from __future__ import annotations

import json

from factory_paths import CONFIG_PATH, assert_inside


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def save_config(cfg: dict) -> None:
    assert_inside(CONFIG_PATH)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
