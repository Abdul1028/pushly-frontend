"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

// A large statement whose words light up, one after another, as it scrolls through the screen.

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block mr-[0.25em]">
      {children}
    </motion.span>
  );
}

export function ScrollText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");

  return (
    <section className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <p
          ref={ref}
          className="text-[clamp(1.75rem,4.2vw,3rem)] leading-[1.15] font-semibold tracking-[-0.035em] text-label"
        >
          {/* Opacity only — no movement — so it stays on with reduced motion, as Apple advises */}
          {words.map((w, i) => (
            <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
              {w}
            </Word>
          ))}
        </p>
      </div>
    </section>
  );
}
