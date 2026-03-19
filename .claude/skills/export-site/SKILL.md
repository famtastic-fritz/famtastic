---
name: export-site
description: Export a site as a standalone project with package.json and README
user-invocable: true
---

Export a FAMtastic site as a standalone project.

1. Parse arguments from $ARGUMENTS — expects `<tag> <target-path>` (e.g., "clean-pools ~/projects/clean-pools")
2. If no arguments, ask the user for the tag and target path
3. Normalize the tag (add "site-" prefix if missing)
4. Run: `cd ~/famtastic && ./scripts/site-export "site-$TAG" "$TARGET_PATH"`
5. Report success with the path and instructions to serve locally

The exported project includes:
- All HTML + assets from dist/
- package.json with `npm run serve` (npx serve)
- README with re-import instructions
- Session summaries if they exist
