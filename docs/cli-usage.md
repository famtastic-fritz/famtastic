# FAMtastic Hub CLI Usage Guide

The `fam-hub` command provides a unified interface to all Hub functionality. This document covers common usage patterns and workflows.

## Quick Start

```bash
# Get help
fam-hub

# List available conversation tags
ls ~/.local/share/famtastic/sync/chatgpt/

# Basic workflow: ingest → orchestrate → sync
fam-hub ingest my-project md
fam-hub orchestrator resume my-project
fam-hub sync my-project
```

## Installation & Setup

```bash
# Install completions (bash/zsh)
scripts/install-completions

# Reload shell to enable completions
source ~/.bashrc  # or ~/.zshrc
```

## Command Reference

### Conversation Management
```bash
# Reconcile conversation from ChatGPT export
fam-hub convo reconcile <tag>
```

### Content Ingestion
```bash
# Ingest markdown from ChatGPT
fam-hub ingest resume-notes md

# Ingest JSON conversation data
fam-hub ingest job-amazon json
```

### Bundle Sync
```bash
# Create bundle for ChatGPT (current working set)
fam-hub sync

# Create bundle for specific conversation
fam-hub sync my-project
```

### Multi-Agent Orchestration
```bash
# Generate tailored resume
fam-hub orchestrator resume job-amazon

# Build website/landing page
fam-hub orchestrator site company-pitch

# Process job application
fam-hub orchestrator job startup-xyz
```

### Direct Agent Interaction
```bash
# Run Claude on a conversation tag
fam-hub agent run claude my-project

# Run Gemini analysis
fam-hub agent run gemini research-notes

# Generate code with Codex
fam-hub agent run codex api-spec
```

### Text-to-Speech
```bash
# Generate speech from latest conversation
fam-hub tts

# Generate speech from specific tag
fam-hub tts meeting-notes
```

### File Management
```bash
# Promote draft to final (trusted patterns only)
fam-hub promote resume-tech-lead
```

## Common Workflows

### Resume Generation
```bash
# 1. Start with job posting analysis
fam-hub ingest job-amazon md

# 2. Generate tailored resume
fam-hub orchestrator resume job-amazon

# 3. Sync for ChatGPT review
fam-hub sync job-amazon

# 4. Listen to summary
fam-hub tts job-amazon
```

### Site Building
```bash
# 1. Ingest requirements/wireframes
fam-hub ingest site-portfolio md

# 2. Generate site structure
fam-hub orchestrator site site-portfolio

# 3. Sync deliverables
fam-hub sync site-portfolio
```

### Meeting Processing
```bash
# 1. Ingest meeting transcript
fam-hub ingest meeting-q3-planning md

# 2. Generate action items (if orchestrator exists)
fam-hub orchestrator meeting meeting-q3-planning

# 3. Create summary audio
fam-hub tts meeting-q3-planning
```

## File Locations

- **Conversation Data**: `~/.local/share/famtastic/sync/chatgpt/<tag>/`
- **Hub Sources**: `~/.local/share/famtastic/agent-hub/sources/`
- **Output Artifacts**: `~/famtastic/outputs/`
- **Audio Files**: `~/famtastic/outputs/audio/`

## Auto-Promotion Patterns

These conversation tags automatically promote drafts to final files:
- `resume-*` → Resume files
- `job-*` → Job application materials
- `meeting-*` → Meeting summaries
- `notes-*` → Note compilations
- `site-*` → Website builds
- `project-*` → Project deliverables

Unknown patterns stay in draft until manual promotion.

## Debugging

```bash
# Check conversation status
ls -la ~/.local/share/famtastic/sync/chatgpt/<tag>/

# View orchestrator logs
cat ~/.local/share/famtastic/agent-hub/sources/orchestrator/<tag>.jsonl

# Check TTS generation
cat ~/.local/share/famtastic/agent-hub/sources/tts/<tag>.jsonl

# View latest bundle
cat ~/.local/share/famtastic/sync/chatgpt/<tag>/refresh-ready.md
```