"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";

// Wraps the dark sections. The page background blends from light into black as they
// arrive and back to white as they leave, instead of cutting hard between bands.
// A colour change, not movement, so it plays with reduced motion too.
export function DarkChapter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const backgroundColor = useTransform(
    scrollYProgress,
    [0.02, 0.12, 0.84, 0.95],
    ["#f5f5f7", "#000000", "#000000", "#ffffff"]
  );

  // Switch the nav to its dark material while black is behind it
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const dark = v > 0.1 && v < 0.88;
    const root = document.documentElement;
    if (dark) root.dataset.nav = "dark";
    else if (root.dataset.nav === "dark") delete root.dataset.nav;
  });
  useEffect(() => () => void delete document.documentElement.dataset.nav, []);

  return (
    <motion.div ref={ref} style={{ backgroundColor }}>
      {/* Room for the blend in, before the first dark section starts */}
      <div aria-hidden className="h-[50vh]" />
      {children}
      {/* Room for the blend out */}
      <div aria-hidden className="h-[50vh]" />
    </motion.div>
  );
}
