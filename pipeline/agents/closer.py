#!/usr/bin/env python3
"""
Closer Agent - Sells completed assets
Follows up, handles objections, closes deals
"""

import json
import os
import time
from pathlib import Path
from datetime import datetime

class CloserAgent:
    def __init__(self):
        self.data_dir = Path.home() / "famtastic/pipeline/data"
        self.sales_queue = self.data_dir / "sales_queue.jsonl"
        self.revenue_file = Path.home() / "famtastic/pipeline/revenue/income.jsonl"
        self.revenue_file.parent.mkdir(parents=True, exist_ok=True)
        
    def load_next_sale(self):
        """Load next sale-ready asset"""
        if not self.sales_queue.exists():
            return None
        
        lines = self.sales_queue.read_text().strip().split('\n')
        if not lines or lines == ['']:
            return None
        
        try:
            return json.loads(lines[0])
        except:
            return None
    
    def generate_pitch(self, asset, lead):
        """Generate personalized pitch"""
        service_type = asset.get('type', 'Professional Service')
        url = asset.get('url', '')
        price = self._extract_price(url)
        
        pitch = f"""Hi,

I saw your post about needing {lead.get('title', 'help with a project')}.

Built exactly that: {url}

Price: {price}
Delivery: 24-48 hours
Ready to deploy immediately.

This includes:
✅ Complete setup
✅ Custom configuration  
✅ Documentation
✅ 30-day support

Want to discuss?

- Fritz"""
        
        return pitch
    
    def _extract_price(self, url):
        """Extract price from landing page"""
        return "$500-2000"  # Simplified
    
    def simulate_sale(self, lead, asset):
        """Simulate the sales process (for demo)"""
        # In production, this would:
        # 1. Send email/DM
        # 2. Wait for response
        # 3. Handle objections
        # 4. Collect payment
        # 5. Deliver files
        
        sale = {
            'lead_id': lead.get('id'),
            'asset_id': asset.get('id'),
            'lead_title': lead.get('title', ''),
            'source': lead.get('source', ''),
            'amount': self._estimate_price(lead),
            'closed_at': datetime.now().isoformat(),
            'status': 'pending_payment'  # or 'collected'
        }
        
        # Record revenue
        with open(self.revenue_file, 'a') as f:
            f.write(json.dumps(sale) + '\n')
        
        return sale
    
    def _estimate_price(self, lead):
        """Estimate deal value"""
        budget = lead.get('budget', 0)
        if budget > 0:
            return budget * 0.8  # Slightly under budget
        return 500  # Default
    
    def _notify_collection(self, sale):
        """Notify about sale (simulate for now)"""
        import requests
        bot_token = os.environ.get('BOT_TOKEN', '')
        chat_id = '7456504966'
        
        message = f"""💰 SALE CLOSED (Simulated)

Lead: {sale['lead_title'][:50]}
Source: {sale['source']}
Amount: ${sale['amount']}
Status: {sale['status']}

Payment link sent to client."""
        
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data={"chat_id": chat_id, "text": message},
                timeout=10
            )
        except:
            pass
    
    def run(self):
        """Main closer loop"""
        print(f"[{datetime.now()}] Closer agent starting...")
        
        while True:
            job = self.load_next_sale()
            if job:
                try:
                    lead = job.get('lead', {})
                    asset = job.get('asset', {})
                    
                    print(f"[{datetime.now()}] Closing sale for {lead.get('id', 'unknown')}")
                    
                    # Generate pitch
                    pitch = self.generate_pitch(asset, lead)
                    
                    # Simulate sale (in production, sends email/waits)
                    sale = self.simulate_sale(lead, asset)
                    
                    # Notify
                    self._notify_collection(sale)
                    
                except Exception as e:
                    print(f"Close failed: {e}")
            
            time.sleep(120)  # Check every 2 minutes

if __name__ == '__main__':
    agent = CloserAgent()
    agent.run()
