"use client";

import { motion, type Variants } from "motion/react";
import { Check, Eye, EyeOff, Github, GitBranch, RotateCcw, Globe } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Reveal } from "./reveal";
import { SplitHeadline } from "./split-headline";

// Feature grid. Each tile rises in on scroll, lifts slightly on hover, and plays one
// small animation of its own the first time it's seen.

function Tile({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: number;
  children: React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <Reveal delay={delay} className={className}>
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="h-full rounded-2xl bg-white p-7 md:p-8 flex flex-col overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)] transition-shadow duration-300"
      >
        {children}
      </motion.div>
    </Reveal>
  );
}

function TileText({ title, body }: { title: string; body: string }) {
  return (
    <h3 className="text-[21px] md:text-[24px] leading-[1.2] font-semibold tracking-[-0.03em] text-label">
      {title} <span className="text-label-2">{body}</span>
    </h3>
  );
}

const list: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } };
const row: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.6 } },
};

function EnvVars() {
  const vars = [
    { key: "DATABASE_URL", shown: false },
    { key: "STRIPE_SECRET_KEY", shown: false },
    { key: "NEXT_PUBLIC_SITE_URL", value: "https://storefront.pushly.app", shown: true },
  ];
  return (
    <motion.div
      variants={list}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      className="mt-8 rounded-xl border border-black/[0.08] divide-y divide-black/[0.06] font-mono text-[12.5px]"
    >
      {vars.map((v) => (
        <motion.div key={v.key} variants={row} className="flex items-center gap-3 px-4 py-3">
          <span className="text-label truncate">{v.key}</span>
          <span className="ml-auto text-label-3 truncate max-w-[50%]">{v.shown ? v.value : "••••••••••••"}</span>
          {v.shown ? <Eye className="size-3.5 text-label-3 shrink-0" aria-hidden /> : <EyeOff className="size-3.5 text-label-3 shrink-0" aria-hidden />}
        </motion.div>
      ))}
    </motion.div>
  );
}

function Domain() {
  return (
    <div className="mt-auto pt-8 space-y-2.5">
      <div className="flex items-center gap-2 rounded-lg bg-fill px-3.5 py-2.5 text-[14px] text-label">
        <Globe className="size-4 text-label-3" aria-hidden />
        www.yourstore.com
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.6, delay: 0.6 }}
          className="ml-auto size-5 rounded-full bg-sys-green grid place-items-center"
        >
          <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
        </motion.span>
      </div>
      <p className="text-[12px] text-label-3 pl-1">DNS verified · certificate active</p>
    </div>
  );
}

function BuildBars() {
  const heights = [48, 72, 40, 88, 60, 96, 70, 84];
  return (
    <div className="mt-auto pt-8 flex items-end gap-2 h-36" aria-hidden>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", bounce: 0, duration: 0.9, delay: 0.3 + i * 0.06 }}
          style={{ height: `${h}%` }}
          className={i === heights.length - 1 ? "flex-1 rounded-md bg-apple-blue origin-bottom" : "flex-1 rounded-md bg-fill-2 origin-bottom"}
        />
      ))}
    </div>
  );
}

function Rollback() {
  return (
    <div className="mt-auto pt-8 flex items-center gap-3">
      <motion.div
        initial={{ rotate: 0 }}
        whileInView={{ rotate: -360 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", bounce: 0, duration: 1.4, delay: 0.4 }}
        className="size-14 rounded-full bg-fill grid place-items-center"
      >
        <RotateCcw className="size-6 text-label" aria-hidden />
      </motion.div>
      <div className="text-[13px]">
        <p className="text-label font-medium">v41 restored</p>
        <p className="text-label-3">Production · 2s</p>
      </div>
    </div>
  );
}

function GitHubTile() {
  return (
    <div className="mt-auto pt-8 flex items-center gap-4">
      <Github className="size-12 text-label" strokeWidth={1.25} aria-hidden />
      <div className="space-y-1.5 text-[13px]">
        {["main → Production", "feat/* → Preview"].map((t, i) => (
          <motion.p
            key={t}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.4 + i * 0.15 }}
            className="flex items-center gap-1.5 text-label-2"
          >
            <GitBranch className="size-3.5" aria-hidden />
            {t}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

export function Bento() {
  return (
    <section className="bg-fill py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <SplitHeadline
          className="text-headline text-label"
          lines={["Everything you need.", { text: "Nothing you don’t.", muted: true }]}
        />

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-6 gap-5 auto-rows-[minmax(300px,auto)]">
          <Tile delay={0} className="md:col-span-4">
            <TileText title="Environment variables." body="Set them per project. They apply on your next deploy." />
            <EnvVars />
          </Tile>
          <Tile delay={0.08} className="md:col-span-2">
            <TileText title="Custom domains." body="Point DNS, we do the rest." />
            <Domain />
          </Tile>
          <Tile delay={0} className="md:col-span-2">
            <TileText title="Instant rollback." body="Any release, one click." />
            <Rollback />
          </Tile>
          <Tile delay={0.08} className="md:col-span-2">
            <TileText title="GitHub, built in." body="Branches map to environments." />
            <GitHubTile />
          </Tile>
          <Tile delay={0.16} className="md:col-span-2">
            <TileText title="Build history." body="Every deploy, with its status and logs." />
            <BuildBars />
          </Tile>
        </div>
      </div>
    </section>
  );
}
