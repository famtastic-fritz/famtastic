from components.swarm.swarm_graph import SwarmGraph
from components.swarm.dispatcher import Dispatcher

class RevenueMode:
    """
    DAG Configuration for Revenue Generation Tasks (e.g. Upwork proposals, lead gen).
    Queen delegates to Lead Sourcer, Proposal Writer, and Output Reviewer.
    """
    def __init__(self, dispatcher: Dispatcher):
        self.graph = SwarmGraph(dispatcher)
        self._build_graph()

    def _build_graph(self):
        # 1. Strategy/Queen
        self.graph.add_node("Strategy", "Identify revenue angle", brain="claude", tier="complex", skill_file="revenue/strategy.md")
        
        # 2. Worker (Sourcer)
        self.graph.add_node("Sourcer", "Find leads / gigs", brain="gemini", tier="medium", skill_file="revenue/lead-sourcer.md")
        
        # 3. Worker (Writer)
        self.graph.add_node("Proposal_Writer", "Draft tailored proposals", brain="gemini", tier="medium", skill_file="revenue-plans/upwork/proposal-template.md")

        # Explicit flows
        self.graph.add_edge("Strategy", "Sourcer")
        self.graph.add_edge("Sourcer", "Proposal_Writer")
        self.graph.add_edge("Proposal_Writer", "Strategy") # Queen/Strategy reviews the drafted proposal

    def run(self, target: str):
        print(f"[Revenue Mode] Initiating revenue swarm for: {target}")
        return self.graph.execute(target)
