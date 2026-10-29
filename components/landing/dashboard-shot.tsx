"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Lock, GitBranch, RotateCcw, Rocket } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";

// The hero's product shot: the Pushly dashboard in a Safari-style window. It comes alive
// once it's on screen — a build finishes, then the release reaches production — and loops.

type Status = "Ready" | "Building";
type Activity = { id: string; title: string; detail: string; note: string; status: Status; time: string };

const BASE_ACTIVITY: Activity[] = [
  { id: "a1", title: "Production", detail: "storefront · main", note: "Fix cart total rounding", status: "Ready", time: "2m" },
  { id: "a2", title: "Preview", detail: "docs · feat/search", note: "Add search index", status: "Building", time: "now" },
  { id: "a3", title: "Rolled back", detail: "marketing-site · v41", note: "Restored previous release", status: "Ready", time: "1h" },
  { id: "a4", title: "Preview", detail: "storefront · feat/checkout", note: "Apple Pay button", status: "Ready", time: "3h" },
];

const RELEASE: Activity = {
  id: "a0",
  title: "Production",
  detail: "docs · main",
  note: "Merged feat/search",
  status: "Building",
  time: "now",
};

// Timeline of one loop (ms after the shot appears)
const T_PREVIEW_READY = 1600;
const T_RELEASE_START = 3200;
const T_RELEASE_READY = 5200;
const T_RESET = 9000;

function StatusDot({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-label-2">
      <span className="relative flex size-2">
        {status === "Building" && (
          <span className="absolute inset-0 rounded-full bg-sys-orange animate-ping opacity-60" />
        )}
        <span
          className={
            status === "Ready"
              ? "relative size-2 rounded-full bg-sys-green transition-colors duration-500"
              : "relative size-2 rounded-full bg-sys-orange transition-colors duration-500"
          }
        />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        >
          {status}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function DashboardShot() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const [step, setStep] = useState(0);

  // Advance the story while visible; pause (and keep state) when scrolled away
  useEffect(() => {
    if (!inView) return;
    const ids = [
      setTimeout(() => setStep(1), T_PREVIEW_READY),
      setTimeout(() => setStep(2), T_RELEASE_START),
      setTimeout(() => setStep(3), T_RELEASE_READY),
      setTimeout(() => setStep(0), T_RESET),
    ];
    const loop = setInterval(() => {
      ids.push(
        setTimeout(() => setStep(1), T_PREVIEW_READY),
        setTimeout(() => setStep(2), T_RELEASE_START),
        setTimeout(() => setStep(3), T_RELEASE_READY),
        setTimeout(() => setStep(0), T_RESET)
      );
    }, T_RESET + 400);
    return () => {
      ids.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [inView]);

  const docsStatus: Status = step >= 1 ? "Ready" : "Building";
  const projects: { name: string; url: string; branch: string; status: Status; time: string }[] = [
    { name: "storefront", url: "storefront.pushly.app", branch: "main", status: "Ready", time: "2m ago" },
    { name: "marketing-site", url: "marketing.pushly.app", branch: "main", status: "Ready", time: "1h ago" },
    { name: "docs", url: "docs.pushly.app", branch: step >= 2 ? "main" : "feat/search", status: step === 2 ? "Building" : docsStatus, time: "Just now" },
  ];
  const activity: Activity[] = [
    ...(step >= 2 ? [{ ...RELEASE, status: (step >= 3 ? "Ready" : "Building") as Status }] : []),
    ...BASE_ACTIVITY.map((a) => (a.id === "a2" ? { ...a, status: docsStatus } : a)),
  ].slice(0, 4);

  return (
    <div
      ref={ref}
      className="relative rounded-xl border border-black/10 bg-white overflow-hidden text-left shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35),0_10px_30px_-10px_rgba(0,0,0,0.12)]"
      aria-label={`${PRODUCT_NAME} dashboard`}
      role="img"
    >
      {/* Safari toolbar */}
      <div className="relative flex items-center h-11 px-4 bg-[#f6f6f6] border-b border-black/[0.08]">
        <div className="flex gap-2" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-7 px-3 sm:w-[340px] justify-center rounded-md bg-black/[0.05] text-[12px] text-label-2">
          <Lock className="size-3" aria-hidden />
          pushly.app/dashboard
        </div>
      </div>

      {/* App header */}
      <div className="flex items-center gap-6 h-12 px-5 border-b border-black/[0.06]">
        <span className="text-[15px] font-semibold text-label tracking-[-0.022em]">{PRODUCT_NAME}</span>
        <div className="hidden sm:flex gap-5 text-[13px]">
          <span className="text-label font-medium">Projects</span>
          <span className="text-label-3">Deployments</span>
          <span className="text-label-3">Domains</span>
          <span className="text-label-3">Settings</span>
        </div>
        <span className="ml-auto size-7 rounded-full bg-fill-2 text-[11px] font-semibold text-label-2 grid place-items-center">AK</span>
      </div>

      <div className="grid md:grid-cols-[1.35fr_1fr]">
        {/* Projects */}
        <div className="p-5 md:p-6 md:border-r border-black/[0.06]">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-[17px] font-semibold text-label tracking-[-0.022em]">Projects</h3>
            <span className="text-[13px] text-link">New project</span>
          </div>
          <div className="divide-y divide-black/[0.06] rounded-lg border border-black/[0.08]">
            {projects.map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-3.5">
                <span className="size-9 shrink-0 rounded-lg bg-fill text-[13px] font-semibold text-label grid place-items-center uppercase">
                  {p.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-label truncate">{p.name}</p>
                  <p className="text-[12px] text-label-3 truncate">{p.url}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <StatusDot status={p.status} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-label-3">
                    <GitBranch className="size-3" aria-hidden />
                    {p.branch} · {p.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="hidden md:block p-6 bg-[#fbfbfd]">
          <h3 className="text-[17px] font-semibold text-label tracking-[-0.022em] mb-4">Activity</h3>
          <ol className="space-y-4">
            <AnimatePresence initial={false} mode="popLayout">
              {activity.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: -14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                  className="flex gap-3"
                >
                  <span className="mt-0.5 size-6 shrink-0 rounded-full bg-white border border-black/[0.08] grid place-items-center">
                    {a.title === "Rolled back" ? (
                      <RotateCcw className="size-3 text-label-2" aria-hidden />
                    ) : a.id === "a0" ? (
                      <Rocket className="size-3 text-label-2" aria-hidden />
                    ) : (
                      <span className={a.status === "Ready" ? "size-1.5 rounded-full bg-sys-green" : "size-1.5 rounded-full bg-sys-orange"} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-label">{a.title}</p>
                      <StatusDot status={a.status} />
                    </div>
                    <p className="text-[12px] text-label-2 truncate">{a.detail}</p>
                    <p className="text-[12px] text-label-3 truncate">{a.note}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </div>
      </div>

      {/* Toast when the release goes live */}
      <AnimatePresence>
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="absolute bottom-5 right-5 flex items-center gap-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-black/10 px-4 py-3 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.25)]"
          >
            <span className="size-2 rounded-full bg-sys-green" />
            <span className="text-[13px] text-label font-medium">docs.pushly.app is live</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
