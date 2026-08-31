import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Bot,
  Check,
  Database,
  Gauge,
  History,
  ListChecks,
  Loader2,
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { api, sleep, uid } from "@/lib/api";
import type { ToolCall } from "@/lib/types";
import { BorderTrail } from "@/components/motion/BorderTrail";
import { TextEffect } from "@/components/motion/TextEffect";
import { SPRING } from "@/components/ui";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* types & helpers                                                     */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  escalate?: boolean;
  machineId?: string | null;
}

interface PendingTrace {
  tools: ToolCall[];
  shown: number;
}

interface StoredChatSession {
  threadId: string;
  messages: ChatMessage[];
}

const CHAT_SESSION_KEY = "manufacturing-rag-chat-session-v2";

function loadChatSession(): StoredChatSession {
  try {
    const stored = window.sessionStorage.getItem(CHAT_SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored) as Partial<StoredChatSession>;
      if (typeof session.threadId === "string" && Array.isArray(session.messages)) {
        return { threadId: session.threadId, messages: session.messages };
      }
    }
  } catch {
    // Browser storage is optional; an invalid saved value starts a fresh chat.
  }

  return { threadId: uid(), messages: [] };
}

const TOOL_ICONS: Record<string, typeof Database> = {
  retriever_tool: Database,
  sensor_check_tool: Gauge,
  get_threshold_tool: SlidersHorizontal,
  list_machines_tool: ListChecks,
  get_machine_history_tool: History,
};

const toolIcon = (name: string) => TOOL_ICONS[name] ?? Wrench;

const toolHint = (name: string) =>
  ({
    retriever_tool: "Searching maintenance logs",
    sensor_check_tool: "Checking live sensor data",
    get_threshold_tool: "Reading failure thresholds",
    list_machines_tool: "Indexing the fleet",
    get_machine_history_tool: "Pulling machine history",
  })[name] ?? "Running tool";

function formatArgs(args: Record<string, unknown>, max = 48): string {
  const s = Object.entries(args)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/* ------------------------------------------------------------------ */
/* lightweight answer formatter (paragraphs, lists, `code`, **bold**)  */
/* ------------------------------------------------------------------ */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={key} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={key}
          className="rounded-md border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function AnswerText({ text }: { text: string }) {
  const blocks = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean),
    [text],
  );
  return (
    <div className="space-y-3 text-[0.925rem] leading-relaxed text-slate-300">
      {blocks.map((block, bi) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const isList =
          lines.length > 1 &&
          lines.every((l) => /^[-•]/.test(l) || /^\d+[.)]/.test(l));
        if (isList) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.map((line, li) => (
                <li key={li} className="flex items-start gap-2.5">
                  <span className="mt-[0.62em] size-1 shrink-0 rounded-full bg-slate-500" />
                  <span>
                    {renderInline(
                      line.replace(/^([-•]|\d+[.)])\s*/, ""),
                      `${bi}-${li}`,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>{renderInline(lines.join(" "), `b${bi}`)}</p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* sub-components                                                      */
/* ------------------------------------------------------------------ */

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-slate-500"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </span>
  );
}

/** In-flight trace — the agent reasoning + tools revealing step by step. */
function ReasoningTile({ pending }: { pending: PendingTrace }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
      transition={SPRING}
      className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
    >
      <div className="flex items-center gap-2.5">
        <Loader2 className="spin-slow size-3.5 text-slate-400" />
        <span className="font-mono text-xs text-slate-400">
          agent.reasoning
        </span>
        <ThinkingDots />
      </div>
      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {pending.tools.slice(0, pending.shown).map((tool, i) => {
            const Icon = toolIcon(tool.name);
            const running = i === pending.shown - 1;
            return (
              <motion.div
                key={`${tool.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="flex items-center gap-2.5"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04]">
                  <Icon className="size-3 text-slate-300" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 font-mono text-xs text-slate-300">
                  {tool.name}
                  <span className="text-slate-600">
                    ({formatArgs(tool.args)})
                  </span>
                </span>
                <span className="ml-auto shrink-0">
                  {running ? (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                      {toolHint(tool.name)}
                      <Loader2 className="spin-slow size-3" />
                    </span>
                  ) : (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING}
                      className="flex items-center gap-1 font-mono text-[10px] text-slate-500"
                    >
                      done
                      <Check className="size-3" />
                    </motion.span>
                  )}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Completed tool calls rendered compactly above a final answer. */
function CompletedTools({ tools }: { tools: ToolCall[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="mb-3 flex flex-wrap gap-1.5"
    >
      {tools.map((tool, i) => {
        const Icon = toolIcon(tool.name);
        return (
          <motion.span
            key={`${tool.name}-${i}`}
            variants={{
              hidden: { opacity: 0, y: 8, scale: 0.96 },
              show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-slate-400"
            title={formatArgs(tool.args, 240)}
          >
            <Icon className="size-3 text-slate-500" strokeWidth={1.8} />
            {tool.name}
            <Check className="size-3 text-slate-600" />
          </motion.span>
        );
      })}
    </motion.div>
  );
}

/** The one place amber is allowed: a real escalation. */
function EscalationCard({
  machineId,
  onOpenMachine,
}: {
  machineId?: string | null;
  onOpenMachine: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay: 0.2 }}
      className="relative mt-4 overflow-hidden rounded-xl border border-amber-400/25 bg-amber-400/[0.06]"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
              background:
                "radial-gradient(ellipse 90% 120% at 8% 0%, rgba(228,109,50,0.12), transparent 55%)",
        }}
      />
      <div className="relative p-4">
        <div className="flex items-center gap-2 text-amber-300">
          <TriangleAlert className="size-4" strokeWidth={2} />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
            Escalation · inspection recommended
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-amber-100/85">
          {machineId
            ? `${machineId} has breached one or more operating thresholds. Schedule an inspection before the next shift.`
            : "A machine has breached one or more operating thresholds. Schedule an inspection before the next shift."}
        </p>
        {machineId && (
          <button
            onClick={() => onOpenMachine(machineId)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 px-3 py-1.5 font-mono text-[11px] text-amber-200 transition-colors duration-300 hover:bg-amber-300/10"
          >
            Open {machineId} file
            <ArrowUpRight className="size-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function AssistantMessage({
  message,
  onOpenMachine,
  typing,
}: {
  message: ChatMessage;
  onOpenMachine: (id: string) => void;
  typing: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="flex gap-3"
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
        <Bot className="size-4 text-slate-300" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <CompletedTools tools={message.toolCalls} />
        )}
        <TypewriterAnswer text={message.content} animate={typing} />
        {message.escalate && (
          <EscalationCard
            machineId={message.machineId}
            onOpenMachine={onOpenMachine}
          />
        )}
        {!message.escalate && message.machineId && (
          <button
            onClick={() => onOpenMachine(message.machineId!)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-slate-400 transition-colors duration-300 hover:border-white/20 hover:text-slate-200"
          >
            referenced {message.machineId}
            <ArrowUpRight className="size-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TypewriterAnswer({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const [visibleText, setVisibleText] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setVisibleText(text);
      return;
    }

    let position = 0;
    setVisibleText("");
    const timer = window.setInterval(() => {
      position = Math.min(position + 2, text.length);
      setVisibleText(text.slice(0, position));
      if (position === text.length) window.clearInterval(timer);
    }, 12);

    return () => window.clearInterval(timer);
  }, [animate, text]);

  const isTyping = animate && visibleText.length < text.length;
  return (
    <div>
      <AnswerText text={visibleText} />
      {isTyping && (
        <span
          aria-label="Answer is appearing"
          className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-cyan-500 align-[-0.2em]"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

const STARTERS = [
  "Why is M07 vibrating above threshold?",
  "Summarize the last bearing failure on M03.",
  "Which machines are due for inspection?",
  "What is the temperature limit for M12?",
];

export interface ChatDraft {
  key: string;
  text: string;
}

interface ChatPageProps {
  draft: ChatDraft | null;
  onDraftConsumed: () => void;
  onOpenMachine: (id: string) => void;
}

export function ChatPage({
  draft,
  onDraftConsumed,
  onOpenMachine,
}: ChatPageProps) {
  const [storedSession] = useState(loadChatSession);
  const [threadId, setThreadId] = useState(storedSession.threadId);
  const [messages, setMessages] = useState<ChatMessage[]>(storedSession.messages);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingTrace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const threadRef = useRef(threadId);
  threadRef.current = threadId;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        CHAT_SESSION_KEY,
        JSON.stringify({ threadId, messages }),
      );
    } catch {
      // The current chat remains usable if session storage is unavailable.
    }
  }, [threadId, messages]);

  /* gentle backend health probe for the header pill */
  useEffect(() => {
    let cancelled = false;
    api
      .machines()
      .then(() => !cancelled && setHealth("online"))
      .catch(() => !cancelled && setHealth("offline"));
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, error]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setValue("");
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: text },
    ]);
    setPending({ tools: [], shown: 0 });
    try {
      const res = await api.chat(text, threadRef.current);
      const tools = res.tool_calls ?? [];
      for (let i = 0; i < tools.length; i++) {
        await sleep(520);
        if (!aliveRef.current) return;
        setPending({ tools, shown: i + 1 });
      }
      await sleep(460);
      if (!aliveRef.current) return;
      setPending(null);
      const assistantMessageId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: res.answer,
          toolCalls: tools,
          escalate: res.escalate,
          machineId: res.machine_id,
        },
      ]);
      setTypingMessageId(assistantMessageId);
    } catch (err) {
      if (!aliveRef.current) return;
      setPending(null);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setLastFailed(text);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  }, []);

  /* consume external drafts (e.g. "ask about M04" from the dashboard) */
  const consumedDraftRef = useRef<string | null>(null);
  useEffect(() => {
    if (draft && consumedDraftRef.current !== draft.key) {
      consumedDraftRef.current = draft.key;
      onDraftConsumed();
      void send(draft.text);
    }
  }, [draft, onDraftConsumed, send]);

  const newSession = () => {
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
    setThreadId(uid());
    setMessages([]);
    setTypingMessageId(null);
    setPending(null);
    setError(null);
    setLastFailed(null);
    setValue("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(value);
  };

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 pb-8 pt-28 md:px-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-5"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-100">
            Chat with the agent
          </h1>
          <p className="mt-1.5 font-mono text-[11px] text-slate-500">
            thread {threadId.slice(0, 8)} · llama3.2 local · grounded by tools
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] text-slate-500 sm:inline-flex">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors duration-500",
                health === "online"
                  ? "bg-slate-300"
                  : health === "checking"
                    ? "bg-slate-600"
                    : "border border-slate-500 bg-transparent",
              )}
            />
            {health === "online"
              ? "agent reachable"
              : health === "checking"
                ? "checking backend"
                : "backend offline"}
          </span>
          <button
            onClick={newSession}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04]"
          >
            <RotateCcw className="size-3.5" />
            New session
          </button>
        </div>
      </motion.div>

      {/* messages */}
      <div className="flex flex-1 flex-col gap-7 py-8">
        {empty && !busy && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
            }}
            className="flex flex-1 flex-col items-center justify-center py-10 text-center"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0, transition: SPRING },
              }}
              className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <Bot className="size-6 text-slate-300" strokeWidth={1.5} />
            </motion.div>
            <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
              <TextEffect text="Ask the floor anything." stagger={0.035} />
            </h2>
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: SPRING },
              }}
              className="mt-3 max-w-md text-balance text-sm leading-relaxed text-slate-400"
            >
              The agent retrieves maintenance records, checks live sensors, and
              compares against failure thresholds — then shows its work.
            </motion.p>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: SPRING },
              }}
              className="mt-8 flex max-w-lg flex-wrap items-center justify-center gap-2"
            >
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-xs text-slate-300 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.05]"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-slate-100 md:max-w-[75%]">
                {m.content}
              </div>
            </motion.div>
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              onOpenMachine={onOpenMachine}
              typing={m.id === typingMessageId}
            />
          ),
        )}

        <AnimatePresence>
          {pending && <ReasoningTile key="reasoning" pending={pending} />}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              key="chat-error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING}
              className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5 text-sm text-slate-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>{error}</span>
              </div>
              {lastFailed && (
                <button
                  onClick={() => void send(lastFailed)}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-200 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04] sm:self-auto"
                >
                  <RotateCcw className="size-3" />
                  Retry
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={endRef} className="h-px" />
      </div>

      {/* composer */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.15 }}
        className="sticky bottom-5 z-10"
      >
        <form
          onSubmit={onSubmit}
          className={cn(
            "relative flex items-center gap-2 rounded-full border border-orange-300/60 bg-[#fffaf2]/95 py-2 pl-5 pr-2",
            "shadow-[0_16px_48px_rgba(109,65,32,0.18)] backdrop-blur-xl",
          )}
        >
          <BorderTrail
            radius={999}
            trailSize={7}
            duration={10}
            className="opacity-50"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask about a machine, a threshold, a failure pattern…"
            aria-label="Message the agent"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <motion.button
            type="submit"
            aria-label="Send message"
            disabled={!value.trim() || busy}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-900 transition-colors duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
          >
            {busy ? (
              <Loader2 className="spin-slow size-4" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
