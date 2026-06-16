from components.swarm.swarm_graph import SwarmGraph
from components.swarm.dispatcher import Dispatcher

class BuildMode:
    """
    DAG Configuration for Software/Website Building Tasks.
    Queen delegates to Architect, Frontend, Backend, and Reviewer.
    """
    def __init__(self, dispatcher: Dispatcher):
        self.graph = SwarmGraph(dispatcher)
        self._build_graph()

    def _build_graph(self):
        # 1. Architect defines spec
        self.graph.add_node("Architect", "Draft technical spec", brain="claude", tier="complex", skill_file="build/tech-spec-writer.md")
        
        # 2. Frontend Dev
        self.graph.add_node("Frontend_Dev", "Generate React components", brain="gemini", tier="medium", skill_file="build/react-dev.md")
        
        # 3. Backend Dev
        self.graph.add_node("Backend_Dev", "Generate backend/schema", brain="gemini", tier="medium", skill_file="build/backend-dev.md")
        
        # 4. Reviewer
        self.graph.add_node("Reviewer", "Quality gate", brain="claude", tier="complex", skill_file="build/code-reviewer.md")

        # Directional flows (as described in blueprint)
        self.graph.add_edge("Architect", "Frontend_Dev")
        self.graph.add_edge("Architect", "Backend_Dev")
        self.graph.add_edge("Frontend_Dev", "Reviewer")
        self.graph.add_edge("Backend_Dev", "Reviewer")

    def run(self, project_reqs: str):
        print(f"[Build Mode] Initiating build swarm for: {project_reqs}")
        return self.graph.execute(project_reqs)
