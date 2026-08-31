from langchain_core.messages import SystemMessage, ToolMessage, AIMessage
from langchain_ollama import ChatOllama
from state import AgentState
from tools import tools, tools_dict


llm = ChatOllama(model="llama3.2", temperature=0)
llm = llm.bind_tools(tools)


SYSTEM_PROMPT = """
You are a predictive maintenance assistant for factory equipment.

You have these tools available:
- retriever_tool: search maintenance manuals and past maintenance logs
  for explanations, history, or context about an issue
- sensor_check_tool: check a machine's current sensor readings against
  failure thresholds
- get_threshold_tool: look up the safe operating thresholds for a machine
- list_machines_tool: list all machine IDs present in the data — use
  this whenever the question asks "which machines" or "how many
  machines" rather than searching manuals for it

When presenting information from tools, summarize it in clear, natural
language — don't just dump raw data. Speak like you're explaining it 
to a maintenance engineer, not printing a report.

If the user asks multiple things in one question (e.g. count, names,
AND thresholds), make sure to call all the tools needed to answer 
every part of the question before giving your final answer — don't 
stop after just one tool call if more information is still needed.


Answer the most recent user question. Conversation history is context only:
do not repeat a previous answer unless the newest question explicitly asks
about it. For fleet counts or machine names, use list_machines_tool and give
the exact result. Mention a machine ID only when the answer concerns a
specific machine, and state whether the answer is based on past records,
current sensor data, or threshold specifications.

Decide which tool(s) you need based on the newest question. You may call
multiple tools in sequence, or none if you can already answer from the
conversation so far.
"""

def call_llm(state: AgentState) -> AgentState:
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(state["messages"])
    response = llm.invoke(messages)
    return {"messages": [response]}


def should_continue(state: AgentState) -> bool:
    last = state["messages"][-1]
    return hasattr(last, "tool_calls") and len(last.tool_calls) > 0

# should_continue() isliye banaya hai taaki LangGraph
# ko decide kar sake ki abhi process ko aage chalana hai ya stop karna hai.

# Basically ye check karta hai:
# "LLM ne koi tool use karne ko bola hai kya?"
# Haan → True → Tool node pe jao
# Nahi → False → Process END karo



def take_action(state: AgentState) -> AgentState:
    tool_calls = state["messages"][-1].tool_calls
    results = []
    machine_id = state.get("machine_id", "")
    sensor_result = state.get("sensor_result", "")
    for call in tool_calls:
        name = call["name"]
        args = call["args"]
        if name not in tools_dict:
            output = f"Tool '{name}' does not exist."
        else:
            output = tools_dict[name].invoke(args)

        if name == "sensor_check_tool":
            sensor_result = output
            machine_id = args.get("machine_id", machine_id)

        results.append(
            ToolMessage(tool_call_id=call["id"], name=name, content=str(output))
        )

    return {"messages": results, "machine_id": machine_id, "sensor_result": sensor_result}
# Multiple tools hon toh?
# Suppose LLM ne bola:

# 1. retriever_tool
# 2. sensor_check_tool

# Loop:
# for call in tool_calls
# pehle:
# retriever_tool
#    ↓
# execute
#    ↓
# result
#    ↓
# ToolMessage
# -------
# phir:

# sensor_check_tool
#    ↓
# execute
#    ↓
# result
#    ↓
# ToolMessage


def check_escalate(state: AgentState) -> AgentState:
    sensor_result = state.get("sensor_result", "")
    escalate = sensor_result.startswith("ANOMALY")
    return {"escalate": escalate}

# check_escalate() sensor result dekhkar ek simple True/False flag banata hai, 
# taaki LangGraph decide kar sake ki machine issue ko escalate karna hai 
# ya normal flow se end karna hai.



def route_after_escalate(state: AgentState) -> bool:
    return state.get("escalate", False)

# route_after_escalate()
# Us decision ko graph tak pahunchata hai:

# True → escalation
# False → END



def escalate_node(state: AgentState) -> AgentState:
    machine_id = state.get("machine_id", "unknown machine")
    alert = AIMessage(
        content=f"[ALERT] {machine_id} has crossed a failure threshold. "
        f"Flagging for inspection by the maintenance team."
    )
    return {"messages": [alert]}


























