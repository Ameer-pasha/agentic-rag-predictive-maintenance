import os
import pandas as pd
from langchain_core.tools import tool
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

PERSIST_DIR = "chroma_store"
COLLECTION_NAME = "maintenance-docs"
SENSOR_CSV = "data/sensor_data.csv"

THRESHOLDS = {
    "air_temperature": 303.0,
    "process_temperature": 313.0,
    "rotational_speed": 2500.0,
    "torque": 60.0,
    "tool_wear": 200.0,
}

# Must match the embedding model used in ingest.py exactly
embeddings = OllamaEmbeddings(model="nomic-embed-text")

_vectorstore = None


def _get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        if not os.path.exists(PERSIST_DIR):
            raise FileNotFoundError(
                f"No vector store found at '{PERSIST_DIR}'. Run ingest.py first."
            )
        _vectorstore = Chroma(
            persist_directory=PERSIST_DIR,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
    return _vectorstore


@tool
def retriever_tool(query: str) -> str:
    """Search maintenance manuals and past maintenance logs for information
    relevant to the query."""
    retriever = _get_vectorstore().as_retriever(search_kwargs={"k": 4})
    docs = retriever.invoke(query)

    if not docs:
        return "No relevant maintenance records or manual sections found."

    return "\n\n".join(
        f"Record {i + 1}:\n{doc.page_content}" for i, doc in enumerate(docs)
    )


@tool
def sensor_check_tool(machine_id: str) -> str:
    """Check the current sensor readings for a given machine ID against
    known failure thresholds."""
    if not os.path.exists(SENSOR_CSV):
        return f"No sensor data file found at '{SENSOR_CSV}'."

    df = pd.read_csv(SENSOR_CSV)
    row = df[df["machine_id"] == machine_id]

    if row.empty:
        return f"No sensor data found for machine '{machine_id}'."

    row = row.iloc[-1]
    breaches = []
    for column, limit in THRESHOLDS.items():
        if column in row and row[column] > limit:
            breaches.append(f"{column}={row[column]} (threshold {limit})")

    if breaches:
        return f"ANOMALY for {machine_id}: " + "; ".join(breaches)
    return f"NORMAL: {machine_id} readings are within safe thresholds."

@tool
def list_machines_tool(_: str = "") -> str:
    """List all machine IDs present in the maintenance data."""
    df = pd.read_csv("data/maintenance_logs.csv")
    machine_ids = sorted(df["machine_id"].unique())
    return f"Machines in the data: {', '.join(machine_ids)}"


from typing import Optional

@tool
def get_threshold_tool(machine_id: Optional[str] = None) -> str:
    """Look up the safe operating thresholds used for failure detection."""
    return "Thresholds (same for all machines): " + ", ".join(
        f"{col}={val}" for col, val in THRESHOLDS.items()
    )


tools = [retriever_tool, sensor_check_tool, get_threshold_tool, list_machines_tool]
tools_dict = {t.name: t for t in tools}










# Proper tarika — LangGraph ka built-in memory (Checkpointer)
# LangGraph mein iske liye already ek feature hai — MemorySaver. Ye automatically conversation history track karta hai, per "thread" (jaise ek user ki ek session), bina tumhe manually list manage kiye:

# python
# from langgraph.checkpoint.memory import MemorySaver

# memory = MemorySaver()
# agent = graph.compile(checkpointer=memory)

# # call karte waqt ek thread_id dena hota hai
# config = {"configurable": {"thread_id": "session-1"}}
# result = agent.invoke({"messages": [HumanMessage(content=query)]}, config=config)





# # Isse LangGraph khud state ko save/load karta rehta hai us thread_id ke against — 
# # agli baar same thread_id se call karo, purana context automatically mil jayega.
# #  Ye production-grade tarika hai, aur interview mein bhi achha lagega ki 
# # tumne LangGraph ka checkpointing feature use kiya, khud se list track nahi kiya.

# # Abhi ke liye recommendation: agar demo/portfolio ke liye kaam kar rahe ho, 
# # option 2 (MemorySaver) use karo — ye proper way hai aur LangGraph ka core 
# # feature dikhata hai. Chahiye to main tumhara main.py aur graph.py update kar 
# # deta hoon isko integrate karke?