import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  MessageSquareText,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { HistoryEntry, MachineStatus } from "@/lib/types";
import { StatusDot } from "@/components/ui";
import { cn } from "@/utils/cn";

interface MachineSlideOverProps {
  machineId: string | null;
  onClose: () => void;
  onAskAbout: (id: string) => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#fffaf2",
  border: "1px solid #d7b98e",
  borderRadius: 12,
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  color: "#3d291c",
} as const;

export function MachineSlideOver({
  machineId,
  onClose,
  onAskAbout,
}: MachineSlideOverProps) {
  const [status, setStatus] = useState<MachineStatus | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const open = machineId !== null;

  /* fetch status + history whenever a machine is selected */
  useEffect(() => {
    if (!machineId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStatus(null);
    setEntries(null);
    Promise.all([api.status(machineId), api.history(machineId)])
      .then(([s, h]) => {
        if (cancelled) return;
        setStatus(s);
        setEntries(h.entries);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : `Could not load records for ${machineId}.`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [machineId, reloadKey]);

  /* escape closes, and lock body scroll while open */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  /* events-per-year chart, derived from real history data */
  const chartData = useMemo(() => {
    if (!entries) return [];
    const byYear = new Map<string, number>();
    for (const e of entries) {
      const year = new Date(e.date).getFullYear();
      if (Number.isFinite(year))
        byYear.set(String(year), (byYear.get(String(year)) ?? 0) + 1);
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([year, events]) => ({ year, events }));
  }, [entries]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`${machineId} details`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "104%" }}
            animate={{ x: 0 }}
            exit={{ x: "104%" }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
            className="absolute inset-y-0 right-0 flex w-[min(30rem,94vw)] flex-col border-l border-orange-300/60 bg-[#fffaf2]"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg text-slate-100">
                  {machineId}
                </span>
                {status && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
                      status.status === "anomaly"
                        ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
                        : "border-white/10 bg-white/[0.04] text-slate-300",
                    )}
                  >
                    <StatusDot state={status.status} className="size-1.5 [&>span]:size-1.5" />
                    {status.status === "anomaly" ? "flagged" : "operational"}
                  </span>
                )}
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                aria-label="Close panel"
                className="grid size-8 place-items-center rounded-full border border-white/10 text-slate-400 transition-colors duration-300 hover:border-white/25 hover:text-slate-100"
              >
                <X className="size-4" />
              </motion.button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading && (
                <div className="space-y-5" aria-label="Loading machine data">
                  <div className="skeleton h-16 w-full rounded-xl" />
                  <div className="skeleton h-40 w-full rounded-xl" />
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="skeleton h-20 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              )}

              {!loading && error && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="flex flex-col items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
                >
                  <p className="text-sm leading-relaxed text-slate-300">{error}</p>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04]"
                  >
                    <RotateCcw className="size-3" />
                    Retry
                  </button>
                </motion.div>
              )}

              {!loading && !error && status && (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.07 } } }}
                  className="space-y-8"
                >
                  {/* live status */}
                  <motion.section
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Live sensor check
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                      {status.details}
                    </p>
                    <button
                      onClick={() => machineId && onAskAbout(machineId)}
                      className={cn(
                        "mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors duration-300",
                        status.status === "anomaly"
                          ? "border-amber-300/25 text-amber-200 hover:bg-amber-300/10"
                          : "border-white/10 text-slate-200 hover:border-white/25 hover:bg-white/[0.04]",
                      )}
                    >
                      <MessageSquareText className="size-3.5" />
                      Ask the agent about {machineId}
                      <ArrowUpRight className="size-3" />
                    </button>
                  </motion.section>

                  {/* events chart */}
                  <motion.section
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Maintenance events / year
                    </p>
                    {chartData.length > 0 ? (
                      <div className="mt-4 h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 4, right: 4, left: -26, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(148,163,184,0.12)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="year"
                              tick={{ fill: "#64748b", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fill: "#64748b", fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(255,255,255,0.03)" }}
                              contentStyle={TOOLTIP_STYLE}
                              labelStyle={{ color: "#94a3b8" }}
                            />
                            <Bar
                              dataKey="events"
                              name="events"
                              fill="#64748b"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={26}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">
                        No timeline data available.
                      </p>
                    )}
                  </motion.section>

                  {/* history timeline */}
                  <motion.section
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Maintenance history
                    </p>
                    <div className="mt-4">
                      {entries && entries.length > 0 ? (
                        entries.map((entry, i) => (
                          <motion.div
                            key={`${entry.date}-${i}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 100,
                              damping: 20,
                              delay: 0.05 * i,
                            }}
                            className="relative border-l border-white/[0.08] pb-6 pl-5 last:pb-1"
                          >
                            <span className="absolute -left-[5px] top-1 size-2.5 rounded-full border-2 border-[#0d1218] bg-slate-500" />
                            <p className="font-mono text-[11px] text-slate-500">
                              {entry.date}
                            </p>
                            <h4 className="mt-1 text-sm font-semibold text-slate-100">
                              {entry.issue}
                            </h4>
                            <dl className="mt-2.5 space-y-1.5 text-xs leading-relaxed">
                              {(
                                [
                                  ["Diagnosis", entry.diagnosis],
                                  ["Fix", entry.fix],
                                  ["Outcome", entry.outcome],
                                ] as const
                              ).map(([label, value]) => (
                                <div key={label} className="flex gap-2">
                                  <dt className="w-16 shrink-0 font-mono text-[10px] uppercase leading-5 tracking-wider text-slate-600">
                                    {label}
                                  </dt>
                                  <dd className="text-slate-400">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </motion.div>
                        ))
                      ) : (
                        <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs text-slate-500">
                          No maintenance events on record for this machine.
                        </p>
                      )}
                    </div>
                  </motion.section>
                </motion.div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
