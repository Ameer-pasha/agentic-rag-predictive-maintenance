/** Shared types mirroring the FastAPI backend contract. */

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  thread_id: string;
}

export interface ChatResponse {
  answer: string;
  tool_calls: ToolCall[];
  escalate: boolean;
  machine_id: string | null;
}

export interface MachinesResponse {
  machines: string[];
}

export type MachineState = "normal" | "anomaly";

export interface MachineStatus {
  machine_id: string;
  status: MachineState;
  details: string;
}

export interface HistoryEntry {
  date: string;
  issue: string;
  diagnosis: string;
  fix: string;
  outcome: string;
}

export interface MachineHistory {
  machine_id: string;
  entries: HistoryEntry[];
}
