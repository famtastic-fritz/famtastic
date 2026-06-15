#!/usr/bin/env python3
"""
Builder Agent - Creates assets from templates
Auto-builds landing pages, configs, and code
"""

import json
import os
import time
import re
from pathlib import Path
from datetime import datetime

class BuilderAgent:
    def __init__(self):
        self.data_dir = Path.home() / "famtastic/pipeline/data"
        self.assets_dir = Path.home() / "famtastic/pipeline/assets"
        self.templates_dir = Path.home() / "famtastic/pipeline/templates"
        self.queue_file = self.data_dir / "build_queue.jsonl"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        
    def load_next_job(self):
        """Load next queued lead"""
        if not self.queue_file.exists():
            return None
        
        lines = self.queue_file.read_text().strip().split('\n')
        if not lines or lines == ['']:
            return None
        
        # Get first unprocessed job (simplified)
        try:
            return json.loads(lines[0])
        except:
            return None
    
    def generate_landing_page(self, lead):
        """Generate a landing page for the lead"""
        title = lead.get('title', 'Professional Service')
        keywords = self._extract_keywords(title)
        
        # Create service name
        service_name = keywords[0].title() + ' ' + keywords[1].title() if len(keywords) >= 2 else title[:30]
        
        # Load template
        template_path = self.templates_dir / "landing-page.html"
        if template_path.exists():
            template = template_path.read_text()
        else:
            template = self._default_template()
        
        # Customize
        html = template.replace('{{SERVICE_NAME}}', service_name)
        html = html.replace('{{PRICE}}', self._suggest_price(lead))
        html = html.replace('{{LEAD_ID}}', lead.get('id', 'unknown'))
        
        # Save
        asset_id = f"lp_{lead['id']}_{int(time.time())}"
        asset_path = self.assets_dir / f"{asset_id}.html"
        asset_path.write_text(html)
        
        return {
            'id': asset_id,
            'type': 'landing_page',
            'path': str(asset_path),
            'url': f"http://100.126.57.66:9080/{asset_id}.html",
            'lead_id': lead['id'],
            'created_at': datetime.now().isoformat()
        }
    
    def _extract_keywords(self, text):
        """Extract keywords from job title"""
        common_tech = ['react', 'node', 'python', 'ai', 'api', 'web', 'app', 'automation', 
                       'dashboard', 'integration', 'bot', 'scraper', 'generator', 'tool']
        words = text.lower().split()
        return [w for w in words if w in common_tech][:3] or ['professional', 'service']
    
    def _suggest_price(self, lead):
        """Price based on lead budget"""
        budget = lead.get('budget', 0)
        if budget > 5000:
            return "$2,000-5,000"
        elif budget > 2000:
            return "$1,000-2,000"
        elif budget > 1000:
            return "$500-1,000"
        else:
            return "$300-500"
    
    def _default_template(self):
        """Default landing page template"""
        return """<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{{SERVICE_NAME}}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:50px auto;padding:20px}
.hero{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:60px 20px;text-align:center;border-radius:16px}
h1{margin:0 0 20px}.price{font-size:2em;font-weight:bold;margin:30px 0}
.cta{background:#fff;color:#667eea;padding:20px 40px;border-radius:50px;text-decoration:none;display:inline-block;font-weight:bold}
.features{margin:40px 0}.feature{display:flex;align-items:center;margin:20px 0}
.feature span{font-size:1.5em;margin-right:15px}</style></head>
<body><div class="hero"><h1>{{SERVICE_NAME}}</h1><p>Professional setup and configuration</p>
<div class="price">{{PRICE}}</div><a href="mailto:fritz.medine@gmail.com?subject=Booking" class="cta">Book Now</a>
<p><small>24-48h delivery · 100% satisfaction guarantee</small></p></div>
<div class="features"><h2>Includes:</h2>
<div class="feature"><span>✅</span><div><strong>Complete Setup</strong><br>Full installation</div></div>
<div class="feature"><span>🔧</span><div><strong>Configuration</strong><br>Custom to your needs</div></div>
<div class="feature"><span>📚</span><div><strong>Documentation</strong><br>Step-by-step guide</div></div>
<div class="feature"><span>📧</span><div><strong>30-Day Support</strong><br>Email assistance</div></div>
</div></body></html>"""
    
    def _notify_telegram(self, asset):
        """Notify that asset is ready"""
        import requests
        bot_token = os.environ.get('BOT_TOKEN', '')
        chat_id = '7456504966'
        
        message = f"""🚀 ASSET READY

Type: {asset['type']}
Lead: {asset['lead_id']}
URL: {asset['url']}

Sales bot engaging now..."""
        
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data={"chat_id": chat_id, "text": message},
                timeout=10
            )
        except:
            pass
    
    def run(self):
        """Main builder loop"""
        print(f"[{datetime.now()}] Builder agent starting...")
        
        while True:
            job = self.load_next_job()
            if job:
                try:
                    lead = job.get('lead', {})
                    print(f"[{datetime.now()}] Building asset for {lead.get('id', 'unknown')}")
                    
                    # Build asset
                    asset = self.generate_landing_page(lead)
                    
                    # Queue for closer
                    sales_queue = self.data_dir / "sales_queue.jsonl"
                    with open(sales_queue, 'a') as f:
                        f.write(json.dumps({
                            'asset': asset,
                            'lead': lead,
                            'queued_at': datetime.now().isoformat()
                        }) + '\n')
                    
                    # Notify
                    self._notify_telegram(asset)
                    
                    # Mark job complete (remove from queue)
                    # In practice, use proper queue management
                    
                except Exception as e:
                    print(f"Build failed: {e}")
            
            time.sleep(60)  # Check every minute

if __name__ == '__main__':
    agent = BuilderAgent()
    agent.run()
