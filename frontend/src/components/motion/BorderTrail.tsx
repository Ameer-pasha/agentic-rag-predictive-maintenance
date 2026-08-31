import { motion } from "motion/react";
import { cn } from "@/utils/cn";

/**
 * BorderTrail (motion-primitives style) — a neutral light trail that
 * continuously travels the rounded border of its positioned parent.
 * Uses an SVG rect with normalized pathLength so it works at any size.
 */

interface BorderTrailProps {
  className?: string;
  /** Percent of the perimeter covered by the trail. */
  trailSize?: number;
  /** Seconds per full lap. */
  duration?: number;
  /** Border radius of the parent, in px. */
  radius?: number;
}

export function BorderTrail({
  className,
  trailSize = 16,
  duration = 7,
  radius = 24,
}: BorderTrailProps) {
  const dash = `${trailSize} ${100 - trailSize}`;
  const size = { width: "calc(100% - 2px)", height: "calc(100% - 2px)" } as const;
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-slate-400",
        className,
      )}
    >
      {/* soft glow layer */}
      <motion.rect
        x={1}
        y={1}
        style={size}
        rx={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth={5}
        pathLength={100}
        strokeDasharray={dash}
        strokeLinecap="round"
        className="blur-[3px]"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -100 }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      />
      {/* core layer */}
      <motion.rect
        x={1}
        y={1}
        style={size}
        rx={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.7}
        strokeWidth={1.1}
        pathLength={100}
        strokeDasharray={dash}
        strokeLinecap="round"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -100 }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      />
    </svg>
  );
}
