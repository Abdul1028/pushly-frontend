"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Github, GitPullRequest, Eye, Rocket, ChevronRight, GitBranch, Check, Lock } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SplitHeadline } from "./split-headline";
import { Reveal } from "./reveal";

const DOCS_URL = "https://developers.wareality.tech";

/* ── Step visuals ── */

function ConnectVisual() {
  return (
    <div className="w-full max-w-[360px] rounded-xl bg-white border border-black/[0.08] divide-y divide-black/[0.06] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
      {["acme/storefront", "acme/docs", "acme/marketing-site"].map((r, i) => (
        <div key={r} className="flex items-center gap-3 px-4 py-3">
          <Github className="size-4 text-label-2" aria-hidden />
          <span className="text-[14px] text-label flex-1">{r}</span>
          {i === 0 ? (
            <span className="text-[12px] font-medium text-white bg-apple-blue rounded-full px-3 py-1">Import</span>
          ) : (
            <span className="text-[12px] text-link">Import</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PushVisual() {
  return (
    <div className="w-full max-w-[360px] space-y-3">
      <div className="rounded-xl bg-white border border-black/[0.08] px-4 py-3 font-mono text-[13px] text-label shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
        <span className="text-label-3">$ </span>git push origin feat/checkout
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-white border border-black/[0.08] px-4 py-3 text-[13px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
        <GitBranch className="size-4 text-label-3" aria-hidden />
        <span className="text-label">feat/checkout</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-label-2">
          <span className="size-2 rounded-full bg-sys-orange" /> Building
        </span>
      </div>
    </div>
  );
}

function ReviewVisual() {
  return (
    <div className="w-full max-w-[360px] rounded-xl bg-white border border-black/[0.08] overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-1.5 h-9 px-3 bg-[#f6f6f6] border-b border-black/[0.06] text-[11px] text-label-2">
        <Lock className="size-3" aria-hidden /> feat-checkout.storefront.pushly.app
      </div>
      <div className="p-5 space-y-2.5">
        <div className="h-3 w-2/3 rounded bg-fill-2" />
        <div className="h-3 w-full rounded bg-fill" />
        <div className="h-3 w-5/6 rounded bg-fill" />
        <div className="mt-4 h-9 w-32 rounded-full bg-label" />
      </div>
    </div>
  );
}

function MergeVisual() {
  return (
    <div className="w-full max-w-[360px] rounded-xl bg-white border border-black/[0.08] p-5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 text-[13px] text-label-2">
        <GitPullRequest className="size-4" aria-hidden /> Merged into main
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-fill px-4 py-3">
        <span className="size-5 rounded-full bg-sys-green grid place-items-center">
          <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
        </span>
        <span className="text-[14px] text-label">storefront.pushly.app</span>
        <span className="ml-auto text-[12px] font-medium text-sys-green">Production</span>
      </div>
    </div>
  );
}

const STEPS = [
  { Icon: Github, title: "Connect.", body: "Import a repository from GitHub, or paste any Git URL.", Visual: ConnectVisual, tint: "bg-[#f5f5f7]" },
  { Icon: GitPullRequest, title: "Push a branch.", body: "Every branch builds on its own preview URL, automatically.", Visual: PushVisual, tint: "bg-[#eef3fb]" },
  { Icon: Eye, title: "Review.", body: "Share the preview link. Check it on any device before it ships.", Visual: ReviewVisual, tint: "bg-[#f3f0fa]" },
  { Icon: Rocket, title: "Merge.", body: "Main goes to production. Roll back any time with one click.", Visual: MergeVisual, tint: "bg-[#eef7f0]" },
];

/* ── Stack ── */

function StackCard({
  i,
  total,
  progress,
  reduce,
}: {
  i: number;
  total: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const { Icon, title, body, Visual, tint } = STEPS[i];
  // Once the next card starts sliding over, this one recedes: slightly smaller, slightly darker
  const start = (i + 1) / total;
  const scale = useTransform(progress, [start - 0.1, 1], [1, 1 - (total - 1 - i) * 0.05]);
  const shade = useTransform(progress, [start - 0.1, 1], [0, i === total - 1 ? 0 : 0.18]);

  return (
    <div className="sticky h-[78svh] md:h-[72svh]" style={{ top: `calc(5.5rem + ${i * 22}px)` }}>
      <motion.div
        style={reduce ? { scale: 1 } : { scale, transformOrigin: "50% 0%" }}
        className={`relative h-[min(560px,64svh)] rounded-3xl ${tint} overflow-hidden shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.25)]`}
      >
        <div className="h-full grid md:grid-cols-2">
          <div className="p-8 md:p-12 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="size-11 rounded-full bg-white grid place-items-center shadow-sm">
                <Icon className="size-5 text-label" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[13px] font-medium text-label-3 tabular-nums">Step {i + 1} of {total}</span>
            </div>
            <h3 className="mt-auto text-section text-label">{title}</h3>
            <p className="mt-3 text-[17px] leading-[1.47] text-label-2 max-w-[360px]">{body}</p>
          </div>
          <div className="hidden md:flex items-center justify-center p-10">
            <Visual />
          </div>
        </div>
        {/* Dimming veil (a colour change, so it runs with reduced motion too) */}
        <motion.div aria-hidden style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-black" />
      </motion.div>
    </div>
  );
}

export function WorkflowStack() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="workflow" className="scroll-mt-12 bg-white pt-24 md:pt-32 pb-12">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <div className="text-center">
          <Reveal>
            <p className="text-eyebrow text-label-2">Workflow</p>
          </Reveal>
          <SplitHeadline className="text-headline text-label mt-2" lines={["From pull request", "to production."]} />
          <Reveal delay={0.2}>
            <p className="text-lede text-label-2 mt-5 max-w-[600px] mx-auto">
              {PRODUCT_NAME} fits the way you already work in Git. Generate a GitHub Actions pipeline
              from the developer portal, or just push.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="mt-14 md:mt-20">
          {STEPS.map((_, i) => (
            <StackCard key={i} i={i} total={STEPS.length} progress={scrollYProgress} reduce={reduce} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="btn-link">
            Open the developer portal
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
