# Agentic RAG — Predictive Maintenance Assistant

An agentic RAG system for industrial predictive maintenance, built with
**LangGraph**. Instead of a fixed retrieve-then-generate pipeline, the
agent decides for itself which source of information a question needs —
past maintenance records, live sensor readings, or documented failure
thresholds — and can automatically flag a machine for inspection when
a failure pattern is detected.

## Why agentic, not plain RAG

A normal RAG pipeline always retrieves, every time, regardless of the
question. This agent instead reasons first:

```
User question
     │
     ▼
   [ LLM ]  ── decides which tool(s) it needs ──▶  retriever_tool
     │                                              sensor_check_tool
     │                                              get_threshold_tool
     │                                              list_machines_tool
     ▼
 [ Reason over results ]
     │
     ▼
 Failure pattern detected? ──▶ escalate (flag for inspection)
     │
     ▼
  Final answer
```

## Tools

| Tool | Purpose | Data source |
|---|---|---|
| `retriever_tool` | Semantic search over maintenance logs for context/history | Chroma vector store (RAG) |
| `sensor_check_tool` | Compares a machine's latest sensor reading against failure thresholds | `data/sensor_data.csv` |
| `get_threshold_tool` | Reports the failure thresholds used for detection | Config in `tools.py` |
| `list_machines_tool` | Lists all machine IDs in the dataset | `data/maintenance_logs.csv` |

Numeric/structured lookups (thresholds, machine lists, sensor checks)
are deliberately **not** routed through RAG — semantic retrieval is
approximate, and exact values need a deterministic lookup instead.

## Project structure

```
manufacturing-rag-agent/
├── main.py                 # entry point — run this to chat with the agent
├── ingest.py                # run once to build the vector store from maintenance logs
├── requirements.txt
├── src/
│   ├── agent/
│   │   ├── state.py         # AgentState schema (messages, machine_id, sensor_result, escalate)
│   │   ├── nodes.py         # call_llm, take_action, check_escalate, escalate_node
│   │   └── graph.py         # LangGraph StateGraph wiring + conditional routing
│   └── tools/
│       └── tools.py         # retriever_tool, sensor_check_tool, get_threshold_tool, list_machines_tool
├── data/
│   ├── maintenance_logs.csv # synthetic maintenance history per machine
│   └── sensor_data.csv      # synthetic sensor readings per machine
└── tests/
```

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Pull the required Ollama models (LLM + embeddings run locally):
   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```
   Make sure Ollama is running (`ollama serve`) before starting the agent.

3. Build the vector store (run once, or whenever the logs change):
   ```bash
   python ingest.py
   ```

4. Run the agent:
   ```bash
   python main.py
   ```

## Example questions

- "How many machines are there in the data?"
- "What is the maintenance history for M03?"
- "Is M07 currently in an anomaly state?"
- "What are the failure thresholds?"

## Design notes

- **Conversation memory** is handled via LangGraph's `MemorySaver`
  checkpointer, keyed by `thread_id` — no manual message-list tracking.
- **Escalation** is a separate graph node, not baked into the LLM's
  reasoning — it deterministically checks the sensor tool's output for
  an `ANOMALY` flag before deciding whether to alert.
- Embedding model must stay identical between `ingest.py` and
  `src/tools/tools.py`, or retrieval quality silently degrades.
