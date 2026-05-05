# Workbench Default-Shell Cutover Checklist

## Goal

Make the Workbench Foundation the default Studio shell without losing the current Studio entry points, Shay behavior, preview access, or rollback path.

## Action Items

1. Inventory current Studio entry points in `site-studio/public/index.html`, `site-studio/public/js/studio-shell.js`, and `site-studio/public/workbench-foundation.html`.
2. Decide the default route behavior: Workbench first, legacy shell preserved as explicit fallback.
3. Wire the default shell behind a reversible flag or route gate before removing any legacy entry point.
4. Keep `workbench.foundation` as the active Shay context provider only when the Workbench shell is foregrounded.
5. Verify with browser automation through launchd-managed Studio, not direct file open.
6. Capture screenshots for desktop and mobile-ish widths.
7. Update `SITE-LEARNINGS.md`, `FAMTASTIC-STATE.md`, and `CHANGELOG.md`.

## Acceptance

- Opening Studio lands in Workbench by default.
- Legacy Studio remains reachable.
- Shay-Shay still receives page context.
- No new inline CSS or app logic is added to `index.html`.
- Rollback is one small patch.

## Hard Stops

- Do not change production deploy, DNS, auth, or payment behavior.
- Do not remove the legacy shell until at least one successful Workbench-default browser proof exists.
