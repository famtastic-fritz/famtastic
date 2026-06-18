# FAMtastic Agency — Local Sandbox

Watch the whole agency pipeline run on your own machine: qualified leads →
generated sites → live preview, all in a browser you control. **Pure Python
stdlib — no installs, no API key, nothing to set up.**

## Run it (on the Mac)

```bash
cd ~/famtastic
python3 agency/sandbox/serve.py
```

That's it. It builds a site for every lead, starts a local server, and opens
your browser to the sandbox hub at **http://localhost:8788**:

- **Left:** your 10 qualified Port St. Lucie leads, tagged by vertical.
- **Right:** a live preview of the selected site. Click any lead to preview it.

Stop with `Ctrl-C`.

### Options

```bash
python3 agency/sandbox/serve.py --port 9000   # use a different port
python3 agency/sandbox/serve.py --no-open      # don't auto-open the browser
python3 agency/sandbox/generate.py             # just build the files, no server
```

## What's in here

| File | Role |
|------|------|
| `generate.py` | The template engine. Reads `../leads/psl-2026-06-18.json`, renders a clean, premium, **vertical-aware** site per lead (taqueria, nail, detailing, lawn each get their own palette + copy). |
| `serve.py` | Builds all leads, writes the preview hub, serves on localhost, opens the browser. |
| `output/` | Generated sites (git-ignored — rebuilt on every run). |

## How it fits the pipeline

This is the **deterministic baseline** — instant, reliable, good-looking, and
something you can see and iterate on. The same lead JSON can be handed to the
Claude-backed factory (`fam-hub site build`) for a bespoke, hand-tuned build
when a lead is worth it. Sandbox first (cheap, fast, watchable) → factory when
you're ready to ship a real one.

## Changing the look

Edit the `THEMES` dict at the top of `generate.py` — palette, fonts, headline,
CTAs are all there per vertical. Re-run and refresh. The hero, sections,
divider, and visit block are in the `render()` function below it.

## Adding leads

Drop more qualified leads into `agency/leads/*.json` (same shape) and point the
`leads_path` in `serve.py` at the file. Re-run to rebuild.
