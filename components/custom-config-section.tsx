"use client";

import { motion } from "motion/react";
import { Settings, SlidersHorizontal, ArrowRight } from "lucide-react";

export function CustomConfigSection() {
  return (
    <section className="w-full py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Text Content */}
          <div className="order-2 lg:order-1 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <Settings size={14} /> Total Control
            </div>
            
            <h2 className="text-3xl tracking-tight font-bold mb-5 text-foreground">
              Zero-config by default. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Highly customizable
              </span> when needed.
            </h2>
            
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-6 max-w-md">
              While Gitway natively detects and configures optimal build settings for 14+ frameworks automatically, we don't lock you in. 
            </p>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-8 max-w-md">
              Drop an optional <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-primary">gitway.config.json</code> into your root directory to override build commands, output paths, and exact dependencies effortlessly.
            </p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-foreground/80 font-medium tracking-wide">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                Any Package Manager (npm, yarn, pnpm, bun)
              </li>
              <li className="flex items-center gap-3 text-sm text-foreground/80 font-medium tracking-wide">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                Custom Output Directories
              </li>
              <li className="flex items-center gap-3 text-sm text-foreground/80 font-medium tracking-wide">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                Monorepo Support
              </li>
            </ul>

            <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors group">
              View configuration docs 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right: Code Editor Simulation */}
          <div className="order-1 lg:order-2 relative w-full perspective-1000">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-gradient-to-br from-primary/30 to-blue-500/20 blur-[80px] rounded-full opacity-50 pointer-events-none -z-10" />

            {/* Editor Window */}
            <motion.div 
              initial={{ rotateY: -10, rotateX: 5, z: -50 }}
              whileInView={{ rotateY: 0, rotateX: 0, z: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-[#050505] rounded-2xl border border-white/10 p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group overflow-hidden w-full max-w-lg shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Subtle glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent rounded-2xl pointer-events-none" />

              {/* Window Header */}
              <div className="flex items-center pb-4 border-b border-white/5 mb-5 relative z-10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground tracking-widest">
                  gitway.config.json
                </div>
                <div className="ml-auto text-muted-foreground/40">
                  <SlidersHorizontal size={14} />
                </div>
              </div>

              {/* Code Content */}
              <div className="font-mono text-[13px] md:text-sm leading-[1.8] tracking-wide relative z-10">
                <div className="text-white/60 mb-2 font-mono text-xs">
                  // All fields are optional overrides
                </div>
                <div><span className="text-[#aeb5c0]">{"{"}</span></div>
                <div className="pl-4">
                  <span className="text-[#61afef]">"buildCommand"</span>
                  <span className="text-[#aeb5c0]">: </span>
                  <span className="text-[#98c379]">"pnpm run build"</span><span className="text-[#aeb5c0]">,</span>
                </div>
                <div className="pl-4">
                  <span className="text-[#61afef]">"installCommand"</span>
                  <span className="text-[#aeb5c0]">: </span>
                  <span className="text-[#98c379]">"pnpm install"</span><span className="text-[#aeb5c0]">,</span>
                </div>
                <div className="pl-4">
                  <span className="text-[#61afef]">"outputDirectory"</span>
                  <span className="text-[#aeb5c0]">: </span>
                  <span className="text-[#98c379]">"out"</span>
                </div>
                <div><span className="text-[#aeb5c0]">{"}"}</span></div>
                
                {/* Blinking trailing cursor */}
                <motion.div 
                  className="inline-block w-2 bg-white/40 h-4 translate-y-1 ml-1"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                />
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
