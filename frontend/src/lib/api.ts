import type {
  ChatResponse,
  MachineHistory,
  MachineStatus,
  MachinesResponse,
} from "./types";

/**
 * The FastAPI backend runs locally (FastAPI + LangGraph + Ollama).
 * Override with VITE_API_URL when deploying.
 */
export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8010";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      throw new ApiError(
        `Backend responded with ${res.status} ${res.statusText}`.trim(),
        res.status,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — the agent may still be thinking.");
    }
    throw new ApiError(
      `Could not reach the agent at ${API_BASE}. Is the FastAPI server running?`,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  /** Local LLM inference can take a while → generous timeout. */
  chat: (message: string, thread_id: string) =>
    request<ChatResponse>(
      "/chat",
      { method: "POST", body: JSON.stringify({ message, thread_id }) },
      180_000,
    ),
  machines: () => request<MachinesResponse>("/machines"),
  status: (machineId: string) =>
    request<MachineStatus>(`/machines/${encodeURIComponent(machineId)}/status`),
  history: (machineId: string) =>
    request<MachineHistory>(`/machines/${encodeURIComponent(machineId)}/history`),
};

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
