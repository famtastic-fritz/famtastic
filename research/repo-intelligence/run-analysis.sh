#!/bin/bash
# Tech Stack Analysis Cron Job
# Runs every hour, processes up to 5 repos
set -euo pipefail

REPO_DIR="$HOME/famtastic/research/repo-intelligence"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/analysis.log"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR"
python3 analyze_repo.py >> "$LOG_FILE" 2>&1
