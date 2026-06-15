import os
from pathlib import Path
from typing import Dict, Any, Optional

class SkillInjector:
    """
    Handles hot-loading of Vercel/agentskills.io compatible SKILL.md files.
    Constructs the exact, narrowed context a blank-slate worker needs.
    """
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = Path(skills_dir)

    def load_skill(self, skill_path: str) -> Optional[str]:
        """Loads a SKILL.md from the local filesystem."""
        full_path = self.skills_dir / skill_path
        if full_path.exists() and full_path.is_file():
            return full_path.read_text(encoding="utf-8")
        return None

    def build_worker_context(self, system_prompt: str, task: str, skill_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates the injected context for a dynamic worker.
        """
        skill_content = ""
        if skill_path:
            content = self.load_skill(skill_path)
            if content:
                skill_content = f"\n\n--- INJECTED SKILL ---\n{content}\n----------------------\n"
        
        final_prompt = f"{system_prompt}{skill_content}\nTask: {task}"
        
        return {
            "final_prompt": final_prompt,
            "has_skill": bool(skill_content)
        }
