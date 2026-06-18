#!/usr/bin/env python3
"""Runnable companion to claude-code-prompt-builder.md.

Compose a Claude Code prompt from the 9-slot model. Pure stdlib, importable or CLI.

    python3 prompt_builder.py            # prints a demo prompt
    from prompt_builder import build     # build({...}) -> str
"""
SLOTS = [
    ("role", "Role / stance"),
    ("mission", "Mission (one outcome)"),
    ("context", "Context to load first"),
    ("constraints", "Hard constraints (non-negotiable)"),
    ("reuse", "Reuse before generate"),
    ("plan_gate", "Plan gate (ask vs proceed)"),
    ("success", "Success criteria (testable)"),
    ("proof", "Proof of success"),
    ("output", "Output contract"),
]


def build(slots):
    out = []
    for key, label in SLOTS:
        val = slots.get(key)
        if not val:
            continue
        out.append(f"## {label}")
        if isinstance(val, (list, tuple)):
            out.extend(f"- {v}" for v in val)
        else:
            out.append(str(val))
        out.append("")
    return "\n".join(out).strip()


if __name__ == "__main__":
    demo = {
        "role": "You are a senior build engineer operating in ultracode mode.",
        "mission": "Ship a working contact page for the active site.",
        "context": ["CLAUDE.md", "famtastic-dna.md", "site-studio/server.js"],
        "constraints": [
            "Use TAG, never process.env.SITE_TAG",
            "No inline style= attributes",
            "Route every HTML write through runPostProcessing()",
        ],
        "reuse": "Check site-studio/lib and existing pages before generating new CSS.",
        "plan_gate": "Proceed autonomously; only stop if a protected file must change.",
        "success": "Page renders, nav uses NAV_SKELETON classes, checklist 13/13.",
        "proof": "Screenshot + test output pasted back.",
        "output": "A single committed page + updated SITE-LEARNINGS entry.",
    }
    print(build(demo))
