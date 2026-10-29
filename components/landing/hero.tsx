"use client";

import { useRef } from "react";
import { GrowLink } from "@/components/page-morph";
import { motion, useScroll, useTransform } from "motion/react";
import { ChevronRight } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DashboardShot } from "./dashboard-shot";

const DOCS_URL = "https://developers.wareality.tech";

// Entrance: each line rises out of a soft blur, one after another
const rise = (delay: number, reduce: boolean) =>
  reduce
    ? // Reduced motion: mount straight into the final state. Paired with a `key` that changes
      // with the preference, this remounts the element and drops the blurred start style the
      // server rendered before it could know the preference.
      { initial: false as const, animate: { opacity: 1, y: 0, filter: "blur(0px)" } }
    : {
        initial: { opacity: 0, y: 28, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        // Springs only animate plain numbers, so the blur gets its own eased tween
        transition: {
          default: { type: "spring" as const, bounce: 0, duration: 1.1, delay },
          filter: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay },
        },
      };

export function Hero() {
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);

  // Headline drifts up and fades as the page scrolls away from it
  const { scrollYProgress: leave } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const copyY = useTransform(leave, [0, 0.5], [0, -80]);
  const copyOpacity = useTransform(leave, [0, 0.35], [1, 0]);
  const copyScale = useTransform(leave, [0, 0.5], [1, 0.94]);

  // Product shot opens like a laptop lid as it scrolls toward the middle of the screen
  const { scrollYProgress: open } = useScroll({ target: shotRef, offset: ["start end", "center center"] });
  const lid = useTransform(open, [0, 1], [32, 0]);
  const shotScale = useTransform(open, [0, 1], [0.84, 1]);
  const shotY = useTransform(open, [0, 1], [80, 0]);

  return (
    <section ref={sectionRef} className="pt-14 md:pt-20 pb-20 md:pb-28 overflow-hidden">
      <motion.div
        className="mx-auto max-w-[980px] px-4 sm:px-6 text-center will-change-transform"
        style={reduce ? { opacity: copyOpacity, y: 0, scale: 1 } : { y: copyY, opacity: copyOpacity, scale: copyScale }}
      >
        <motion.p key={`eyebrow-${reduce}`} {...rise(0.05, reduce)} className="text-[21px] md:text-[28px] font-semibold tracking-[-0.022em] text-label">
          {PRODUCT_NAME}
        </motion.p>
        <motion.h1 key={`title-${reduce}`} {...rise(0.15, reduce)} className="text-display mt-1">
          Ship on every push.
        </motion.h1>
        <motion.p key={`lede-${reduce}`} {...rise(0.3, reduce)} className="text-lede text-label-2 mt-5 max-w-[620px] mx-auto">
          Connect a Git repository and get a live URL in seconds. Every push after that deploys
          itself — previews for branches, production for main.
        </motion.p>
        <motion.div key={`cta-${reduce}`} {...rise(0.45, reduce)} className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <GrowLink href="/register" className="btn-apple">
            Get started
          </GrowLink>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="btn-link">
            Read the docs
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </motion.div>
      </motion.div>

      <div ref={shotRef} className="mx-auto max-w-[1100px] px-4 sm:px-6 mt-14 md:mt-20 [perspective:1800px]">
        {/* Outer layer follows scroll; inner layer plays the entrance — kept apart so they don't fight */}
        <motion.div
          className="will-change-transform"
          // Neutral values are explicit: the server rendered the tilted start before knowing the preference
          style={reduce ? { rotateX: 0, scale: 1, y: 0 } : { rotateX: lid, scale: shotScale, y: shotY, transformOrigin: "50% 100%" }}
        >
          <motion.div key={`shot-${reduce}`} {...rise(0.6, reduce)}>
            <DashboardShot />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
