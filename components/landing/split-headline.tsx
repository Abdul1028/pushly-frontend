"use client";

import { motion, type Variants } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Headline whose words materialise as it enters: each tips up out of a slight 3D tilt,
// rises out of a blur and sharpens, rippling across the line.
// Reduced motion keeps the blur-to-sharp and fade, without the tilt or rise.

type Line = string | { text: string; muted?: boolean };

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045 } },
};

const wordFull: Variants = {
  hidden: { opacity: 0, y: "0.5em", rotateX: -70, filter: "blur(12px)" },
  shown: {
    opacity: 1,
    y: "0em",
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      default: { type: "spring", bounce: 0, duration: 1.1 },
      // Springs only animate plain numbers; blur gets an eased tween
      filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.5, ease: "easeOut" },
    },
  },
};

const wordReduced: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)" },
  // Always land at y 0 / no tilt: the server rendered the tilted start before it knew the preference
  shown: {
    opacity: 1,
    y: "0em",
    rotateX: 0,
    filter: "blur(0px)",
    transition: { y: { duration: 0 }, rotateX: { duration: 0 }, filter: { duration: 0.6 }, opacity: { duration: 0.5 } },
  },
};

export function SplitHeadline({ lines, className }: { lines: Line[]; className?: string }) {
  const reduce = usePrefersReducedMotion();
  const word = reduce ? wordReduced : wordFull;

  return (
    <motion.h2
      className={className}
      variants={container}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-12% 0px" }}
      style={{ perspective: 800 }}
    >
      {lines.map((line, li) => {
        const { text, muted } = typeof line === "string" ? { text: line, muted: false } : line;
        return (
          <span key={li} className={muted ? "block text-label-3" : "block"}>
            {text.split(" ").map((w, wi) => (
              <motion.span
                key={wi}
                variants={word}
                className="inline-block will-change-transform"
                style={{ transformOrigin: "50% 100%", marginRight: wi < text.split(" ").length - 1 ? "0.24em" : 0 }}
              >
                {w}
              </motion.span>
            ))}
          </span>
        );
      })}
    </motion.h2>
  );
}
