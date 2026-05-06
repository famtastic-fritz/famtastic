# Admin — Icon Set Brief

## 1. Domain identity

Admin is the **keys and operations** domain — settings, secrets, health
checks, deploy keys, the launchd plist, the worker queue ledger, the
diagnostics surface. The feeling is *trusted, mechanical, behind-the-curtain*.
Adjacent references: Stripe's developer dashboard, GitHub Settings,
1Password's vault, a server room control panel.

Visual personality: **mechanical, weighty, slightly utilitarian**.
Gears, keys, vaults, shields, pulse lines, valves. The opposite of
Brainstorm's softness. Strokes are firm. Shapes lock together
(gear-into-gear, key-into-lock).

## 2. Icon vocabulary (10 concepts)

1. **Admin rail icon** — gear with a small key shape inside
2. **Settings** — gear (single)
3. **Secret / API key** — small key with a tag
4. **Vault / credentials** — gear inside a closed arc
5. **Health check** — heartbeat pulse line
6. **Diagnostics** — gear with a small magnifier
7. **Worker queue** — three stacked horizontal bars with a gear at the
   end
8. **Process / launchd** — gear with a small play triangle
9. **Deploy key** — key with an upward arrow
10. **Permission / shield** — shield with a checkmark
11. **Danger zone** — shield with a slash
12. **Audit log** — page with a stamp glyph

The gear is the absolute through-line. If a glyph doesn't have a gear,
a key, or a shield, it doesn't belong in the Admin set.

## 3. Reference sets

**Lucide** (https://lucide.dev)
- Pros: has `settings`, `key`, `key-round`, `lock`, `shield`,
  `shield-check`, `shield-alert`, `activity`, `heart-pulse`, `cog`,
  `server`. ISC.
- Cons: gear shapes are slightly small inside the viewbox.
- Suitability: **strong** — Lucide's vocabulary fits Admin almost
  completely.

**Tabler Icons** (https://tabler.io/icons)
- Pros: has `settings`, `settings-2`, `key`, `lock`, `shield-lock`,
  `activity-heartbeat`, `server-cog`, `database-cog`. 2px stroke
  matches the mechanical weight we want. MIT.
- Cons: occasionally over-detailed.
- Suitability: **excellent**.

## 4. Recommended set

**Tabler Icons (2px outline)** as the base. Tabler's heavier stroke
matches the mechanical-and-trusted feeling better than Lucide's. Pin
the entire Admin set to `*-cog` and `*-lock` Tabler variants where
they exist (`server-cog`, `database-cog`, `shield-lock`) so the
gear/lock through-line is enforced by glyph naming, not by us trying
to remember it.

## 5. Custom additions needed

- **Worker queue + gear composite** — three stacked bars with a small
  gear at the right end. Tabler has `list` and `settings` separately;
  combine into one 22px glyph.
- **Deploy key** — key with an upward arrow. Tabler has `key` and
  `arrow-up` separately.
- **Audit log stamp** — page with a custom round stamp glyph in the
  corner. No good open-source equivalent.

Store in `site-studio/public/icons/admin/`.

## 6. Color / style rule

- **Line weight:** 2px (matches Components — both are "mechanical"
  domains and benefit from a heavier line)
- **Fill style:** outline at rest; **the gear teeth fill** with
  `var(--glow-warm)` on active — not the whole gear, just the teeth
  edges. Suggests the gear is "engaged."
- **Corner radius:** 1px on shapes, sharp on gear teeth
- **Accent color when active:** `var(--glow-warm)` on gear teeth, key
  bow, or shield border. Use the cool accent (`var(--glow-cool)`) **only**
  on the heart-pulse health check (signals "alive, monitored")
- **Hover:** the gear *rotates 18°* over 400ms ease-out, paired with
  the standard glow. The rotation is the Admin personality — the
  mechanism turns when you point at it.
