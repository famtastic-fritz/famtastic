# FAMtastic Thoughts — Content Model

This doc defines the content objects and capture flow for the Thoughts publishing site.

## Content Objects

### 1. Thought (the core post)

| Field | Type | Notes |
|---|---|---|
| `thought_id` | CHAR(16) PK | base62 public slug |
| `title` | VARCHAR(255) | headline |
| `slug` | VARCHAR(128) UNIQUE | URL slug |
| `status` | ENUM | `draft` → `review` → `published` → `archived` |
| `format` | ENUM | `note`, `essay`, `thread`, `lesson`, `link`, `quote` |
| `body` | TEXT | main content; Markdown with optional HTML |
| `excerpt` | TEXT | 1-2 sentence summary |
| `source` | ENUM | `web-form`, `email`, `voice`, `clipper`, `import` |
| `captured_at` | TIMESTAMP | when the idea was first captured |
| `published_at` | TIMESTAMP | go-live time |
| `updated_at` | TIMESTAMP | last edit |
| `author` | VARCHAR(128) | who wrote/published it |
| `featured_image` | VARCHAR(512) | optional hero image |
| `canonical_url` | VARCHAR(512) | optional external canonical |
| `meta_title` | VARCHAR(255) | SEO title |
| `meta_description` | TEXT | SEO description |
| `reading_time_min` | INT | computed on save |

### 2. Tag

| Field | Type | Notes |
|---|---|---|
| `tag_id` | INT PK | |
| `name` | VARCHAR(64) UNIQUE | lowercase, hyphenated |
| `display_name` | VARCHAR(64) | human label |
| `description` | TEXT | optional |
| `thought_count` | INT | cached count |

### 3. ThoughtTag (join)

| Field | Type | Notes |
|---|---|---|
| `thought_id` | CHAR(16) FK | |
| `tag_id` | INT FK | |
| PK | (`thought_id`, `tag_id`) | |

### 4. Collection

A curated group of thoughts (e.g., "Hosting Lessons", "Design Sprints", "AI Ops").

| Field | Type | Notes |
|---|---|---|
| `collection_id` | CHAR(16) PK | |
| `title` | VARCHAR(255) | |
| `slug` | VARCHAR(128) UNIQUE | |
| `description` | TEXT | |
| `thought_ids` | JSON | ordered list of thought_id |
| `is_featured` | BOOLEAN | show on homepage |
| `sort_order` | INT | |

### 5. MediaAsset

Images, audio transcripts, screenshots attached to a thought.

| Field | Type | Notes |
|---|---|---|
| `asset_id` | CHAR(16) PK | |
| `thought_id` | CHAR(16) FK | optional |
| `type` | ENUM | `image`, `audio`, `video`, `file` |
| `url` | VARCHAR(512) | |
| `caption` | TEXT | optional |
| `uploaded_at` | TIMESTAMP | |

### 6. CrossLink

Explicit links to other FAMtastic properties.

| Field | Type | Notes |
|---|---|---|
| `link_id` | INT PK | |
| `thought_id` | CHAR(16) FK | |
| `target` | ENUM | `hosting`, `designs`, `external` |
| `url` | VARCHAR(512) | |
| `label` | VARCHAR(255) | CTA text |

### 7. SiteBlock (editable page sections)

Same pattern as Hosting: rows keyed by `page`, `section`, `key_name`.

| Field | Type | Notes |
|---|---|---|
| `id` | INT PK | |
| `page` | VARCHAR(64) | e.g. `index`, `about`, `subscribe` |
| `section` | VARCHAR(64) | e.g. `hero`, `newsletter`, `cross_promo_hosting` |
| `key_name` | VARCHAR(128) | e.g. `headline`, `body`, `cta_url` |
| `value_text` | TEXT | |
| `updated_at` | TIMESTAMP | |

## Capture Flow

```
[Idea appears anywhere]
        ↓
[Capture channel]
  ├── Email → thoughts@famtasticthoughts.com
  ├── Web form → /capture
  ├── Mobile bookmarklet → pre-fills title + URL
  ├── Voice note → Whisper transcription
  └── Import → Markdown / Notion / ChatGPT export
        ↓
[Ingest service]
  • generates title if missing
  • extracts tags with LLM
  • writes body draft
  • sets status = draft
        ↓
[Review queue]
  • human approves / edits / schedules
        ↓
[Publish]
  • status = published
  • published_at = now
  • rebuilds affected routes
```

## Capture channels (detailed)

### Email
- Send to `thoughts@famtasticthoughts.com`.
- Subject becomes title.
- Body becomes draft.
- Attachments become MediaAssets.
- Auto-tag based on keywords.

### Web form (`/capture`)
- Minimal: title, body, tags.
- One-click save as draft.
- Supports Markdown preview.

### Mobile bookmarklet
- Javascript snippet that opens `/capture?title=...&url=...&quote=...`.
- Prefills source URL and selected text.

### Voice-to-text
- User records audio via `/capture/voice`.
- Whisper API transcribes.
- LLM cleans transcript into a draft thought.

### Import
- Markdown files dropped into `data/import/`.
- CLI script parses frontmatter and creates Thought rows.

## Page routes

| Route | Render | Notes |
|---|---|---|
| `/` | SSG | latest thoughts, featured collections, cross-promo |
| `/t/[slug]` | SSG/SSR | individual thought |
| `/tag/[name]` | SSG | tag index |
| `/collection/[slug]` | SSG | curated collection |
| `/capture` | SSR | auth-required capture form |
| `/admin` | SSR | auth-required admin list |

## Cross-promo wiring

- Homepage includes a `cross_promo_hosting` SiteBlock linking to `https://famtastichosting.com/?ref=thoughts`.
- Homepage includes a `cross_promo_designs` SiteBlock linking to `https://famtasticdesigns.com/?ref=thoughts`.
- Individual thoughts can include `CrossLink` records to hosting/designs pages.

## Sample JSON

See [`data/sample-thoughts.json`](../../data/sample-thoughts.json).
