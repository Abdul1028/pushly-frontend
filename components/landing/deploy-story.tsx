"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { Check, GitCommitHorizontal, Lock } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Pinned scroll story: the stage holds still while scrolling drives a deploy from push to live.

const CAPTIONS = [
  { title: "You push.", body: "Commit to main like you always do. That’s the whole workflow." },
  { title: "We build.", body: "Your framework is detected, dependencies installed, and the app built." },
  { title: "It’s live.", body: "Served from the edge with HTTPS, seconds after you pushed." },
];

const STEPS = [
  { label: "Push received", detail: "main · a1c9e2f" },
  { label: "Framework detected", detail: "Next.js · pnpm" },
  { label: "Dependencies installed", detail: "pnpm install" },
  { label: "Build complete", detail: "pnpm run build" },
  { label: "Deployed to the edge", detail: "300+ locations" },
];

// Scroll progress at which each build step completes
const STEP_AT = [0.12, 0.34, 0.48, 0.62, 0.74];

export function DeployStory() {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const [done, setDone] = useState(0);
  useMotionValueEvent(p, "change", (v) => {
    const n = STEP_AT.filter((t) => v >= t).length;
    if (n !== done) setDone(n);
  });
  const caption = done >= 5 ? 2 : done >= 2 ? 1 : 0;
  const live = done >= 5;

  // The window starts close up and pulls back to show the whole deploy
  const scale = useTransform(p, [0, 0.22], [1.3, 1]);
  const y = useTransform(p, [0, 0.22], [120, 0]);
  // Build bar follows scroll continuously (a size change, not movement, so also with reduced
  // motion), through a spring so wheel steps glide instead of jumping
  const bar = useSpring(useTransform(p, [0.12, 0.74], [0, 1]), { stiffness: 140, damping: 30, mass: 0.6 });

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Caption */}
        <div className="relative h-[150px] md:h-[170px] w-full max-w-[760px] text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={caption}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="absolute inset-x-0 top-0"
            >
              <h2 className="text-headline text-ink">{CAPTIONS[caption].title}</h2>
              <p className="text-lede text-ink-2 mt-3 max-w-[520px] mx-auto">{CAPTIONS[caption].body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stage */}
        <motion.div
          className="w-full max-w-[720px] will-change-transform"
          style={reduce ? { scale: 1, y: 0 } : { scale, y, transformOrigin: "50% 0%" }}
        >
          <div className="rounded-xl bg-white overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] text-left">
            <div className="relative flex items-center h-10 px-4 bg-[#f6f6f6] border-b border-black/[0.08]">
              <div className="flex gap-2" aria-hidden>
                <span className="size-3 rounded-full bg-[#ff5f57]" />
                <span className="size-3 rounded-full bg-[#febc2e]" />
                <span className="size-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="absolute left-1/2 -translate-x-1/2 text-[12px] text-label-2">Deployment · storefront</span>
            </div>

            <div className="p-5 md:p-7">
              <div className="flex items-center gap-2 text-[13px] text-label-2">
                <GitCommitHorizontal className="size-4" aria-hidden />
                <span className="font-mono">a1c9e2f</span>
                <span className="truncate">Fix cart total rounding</span>
              </div>

              {/* Progress */}
              <div className="mt-5 h-1.5 rounded-full bg-fill-2 overflow-hidden">
                <motion.div
                  className="h-full bg-apple-blue origin-left"
                  style={{ scaleX: bar }}
                />
              </div>

              <ol className="mt-5 space-y-3">
                {STEPS.map((s, i) => {
                  const complete = i < done;
                  const active = i === done;
                  return (
                    <li key={s.label} className="flex items-center gap-3">
                      <span
                        className={
                          complete
                            ? "size-5 rounded-full bg-sys-green grid place-items-center transition-colors duration-300"
                            : active
                              ? "size-5 rounded-full border-2 border-apple-blue transition-colors duration-300"
                              : "size-5 rounded-full border-2 border-fill-2 transition-colors duration-300"
                        }
                      >
                        {complete && <Check className="size-3 text-white" strokeWidth={3} aria-hidden />}
                      </span>
                      <span className={complete || active ? "text-[15px] text-label" : "text-[15px] text-label-3"}>{s.label}</span>
                      <span className="ml-auto text-[13px] text-label-3 font-mono hidden sm:inline">{s.detail}</span>
                    </li>
                  );
                })}
              </ol>

              {/* Live URL */}
              <div
                className={
                  live
                    ? "mt-6 flex items-center gap-3 rounded-lg bg-fill px-4 py-3 opacity-100 transition-opacity duration-500"
                    : "mt-6 flex items-center gap-3 rounded-lg bg-fill px-4 py-3 opacity-0 transition-opacity duration-500"
                }
                aria-hidden={!live}
              >
                <span className="size-2.5 rounded-full bg-sys-green" />
                <Lock className="size-3.5 text-label-2" aria-hidden />
                <span className="text-[15px] text-label">storefront.pushly.app</span>
                <span className="ml-auto text-[13px] font-medium text-sys-green">Live</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
