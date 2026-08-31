import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/utils/cn";

/** Global entrance spring — used everywhere for a consistent feel. */
export const SPRING = { type: "spring", stiffness: 100, damping: 20 } as const;

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}

/** The single primary accent button (teal) — used sparingly by design. */
export function PrimaryButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
  ariaLabel,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full",
        "bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950",
        "transition-[box-shadow,background-color] duration-300 ease-out",
        "hover:bg-cyan-300 hover:shadow-[0_0_36px_rgba(228,109,50,0.30)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/** Secondary actions — transparent fill, thin gray border. */
export function GhostButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
  ariaLabel,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full",
        "border border-white/15 bg-transparent px-6 py-3 text-sm font-medium text-slate-200",
        "transition-[border-color,background-color] duration-300 ease-out",
        "hover:border-white/30 hover:bg-white/[0.04]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/** Pulsing status dot — neutral teal for normal, amber ONLY for anomaly. */
export function StatusDot({
  state,
  className,
}: {
  state: "normal" | "anomaly";
  className?: string;
}) {
  const color = state === "anomaly" ? "bg-amber-400" : "bg-teal-400";
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className={cn("ping-ring", color)} />
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}
