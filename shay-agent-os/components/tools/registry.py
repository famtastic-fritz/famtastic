"""
Multi-provider tool registry (Phase 3A) — define a tool ONCE, serialize it for
any brain provider's schema. Stolen conceptually from blackbox-poc's
tool_registry: 72 tools defined once, formatted per provider. Lets Shay stay
brain-agnostic (Claude / OpenAI / Gemini / MCP) without re-declaring tools per
vendor — the core of cap-resilience (when one brain caps, the same tools work
on the next).

Usage:
    from tools.registry import ToolRegistry, tool

    reg = ToolRegistry()
    reg.register(
        name="search_vault",
        description="Search Shay's Obsidian vault for notes matching a query.",
        params={
            "query": {"type": "string", "description": "Search text", "required": True},
            "k": {"type": "integer", "description": "Max results", "default": 5},
        },
        handler=lambda query, k=5: do_search(query, k),
    )
    anthropic_tools = reg.serialize("anthropic")
    openai_tools    = reg.serialize("openai")
    gemini_tools    = reg.serialize("gemini")
    mcp_tools       = reg.serialize("mcp")
    result = reg.invoke("search_vault", {"query": "brand voice"})
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

_JSON_TYPES = {"string", "integer", "number", "boolean", "object", "array"}


@dataclass
class ToolSpec:
    name: str
    description: str
    params: Dict[str, Dict[str, Any]]  # name -> {type, description, required?, default?, enum?}
    handler: Optional[Callable] = None

    def _json_schema(self) -> Dict[str, Any]:
        """The provider-neutral JSON Schema for this tool's parameters."""
        props, required = {}, []
        for pname, p in self.params.items():
            t = p.get("type", "string")
            if t not in _JSON_TYPES:
                t = "string"
            prop: Dict[str, Any] = {"type": t}
            if p.get("description"):
                prop["description"] = p["description"]
            if "enum" in p:
                prop["enum"] = p["enum"]
            if t == "array" and "items" in p:
                prop["items"] = p["items"]
            props[pname] = prop
            if p.get("required"):
                required.append(pname)
        schema: Dict[str, Any] = {"type": "object", "properties": props}
        if required:
            schema["required"] = required
        return schema


class ToolRegistry:
    """Define tools once; serialize per provider; invoke by name."""

    def __init__(self):
        self._tools: Dict[str, ToolSpec] = {}

    def register(self, name: str, description: str,
                 params: Optional[Dict[str, Dict[str, Any]]] = None,
                 handler: Optional[Callable] = None) -> None:
        if name in self._tools:
            raise ValueError(f"tool already registered: {name}")
        self._tools[name] = ToolSpec(name, description, params or {}, handler)

    def names(self) -> List[str]:
        return sorted(self._tools)

    def serialize(self, provider: str) -> List[Dict[str, Any]]:
        """Format every tool for the given provider's schema.
        Providers: anthropic, openai, gemini, mcp."""
        provider = (provider or "").lower()
        out = []
        for t in self._tools.values():
            schema = t._json_schema()
            if provider == "anthropic":
                out.append({"name": t.name, "description": t.description,
                            "input_schema": schema})
            elif provider in ("openai", "codex", "gpt"):
                out.append({"type": "function", "function": {
                    "name": t.name, "description": t.description,
                    "parameters": schema}})
            elif provider == "gemini":
                # Gemini omits an empty properties object's "required"; it also
                # uses "parameters" with the same JSON-schema shape.
                out.append({"name": t.name, "description": t.description,
                            "parameters": schema})
            elif provider == "mcp":
                out.append({"name": t.name, "description": t.description,
                            "inputSchema": schema})
            else:
                raise ValueError(f"unknown provider: {provider}")
        return out

    def invoke(self, name: str, args: Optional[Dict[str, Any]] = None) -> Any:
        t = self._tools.get(name)
        if not t:
            raise KeyError(f"no such tool: {name}")
        if not t.handler:
            raise ValueError(f"tool {name} has no handler")
        return t.handler(**(args or {}))


# A module-level default registry for convenience.
default_registry = ToolRegistry()


def tool(name: str, description: str, params: Optional[Dict] = None):
    """Decorator: register a function as a tool on the default registry."""
    def deco(fn: Callable) -> Callable:
        default_registry.register(name, description, params, fn)
        return fn
    return deco
