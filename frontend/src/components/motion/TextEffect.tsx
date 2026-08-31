import { motion, type Variants } from "motion/react";

/**
 * TextEffect (motion-primitives style) — splits text into words or
 * characters and reveals them with a staggered spring.
 */

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 110, damping: 19 },
  },
};

interface TextEffectProps {
  text: string;
  per?: "word" | "char";
  delay?: number;
  stagger?: number;
  className?: string;
  once?: boolean;
}

export function TextEffect({
  text,
  per = "word",
  delay = 0,
  stagger = 0.04,
  className,
  once = true,
}: TextEffectProps) {
  const tokens = per === "word" ? text.split(" ") : Array.from(text);
  return (
    <motion.span
      className={className}
      style={{ display: "inline-block" }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
      variants={{
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      aria-label={text}
    >
      {tokens.map((token, i) => (
        <motion.span
          key={`${token}-${i}`}
          aria-hidden="true"
          className="inline-block will-change-transform"
          variants={wordVariants}
        >
          {token === " " ? " " : token}
          {per === "word" && i < tokens.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
