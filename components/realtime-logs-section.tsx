"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const RAW_LOGS = [
  "[1] [3/27/2026, 12:05:05 PM] Build Started... (ENV: PRODUCTION)",
  "[2] [3/27/2026, 12:05:05 PM] 📌 Commit SHA:: ddb82b1",
  "[3] [3/27/2026, 12:05:05 PM] 💬 Commit Message: (fix): responsiveness",
  "[4] [3/27/2026, 12:05:05 PM] 🔍 Detecting framework...",
  "[5] [3/27/2026, 12:05:05 PM] 🔍 Scanning dependencies (19 found)...",
  "[6] [3/27/2026, 12:05:05 PM] ✅ Framework matched: angular",
  "[7] [3/27/2026, 12:05:05 PM] 📦 Detected: angular",
  "[8] [3/27/2026, 12:05:05 PM] 📦 Package manager detected: pnpm",
  "[9] [3/27/2026, 12:05:05 PM] 🔧 Build Configuration Resolution:",
  "[10] [3/27/2026, 12:05:05 PM] Framework:        angular",
  "[11] [3/27/2026, 12:05:05 PM] Package Manager:  pnpm",
  "[12] [3/27/2026, 12:05:05 PM] Install Command:  pnpm install",
  "[13] [3/27/2026, 12:05:05 PM] Build Command:    pnpm build",
  "[14] [3/27/2026, 12:05:05 PM] Output Directory: dist/ng-pokedex",
  "[15] [3/27/2026, 12:05:05 PM] 📍 Source: UI Override",
  "[16] [3/27/2026, 12:05:06 PM] 📥 Installing dependencies: pnpm install",
  "[17] [3/27/2026, 12:05:06 PM] 🔨 Building project: pnpm build",
  "[18] [3/27/2026, 12:05:07 PM] Lockfile is up to date, resolution step is skipped",
  "[19] [3/27/2026, 12:05:07 PM] Progress: resolved 1, reused 0, downloaded 0, added 0",
  "[20] [3/27/2026, 12:05:07 PM] Packages: +472",
  "[21] [3/27/2026, 12:05:07 PM] +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++",
  "[22] [3/27/2026, 12:05:07 PM] ╭──────────────────────────────────────────╮",
  "[23] [3/27/2026, 12:05:07 PM] │                                          │",
  "[24] [3/27/2026, 12:05:07 PM] │   Update available! 10.29.3 → 10.33.0.   │",
  "[25] [3/27/2026, 12:05:07 PM] │   Changelog: https://pnpm.io/v/10.33.0   │",
  "[26] [3/27/2026, 12:05:07 PM] │     To update, run: pnpm add -g pnpm     │",
  "[27] [3/27/2026, 12:05:07 PM] │                                          │",
  "[28] [3/27/2026, 12:05:07 PM] ╰──────────────────────────────────────────╯",
  "[29] [3/27/2026, 12:05:08 PM] Progress: resolved 472, reused 0, downloaded 13, added 3",
  "[30] [3/27/2026, 12:05:09 PM] Progress: resolved 472, reused 0, downloaded 83, added 28",
  "[31] [3/27/2026, 12:05:10 PM] Progress: resolved 472, reused 0, downloaded 192, added 84",
  "[32] [3/27/2026, 12:05:11 PM] Progress: resolved 472, reused 0, downloaded 335, added 287",
  "[33] [3/27/2026, 12:05:12 PM] Progress: resolved 472, reused 0, downloaded 471, added 472, done",
  "[34] [3/27/2026, 12:05:12 PM] .../node_modules/@parcel/watcher install$ node scripts/build-from-source.js",
  "[35] [3/27/2026, 12:05:12 PM] .../node_modules/msgpackr-extract install$ node-gyp-build-optional-packages",
  "[36] [3/27/2026, 12:05:12 PM] .../esbuild@0.25.5/node_modules/esbuild postinstall$ node install.js",
  "",
  "[37] [3/27/2026, 12:05:14 PM] ✨ Perfect! Production build completed in 7.2s.",
  "[38] [3/27/2026, 12:05:15 PM] 🚀 Webapp seamlessly deployed to global edge network.",
  "[39] [3/27/2026, 12:05:15 PM] View it at https://project.gitway.app"
];

const renderLogLine = (line: string) => {
  if (!line) return <br />;
  const match = line.match(/^(\[\d+\] \[\d+\/\d+\/\d+, \d+:\d+:\d+ [AP]M\])\s?(.*)/);

  if (match) {
    const timestamp = match[1];
    const content = match[2];

    // Highlighting rules to make it look totally authentic
    let contentEl: React.ReactNode = <span className="text-zinc-300">{content}</span>;

    if (content.includes("View it at")) {
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const parts = content.split(url);
        contentEl = (
          <span className="text-emerald-400 font-medium">
            {parts[0]}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-4 hover:text-white transition-colors relative z-20">
              {url}
            </a>
            {parts[1]}
          </span>
        );
      }
    } else if (content.includes("✅") || content.includes("done") || content.includes("✨") || content.includes("🚀")) {
      contentEl = <span className="text-emerald-400 font-medium">{content}</span>;
    } else if (content.includes("Progress:") || content.includes("Framework:") || content.includes("Build Command:")) {
      contentEl = <span className="text-cyan-400">{content}</span>;
    } else if (content.includes("Update available!") || content.includes("│") || content.includes("╭") || content.includes("╰")) {
      contentEl = <span className="text-yellow-400">{content}</span>;
    } else if (content.includes("🔨") || content.includes("📥") || content.includes("Install Command:")) {
      contentEl = <span className="text-blue-400">{content}</span>;
    }

    return (
      <div className="font-mono text-[13px] leading-snug break-all hover:bg-white/5 px-2 py-0.5 rounded transition-colors group cursor-crosshair">
        <span className="text-zinc-600 mr-3 truncate shrink-0 inline-block group-hover:text-zinc-400 transition-colors w-[260px] md:w-auto">
          {timestamp}
        </span>
        {contentEl}
      </div>
    );
  }
  return <div className="font-mono text-[13px] text-zinc-300 px-2 py-0.5">{line}</div>;
};

export function RealTimeLogsSection() {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

    const streamLogs = () => {
      if (!isSubscribed) return;

      if (i < RAW_LOGS.length) {
        setVisibleLines(prev => [...prev, RAW_LOGS[i]]);
        i++;

        // Dynamic typing speed: fast for info, slow for dependencies
        let delay = Math.random() * 80 + 20;
        if (RAW_LOGS[i] && RAW_LOGS[i].includes("Progress:")) {
          delay = Math.random() * 200 + 100;
        } else if (RAW_LOGS[i] && RAW_LOGS[i].includes("✨")) {
          delay = 1000;
        } else if (RAW_LOGS[i] && RAW_LOGS[i].includes("🚀")) {
          delay = 1200;
        } else if (RAW_LOGS[i] && RAW_LOGS[i].includes("View it at")) {
          delay = 500;
        }

        timeoutId = setTimeout(streamLogs, delay);
      } else {
        // Wait 8 seconds before restarting loop
        timeoutId = setTimeout(() => {
          if (!isSubscribed) return;
          setVisibleLines([]);
          i = 0;
          streamLogs();
        }, 8000);
      }
    };

    streamLogs();

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-zinc-950 border border-border/50 rounded-3xl p-6 md:p-10 lg:p-12 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,180,255,0.03),transparent_70%)] pointer-events-none" />

      {/* Left Text */}
      <div className="lg:col-span-5 flex flex-col z-10">
        <div className="inline-flex items-center w-fit gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
          <Activity size={14} /> Total Transparency
        </div>

        <h2 className="text-3xl md:text-4xl tracking-tight font-bold mb-6 text-foreground">
          Real-time <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">streaming logs.</span>
        </h2>

        <p className="text-muted-foreground text-[16px] leading-relaxed mb-8 max-w-lg">
          No black boxes here. Watch your deployments execute live as we stream the terminal directly to your dashboard. Understand exactly what your container is doing, exactly as it happens.
        </p>

        <ul className="space-y-4">
          {[
            "Live stdout/stderr stream from container directly to client",
            "Auto-formatted ansi-colors with smart parsing",
            "Detailed timestamping and operation tracking",
          ].map((feature, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-foreground/80">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Right Log Window */}
      <div className="lg:col-span-7 z-10 w-full h-[400px] md:h-[500px]">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-blue-900/10 flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#18181b]">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">Gitway Project Logs</span>
            </div>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
          </div>

          {/* Log Stream Body */}
          <div
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar"
          >
            <AnimatePresence>
              {visibleLines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderLogLine(line)}
                </motion.div>
              ))}

              {/* Blinking cursor at the end to simulate loading state optionally or just leave blank */}
              {visibleLines.length > 0 && visibleLines.length < RAW_LOGS.length && (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2 h-4 bg-zinc-500 mt-1 ml-2 inline-block"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
