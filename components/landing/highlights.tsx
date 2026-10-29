"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useScroll, useTransform } from "motion/react";
import { ChevronLeft, ChevronRight, GitBranch, Lock, Check, RotateCcw } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SplitHeadline } from "./split-headline";

/* ── Card visuals: quiet, product-like, no glow ── */

// One object that changes: the command chip reshapes into a build, then into the live URL.
const PUSH_STAGES = [
  { key: "push", hold: 1500, caption: "You push" },
  { key: "build", hold: 1500, caption: "It builds" },
  { key: "live", hold: 2600, caption: "It’s live" },
] as const;

function PushVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setTimeout(() => setStage((s) => (s + 1) % PUSH_STAGES.length), PUSH_STAGES[stage].hold);
    return () => clearTimeout(id);
  }, [inView, stage]);

  const key = PUSH_STAGES[stage].key;
  const live = key === "live";
  const swap = { initial: { opacity: 0, filter: "blur(4px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(4px)" } };

  return (
    <div ref={ref} className="flex flex-col items-center gap-5">
      <motion.div
        layout
        transition={{ layout: { type: "spring", bounce: 0.15, duration: 0.7 } }}
        animate={{
          backgroundColor: live ? "#ffffff" : key === "build" ? "#1d1d1f" : "#f5f5f7",
          borderRadius: live ? 16 : 10,
          boxShadow: live ? "0 16px 40px -16px rgba(0,0,0,0.35)" : "0 0 0 rgba(0,0,0,0)",
        }}
        className="flex items-center justify-center overflow-hidden border border-black/10"
        style={{ padding: live ? "16px 22px" : "12px 18px" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {key === "push" && (
            <motion.span key="push" {...swap} className="font-mono text-[15px] text-label whitespace-nowrap">
              <span className="text-label-3">$ </span>git push origin main
            </motion.span>
          )}
          {key === "build" && (
            <motion.span key="build" {...swap} className="flex items-center gap-2.5 text-[15px] text-white whitespace-nowrap">
              <span className="size-3.5 rounded-full border-2 border-white/25 border-t-white animate-spin" aria-hidden />
              Building storefront
            </motion.span>
          )}
          {key === "live" && (
            <motion.span key="live" {...swap} className="flex items-center gap-3 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-sys-green" />
              <span className="text-[17px] text-label font-medium">storefront.pushly.app</span>
              <span className="text-[12px] font-medium text-sys-green">Live</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Step dots + caption */}
      <div className="flex items-center gap-2" aria-hidden>
        {PUSH_STAGES.map((st, i) => (
          <span
            key={st.key}
            className={i === stage ? "h-1.5 w-5 rounded-full bg-label transition-all duration-500" : "h-1.5 w-1.5 rounded-full bg-label/20 transition-all duration-500"}
          />
        ))}
      </div>
      <p className="text-[13px] text-label-3 h-4">{PUSH_STAGES[stage].caption}</p>
    </div>
  );
}

const FRAMEWORKS = ["Next.js", "React", "Vue", "Nuxt", "Svelte", "SvelteKit", "Astro", "Vite", "Angular", "Remix", "Gatsby", "Expo", "SolidJS", "Qwik"];

function FrameworksVisual() {
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 max-w-[440px] text-[24px] md:text-[28px] font-semibold tracking-[-0.035em]">
      {FRAMEWORKS.map((f, i) => (
        <span key={f} className={i % 4 === 0 ? "text-label" : "text-label-3/60"}>
          {f}
        </span>
      ))}
    </div>
  );
}

function PreviewVisual() {
  const rows = [
    { env: "Production", branch: "main", url: "storefront.pushly.app" },
    { env: "Preview", branch: "feat/checkout", url: "feat-checkout.storefront.pushly.app" },
    { env: "Preview", branch: "fix/cart", url: "fix-cart.storefront.pushly.app" },
  ];
  return (
    <div className="w-full max-w-[420px] rounded-xl border border-black/10 bg-white divide-y divide-black/[0.06] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]">
      {rows.map((r) => (
        <div key={r.url} className="flex items-center gap-3 px-4 py-3">
          <GitBranch className="size-4 text-label-3 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-label">{r.branch}</p>
            <p className="text-[12px] text-label-3 truncate">{r.url}</p>
          </div>
          <span className={r.env === "Production" ? "text-[11px] font-medium text-white bg-label rounded-md px-2 py-0.5" : "text-[11px] font-medium text-label-2 bg-fill rounded-md px-2 py-0.5"}>
            {r.env}
          </span>
        </div>
      ))}
    </div>
  );
}

function HttpsVisual() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Lock className="size-20 text-label" strokeWidth={1.25} aria-hidden />
      <div className="flex items-center gap-2 rounded-full bg-fill px-4 py-2 text-[15px]">
        <span className="text-sys-green">https://</span>
        <span className="text-label">www.yourdomain.com</span>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[13px] text-label-2">
        <Check className="size-4 text-sys-green" aria-hidden /> Certificate issued and renewing automatically
      </span>
    </div>
  );
}

function LogsVisual() {
  const lines = [
    ["12:05:05", "Cloning storefront@main"],
    ["12:05:05", "Detected Next.js · pnpm"],
    ["12:05:06", "pnpm install"],
    ["12:05:12", "pnpm build"],
    ["12:05:19", "Uploading to edge network"],
  ];
  return (
    <div className="w-full max-w-[440px] rounded-xl bg-[#fbfbfd] border border-black/[0.08] p-4 font-mono text-[12.5px] leading-[1.9]">
      {lines.map(([t, l]) => (
        <div key={l} className="flex gap-4">
          <span className="text-label-3 tabular-nums">{t}</span>
          <span className="text-label">{l}</span>
        </div>
      ))}
      <div className="flex gap-4">
        <span className="text-label-3 tabular-nums">12:05:21</span>
        <span className="text-sys-green font-medium">Ready — storefront.pushly.app</span>
      </div>
    </div>
  );
}

function RollbackVisual() {
  const versions = [
    { v: "v42", note: "Fix cart total rounding", active: true },
    { v: "v41", note: "New product grid", active: false },
    { v: "v40", note: "Checkout copy update", active: false },
  ];
  return (
    <div className="w-full max-w-[420px] rounded-xl border border-black/10 bg-white divide-y divide-black/[0.06] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]">
      {versions.map((r) => (
        <div key={r.v} className="flex items-center gap-3 px-4 py-3">
          <span className="text-[13px] font-semibold text-label w-8 tabular-nums">{r.v}</span>
          <p className="flex-1 min-w-0 text-[13px] text-label-2 truncate">{r.note}</p>
          {r.active ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-label-2">
              <span className="size-2 rounded-full bg-sys-green" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[12px] text-link">
              <RotateCcw className="size-3" aria-hidden /> Roll back
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const CARDS = [
  { title: "Push to deploy.", body: "Every commit to main goes live on its own. No buttons, no scripts.", Visual: PushVisual },
  { title: "Fourteen frameworks.", body: "Zero configuration. Pushly reads your repo and sets the right build.", Visual: FrameworksVisual },
  { title: "A URL for every branch.", body: "Preview each change before it reaches production.", Visual: PreviewVisual },
  { title: "HTTPS, handled.", body: "Certificates are issued and renewed for every domain you connect.", Visual: HttpsVisual },
  { title: "Watch it build.", body: "Logs stream line by line while your app builds.", Visual: LogsVisual },
  { title: "Undo in one click.", body: "Roll production back to any earlier release instantly.", Visual: RollbackVisual },
];

/* ── Pinned track: scrolling down slides the cards sideways ── */

function PinnedHighlights() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  // How far the track must travel so the last card ends flush with the content edge
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setShift(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.04, 0.96], [0, -shift]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.08], [0.4, 1]);

  return (
    // Vertical distance matches horizontal travel, so the cards move 1:1 with the scroll
    <section
      id="highlights"
      ref={sectionRef}
      className="relative bg-fill"
      style={{ height: `calc(100svh + ${shift}px)` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col justify-center py-16">
        <motion.div style={{ opacity: titleOpacity }} className="mx-auto w-full max-w-[980px] px-4 sm:px-6">
          <SplitHeadline className="text-headline text-label" lines={["Get the highlights."]} />
        </motion.div>

        <motion.div
          ref={trackRef}
          style={{ x }}
          className="mt-8 md:mt-10 flex gap-5 w-max px-[max(1rem,calc((100vw-980px)/2+1.5rem))] will-change-transform"
          role="list"
          aria-label="Highlights"
        >
          {CARDS.map(({ title, body, Visual }) => (
            <article
              key={title}
              role="listitem"
              className="shrink-0 w-[82vw] sm:w-[500px] lg:w-[560px] h-[min(62svh,560px)] rounded-2xl bg-white flex flex-col overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <h3 className="text-[24px] md:text-[28px] leading-[1.15] font-semibold tracking-[-0.03em] text-label">
                  {title} <span className="text-label-2">{body}</span>
                </h3>
              </div>
              <div className="flex-1 flex items-center justify-center px-6 pb-10">
                <Visual />
              </div>
            </article>
          ))}
        </motion.div>

        {/* Progress */}
        <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 mt-8">
          <div className="h-[3px] w-40 rounded-full bg-fill-2 overflow-hidden">
            <motion.div className="h-full bg-label origin-left" style={{ scaleX: scrollYProgress }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Highlights() {
  const reduceMotion = usePrefersReducedMotion();
  // Sideways motion tied to scroll is too much with reduced motion — offer the swipeable carousel instead
  return reduceMotion ? <CarouselHighlights /> : <PinnedHighlights />;
}

/* ── Carousel (reduced motion): swipe or use the paddles ── */

function CarouselHighlights() {
  const scroller = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [edge, setEdge] = useState({ start: true, end: false });

  const updateEdges = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    el.addEventListener("scrollend", updateEdges);
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      el.removeEventListener("scrollend", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section id="highlights" className="scroll-mt-12 bg-fill py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <SplitHeadline className="text-headline text-label" lines={["Get the highlights."]} />
      </div>

      <div
        ref={scroller}
        className="mt-10 md:mt-12 flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-[max(1rem,calc((100vw-980px)/2+1.5rem))] px-[max(1rem,calc((100vw-980px)/2+1.5rem))] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Highlights"
      >
        {CARDS.map(({ title, body, Visual }, i) => (
          <motion.article
            key={`${title}-${reduceMotion}`}
            data-card
            role="listitem"
            initial={reduceMotion ? false : { opacity: 0, x: 60 }}
            // Always land at x: 0 — the server renders the offset start before it knows the preference
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ type: "spring", bounce: 0, duration: 1, delay: Math.min(i, 3) * 0.08 }}
            whileHover={reduceMotion ? undefined : { scale: 1.01 }}
            className="snap-start shrink-0 w-[85vw] sm:w-[520px] lg:w-[600px] h-[520px] md:h-[580px] rounded-2xl bg-white flex flex-col overflow-hidden"
          >
            <div className="p-8 md:p-10">
              <h3 className="text-[24px] md:text-[28px] leading-[1.15] font-semibold tracking-[-0.03em] text-label">
                {title} <span className="text-label-2">{body}</span>
              </h3>
            </div>
            <motion.div
              className="flex-1 flex items-center justify-center px-6 pb-10"
              initial={reduceMotion ? false : { scale: 1.08, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", bounce: 0, duration: 1.2, delay: 0.15 + Math.min(i, 3) * 0.08 }}
            >
              <Visual />
            </motion.div>
          </motion.article>
        ))}
      </div>

      {/* Paddle controls */}
      <div className="mx-auto max-w-[980px] px-4 sm:px-6 mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => page(-1)}
          disabled={edge.start}
          aria-label="Previous highlight"
          className="size-11 rounded-full bg-fill-2 text-label grid place-items-center transition-colors hover:bg-[#dcdce1] disabled:opacity-40 disabled:hover:bg-fill-2 active:scale-[0.95] motion-reduce:active:scale-100"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          disabled={edge.end}
          aria-label="Next highlight"
          className="size-11 rounded-full bg-fill-2 text-label grid place-items-center transition-colors hover:bg-[#dcdce1] disabled:opacity-40 disabled:hover:bg-fill-2 active:scale-[0.95] motion-reduce:active:scale-100"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
