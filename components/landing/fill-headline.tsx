"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

// Headline that fills with colour, left to right, as it scrolls up the screen.
// Pure colour reveal (no movement), so it plays with reduced motion too.
export function FillHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.35"] });
  const clip = useTransform(scrollYProgress, [0, 1], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);

  const text = lines.map((l, i) => (
    <span key={i} className="block">
      {l}
    </span>
  ));

  return (
    <h2 ref={ref} className="relative text-headline">
      {/* Base: quiet grey */}
      <span className="text-label/15">{text}</span>
      {/* Fill: Apple blue → indigo → violet, revealed by scroll */}
      <motion.span
        aria-hidden
        style={{ clipPath: clip }}
        className="absolute inset-0 bg-[linear-gradient(90deg,#0071e3_0%,#5e5ce6_55%,#bf5af2_100%)] bg-clip-text text-transparent"
      >
        {text}
      </motion.span>
    </h2>
  );
}
