from langgraph.graph import StateGraph, END
from state import AgentState
from nodes import (call_llm, take_action, should_continue, check_escalate, route_after_escalate, escalate_node)
from langgraph.checkpoint.memory import MemorySaver


graph = StateGraph(AgentState)


graph.add_node("llm", call_llm)
graph.add_node("take_action", take_action)
graph.add_node("check_escalate", check_escalate)
graph.add_node("escalate", escalate_node)



graph.set_entry_point("llm")

graph.add_conditional_edges(
    "llm",
    should_continue,
    {True: "take_action", False: "check_escalate"},
)

graph.add_edge("take_action", "llm")

graph.add_conditional_edges(
    "check_escalate",
    route_after_escalate,
    {True: "escalate", False: END},
)

graph.add_edge("escalate", END)

memory = MemorySaver()
agent = graph.compile(checkpointer=memory)


