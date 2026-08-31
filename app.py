from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from pydantic import BaseModel


PROJECT_ROOT = Path(__file__).resolve().parent
MAINTENANCE_LOGS = PROJECT_ROOT / "data" / "maintenance_logs.csv"


app = FastAPI(title="Manufacturing Agentic RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "session-1"


class ToolCall(BaseModel):
    name: str
    args: dict[str, Any]


class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCall]
    escalate: bool
    machine_id: str | None


class MachinesResponse(BaseModel):
    machines: list[str]


class MachineStatus(BaseModel):
    machine_id: str
    status: str
    details: str


class HistoryEntry(BaseModel):
    date: str
    issue: str
    diagnosis: str
    fix: str
    outcome: str


class MachineHistory(BaseModel):
    machine_id: str
    entries: list[HistoryEntry]


def _tool_calls(messages: list[Any]) -> list[ToolCall]:
    calls: list[ToolCall] = []
    for message in messages:
        for call in getattr(message, "tool_calls", []) or []:
            calls.append(
                ToolCall(
                    name=call.get("name", ""),
                    args=call.get("args", {}) or {},
                )
            )
    return calls


def _maintenance_data() -> pd.DataFrame:
    if not MAINTENANCE_LOGS.exists():
        raise HTTPException(status_code=404, detail="Maintenance logs are missing")
    return pd.read_csv(MAINTENANCE_LOGS)


def _require_machine(machine_id: str) -> None:
    machine_ids = set(_maintenance_data()["machine_id"].dropna())
    if machine_id not in machine_ids:
        raise HTTPException(status_code=404, detail=f"Unknown machine: {machine_id}")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    from graph import agent

    config = {"configurable": {"thread_id": request.thread_id}}
    previous_state = agent.get_state(config)
    previous_messages = list(previous_state.values.get("messages", []))

    result = agent.invoke(
        {
            "messages": [HumanMessage(content=request.message)],
            "machine_id": "",
            "sensor_result": "",
            "escalate": False,
        },
        config=config,
    )

    messages = list(result["messages"])
    turn_messages = messages[len(previous_messages) :]
    answer_message = next(
        (
            message
            for message in reversed(turn_messages)
            if getattr(message, "type", "") == "ai" and str(message.content).strip()
        ),
        messages[-1],
    )

    return ChatResponse(
        answer=str(answer_message.content),
        tool_calls=_tool_calls(turn_messages),
        escalate=bool(result.get("escalate", False)),
        machine_id=result.get("machine_id") or None,
    )


@app.get("/machines", response_model=MachinesResponse)
def machines() -> MachinesResponse:
    machine_ids = sorted(_maintenance_data()["machine_id"].dropna().unique().tolist())
    return MachinesResponse(machines=machine_ids)


@app.get("/machines/{machine_id}/status", response_model=MachineStatus)
def machine_status(machine_id: str) -> MachineStatus:
    _require_machine(machine_id)

    from tools import sensor_check_tool

    details = str(sensor_check_tool.invoke({"machine_id": machine_id}))
    status = "anomaly" if details.startswith("ANOMALY") else "normal"
    return MachineStatus(machine_id=machine_id, status=status, details=details)


@app.get("/machines/{machine_id}/history", response_model=MachineHistory)
def machine_history(machine_id: str) -> MachineHistory:
    _require_machine(machine_id)
    rows = _maintenance_data().query("machine_id == @machine_id")
    entries = [
        HistoryEntry(
            date=str(row.date),
            issue=str(row.issue),
            diagnosis=str(row.diagnosis),
            fix=str(row.fix),
            outcome=str(row.outcome),
        )
        for row in rows.itertuples(index=False)
    ]
    return MachineHistory(machine_id=machine_id, entries=entries)
