# Codex Adversarial Review — Audit Report
**Date:** 2026-04-16  
**Scope:** `/codex:adversarial-review` plugin (openai-codex v1.0.2)

---

## 1. What It Is Actually Doing Right Now

### Execution path

When you run `/codex:adversarial-review --wait <target>`:

1. Claude reads `commands/adversarial-review.md` — the skill prompt that drives behavior.
2. Claude runs `node .../scripts/codex-companion.mjs adversarial-review "--wait <args>"` via Bash.
3. `codex-companion.mjs` calls `runAppServerReview()` which:
   - Launches the Codex CLI app-server broker (`codex-cli 0.118.0`)
   - Opens a thread with `approvalPolicy: "never"`, `sandbox: "read-only"`
   - Sends the `adversarial-review.md` prompt template with diff/file context interpolated
   - Collects Codex's structured JSON output (validated against `review-output.schema.json`)
   - Renders it via `renderReviewResult()`
4. Claude returns the stdout verbatim — no paraphrase, no fixes, no additions.

### What model runs

The codex-companion invokes **Codex CLI** which calls OpenAI's API. The model is determined by Codex CLI configuration. The companion supports a `spark` alias (`gpt-5.3-codex-spark`), suggesting the default is a different OpenAI model. The review runs in a **read-only sandbox** — Codex can read files and run shell commands (grep, sed, git) but cannot make changes.

### What happens at the review level

Codex performs genuine adversarial analysis. From the live test run:

- It **proactively read the working tree** beyond just the specified file — scanned `site-studio/public/index.html`, test files, and deleted CSS files
- It correctly identified three real issues in the test file + working tree combination
- It returned **structured JSON** with `verdict`, `summary`, per-finding `file`, `line_start`, `line_end`, `confidence`, `recommendation`
- The verdict was `needs-attention` with a `no-ship` assessment

### Live output (verbatim from test run)

```
Target: working tree diff
Verdict: needs-attention

No-ship. The focused JS introduces an arbitrary file write primitive, and the 
UI refactor also drops a CSS file that the existing regression suite still 
hard-depends on.

Findings:
- [high] Arbitrary path traversal in writeFile() (lines 7-9)
  Untrusted filename concatenated directly onto /var/data/ with no path.resolve()
  boundary check. A caller can pass ../ segments to escape the directory.
  Recommendation: path.resolve() + check resolved path stays under base dir.

- [high] User input executed as code in processUserInput() (lines 2-4)
  Builds a SQL-looking string and passes it to the JS runtime execution function.
  That function executes JavaScript, not SQL — even benign input throws immediately.
  The lookup path is dead on normal use. Remove it; use a parameterized DB driver.

- [medium] Deleted studio-canvas.css breaks existing test coverage (line 274/217/229)
  studio-canvas.css was removed from the CSS directory, but three test files still
  reference that path directly. Existing regression coverage is now invalidated.
  Recommendation: Update test paths or add a compatibility file before shipping.
```

---

## 2. What It Is Supposed to Do

Per `prompts/adversarial-review.md`, it should:

- **Default to skepticism** — assume the change can fail in subtle, high-cost ways
- **Target expensive failure modes**: auth/permissions, data loss/corruption, race conditions, rollback safety, observability gaps
- **Actively try to disprove the change** — look for violated invariants, missing guards, unhandled failure paths
- **Report only material findings** — no style, naming, or speculative concerns
- Per finding: what can go wrong, why is this path vulnerable, likely impact, concrete fix
- Return structured JSON with `verdict: approve | needs-attention`
- Write the summary like a **terse ship/no-ship assessment**
- Claude returns output **verbatim** — no paraphrase, no commentary, no fixes

---

## 3. The Gap

### Gap 1 — Argument is not a scope filter

Running `/codex:adversarial-review --wait /tmp/test-review-target.js` did **not** limit the review to that file. Codex reviewed the entire working tree diff. The file path argument is treated as **focus text**, not a scope limiter.

The skill spec supports `--scope auto|working-tree|branch` but not file-level scoping. When a file path is passed positionally, it becomes focus text injected into `{{USER_FOCUS}}` in the prompt — Codex still reviews the full diff, just with emphasis on that file.

**Impact:** Large working trees get full reviews even when a single file was intended. No way to scope to one file.

### Gap 2 — The deleted CSS finding is a real unresolved gap

The medium finding about deleted `studio-canvas.css` is accurate and was missed by the Phase 14 smoke tests. Three test files still reference the original path:

- `tests/phase2-ui-shell-tests.js` ~line 274
- `tests/phase4-image-research-tests.js` ~line 217  
- `tests/phase5-intelligence-loop-tests.js` ~line 229

These tests are likely silently failing or erroring when the file is absent.

### Gap 3 — No auth pre-flight in the skill

If the Codex CLI session has expired or the OpenAI key is unconfigured, the companion fails with a raw Node error rather than surfacing `/codex:setup` as the remedy.

### Gap 4 — Argument passed as single string

The companion receives `"--wait /tmp/test-review-target.js"` as one string. It handles this correctly via `splitRawArgumentString()`, but it means any argument with embedded quotes or special characters would break.

---

## 4. Recommended Fixes

### Fix A — Update old test paths referencing deleted CSS (IMMEDIATE)

The three test files at lines 274 / 217 / 229 still reference `studio-canvas.css` at its original pre-rename path. Update or remove those assertions. The new equivalent is `studio-screens.css` or `studio-shell.css` depending on what the test was checking.

### Fix B — Document file path as focus text, not scope (NEAR-TERM)

Update the plugin's argument hint from `[focus ...]` to explicitly note that file paths are treated as focus text, not scope filters:

```
/codex:adversarial-review focus on writeFile and processUserInput
```

Users expecting file-level scope filtering will be confused when the full working tree is reviewed.

### Fix C — Add Codex setup check (LOW)

Before running the companion, check `codex --version` and surface a clear message if unavailable rather than a raw Node error.

---

## 5. Summary

| Dimension | Status |
|-----------|--------|
| Core review quality | **Excellent** — found SQL injection risk, path traversal, code execution, and broken test coverage |
| Scope filtering | **Works but misunderstood** — file path is focus text, not a limiter |
| Auth/setup failure | **Silent** — raw Node error instead of guided setup |
| Argument passing | **Functional but fragile** — single-string argv |
| FAMtastic gap discovered | **Real** — 3 test files reference deleted studio-canvas.css |
| Ship/no-ship accuracy | **Correct** — needs-attention verdict on genuinely risky code |

**Bottom line:** The adversarial review is working and finding real issues. The most important outcome of this audit: three older test files are broken by the Phase 14 CSS rename. Fix those before the next session. The review tool itself is production-quality and should be run against significant working-tree changes before shipping.
