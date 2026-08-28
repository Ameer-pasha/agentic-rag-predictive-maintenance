from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    machine_id: str
    sensor_result:str
    escalate: bool


# messages — sabse zaroori field. Poori conversation (user query, LLM ke tool-call decisions, tool results — ToolMessage ke through)
# yahin store hoti hai. Har node isko padhta/update karta hai. add_messages ka matlab hai naye messages append honge, 
# purane overwrite nahi honge.


# machine_id — jab user "Machine 12 mein noise hai" jaisa kuch bole, LLM/planner isme se ID nikaal ke yahan daalega, 
# taaki sensor tool ko pata chale konsi machine check karni hai. (Simple approach: shuru mein LLM se hi extract karwa lo, 
# ya agar time bache to regex se bhi nikal sakte ho baad mein.)


# sensor_result — sensor tool ka output ("normal" ya "anomaly: temperature 98°C, threshold 85°C") yahan store hoga, 
# taaki final reasoning step ismein se dekh sake failure hai ya nahi.



# escalate — boolean, True/False. Conditional edge isko check karega decide karne ke liye: "Flag for inspection"
# node pe jaana hai ya seedha final answer pe
