from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from components.swarm.dispatcher import DispatchTask, DispatchResult, Dispatcher

@dataclass
class SwarmNode:
    name: str
    role: str
    skill_file: Optional[str] = None
    brain: str = "auto"
    tier: str = "medium"

@dataclass
class SwarmEdge:
    from_node: str
    to_node: str

class SwarmGraph:
    """
    Implements the Agency/GPTSwarm directional graph logic (Queen -> DAG).
    Defines explicit execution flows rather than unconstrained mesh chat.
    """
    def __init__(self, dispatcher: Dispatcher):
        self.dispatcher = dispatcher
        self.nodes: Dict[str, SwarmNode] = {}
        self.edges: List[SwarmEdge] = []

    def add_node(self, name: str, role: str, skill_file: str = None, brain: str = "auto", tier: str = "medium"):
        self.nodes[name] = SwarmNode(name=name, role=role, skill_file=skill_file, brain=brain, tier=tier)

    def add_edge(self, from_node: str, to_node: str):
        if from_node not in self.nodes or to_node not in self.nodes:
            raise ValueError(f"Nodes must exist before adding edge: {from_node} -> {to_node}")
        self.edges.append(SwarmEdge(from_node, to_node))

    def execute(self, initial_goal: str) -> Dict[str, DispatchResult]:
        """
        Executes the graph. In a real implementation, this would do topological sort 
        and execute tasks dynamically passing output of parent to child.
        """
        # Stub implementation for scaffold
        results = {}
        for name, node in self.nodes.items():
            task = DispatchTask(
                id=f"task_{name}",
                prompt=f"Goal: {initial_goal}\nExecute your role: {node.role}",
                brain=node.brain,
                tier=node.tier,
                skill_file=node.skill_file
            )
            # Dispatch synchronously for demo, should be topological walk
            result_list = self.dispatcher.fan_out([task])
            results[name] = result_list[0] if result_list else None
        return results
