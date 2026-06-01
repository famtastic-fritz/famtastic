#!/usr/bin/env python3
"""
test_reviewer_independence.py — B4: reviewer brain must differ from author.

No network: a fake dispatcher stamps brain_used on each result so we can prove:
  1. enforce_reviewer_not_author() hard-blocks when author == reviewer brain.
  2. adversarial_verify() drops same-brain reviewer verdicts before scoring.
  3. If every reviewer ran on the author brain, the review HARD-FAILS (raises)
     instead of silently passing an un-reviewed claim.
  4. Independent reviewers (different brain) are honored normally.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from swarm import (
    adversarial_verify,
    enforce_reviewer_not_author,
    SameBrainReviewError,
    Dispatcher,
    DispatchTask,
    DispatchResult,
)


class _FakeDispatcher(Dispatcher):
    """Returns canned verdicts, each stamped with a chosen brain_used.

    `brain_used` is the brain every reviewer ran on; `refuted` controls the
    verdict so we can steer survive/kill independently of brain identity.
    """

    def __init__(self, brain_used="gemini", refuted=False):
        self._brain_used = brain_used
        self._refuted = refuted

    def fan_out(self, tasks):
        out = []
        for t in tasks:
            out.append(DispatchResult(
                task_id=t.id,
                status="completed",
                output=json.dumps({"refuted": self._refuted, "reason": "x"}),
                brain_used=self._brain_used,
            ))
        return out

    def export_checkpoint(self):
        return ""

    def import_checkpoint(self, jsonl):
        pass

    def health(self):
        return {}


def test_enforce_blocks_same_brain():
    with pytest.raises(SameBrainReviewError):
        enforce_reviewer_not_author("claude", "claude")


def test_enforce_allows_different_brain():
    enforce_reviewer_not_author("claude", "gemini")  # no raise


def test_enforce_allows_unknown():
    enforce_reviewer_not_author(None, "claude")      # nothing to compare
    enforce_reviewer_not_author("claude", None)


def test_same_reviewer_brain_param_hard_blocks():
    d = _FakeDispatcher(brain_used="claude", refuted=False)
    with pytest.raises(SameBrainReviewError):
        adversarial_verify("the sky is blue", d, n=3,
                           author_brain="claude", reviewer_brain="claude")


def test_all_reviews_same_brain_as_author_hard_fails():
    # Reviewer steered to "auto" but the dispatcher stamps every result with the
    # author's brain → no independent reviewer survives → must raise.
    d = _FakeDispatcher(brain_used="claude", refuted=False)
    with pytest.raises(SameBrainReviewError):
        adversarial_verify("the sky is blue", d, n=3,
                           author_brain="claude", reviewer_brain="auto")


def test_independent_reviewers_pass_through():
    # Author claude, reviewers on gemini, none refute → claim survives.
    d = _FakeDispatcher(brain_used="gemini", refuted=False)
    survived = adversarial_verify("the sky is blue", d, n=3,
                                  author_brain="claude", reviewer_brain="auto")
    assert survived is True


def test_independent_reviewers_can_kill():
    # Author claude, reviewers on gemini, all refute → claim killed.
    d = _FakeDispatcher(brain_used="gemini", refuted=True)
    survived = adversarial_verify("the sky is green", d, n=3,
                                  author_brain="claude", reviewer_brain="auto")
    assert survived is False


def test_no_author_brain_keeps_legacy_behavior():
    # Without an author_brain stamp, all verdicts count (back-compat).
    d = _FakeDispatcher(brain_used="claude", refuted=True)
    survived = adversarial_verify("claim", d, n=3)
    assert survived is False


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
