import { Workflow } from "lucide-react";
import { API_BASE } from "@/lib/api";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-md border border-white/10 bg-white/[0.04]">
            <Workflow className="size-3 text-slate-400" strokeWidth={1.8} />
          </span>
          <p className="font-mono text-xs text-slate-500">
            Agentic RAG — FastAPI · LangGraph · Ollama (llama3.2) · Chroma ·
            nomic-embed-text
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-slate-600">
            API → {API_BASE.replace(/^https?:\/\//, "")}
          </span>
          <span className="hidden text-slate-700 md:inline">·</span>
          <span className="font-mono text-[11px] text-slate-500">
            fully on-prem — no API keys
          </span>
        </div>
      </div>
    </footer>
  );
}
