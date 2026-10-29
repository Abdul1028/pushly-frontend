"use client";

import { motion, AnimatePresence } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useEffect, useState, useRef } from "react";
import { Globe, Cpu, CheckCircle2, Terminal, Zap, Layers, Boxes, Code2 } from "lucide-react";

type Phase = "idle" | "connect" | "push" | "commit" | "build" | "deploy" | "live";

// SVG viewBox: 460 x 440
const CX = { github: 230, feature: 100, main: 360, build: 230, preview: 90, prod: 370 };
const CY = { github: 30, branch: 130, build: 260, bottom: 390 };

// Card sizes (px)
const W = { github: 100, feature: 132, main: 110, build: 200, preview: 132, prod: 116 };
const H = { github: 34, branch: 56, build: 140, url: 66 };

// Exact bezier paths
const P = {
  ghToF:     `M 230 47 C 230 74 100 74 100 102`,
  ghToM:     `M 230 47 C 230 74 360 74 360 102`,
  fToBuild:  `M 100 158 C 100 176 230 176 230 190`,
  mToBuild:  `M 360 158 C 360 176 230 176 230 190`,
  buildToPv: `M 230 330 C 230 343 90 343 90 357`,
  buildToPr: `M 230 330 C 230 343 370 343 370 357`,
};

function pct(coord: number, total: number) { return `${(coord / total) * 100}%`; }

function cardStyle(cx: number, w: number, cy: number, h: number) {
  return {
    left: `calc(${pct(cx, 460)} - ${w / 2}px)`,
    top:  `calc(${pct(cy, 440)} - ${h / 2}px)`,
    width: w,
  };
}

const BUILD_LOGS = [
  { text: "cloning repository pushly/web", color: "text-muted-foreground" },
  { text: "resolving graph...", color: "text-muted-foreground" },
  { text: "installing dependencies (2401 packages)", color: "text-ink-2" },
  { text: "running next build", color: "text-apple-green" },
  { text: "optimizing chunks & splitting...", color: "text-apple-link" },
  { text: "prerendering static pages...", color: "text-muted-foreground" },
  { text: "finalizing edge artifacts...", color: "text-ink-2" },
  { text: "deployment ready", color: "text-apple-green" }
];

export function DeployPipelineAnimation() {
  const reduceMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [logs, setLogs] = useState<{ text: string, color: string }[]>([]);
  
  const buildRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reduced motion: no loop, the finished pipeline is rendered instead
    if (reduceMotion) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = (k: number) => {
      setCycleKey(k);
      setPhase("idle");
      setProgress(0);
      setLogs([]);
      if (buildRef.current) clearInterval(buildRef.current);
      if (logRef.current) clearInterval(logRef.current);

      timers.push(setTimeout(() => setPhase("connect"), 200));
      timers.push(setTimeout(() => setPhase("push"), 1000));
      timers.push(setTimeout(() => setPhase("commit"), 1800));
      
      timers.push(setTimeout(() => {
        setPhase("build");
        
        buildRef.current = setInterval(() => {
          setProgress(p => {
            const n = p + Math.random() * 8 + 3;
            if (n >= 100) { clearInterval(buildRef.current!); return 100; }
            return n;
          });
        }, 80);

        let logIndex = 0;
        logRef.current = setInterval(() => {
          if (logIndex < BUILD_LOGS.length - 1) { // leave "ready" for deploy phase
            setLogs(prev => [...prev.slice(-3), BUILD_LOGS[logIndex]]);
            logIndex++;
          } else {
            clearInterval(logRef.current!);
          }
        }, 300); // slightly faster logs

      }, 2700));
      
      timers.push(setTimeout(() => {
        setPhase("deploy");
        setLogs(prev => [...prev.slice(-3), BUILD_LOGS[BUILD_LOGS.length - 1]]);
      }, 4700));
      
      timers.push(setTimeout(() => {
        setPhase("live");
      }, 5400));
    };

    run(0);
    let k = 1;
    const iv = setInterval(() => run(k++), 8000);
    return () => { 
      timers.forEach(clearTimeout); 
      clearInterval(iv); 
      if (buildRef.current) clearInterval(buildRef.current); 
      if (logRef.current) clearInterval(logRef.current); 
    };
  }, [reduceMotion]);

  const shown      = reduceMotion ? "live" : phase;
  const shownLogs  = reduceMotion ? BUILD_LOGS.slice(-4) : logs;
  const connecting = shown === "connect";
  const connected  = ["push","commit","build","deploy","live"].includes(shown);
  const pushing    = shown === "push";
  const committing = shown === "commit";
  const building   = ["build","deploy","live"].includes(shown);
  const deploying  = ["deploy","live"].includes(shown);
  const isLive     = shown === "live";
  const pct2       = reduceMotion ? 100 : Math.round(progress);

  return (
    <div className="relative h-[440px] w-full select-none overflow-hidden group/container">
      
      {/* ── Background Grid (Only Visible on component hover) ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-0 group-hover/container:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 100%)" }} />

      {/* ── SVG paths + dots ── */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox="0 0 460 440" preserveAspectRatio="none">
        <defs>
          <filter id="gp"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="gg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Dim paths */}
        <path d={P.ghToF} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={P.ghToM} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={P.fToBuild} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={P.mToBuild} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={P.buildToPv} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />
        <path d={P.buildToPr} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4" />

        {/* Active: push phase (GH -> Branches) */}
        {(pushing || committing || building) && <>
          <motion.path key={`ghf-${cycleKey}`} d={P.ghToF} fill="none" stroke="rgba(41,151,255,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.65 }} />
          <motion.path key={`ghm-${cycleKey}`} d={P.ghToM} fill="none" stroke="rgba(48,209,88,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.65, delay: 0.1 }} />
        </>}

        {/* Active: commit phase (Branches -> Build) */}
        {(committing || building) && <>
          <motion.path key={`fp-${cycleKey}`} d={P.fToBuild} fill="none" stroke="rgba(41,151,255,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.65 }} />
          <motion.path key={`mp-${cycleKey}`} d={P.mToBuild} fill="none" stroke="rgba(48,209,88,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.65, delay: 0.1 }} />
        </>}

        {/* Active: deploy paths (Build -> Links) */}
        {deploying && <>
          <motion.path key={`pvp-${cycleKey}`} d={P.buildToPv} fill="none" stroke="rgba(41,151,255,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55 }} />
          <motion.path key={`prp-${cycleKey}`} d={P.buildToPr} fill="none" stroke="rgba(48,209,88,0.7)" strokeWidth={1.5} initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, delay: 0.1 }} />
        </>}

        {/* Build glow ring */}
        {building && !reduceMotion && (
          <motion.circle cx={CX.build} cy={CY.build} fill="none" stroke="rgba(255,255,255,0.12)"
            initial={{ r: 76, opacity: 0.4 }} animate={{ r: [76, 105, 76], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} />
        )}

        {/* Drops: Github -> Branches */}
        {pushing && <>
          <motion.circle key={`pcdf-${cycleKey}`} r={5} fill="#2997ff" filter="url(#gp)" initial={{ cx: 230, cy: 47 }} animate={{ cx: 100, cy: 102 }} transition={{ duration: 0.75, ease: "easeInOut" }} />
          <motion.circle key={`pcdm-${cycleKey}`} r={5} fill="#30d158" filter="url(#gg)" initial={{ cx: 230, cy: 47 }} animate={{ cx: 360, cy: 102 }} transition={{ duration: 0.75, delay: 0.1, ease: "easeInOut" }} />
        </>}

        {/* Drops: Branches -> Build */}
        {committing && <>
          <motion.circle key={`cdf-${cycleKey}`} r={5} fill="#2997ff" filter="url(#gp)" initial={{ cx: 100, cy: 158 }} animate={{ cx: 230, cy: 190 }} transition={{ duration: 0.85, ease: "easeInOut" }} />
          <motion.circle key={`cdm-${cycleKey}`} r={5} fill="#30d158" filter="url(#gg)" initial={{ cx: 360, cy: 158 }} animate={{ cx: 230, cy: 190 }} transition={{ duration: 0.85, delay: 0.15, ease: "easeInOut" }} />
        </>}

        {/* Drops: Build -> Links */}
        {deploying && <>
          <motion.circle key={`ddpv-${cycleKey}`} r={4} fill="#2997ff" filter="url(#gp)" initial={{ cx: 230, cy: 330 }} animate={{ cx: 90, cy: 357 }} transition={{ duration: 0.6, ease: "easeInOut" }} />
          <motion.circle key={`ddpr-${cycleKey}`} r={4} fill="#30d158" filter="url(#gg)" initial={{ cx: 230, cy: 330 }} animate={{ cx: 370, cy: 357 }} transition={{ duration: 0.6, delay: 0.12, ease: "easeInOut" }} />
        </>}
      </svg>
      
      {/* ── Floating Framework Icons (Pop along paths) ── */}
      <AnimatePresence>
        {committing && (
           <>
            <motion.div className="absolute text-ink-2 bg-black/50 rounded-full p-1" style={{ top: '35%', left: '35%' }} initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: -10 }} exit={{ opacity: 0, scale: 0 }} transition={{ delay: 0.3 }}><Code2 size={12} /></motion.div>
            <motion.div className="absolute text-apple-link bg-black/50 rounded-full p-1" style={{ top: '38%', right: '35%' }} initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: -10 }} exit={{ opacity: 0, scale: 0 }} transition={{ delay: 0.5 }}><Layers size={12} /></motion.div>
            <motion.div className="absolute text-apple-green bg-black/50 rounded-full p-1" style={{ top: '42%', left: '42%' }} initial={{ opacity: 0, scale: 0, y: 10 }} animate={{ opacity: 1, scale: 1, y: -10 }} exit={{ opacity: 0, scale: 0 }} transition={{ delay: 0.7 }}><Zap size={12} /></motion.div>
           </>
        )}
      </AnimatePresence>

      {/* ── GitHub Node ── */}
      <motion.div className="absolute" style={cardStyle(CX.github, W.github, CY.github, H.github)} whileHover={{ scale: 1.05 }}>
        <AnimatePresence mode="popLayout">
          {connected ? (
            <motion.div key={`ghc-${cycleKey}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-apple-green/10 border border-apple-green/40 rounded-full h-full flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(48,209,88,0.15)] cursor-default tooltip-trigger">
               <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="text-[#30d158]">✓</motion.span>
               <span className="text-[9px] font-mono font-bold text-[#30d158]">Connected</span>
            </motion.div>
          ) : (
            <motion.div key={`ghi-${cycleKey}`} className="bg-surface-2 border border-hairline rounded-full h-full flex items-center justify-center gap-1.5 cursor-default">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
               </svg>
               <span className="text-[9px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                 {connecting ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity }}>Connecting</motion.span> : "GitHub"}
               </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Feature Branch Card ── */}
      <motion.div className="absolute group" style={cardStyle(CX.feature, W.feature, CY.branch, H.branch)} whileHover={{ scale: 1.05 }}>
        <motion.div className="bg-surface-2 rounded-xl p-2.5 border relative z-10" animate={{ borderColor: committing || building ? "rgba(41,151,255,0.65)" : "rgba(255,255,255,0.1)", boxShadow: committing || building ? "0 0 18px rgba(41,151,255,0.2)" : "none" }}>
          <div className="flex items-center gap-1.5">
            <motion.div className="w-2 h-2 rounded-full bg-apple-link" animate={{ scale: committing ? [1, 1.6, 1] : 1 }} transition={{ repeat: committing ? Infinity : 0, duration: 0.8 }} />
            <span className="text-[9px] font-mono text-apple-link font-semibold">feature branch</span>
          </div>
          <AnimatePresence>
             {committing && <motion.p key="fc" className="mt-1.5 text-[8px] font-mono text-muted-foreground" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>git push</motion.p>}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ── Main Branch Card ── */}
      <motion.div className="absolute group" style={cardStyle(CX.main, W.main, CY.branch, H.branch)} whileHover={{ scale: 1.05 }}>
        <motion.div className="bg-surface-2 rounded-xl p-2.5 border relative z-10" animate={{ borderColor: committing || building ? "rgba(48,209,88,0.65)" : "rgba(255,255,255,0.1)", boxShadow: committing || building ? "0 0 18px rgba(48,209,88,0.2)" : "none" }}>
          <div className="flex items-center gap-1.5">
            <motion.div className="w-2 h-2 rounded-full bg-apple-green" animate={{ scale: committing ? [1, 1.6, 1] : 1 }} transition={{ repeat: committing ? Infinity : 0, duration: 0.8, delay: 0.2 }} />
            <span className="text-[9px] font-mono text-apple-green font-semibold">main branch</span>
          </div>
          <AnimatePresence>
            {committing && <motion.p key="mc" className="mt-1.5 text-[8px] font-mono text-muted-foreground" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>git push</motion.p>}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ── Build Node with Larger Streaming Terminal ── */}
      <motion.div className="absolute" style={cardStyle(CX.build, W.build, CY.build, H.build)} whileHover={{ scale: 1.05, zIndex: 30 }}>
        <motion.div className="bg-surface-2 rounded-xl p-3 border flex flex-col h-full shadow-xl" animate={{ borderColor: building ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)", boxShadow: building ? "0 0 40px rgba(255,255,255,0.06)" : "none" }}>
          
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <motion.div animate={{ rotate: building && pct2 < 100 ? 360 : 0 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Cpu className="w-4 h-4 text-ink-2" />
            </motion.div>
            <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">Build Server</span>
            <span className="ml-auto text-[9px] font-mono font-bold tabular-nums text-ink-2">{building ? `${pct2}%` : "—"}</span>
          </div>
          
          <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
            <motion.div className="h-full rounded-full" style={{ background: "#2997ff" }} animate={{ width: `${building ? pct2 : 0}%` }} transition={{ duration: 0.1 }} />
          </div>
          
          {/* Enhanced Terminal */}
          <div className="bg-black rounded-lg border border-white/10 flex-1 p-2.5 overflow-hidden relative shadow-inner flex flex-col">
            {/* Terminal macOS-style dots */}
            <div className="flex items-center gap-1 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-apple-green/80" />
                <div className="ml-auto opacity-30 px-1">
                  <Terminal size={10} />
                </div>
            </div>

            <div className="flex flex-col justify-end h-full flex-1">
               {shownLogs.length === 0 && <span className="text-[8px] font-mono text-muted-foreground/40 leading-tight">waiting for commit hook...</span>}
               {shownLogs.filter(Boolean).map((log, i) => (
                 <motion.div key={`${cycleKey}-${i}`} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className={`text-[8px] font-mono leading-relaxed truncate flex gap-1.5 ${log?.color || "text-muted-foreground"}`}>
                   <span className="text-ink-3 select-none">~</span> {log?.text || ""}
                 </motion.div>
               ))}
               {(building && pct2 < 100) && <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-2.5 bg-ink-2 mt-1" />}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Preview URL Card ── */}
      <AnimatePresence>
        {deploying && (
          <motion.div key={`pv-${cycleKey}`} className="absolute group z-20" style={cardStyle(CX.preview, W.preview, CY.bottom, H.url)}
            initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }} whileHover={{ scale: 1.05 }}>
            <motion.div className="bg-surface-2 rounded-xl p-2.5 border relative" animate={{ borderColor: isLive ? "rgba(41,151,255,0.7)" : "rgba(41,151,255,0.3)", boxShadow: isLive ? "0 0 20px rgba(41,151,255,0.22)" : "none" }}>
              <div className="flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 text-apple-link" />
                <span className="text-[8px] font-bold text-apple-link uppercase tracking-wide">Preview</span>
                {isLive && <motion.div className="ml-auto" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}><CheckCircle2 className="w-3 h-3 text-apple-green" /></motion.div>}
              </div>
              <p className="text-[8px] font-mono text-muted-foreground truncate hover:text-white transition-colors cursor-pointer">feature.pushly.app</p>
              <div className="flex items-center gap-1 mt-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-apple-link" animate={reduceMotion ? undefined : { opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} />
                <span className="text-[7px] text-muted-foreground">{isLive ? "Staging live" : "Deploying…"}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Production URL Card ── */}
      <AnimatePresence>
        {deploying && (
          <motion.div key={`pr-${cycleKey}`} className="absolute group z-20" style={cardStyle(CX.prod, W.prod, CY.bottom, H.url)}
            initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.12 }} whileHover={{ scale: 1.05 }}>
            <motion.div className="bg-surface-2 rounded-xl p-2.5 border relative" animate={{ borderColor: isLive ? "rgba(48,209,88,0.7)" : "rgba(48,209,88,0.3)", boxShadow: isLive ? "0 0 20px rgba(48,209,88,0.18)" : "none" }}>
              <div className="flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 text-apple-green" />
                <span className="text-[8px] font-bold text-apple-green uppercase tracking-wide">Production</span>
                {isLive && <motion.div className="ml-auto" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, delay: 0.1 }}><CheckCircle2 className="w-3 h-3 text-apple-green" /></motion.div>}
              </div>
              <p className="text-[8px] font-mono text-muted-foreground truncate hover:text-white transition-colors cursor-pointer">myapp.pushly.app</p>
              <div className="flex items-center gap-1 mt-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-apple-green" animate={reduceMotion ? undefined : { opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.3, delay: 0.3 }} />
                <span className="text-[7px] text-muted-foreground">{isLive ? "Production live" : "Deploying…"}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
