"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SlidersHorizontal, Check, ChevronRight } from "lucide-react";
import { WindowBar } from "@/components/ui/window-bar";
import { PRODUCT_NAME } from "@/lib/config";

export function CustomConfigSection() {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <section className="w-full px-4 sm:px-6 py-24 md:py-32 relative overflow-hidden bg-black">
      <div className="mx-auto max-w-[980px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          
          {/* Left: Text Content */}
          <div className="order-2 lg:order-1 flex flex-col items-start text-left">
            <p className="text-eyebrow text-ink-2">Total control</p>
            
            <h2 className="text-section mt-2">
              Zero-config by default.
              <br />
              <span className="text-ink-2">Yours to override.</span>
            </h2>
            
            <p className="text-[17px] leading-[1.47] text-ink-2 mt-5 max-w-md">
              {PRODUCT_NAME} sets the right build for 14+ frameworks on its own, but it never locks you in.
              Drop an optional <code className="bg-surface-2 border border-hairline px-1.5 py-0.5 rounded-md font-mono text-[15px] text-ink">gitway.config.json</code> into
              your repository root to override build commands, output paths and dependencies.
            </p>

            <ul className="space-y-3 mt-7 mb-7">
              {[
                "Any package manager: npm, yarn, pnpm, bun",
                "Custom output directories",
                "Monorepo support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[17px] text-ink">
                  <Check className="size-5 text-apple-link shrink-0" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="https://developers.wareality.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-apple-link"
            >
              View configuration docs
              <ChevronRight className="size-4" aria-hidden />
            </a>
          </div>

          {/* Right: Code Editor Simulation */}
          <div className="order-1 lg:order-2 relative w-full perspective-1000">
            {/* Editor Window */}
            <motion.div 
              initial={{ rotateY: -10, rotateX: 5, z: -50 }}
              whileInView={{ rotateY: 0, rotateX: 0, z: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", bounce: 0, duration: 0.9 }}
              className="window relative w-full max-w-lg"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <WindowBar title="gitway.config.json" icon={<SlidersHorizontal size={12} />} />

              {/* Code Content */}
              <div className="p-6 font-mono text-[13px] md:text-sm leading-[1.8] relative z-10">
                <div className="text-ink-3 mb-2 font-mono text-xs">
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
                  animate={reduceMotion ? undefined : { opacity: [1, 0] }}
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
