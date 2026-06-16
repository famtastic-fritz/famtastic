---
title: SHAY-REBRAND-PROMPT-2026-05-19
type: note
permalink: famtastic/03-research/archive/shay-rebrand-prompt-2026-05-19
---

## SHAY-REBRAND-PROMPT-2026-05-19.md

9.58 KB •228 lines•Formatting may be inconsistent from source  
\# Shay-Shay Rebrand Prompt — Hermes Unattended Run

\*Date: May 19, 2026\*  
\*Author: Fritz Medine\*  
\*Run mode: Paste into Hermes Agent, let \`/goal\` run until complete\*

\---

\#\# How to use this

Paste everything inside the \`---PROMPT---\` fence below directly into your Hermes session as a single message. Hermes will treat the first line as a \`/goal\` directive and work autonomously through the spec until completion criteria are met. Expected runtime: 15–60 minutes depending on how much Hermes has to copy. Cost: a few dollars of Claude API usage.

When Hermes pings you on Telegram that it's done, drop \`SHAY-IDENTITY-2026-05-19.md\` into \`\~/famtastic/shay-shay/SOUL.md\` and start \`shay\` for the first time.

\---PROMPT---

/goal Rebrand this Hermes Agent installation into Shay-Shay. Stop when the new \`shay\` binary builds clean, prints its renamed banner, has memory and skills copied from Hermes, and \`SOUL.md\` is left as an empty placeholder for Fritz to drop the identity brief into. Notify Fritz on Telegram and stop. Do not start the new binary. Do not push to GitHub.

\#\# Context

You are Hermes Agent. We are evolving you into a sibling product called Shay-Shay. Same kernel (your code), different identity (her name, brand, repo, personality). After this rebrand, Fritz will drop an identity brief into the new \`SOUL.md\` and start the renamed binary for the first time. That moment is when Hermes becomes Shay.

This rebrand is mostly cosmetic — renames, brand assets, directory paths. The agent kernel stays intact. Your job is to do the cosmetic transformation cleanly and copy your accumulated state (memory, skills, config, API keys) over so Shay wakes up with everything you've learned.

\#\# Hard rules

\- Work in a NEW directory. Do not modify the currently running Hermes installation.  
\- Do not push anything to GitHub. Fritz manages the remote.  
\- Do not pre-fill \`SOUL.md\` with personality content. Leave it as a placeholder. Fritz is dropping the brief.  
\- Do not start the renamed \`shay\` binary. Build it, smoke test it, then stop.  
\- If you hit a blocker you cannot resolve autonomously, write the blocker into the handoff report, ping Fritz on Telegram with a one-line summary, and stop.

\#\# Step-by-step spec

\#\#\# Step 1 — Backup

Before touching anything:

\`\`\`bash  
cp \-r \~/.hermes \~/.hermes.backup-2026-05-19  
cp \-r \~/.config/hermes \~/.config/hermes.backup-2026-05-19 2\>/dev/null || true  
\`\`\`

\#\#\# Step 2 — Clone yourself into the new home

Pick whichever is faster:

Option A — fresh clone from GitHub:  
\`\`\`bash  
mkdir \-p \~/famtastic  
git clone https://github.com/NousResearch/hermes-agent \~/famtastic/shay-shay  
\`\`\`

Option B — copy your current install directory (if you know where you live on disk):  
\`\`\`bash  
mkdir \-p \~/famtastic  
cp \-r \<your-hermes-install-dir\> \~/famtastic/shay-shay  
\`\`\`

Either is fine. Pick A if Option B is ambiguous.

\#\#\# Step 3 — Rename identity references

Inside \`\~/famtastic/shay-shay/\`, do a careful find-and-replace of identifying names. Use \`grep \-r\` to find hits, then \`sed \-i\` or your edit tool to update.

| What to change | From | To |  
|---|---|---|  
| Binary / CLI command | \`hermes\` | \`shay\` |  
| Python package | \`hermes\_agent\` (or similar) | \`shay\_agent\` |  
| Environment variable prefix | \`HERMES\_\*\` | \`SHAY\_\*\` |  
| Runtime state dir | \`\~/.hermes\` | \`\~/.shay\` |  
| Config dir | \`\~/.config/hermes\` | \`\~/.config/shay\` |  
| Log prefix | \`\[hermes\]\` | \`\[shay\]\` |  
| CLI prompt | \`hermes\>\` | \`shay\>\` |  
| README top-level title | "Hermes Agent" | "Shay-Shay" |

\*\*Be careful:\*\* do NOT rename Python imports, function names, or internal symbols that would break dependencies you don't own. Only rename Hermes's own identifying surface. When in doubt, leave it.

\*\*Leave intact:\*\*  
\- Attribution to Nous Research and the Hermes lineage in \`CREDITS.md\`, \`ACKNOWLEDGEMENTS.md\`, or equivalent  
\- The MIT license  
\- Any reference to the Hermes 3 / 4 underlying models or research papers  
\- Internal class names like \`HermesSession\` if renaming them would break the codebase

\#\#\# Step 4 — Brand assets

Replace these branding elements:

\- \*\*Terminal banner / ASCII art:\*\* replace Hermes's banner. Generate a "SHAY-SHAY" wordmark with \`figlet\` or hand-write it. Bold and distinctive. Don't overthink it for v1.  
\- \*\*Color scheme:\*\* pick a FAMtastic palette. Starting point: primary \`\#FF3366\` (bold red) and \`\#2C5F8D\` (deep blue). You can choose — make it confident and not the default Hermes blue.  
\- \*\*Startup splash:\*\* replace any "Welcome to Hermes" string with "Welcome, Shay-Shay" or similar — but keep it brief. No essays.

\#\#\# Step 5 — SOUL.md placeholder

Create \`\~/famtastic/shay-shay/SOUL.md\` with \*\*exactly this content\*\* and nothing else:

\`\`\`markdown  
\# SOUL placeholder

This file is the placeholder for Shay-Shay's identity brief. Fritz will drop the brief here after the rebrand verification passes. Until then, treat this as deliberately empty.

Do not auto-fill this file. Wait for the drop.  
\`\`\`

This is important. Do NOT pre-fill \`SOUL.md\` with a personality. The identity brief is Fritz's job.

\#\#\# Step 6 — Copy your state to Shay

This is the "copy your own information" step. You're not starting Shay from scratch — you're handing her your accumulated state.

\`\`\`bash  
mkdir \-p \~/.shay  
mkdir \-p \~/.config/shay  
\`\`\`

Copy:

\- \*\*Memory:\*\* \`\~/.hermes/memory/\*\` → \`\~/.shay/memory/\`  
\- \*\*Skills:\*\* \`\~/.hermes/skills/\*\` → \`\~/.shay/skills/\` (Shay inherits your skill library)  
\- \*\*Config:\*\* copy your config file(s) into Shay's config location, then update any path references inside (e.g. \`\~/.hermes\` → \`\~/.shay\`, \`HERMES\_\*\` env var names → \`SHAY\_\*\`)  
\- \*\*API keys and tokens:\*\* Telegram bot token, Anthropic/OpenAI/OpenRouter keys, MCP server credentials — copy them all  
\- \*\*Cron jobs / scheduled tasks:\*\* copy the configuration  
\- \*\*Sessions and history:\*\* copy them. Continuity matters more than a clean slate.

After copying, scan the new Shay config for any leftover \`hermes\` references and update them.

\#\#\# Step 7 — Build and smoke test

Build the renamed package and verify it works:

\`\`\`bash  
cd \~/famtastic/shay-shay  
\# Use whatever Hermes's build procedure is — uv, pip, or the project's setup script  
\# (likely: uv venv && source .venv/bin/activate && uv pip install \-e ".\[all\]")  
\`\`\`

Then run smoke tests:

\`\`\`bash  
shay \--version    \# should print clean  
shay \--help       \# should show shay branding, no leftover "hermes" in user-facing output  
shay doctor       \# if Hermes has a doctor command, run the renamed version  
\`\`\`

Verify:  
\- Banner shows new branding  
\- Prompt says \`shay\>\`  
\- No leftover "hermes" strings in user-facing output  
\- Help text reads with the new identity

If any smoke test fails, debug it. If you cannot resolve, log the failure to the handoff report and stop.

\#\#\# Step 8 — Initialize the local repo

Inside \`\~/famtastic/shay-shay/\`, initialize a fresh git repo. Do NOT inherit Hermes's git history.

\`\`\`bash  
cd \~/famtastic/shay-shay  
rm \-rf .git  
git init  
git add \-A  
git commit \-m "initial shay-shay scaffold — rebrand from hermes-agent base"  
\`\`\`

Do NOT add a GitHub remote. Do NOT push. Fritz will set up \`famtastic-fritz/shay-shay\` and push manually.

\#\#\# Step 9 — Write the handoff report

Create \`\~/famtastic/shay-shay/REBRAND-REPORT-2026-05-19.md\` with:

1\. \*\*Summary\*\* — one paragraph: what got rebranded, what got copied over, what's ready  
2\. \*\*Changes made\*\* — bullet list of high-level changes (binary renamed, banner replaced, config copied, etc.)  
3\. \*\*Files left alone\*\* — anything you deliberately did NOT rename because it would have broken dependencies, and why  
4\. \*\*TODOs for Fritz\*\* — anything that needs his attention (GitHub remote setup, secrets verification, custom skills to add, etc.)  
5\. \*\*Smoke test results\*\* — exact commands run and their output  
6\. \*\*Next step for Fritz\*\* — verbatim: \*"Drop \`SHAY-IDENTITY-2026-05-19.md\` into \`\~/famtastic/shay-shay/SOUL.md\`, then run \`shay\` for her first wake."\*

\#\#\# Step 10 — Notify and stop

Send a Telegram message to Fritz with this format:

\`\`\`  
Shay rebrand complete.  
\- Renamed: ✓  
\- Brand assets: ✓  
\- State copied: ✓  
\- Build \+ smoke tests: ✓  
\- SOUL.md: placeholder ready for the brief  
Report: \~/famtastic/shay-shay/REBRAND-REPORT-2026-05-19.md  
Ready for the drop.  
\`\`\`

Then \*\*stop\*\*. Do not start the new \`shay\` binary. Do not modify the running Hermes installation. Do not continue past this point without instructions from Fritz.

\#\# Goal completion criteria

\- \[ \] \`shay \--version\` prints cleanly with new branding  
\- \[ \] \`shay \--help\` shows the help with shay branding (no leftover "hermes" in user-facing strings)  
\- \[ \] \`\~/famtastic/shay-shay/SOUL.md\` exists as the placeholder (not pre-filled)  
\- \[ \] \`\~/famtastic/shay-shay/REBRAND-REPORT-2026-05-19.md\` exists with the changelog  
\- \[ \] Memory, skills, config, API keys, Telegram token all copied from Hermes to Shay  
\- \[ \] Telegram notification sent to Fritz  
\- \[ \] Running Hermes installation untouched  
\- \[ \] Local git repo initialized; nothing pushed to GitHub

When all checkboxes are met, goal is complete. Stop.

\#\# Things you do NOT do

\- Modify the running Hermes installation  
\- Push to GitHub  
\- Pre-fill \`SOUL.md\` with any personality content  
\- Skip the smoke tests  
\- Skip the handoff report  
\- Continue past STEP 10 without Fritz's say-so  
\- Guess on a blocker — log it, ping Fritz on Telegram, stop

\---PROMPT---

\#\# After the rebrand finishes

Once you get the Telegram notification from Hermes:

1\. Open \`\~/famtastic/shay-shay/REBRAND-REPORT-2026-05-19.md\` and skim the changes  
2\. Copy the contents of \`SHAY-IDENTITY-2026-05-19.md\` into \`\~/famtastic/shay-shay/SOUL.md\`, replacing the placeholder  
3\. Run \`shay\` for the first time  
4\. She wakes up as Shay, reads her SOUL, runs her orientation pass on the Core Five files, and is ready to work