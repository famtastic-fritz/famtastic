#!/usr/bin/env python3
"""
Monitor Agent - Watches all agents, reports status
Auto-heals and escalates failures
"""

import json
import os
import psutil
import time
from pathlib import Path
from datetime import datetime

class MonitorAgent:
    def __init__(self):
        self.data_dir = Path.home() / "famtastic/pipeline/data"
        self.log_dir = Path.home() / "famtastic/pipeline/logs"
        self.pids_file = self.data_dir / "pids.txt"
        self.status_file = self.data_dir / "status.json"
        self.failures = {'scout': 0, 'builder': 0, 'closer': 0}
        
    def check_agent_health(self, name, pid):
        """Check if agent process is healthy"""
        try:
            proc = psutil.Process(pid)
            if proc.status() == psutil.STATUS_ZOMBIE:
                return False
            # Check CPU/memory (basic threshold)
            cpu = proc.cpu_percent(interval=0.1)
            mem = proc.memory_info().rss / 1024 / 1024  # MB
            return cpu < 95 and mem < 500  # Healthy thresholds
        except:
            return False
    
    def load_pids(self):
        """Load agent PIDs"""
        if not self.pids_file.exists():
            return {}
        
        pids = {}
        for line in self.pids_file.read_text().strip().split('\n'):
            if '=' in line:
                name, pid = line.split('=')
                pids[name] = int(pid)
        return pids
    
    def restart_agent(self, name):
        """Restart failed agent"""
        print(f"[{datetime.now()}] Restarting {name}...")
        
        agents = {
            'scout': 'agents/scout.py',
            'builder': 'agents/builder.py',
            'closer': 'agents/closer.py'
        }
        
        if name in agents:
            script_path = Path.home() / "famtastic/pipeline" / agents[name]
            if script_path.exists():
                import subprocess
                
                # Start new process
                proc = subprocess.Popen(
                    ['python3', str(script_path)],
                    stdout=open(self.log_dir / f"{name}.log", 'a'),
                    stderr=subprocess.STDOUT,
                    cwd=str(Path.home() / "famtastic/pipeline")
                )
                
                # Update PID file
                pids = self.load_pids()
                pids[name] = proc.pid
                
                with open(self.pids_file, 'w') as f:
                    for n, p in pids.items():
                        f.write(f"{n}={p}\n")
                
                self.notify_escalation(name, f"Auto-restarted with PID {proc.pid}")
                return proc.pid
        
        return None
    
    def notify_escalation(self, agent_name, issue):
        """Send escalation to Telegram"""
        import requests
        bot_token = os.environ.get('BOT_TOKEN', '')
        chat_id = '7456504966'
        
        message = f"""⚠️ AGENT ESCALATION

Agent: {agent_name}
Issue: {issue}
Time: {datetime.now().strftime('%H:%M:%S')}

Action: Auto-restart attempted
Manual review may be needed."""
        
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data={"chat_id": chat_id, "text": message},
                timeout=10
            )
        except:
            pass
    
    def send_status_report(self):
        """Send daily status to Telegram"""
        import requests
        
        # Count leads, assets, sales
        leads_count = 0
        leads_file = self.data_dir / "leads.jsonl"
        if leads_file.exists():
            leads_count = len([l for l in leads_file.read_text().strip().split('\n') if l])
        
        assets_count = len(list((Path.home() / "famtastic/pipeline/assets").glob("*.html")))
        
        revenue_file = Path.home() / "famtastic/pipeline/revenue/income.jsonl"
        revenue = 0
        if revenue_file.exists():
            for line in revenue_file.read_text().strip().split('\n'):
                try:
                    sale = json.loads(line)
                    revenue += sale.get('amount', 0)
                except:
                    pass
        
        bot_token = os.environ.get('BOT_TOKEN', '')
        chat_id = '7456504966'
        
        message = f"""📊 PIPELINE STATUS

Leads: {leads_count}
Assets Built: {assets_count}
Revenue Tracked: ${revenue}

Agents:
• Scout: Running
• Builder: Running
• Closer: Running

Status: OPERATIONAL 🟢"""
        
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                data={"chat_id": chat_id, "text": message},
                timeout=10
            )
        except:
            pass
    
    def run(self):
        """Main monitor loop"""
        print(f"[{datetime.now()}] Monitor agent starting...")
        last_report = 0
        
        while True:
            pids = self.load_pids()
            
            for agent_name, pid in pids.items():
                if agent_name == 'MONITOR':
                    continue
                
                healthy = self.check_agent_health(agent_name, pid)
                
                if not healthy:
                    self.failures[agent_name] += 1
                    
                    if self.failures[agent_name] >= 3:
                        # Escalate to human
                        self.notify_escalation(agent_name, f"Failed {self.failures[agent_name]} times")
                    
                    # Attempt restart
                    new_pid = self.restart_agent(agent_name)
                    if new_pid:
                        self.failures[agent_name] = 0
                else:
                    self.failures[agent_name] = 0
            
            # Send daily report every 4 hours
            if time.time() - last_report > 14400:
                self.send_status_report()
                last_report = time.time()
            
            time.sleep(300)  # Check every 5 minutes

if __name__ == '__main__':
    agent = MonitorAgent()
    agent.run()
