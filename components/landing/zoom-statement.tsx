"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Pinned statement: one word starts enormous and pulls back into place, then the
// supporting line and facts fade in. Reduced motion keeps the fades, drops the zoom.
// Neutral values are set explicitly for reduced motion: the server renders the zoomed,
// blurred start before it knows the preference, and omitting a key doesn't undo it.

const FACTS = [
  { value: "300+", label: "edge locations" },
  { value: "TLS 1.3", label: "on every domain" },
  { value: "Global", label: "cache by default" },
];

export function ZoomStatement() {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const wordScale = useTransform(p, [0, 0.45], [5.5, 1]);
  const wordOpacity = useTransform(p, [0, 0.12], [0, 1]);
  const wordBlur = useTransform(p, [0, 0.3], ["blur(12px)", "blur(0px)"]);
  const lineOpacity = useTransform(p, [0.45, 0.6], [0, 1]);
  const lineY = useTransform(p, [0.45, 0.6], [24, 0]);
  const factsOpacity = useTransform(p, [0.6, 0.75], [0, 1]);
  const glow = useTransform(p, [0.2, 0.6], [0, 1]);

  return (
    <section ref={ref} className="relative h-[260vh] text-ink">
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* Soft light behind the word, rising with it */}
        <motion.div
          aria-hidden
          style={{ opacity: glow }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60vmin] w-[90vmin] rounded-full bg-[radial-gradient(closest-side,rgba(41,151,255,0.22),transparent)]"
        />

        <motion.h2
          // Blur-to-sharp isn't movement, so it plays with reduced motion too; only the zoom is dropped
          style={reduce ? { opacity: wordOpacity, scale: 1, filter: wordBlur } : { scale: wordScale, opacity: wordOpacity, filter: wordBlur }}
          className="relative text-[clamp(5rem,18vw,13rem)] leading-none font-semibold tracking-[-0.06em] will-change-transform"
        >
          Fast.
        </motion.h2>

        <motion.p
          style={reduce ? { opacity: lineOpacity, y: 0 } : { opacity: lineOpacity, y: lineY }}
          className="relative text-lede text-ink-2 mt-6 max-w-[560px]"
        >
          Every deploy is cached across Cloudflare’s global network, so pages load close to
          wherever your visitors are.
        </motion.p>

        <motion.dl style={{ opacity: factsOpacity }} className="relative mt-12 grid grid-cols-3 gap-6 sm:gap-14">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[-0.04em] text-ink">{f.value}</dd>
              <dd className="text-[13px] sm:text-[15px] text-ink-2 mt-1">{f.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
