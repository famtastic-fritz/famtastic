#!/usr/bin/env python3
"""
Upwork Gig Sniper - Automated Job Finder
Scans Upwork for high-probability React/Next.js jobs
"""

import json
import re
from datetime import datetime
from pathlib import Path

# High-conversion job patterns
JOB_PATTERNS = {
    "react_dashboard": {
        "keywords": ["react", "dashboard", "admin panel", "cms"],
        "budget_range": (1000, 5000),
        "proposal_template": """
I specialize in building custom React admin dashboards and CMS systems.

Recent work: Built template builder with drag-drop for National Institute of Building Sciences (NIBS).

Can deliver your {project_type} in {timeline}.

Portfolio: https://famtasticdesigns.com

Let's discuss your requirements.
- Fitzgerald
        """
    },
    "ai_automation": {
        "keywords": ["ai", "automation", "openai", "claude", "gpt"],
        "budget_range": (2000, 10000),
        "proposal_template": """
AI automation specialist. Built systems that cut client costs 60%.

Recent: AI-powered email classification, automated code review, multi-agent workflows.

I can implement exactly {specific_feature} for your use case.

Available immediately.
- Fitzgerald
        """
    },
    "legacy_migration": {
        "keywords": ["migration", "drupal", "wordpress", "refactor", "modernize"],
        "budget_range": (3000, 15000),
        "proposal_template": """
Legacy migration expert. Just completed Drupal→React migration for government client.

Specialize in:
- Zero-downtime migrations
- Data preservation
- Modern React stacks
- Training documentation

Your {current_stack} → {target_stack} project is exactly what I do.

Ready to start.
- Fitzgerald
        """
    }
}

def score_job(title, description, budget):
    """Score job 0-100 based on patterns"""
    text = f"{title} {description}".lower()
    score = 0
    matched_pattern = None
    
    for pattern_name, pattern in JOB_PATTERNS.items():
        matches = sum(1 for kw in pattern["keywords"] if kw in text)
        if matches >= 2:  # At least 2 keywords match
            pattern_score = min(matches * 20, 80)
            if pattern_score > score:
                score = pattern_score
                matched_pattern = pattern
    
    # Budget boost
    if budget:
        for pattern in JOB_PATTERNS.values():
            min_b, max_b = pattern["budget_range"]
            if min_b <= budget <= max_b:
                score += 20
                break
    
    return min(score, 100), matched_pattern

def generate_proposal(job, pattern):
    """Generate tailored proposal"""
    if not pattern:
        return None
    
    proposal = pattern["proposal_template"].format(
        project_type=job.get("type", "project"),
        timeline="2 weeks",
        specific_feature=job.get("title", "AI solution"),
        current_stack="legacy",
        target_stack="React"
    )
    return proposal

# Target jobs (manual curation or scraped)
TARGET_JOBS = [
    {
        "id": "upwork_001",
        "title": "React Dashboard with Drag-Drop Builder",
        "budget": 3000,
        "description": "Need custom admin dashboard with visual page builder for healthcare client...",
        "url": "https://upwork.com/jobs/~01abc123",
        "posted_hours_ago": 4
    },
    {
        "id": "upwork_002", 
        "title": "AI Email Automation System",
        "budget": 5000,
        "description": "Build system that reads emails, classifies urgency, auto-responds to routine...",
        "url": "https://upwork.com/jobs/~01def456",
        "posted_hours_ago": 2
    },
    {
        "id": "upwork_003",
        "title": "Government Website Modernization - Drupal to React",
        "budget": 8000,
        "description": "Migrate legacy Drupal 7 site to modern React stack...",
        "url": "https://upwork.com/jobs/~01ghi789",
        "posted_hours_ago": 1
    }
]

def analyze_jobs():
    """Analyze target jobs and generate proposals"""
    results = []
    
    for job in TARGET_JOBS:
        score, pattern = score_job(job["title"], job["description"], job["budget"])
        proposal = generate_proposal(job, pattern)
        
        results.append({
            "job": job,
            "score": score,
            "tier": "🔥 HOT" if score >= 80 else "✅ GOOD" if score >= 60 else "❌ SKIP",
            "proposal": proposal
        })
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def generate_report():
    """Generate markdown report"""
    results = analyze_jobs()
    
    lines = [
        "# Upwork Gig Analysis Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "## 🔥 HIGH PRIORITY (Score 80+)",
        ""
    ]
    
    hot_jobs = [r for r in results if r["score"] >= 80]
    good_jobs = [r for r in results if 60 <= r["score"] < 80]
    
    for r in hot_jobs:
        job = r["job"]
        lines.extend([
            f"### {job['title']}",
            f"- **Budget:** ${job['budget']}",
            f"- **Posted:** {job['posted_hours_ago']} hours ago",
            f"- **Score:** {r['score']}%",
            f"- **Link:** {job['url']}",
            "",
            "**PROPOSAL:**",
            "```",
            r["proposal"],
            "```",
            "",
            "---",
            ""
        ])
    
    lines.extend([
        "## ✅ MEDIUM PRIORITY (Score 60-79)",
        ""
    ])
    
    for r in good_jobs:
        job = r["job"]
        lines.extend([
            f"### {job['title']}",
            f"- **Budget:** ${job['budget']}",
            f"- **Score:** {r['score']}%",
            ""
        ])
    
    lines.extend([
        "",
        "## Action Plan",
        "",
        f"1. **Apply to {len(hot_jobs)} HOT jobs immediately** (high conversion probability)",
        f"2. **Monitor {len(good_jobs)} GOOD jobs** for 24h, apply if still open",
        "3. **Customize proposals** with specific client pain points",
        "4. **Follow up** within 2 hours of application",
        "",
        "**Expected close rate:** 20-30% on HOT jobs",
        f"**Potential revenue:** ${sum(j['job']['budget'] for j in hot_jobs) * 0.25:.0f}"
    ])
    
    output = Path.home() / "famtastic/revenue-plans/upwork-gigs.md"
    output.write_text('\n'.join(lines))
    return output

if __name__ == "__main__":
    report = generate_report()
    print(f"Report saved: {report}")
    print(f"Hot jobs: {len([r for r in analyze_jobs() if r['score'] >= 80])}")
