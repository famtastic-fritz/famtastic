#!/bin/bash
# Tech Stack Analysis Cron Job
# Runs every hour, processes up to 5 repos

cd ~/famtastic/research/repo-intelligence
python3 analyze_repo.py >> logs/analysis.log 2>&1
