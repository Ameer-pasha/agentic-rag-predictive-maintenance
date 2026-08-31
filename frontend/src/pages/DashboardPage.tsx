import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { ArrowUpRight, RotateCcw, TriangleAlert } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { api } from "@/lib/api";
import type { MachineStatus } from "@/lib/types";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { SPRING, StatusDot } from "@/components/ui";
import { MachineSlideOver } from "@/components/MachineSlideOver";
import { cn } from "@/utils/cn";

type StatusEntry = MachineStatus | null;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

function FleetDonut({
  normal,
  anomaly,
  checking,
}: {
  normal: number;
  anomaly: number;
  checking: number;
}) {
  const data = [
    { name: "Normal", value: normal, color: "#4f8c62" },
    { name: "Flagged", value: anomaly, color: "#e46d32" },
    { name: "Checking", value: checking, color: "#a77d5c" },
  ].filter((d) => d.value > 0);
  const total = normal + anomaly + checking;
  return (
    <div className="relative size-[120px]">
      <PieChart width={120} height={120}>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={40}
          outerRadius={54}
          strokeWidth={0}
          paddingAngle={data.length > 1 ? 3 : 0}
          startAngle={90}
          endAngle={-270}
          animationDuration={900}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-xl font-semibold tabular-nums text-slate-100">
            {total}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            fleet
          </p>
        </div>
      </div>
    </div>
  );
}

interface DashboardPageProps {
  focusMachine: string | null;
  onFocusConsumed: () => void;
  onAskAbout: (id: string) => void;
}

export function DashboardPage({
  focusMachine,
  onFocusConsumed,
  onAskAbout,
}: DashboardPageProps) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StatusEntry>>({});
  const [statusesLoaded, setStatusesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setIds(null);
      setStatuses({});
      setStatusesLoaded(false);
      try {
        const res = await api.machines();
        if (cancelled) return;
        setIds(res.machines);
        const results = await Promise.allSettled(
          res.machines.map((id) => api.status(id)),
        );
        if (cancelled) return;
        const map: Record<string, StatusEntry> = {};
        results.forEach((r, i) => {
          map[res.machines[i]] = r.status === "fulfilled" ? r.value : null;
        });
        setStatuses(map);
        setStatusesLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the machine fleet.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* open a machine panel when requested from elsewhere (chat, etc.) */
  useEffect(() => {
    if (focusMachine) {
      setSelected(focusMachine);
      onFocusConsumed();
    }
  }, [focusMachine, onFocusConsumed]);

  const counts = (ids ?? []).reduce(
    (acc, id) => {
      const s = statuses[id];
      if (!statusesLoaded) acc.checking++;
      else if (s?.status === "anomaly") acc.anomaly++;
      else acc.normal++;
      return acc;
    },
    { normal: 0, anomaly: 0, checking: 0 },
  );

  return (
    <div className="mx-auto min-h-svh w-full max-w-6xl px-5 pb-24 pt-28 md:px-8">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
      >
        <div className="max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
            Fleet overview
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
            Machine Dashboard
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Live status from the sensor layer. Open any machine to inspect its
            service record, or hand it straight to the agent.
          </p>
        </div>

        {/* fleet summary */}
        <div className="flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
          <FleetDonut
            normal={counts.normal}
            anomaly={counts.anomaly}
            checking={counts.checking}
          />
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <StatusDot state="normal" className="[&_.ping-ring]:hidden" />
              <span className="text-xs text-slate-400">
                <AnimatedNumber value={counts.normal} className="font-semibold text-slate-100" />{" "}
                operational
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <StatusDot
                state="anomaly"
                className={counts.anomaly === 0 ? "[&_.ping-ring]:hidden" : ""}
              />
              <span className="text-xs text-slate-400">
                <AnimatedNumber
                  value={counts.anomaly}
                  className={cn(
                    "font-semibold",
                    counts.anomaly > 0 ? "text-amber-300" : "text-slate-100",
                  )}
                />{" "}
                flagged
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-slate-600" />
              <span className="text-xs text-slate-400">
                <AnimatedNumber value={counts.checking} className="font-semibold text-slate-100" />{" "}
                checking
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Fleet data unavailable
              </p>
              <p className="mt-1 text-sm text-slate-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04]"
          >
            <RotateCcw className="size-3" />
            Reconnect
          </button>
        </motion.div>
      )}

      {/* grid */}
      <motion.div
        layout
        initial="hidden"
        animate={ids ? "show" : "hidden"}
        variants={{ show: { transition: { staggerChildren: 0.035 } } }}
        className="mt-10 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {!ids &&
          !error &&
          Array.from({ length: 20 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="skeleton h-[148px] rounded-2xl border border-white/[0.05]"
            />
          ))}

        {ids?.map((id) => {
          const status = statusesLoaded ? statuses[id] : undefined;
          const anomaly = status?.status === "anomaly";
          return (
            <motion.button
              key={id}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={() => setSelected(id)}
              aria-label={`Open ${id} history`}
              className={cn(
                "group flex h-[148px] flex-col rounded-2xl border p-5 text-left transition-colors duration-300",
                anomaly
                  ? "border-amber-400/20 bg-amber-400/[0.03] hover:border-amber-400/35"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-slate-200">
                  {id}
                </span>
                {status === undefined ? (
                  <span className="skeleton size-2 rounded-full" />
                ) : status === null ? (
                  <span
                    className="size-2 rounded-full bg-slate-600"
                    title="Status unknown"
                  />
                ) : (
                  <StatusDot state={status.status} />
                )}
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
                {status === undefined
                  ? "Checking sensors…"
                  : (status?.details ?? "Status unavailable — sensor feed unreachable.")}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.18em]",
                    anomaly ? "text-amber-300" : "text-slate-500",
                  )}
                >
                  {status === undefined
                    ? "checking"
                    : status === null
                      ? "offline"
                      : anomaly
                        ? "flagged"
                        : "operational"}
                </span>
                <ArrowUpRight className="size-3.5 text-slate-600 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <MachineSlideOver
        machineId={selected}
        onClose={() => setSelected(null)}
        onAskAbout={onAskAbout}
      />
    </div>
  );
}
