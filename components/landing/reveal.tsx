"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Content rises out of a soft blur once as it scrolls into view. Critically damped, no bounce.
// Reduced motion: content appears without animating.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      // Reduced motion remounts with no start state, dropping the blurred style the server
      // rendered before it could know the preference — content simply appears.
      key={reduce ? "static" : "reveal"}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 40, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      // Springs only animate plain numbers, so the blur gets its own eased tween
      transition={{
        default: { type: "spring", bounce: 0, duration: 1, delay },
        filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay },
      }}
    >
      {children}
    </motion.div>
  );
}
