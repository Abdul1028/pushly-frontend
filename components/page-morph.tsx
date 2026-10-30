"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

// "Get started" floods into the next page like liquid: droplets swell out of the button at
// different speeds and directions, and an SVG "goo" filter fuses them so the edge ripples and
// bulges as it spreads. The flood deepens into the destination's background, the route
// changes underneath, then the cover lifts. It plays even with reduced motion on: a short
// transition the person starts with a click (an intentional exception).

// Droplets around the button: direction (deg), how far they travel out (fraction of the
// screen diagonal), start delay, growth time. Spread wide and uneven on purpose, so the
// flood's edge stays lumpy and liquid all the way out instead of rounding into a circle.
const DROPS = [
  { a: -90, d: 0.2, delay: 0.1, dur: 0.95 },
  { a: -35, d: 0.34, delay: 0.16, dur: 0.85 },
  { a: 15, d: 0.26, delay: 0.2, dur: 0.9 },
  { a: 70, d: 0.16, delay: 0.14, dur: 1.0 },
  { a: 125, d: 0.3, delay: 0.22, dur: 0.85 },
  { a: 180, d: 0.4, delay: 0.12, dur: 0.95 },
  { a: 230, d: 0.24, delay: 0.18, dur: 0.9 },
];
const LIQUID_EASE = [0.7, 0, 0.25, 1] as const;

type Morph = {
  href: string;
  rect: { top: number; left: number; width: number; height: number };
  viewport: { width: number; height: number };
  label: string;
  fontSize: string;
  to: string;
};

const MorphContext = createContext<(href: string, el: HTMLElement, to?: string) => void>(() => {});

export function PageMorphProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [morph, setMorph] = useState<Morph | null>(null);
  const [pushedHref, setPushedHref] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const start = useCallback(
    // Default flood colour = the light fill behind the sign-up page
    (href: string, el: HTMLElement, to = "#f5f5f7") => {
      const r = el.getBoundingClientRect();
      setPushedHref(null);
      setTimedOut(false);
      router.prefetch(href);
      setMorph({
        href,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        label: el.textContent ?? "",
        fontSize: getComputedStyle(el).fontSize,
        to,
      });
      // Navigate once the liquid has flooded the screen. A timer (matching the slowest drop:
      // ~0.22s delay + ~1s growth) rather than onAnimationComplete, which never fires if the
      // tab can't draw frames — the click must always lead somewhere.
      setTimeout(() => {
        setPushedHref(href);
        router.push(href);
      }, 1250);
    },
    [router]
  );

  // The cover lifts once the destination has rendered underneath it
  const arrived = morph !== null && pushedHref === morph.href && pathname === morph.href;
  const covering = morph !== null && !arrived && !timedOut;

  // Safety net: never leave the cover up if navigation stalls
  useEffect(() => {
    if (!morph) return;
    const id = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(id);
  }, [morph]);

  return (
    <MorphContext.Provider value={start}>
      {children}
      {/* "never" overrides the app-wide reducedMotion="user" so the press scale still plays */}
      <MotionConfig reducedMotion="never">
      <AnimatePresence onExitComplete={() => setMorph(null)}>
        {morph && covering && (() => {
          const { rect, viewport: vp } = morph;
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          // Big enough to cover the screen from anywhere on it
          const full = Math.hypot(vp.width, vp.height);
          return (
            <motion.div
              key="morph"
              aria-hidden
              className="fixed inset-0 z-[100] pointer-events-none"
              exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
            >
              <svg width={vp.width} height={vp.height} viewBox={`0 0 ${vp.width} ${vp.height}`} className="absolute inset-0">
                <defs>
                  {/* Goo: blur the drops together, then snap alpha back to a hard edge */}
                  <filter id="liquid-goo" filterUnits="userSpaceOnUse" x="0" y="0" width={vp.width} height={vp.height}>
                    <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
                  </filter>
                </defs>
                <motion.g
                  filter="url(#liquid-goo)"
                  initial={{ fill: "#0071e3" }}
                  animate={{ fill: morph.to }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
                >
                  {/* The button itself, with a quick press */}
                  <motion.rect
                    x={rect.left}
                    y={rect.top}
                    width={rect.width}
                    height={rect.height}
                    rx={rect.height / 2}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 0.94, 1.04] }}
                    transition={{ duration: 0.3, times: [0, 0.45, 1], ease: "easeOut" }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                  {/* Main body of liquid swelling out of the button */}
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    initial={{ r: rect.height / 2 }}
                    animate={{ r: full }}
                    // Trails the droplets slightly, so they lead the edge
                    transition={{ duration: 1.05, ease: LIQUID_EASE, delay: 0.18 }}
                  />
                  {/* Droplets: pushed outward while they swell, merging as they meet */}
                  {DROPS.map((drop, i) => {
                    const rad = (drop.a * Math.PI) / 180;
                    return (
                      <motion.circle
                        key={i}
                        initial={{ cx, cy, r: 0 }}
                        animate={{
                          cx: cx + Math.cos(rad) * drop.d * full,
                          cy: cy + Math.sin(rad) * drop.d * full,
                          r: full * 0.8,
                        }}
                        transition={{ duration: drop.dur, ease: LIQUID_EASE, delay: drop.delay }}
                      />
                    );
                  })}
                </motion.g>
              </svg>

              {/* The button's label melts away as the liquid takes over */}
              <motion.span
                className="absolute flex items-center justify-center text-white whitespace-nowrap"
                style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, fontSize: morph.fontSize }}
                initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                animate={{ opacity: 0, scale: 1.25, filter: "blur(6px)" }}
                transition={{ duration: 0.45, delay: 0.12 }}
              >
                {morph.label}
              </motion.span>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      </MotionConfig>
    </MorphContext.Provider>
  );
}

// A link whose click grows it into the destination page
export function GrowLink({
  href,
  to,
  className,
  children,
}: {
  href: string;
  to?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const start = useContext(MorphContext);
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        // Let new-tab / modified clicks behave like a plain link
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        start(href, e.currentTarget, to);
      }}
    >
      {children}
    </Link>
  );
}
