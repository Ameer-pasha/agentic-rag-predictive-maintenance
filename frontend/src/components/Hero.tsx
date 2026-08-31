import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { GhostButton, PrimaryButton } from "@/components/ui";

interface HeroProps {
  onStartChat: () => void;
  onDashboard: () => void;
  onHowItWorks: () => void;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

const word: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 110, damping: 19 },
  },
};

const GHOST_TAGS = [
  { label: "M03", top: "17%", left: "7%", duration: 7, delay: 0 },
  { label: "M11", top: "26%", right: "9%", duration: 8, delay: 1.2 },
  { label: "M07", top: "62%", left: "11%", duration: 6.5, delay: 0.6 },
  { label: "M19", top: "70%", right: "13%", duration: 7.5, delay: 1.8 },
  { label: "M14", top: "40%", left: "17%", duration: 9, delay: 0.3 },
  { label: "M02", top: "48%", right: "21%", duration: 8.5, delay: 2.2 },
];

export function Hero({ onStartChat, onDashboard, onHowItWorks }: HeroProps) {
  const [machineCount, setMachineCount] = useState(20);

  useEffect(() => {
    let cancelled = false;
    api
      .machines()
      .then((res) => {
        if (!cancelled && res.machines.length > 0)
          setMachineCount(res.machines.length);
      })
      .catch(() => {
        /* backend offline — keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="hero-stage relative overflow-hidden">
      {/* backdrop */}
      <div className="dot-grid absolute inset-0" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 42% at 50% 34%, rgba(228,109,50,0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          background: "linear-gradient(to bottom, transparent, #ead7bb)",
        }}
      />

      {/* drifting machine ghosts */}
      {GHOST_TAGS.map((tag) => (
        <motion.span
          key={tag.label}
          aria-hidden="true"
          className="absolute hidden font-mono text-[11px] tracking-[0.25em] text-slate-500/50 lg:block"
          style={{ top: tag.top, left: tag.left, right: tag.right }}
          animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: tag.duration,
            delay: tag.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {tag.label}
        </motion.span>
      ))}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="hero-content relative mx-auto flex max-w-4xl flex-col items-center px-5 pb-20 pt-36 text-center md:pb-28 md:pt-44"
      >
        {/* badge */}
        <motion.div variants={item}>
          <span className="hero-badge inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-slate-300">
            <span className="relative flex size-1.5">
              <span className="ping-ring bg-slate-300" />
              <span className="relative size-1.5 rounded-full bg-slate-300" />
            </span>
            Agentic RAG
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-400">LangGraph + Ollama + FastAPI</span>
          </span>
        </motion.div>

        {/* heading */}
        <motion.h1
          variants={container}
          className="hero-title mt-8 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-slate-100 sm:text-6xl md:text-7xl"
        >
          <span className="block">
            {"Every anomaly has a paper trail.".split(" ").map((w, i) => (
              <motion.span
                key={`l1-${i}`}
                variants={word}
                className="inline-block will-change-transform"
              >
                {w}
                {"\u00A0"}
              </motion.span>
            ))}
          </span>
          <span className="block">
            {[
              { t: "Now", accent: false },
              { t: "it", accent: false },
              { t: "answers", accent: true },
              { t: "back.", accent: false },
            ].map((w, i) => (
              <motion.span
                key={`l2-${i}`}
                variants={word}
                className={[
                  "inline-block will-change-transform",
                  w.accent ? "text-cyan-400" : "",
                ].join(" ")}
              >
                {w.t}
                {"\u00A0"}
              </motion.span>
            ))}
          </span>
        </motion.h1>

        {/* subtext */}
        <motion.p
          variants={item}
          className="hero-copy mt-6 max-w-2xl text-balance text-base leading-relaxed text-slate-400 md:text-lg"
        >
          A local LangGraph agent that grounds every answer in real maintenance
          records, live sensor values, and failure thresholds — running on
          Llama&nbsp;3.2 via Ollama. No API keys; nothing leaves the floor.
        </motion.p>

        {/* buttons */}
        <motion.div
          variants={item}
          className="hero-actions mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <PrimaryButton onClick={onStartChat}>
            Start Chat Session
            <ArrowRight className="size-4" strokeWidth={2.2} />
          </PrimaryButton>
          <GhostButton onClick={onDashboard}>Machine Dashboard</GhostButton>
          <GhostButton onClick={onHowItWorks}>
            How It Works
            <ArrowDown className="size-4" strokeWidth={2} />
          </GhostButton>
        </motion.div>

        {/* stats */}
        <motion.div variants={item} className="hero-stats mt-16 w-full md:mt-20">
          <div className="hairline-fade mx-auto mb-10 h-px w-full max-w-3xl" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            {[
              {
                label: "Machines tracked",
                value: <AnimatedNumber value={machineCount} />,
              },
              {
                label: "Fleet uptime",
                value: <AnimatedNumber value={99.2} decimals={1} suffix="%" />,
              },
              {
                label: "Median response",
                value: (
                  <>
                    <AnimatedNumber value={1.4} decimals={1} />
                    <span className="ml-1 text-base text-slate-500">s</span>
                  </>
                ),
              },
              {
                label: "Agent tools",
                value: <AnimatedNumber value={5} />,
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="order-2 mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {stat.label}
                </dt>
                <dd className="font-display text-3xl font-semibold tabular-nums text-slate-100 md:text-4xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.div>
    </section>
  );
}
