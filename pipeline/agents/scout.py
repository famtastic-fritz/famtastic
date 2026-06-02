#!/usr/bin/env python3
"""
Scout Agent - Finds paying work 24/7
Monitors: Upwork, Reddit, Twitter, Discord, LinkedIn
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path.home() / "famtastic" / "pipeline" / "lib"))
try:
    from heartbeat import beat
except Exception:
    def beat(*a, **k):
        pass

class ScoutAgent:
    def __init__(self):
        self.data_dir = Path.home() / "famtastic/pipeline/data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.leads_file = self.data_dir / "leads.jsonl"
        self.seen_ids = self._load_seen_ids()
        
    def _load_seen_ids(self):
        """Load already processed lead IDs"""
        if not self.leads_file.exists():
            return set()
        seen = set()
        with open(self.leads_file) as f:
            for line in f:
                try:
                    lead = json.loads(line)
                    seen.add(lead.get('id'))
                except:
                    pass
        return seen
    
    def _score_lead(self, lead):
        """AI-free scoring based on keywords and budget"""
        score = 0
        text = f"{lead.get('title', '')} {lead.get('description', '')}".lower()
        
        # Budget scoring
        budget = lead.get('budget', 0)
        if budget > 5000: score += 40
        elif budget > 2000: score += 30
        elif budget > 1000: score += 20
        elif budget > 500: score += 10
        
        # Keyword scoring
        keywords = {
            'react': 10, 'nextjs': 10, 'automation': 15, 'ai': 15,
            'dashboard': 12, 'api': 10, 'integration': 12,
            'urgent': 15, 'asap': 15, 'immediate': 15,
            'typescript': 8, 'node': 8, 'python': 8
        }
        for kw, points in keywords.items():
            if kw in text: score += points
        
        # Negatives
        if 'wordpress' in text: score -= 10
        if 'drupal' in text and 'migration' not in text: score -= 5
        if 'intern' in text: score -= 10
        if budget < 300: score -= 20
        
        return min(score, 100)
    
    def _notify_high_value(self, lead, score):
        """Send Telegram alert for high-value leads"""
        message = f"""🎯 HIGH-VALUE LEAD DETECTED

{lead.get('title', 'Unknown')}
Budget: ${lead.get('budget', 'Unknown')}
Score: {score}/100
Source: {lead.get('source', 'Unknown')}

URL: {lead.get('url', 'N/A')}

Building demo now..."""
        
        # Send to Telegram
        bot_token = os.environ.get('BOT_TOKEN', '')
        chat_id = '7456504966'
        
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data={"chat_id": chat_id, "text": message, "disable_web_page_preview": True},
                timeout=10
            )
        except Exception as e:
            print(f"Telegram notification failed: {e}")
    
    def _extract_budget(self, text):
        """Extract budget from text"""
        import re
        if not text:
            return 0
        patterns = [
            r'\$([\d,]+)\s*-?\s*\$?([\d,]+)?',  # $X,XXX - $X,XXX
            r'budget.*?\$([\d,]+)',  # budget of $X
            r'\$([\d,]+)\s+(?:budget|fixed|price)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    return int(match.group(1).replace(',', ''))
                except:
                    pass
        return 0
    
    def scan_reddit(self):
        """Monitor Reddit job subs"""
        subs = ['forhire', 'slavelabour', 'jobbit']
        leads = []
        
        for sub in subs:
            try:
                beat('scout', 'scanning', f'reddit r/{sub}')
                url = f"https://www.reddit.com/r/{sub}/new/.json?limit=10"
                # (connect, read) timeout — prevents the hang documented in status.txt
                response = requests.get(url, headers={'User-Agent': 'ScoutBot/1.0'}, timeout=(5, 15))
                data = response.json()
                
                for post in data.get('data', {}).get('children', []):
                    post_data = post.get('data', {})
                    lead = {
                        'id': f"reddit_{post_data.get('id')}",
                        'source': 'reddit',
                        'title': post_data.get('title', ''),
                        'url': f"https://reddit.com{post_data.get('permalink', '')}",
                        'description': post_data.get('selftext', '')[:500],
                        'budget': self._extract_budget(post_data.get('selftext', '')),
                        'found_at': datetime.now().isoformat()
                    }
                    leads.append(lead)
            except Exception as e:
                print(f"Reddit scan failed for r/{sub}: {e}")
        
        return leads
    
    def run(self):
        """Main scout loop"""
        print(f"[{datetime.now()}] Scout agent starting...")
        
        while True:
            beat('scout', 'looping', 'start scan cycle')
            all_leads = []

            # Scan Reddit
            try:
                all_leads.extend(self.scan_reddit())
            except Exception as e:
                print(f"Reddit scan error: {e}")
                beat('scout', 'error', f'reddit: {e}')
            
            # Process leads
            new_high_value = 0
            for lead in all_leads:
                if lead['id'] in self.seen_ids:
                    continue
                
                score = self._score_lead(lead)
                lead['score'] = score
                
                # Save to database
                with open(self.leads_file, 'a') as f:
                    f.write(json.dumps(lead) + '\n')
                
                self.seen_ids.add(lead['id'])
                
                # Notify for high-value leads
                if score >= 75:
                    self._notify_high_value(lead, score)
                    new_high_value += 1
                    
                    # Queue for builder
                    queue_file = self.data_dir / "build_queue.jsonl"
                    with open(queue_file, 'a') as f:
                        f.write(json.dumps({
                            'lead_id': lead['id'],
                            'lead': lead,
                            'queued_at': datetime.now().isoformat()
                        }) + '\n')
            
            if new_high_value > 0:
                print(f"[{datetime.now()}] Found {new_high_value} high-value leads")
            
            # Sleep before next scan — heartbeat during the wait so a sleeping
            # agent stays distinguishable from a wedged one.
            beat('scout', 'idle', 'sleeping until next scan')
            for _ in range(60):
                time.sleep(5)
                beat('scout', 'idle', 'sleeping until next scan')

if __name__ == '__main__':
    agent = ScoutAgent()
    agent.run()
