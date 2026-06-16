from components.swarm.swarm_graph import SwarmGraph
from components.swarm.dispatcher import Dispatcher

class ResearchMode:
    """
    DAG Configuration for Research / Info-Gathering Tasks.
    Queen delegates to Searchers, Analyzers, and Synthesizers.
    """
    def __init__(self, dispatcher: Dispatcher):
        self.graph = SwarmGraph(dispatcher)
        self._build_graph()

    def _build_graph(self):
        # 1. Queen (Orchestrator) defines search queries
        self.graph.add_node("Queen", "Decompose research goal", brain="claude", tier="complex")
        
        # 2. Worker (Searcher) hits APIs/Web
        self.graph.add_node("Web_Searcher", "Execute search and fetch content", brain="gemini", tier="medium", skill_file="research/web-search.md")
        
        # 3. Worker (Synthesizer) condenses findings
        self.graph.add_node("Synthesizer", "Summarize findings", brain="ollama", tier="medium", skill_file="research/summarizer.md")

        # Explicit directed flows
        self.graph.add_edge("Queen", "Web_Searcher")
        self.graph.add_edge("Web_Searcher", "Synthesizer")
        self.graph.add_edge("Synthesizer", "Queen")  # Synthesis goes back to Queen for Review

    def run(self, topic: str):
        print(f"[Research Mode] Initiating swarm for topic: {topic}")
        return self.graph.execute(topic)
