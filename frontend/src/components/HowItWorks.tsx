import { motion, type Variants } from "motion/react";
import {
  BrainCircuit,
  Database,
  FileCheck,
  Gauge,
  History,
  ListChecks,
  MessageSquareText,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { TextEffect } from "@/components/motion/TextEffect";

const steps = [
  {
    icon: MessageSquareText,
    title: "Ask in plain language",
    desc: "An engineer asks about any machine — no query syntax, no dashboards to dig through.",
  },
  {
    icon: BrainCircuit,
    title: "The agent plans",
    desc: "A LangGraph state machine running Llama 3.2 locally reasons step-by-step and picks its tools.",
  },
  {
    icon: Wrench,
    title: "Tools do the grounding",
    desc: "History from Chroma, live sensor reads, and threshold lookups execute as real tool calls.",
  },
  {
    icon: FileCheck,
    title: "Answer — or escalation",
    desc: "A sourced diagnosis in context. If a threshold is breached, it escalates. Amber means act now.",
  },
];

const tools = [
  { icon: Database, name: "retriever_tool", hint: "RAG over maintenance logs" },
  { icon: Gauge, name: "sensor_check_tool", hint: "live threshold check" },
  { icon: SlidersHorizontal, name: "get_threshold_tool", hint: "failure limits" },
  { icon: ListChecks, name: "list_machines_tool", hint: "fleet index" },
  { icon: History, name: "get_machine_history_tool", hint: "full event log" },
];

const stack = [
  "FastAPI",
  "LangGraph",
  "Ollama · llama3.2",
  "nomic-embed-text",
  "Chroma",
  "React + Vite",
];

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
      {/* header */}
      <div className="max-w-2xl">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500"
        >
          Pipeline
        </motion.p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-100 md:text-5xl">
          <TextEffect text="From question to grounded answer." stagger={0.03} />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          className="mt-4 text-base leading-relaxed text-slate-400"
        >
          Four hops, all on your own hardware. The agent never guesses — every
          claim traces back to a retrieved record or a live sensor read.
        </motion.p>
      </div>

      {/* steps */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        className="relative mt-16 grid gap-4 md:grid-cols-4"
      >
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="absolute -top-px left-0 right-0 hidden h-px origin-left bg-gradient-to-r from-transparent via-white/15 to-transparent md:block"
        />
        {steps.map((step, i) => (
          <motion.article
            key={step.title}
            variants={stepVariants}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-white/[0.14] hover:bg-white/[0.035]"
          >
            <div className="flex items-start justify-between">
              <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                <step.icon className="size-5 text-slate-300" strokeWidth={1.6} />
              </span>
              <span className="font-mono text-xs text-slate-600">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-5 font-display text-base font-semibold tracking-tight text-slate-100">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {step.desc}
            </p>
          </motion.article>
        ))}
      </motion.div>

      {/* toolbelt */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="mt-14 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-8"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Agent toolbelt
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {tools.map((tool) => (
            <span
              key={tool.name}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] py-2 pl-3 pr-4"
            >
              <tool.icon className="size-3.5 text-slate-400" strokeWidth={1.8} />
              <span className="font-mono text-xs text-slate-300">{tool.name}</span>
              <span className="hidden text-xs text-slate-500 sm:inline">
                {tool.hint}
              </span>
            </span>
          ))}
        </div>
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
            Runs on
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-slate-400">
            {stack.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-slate-700">/</span>}
                {s}
              </span>
            ))}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
