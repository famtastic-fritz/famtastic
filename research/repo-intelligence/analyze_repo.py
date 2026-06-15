#!/usr/bin/env python3
"""Tech Stack Analyzer for GitHub Repos - Automation Empire Module"""
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
import subprocess

PENDING_DIR = Path("~/famtastic/research/repo-intelligence/pending").expanduser()
COMPLETED_DIR = Path("~/famtastic/research/repo-intelligence/completed").expanduser()
REPORTS_DIR = Path("~/famtastic/research/repo-intelligence/reports").expanduser()

def extract_repo_info(url):
    """Extract owner/repo from GitHub URL"""
    parsed = urlparse(url)
    match = re.match(r'/([^/]+)/([^/]+)', parsed.path)
    if match:
        return match.group(1), match.group(2).replace('.git', '')
    return None, None

def analyze_repo(url):
    """Perform tech stack analysis via GitHub API"""
    owner, repo = extract_repo_info(url)
    if not owner or not repo:
        return {"error": f"Could not parse: {url}"}
    
    result = {
        "url": url,
        "owner": owner,
        "repo": repo,
        "analyzed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tech_stack": {},
        "dependencies": [],
        "languages": {},
        "architecture": {},
        "automation_potential": {}
    }
    
    # Get repo metadata
    try:
        cmd = f'curl -s -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/{owner}/{repo}'
        response = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        data = json.loads(response.stdout)
        
        result["description"] = data.get("description", "")
        result["stars"] = data.get("stargazers_count", 0)
        result["language"] = data.get("language", "Unknown")
        result["topics"] = data.get("topics", [])
        result["license"] = data.get("license", {}).get("spdx_id", "Unknown")
        result["last_updated"] = data.get("updated_at", "")
        result["open_issues"] = data.get("open_issues_count", 0)
        result["forks"] = data.get("forks_count", 0)
    except Exception as e:
        result["error"] = str(e)
        return result
    
    # Get language breakdown
    try:
        cmd = f'curl -s -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/{owner}/{repo}/languages'
        response = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        result["languages"] = json.loads(response.stdout)
    except:
        pass
    
    # Detect tech stack from topics + description
    stack_keywords = {
        "ai_ml": ["llm", "gpt", "claude", "openai", "anthropic", "transformer", "pytorch", "tensorflow", "ml", "ai", "neural", "embedding", "vector", "rag"],
        "automation": ["cron", "scheduler", "pipeline", "workflow", "agent", "bot", "automation", "orchestration", "ci/cd"],
        "web_frontend": ["react", "vue", "angular", "svelte", "nextjs", "nuxt", "tailwind", "css", "html", "frontend"],
        "web_backend": ["node", "express", "fastapi", "django", "flask", "rails", "spring", "api", "server"],
        "database": ["postgres", "mysql", "mongodb", "redis", "sqlite", "database", "db", "sql", "nosql"],
        "cloud_devops": ["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "pulumi", "serverless", "lambda"],
        "mcp": ["mcp", "model-context-protocol", "claude-skill", "hermes-skill"],
        "mobile": ["react-native", "flutter", "ios", "android", "mobile", "app"],
        "cli_tools": ["cli", "terminal", "command-line", "shell", "bash", "zsh"]
    }
    
    text_to_analyze = " ".join(result.get("topics", [])) + " " + result.get("description", "")
    detected_stack = []
    
    for category, keywords in stack_keywords.items():
        if any(kw.lower() in text_to_analyze.lower() for kw in keywords):
            detected_stack.append(category)
    
    result["tech_stack"]["detected_categories"] = detected_stack
    
    # Automation potential scoring
    auto_score = 0
    auto_reasons = []
    
    if "mcp" in detected_stack or "automation" in detected_stack:
        auto_score += 30
        auto_reasons.append("Explicit automation/MCP tooling")
    
    if "ai_ml" in detected_stack:
        auto_score += 25
        auto_reasons.append("AI/ML capabilities for automation")
    
    if result.get("stars", 0) > 1000:
        auto_score += 15
        auto_reasons.append("High community adoption")
    
    if "cli_tools" in detected_stack:
        auto_score += 15
        auto_reasons.append("CLI integration potential")
    
    if result.get("language") in ["Python", "TypeScript", "JavaScript", "Go"]:
        auto_score += 10
        auto_reasons.append("Automation-friendly language")
    
    result["automation_potential"]["score"] = min(auto_score, 100)
    result["automation_potential"]["reasons"] = auto_reasons
    result["automation_potential"]["tier"] = "HIGH" if auto_score >= 70 else "MEDIUM" if auto_score >= 40 else "LOW"
    
    return result

def generate_report(results):
    """Generate markdown report from analysis results"""
    timestamp = time.strftime("%Y-%m-%d_%H%M%S")
    report_file = REPORTS_DIR / f"batch_{timestamp}.md"
    
    lines = [
        "# Tech Stack Analysis Report",
        f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Repos analyzed:** {len(results)}",
        "",
        "## Summary",
        "",
        "| Repo | Stars | Language | Auto Score | Tier |",
        "|------|-------|----------|------------|------|"
    ]
    
    high_priority = []
    
    for r in results:
        if "error" in r:
            lines.append(f"| {r.get('repo', 'ERROR')} | - | - | - | ERROR |")
            continue
        
        name = f"[{r['owner']}/{r['repo']}]({r['url']})"
        stars = r.get('stars', 0)
        lang = r.get('language', 'Unknown')
        score = r.get('automation_potential', {}).get('score', 0)
        tier = r.get('automation_potential', {}).get('tier', 'LOW')
        
        lines.append(f"| {name} | {stars} | {lang} | {score}% | {tier} |")
        
        if tier == "HIGH":
            high_priority.append(r)
    
    lines.extend([
        "",
        "## High Priority for Automation Empire",
        ""
    ])
    
    for r in high_priority:
        lines.extend([
            f"### {r['owner']}/{r['repo']}",
            f"- **Description:** {r.get('description', 'N/A')}",
            f"- **Stars:** {r.get('stars', 0)}",
            f"- **Languages:** {', '.join(r.get('languages', {}).keys())[:5]}",
            f"- **Topics:** {', '.join(r.get('topics', []))[:5]}",
            f"- **Automation Score:** {r.get('automation_potential', {}).get('score', 0)}%",
            f"- **Why:** {', '.join(r.get('automation_potential', {}).get('reasons', []))}",
            ""
        ])
    
    report_file.write_text('\n'.join(lines))
    return report_file

def main():
    # Get pending URLs
    pending_files = list(PENDING_DIR.glob("*.json"))
    if not pending_files:
        print("No pending repos to analyze")
        return
    
    # Process first file (batch of up to 5)
    batch_file = pending_files[0]
    with open(batch_file) as f:
        urls = json.load(f)
    
    # Limit to 5 per run
    urls_to_process = urls[:5]
    remaining = urls[5:]
    
    print(f"Analyzing {len(urls_to_process)} repos...")
    results = []
    
    for url in urls_to_process:
        url = url.strip()
        if not url or 'github.com' not in url:
            continue
        print(f"  → {url}")
        results.append(analyze_repo(url))
        time.sleep(2)  # Rate limit protection
    
    # Save individual results
    for r in results:
        if "owner" in r and "repo" in r:
            result_file = COMPLETED_DIR / f"{r['owner']}_{r['repo']}.json"
            with open(result_file, 'w') as f:
                json.dump(r, f, indent=2)
    
    # Generate report
    report = generate_report(results)
    print(f"Report saved: {report}")
    
    # Update or remove batch file
    if remaining:
        with open(batch_file, 'w') as f:
            json.dump(remaining, f, indent=2)
        print(f"{len(remaining)} repos remaining in batch")
    else:
        batch_file.unlink()
        print("Batch complete")
    
    print(f"\nCompleted: {len(results)} repos analyzed")

if __name__ == "__main__":
    main()
