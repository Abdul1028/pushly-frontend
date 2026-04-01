"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Unlock, ShieldCheck } from "lucide-react";

export function SslSecuritySection() {
  const [isSecure, setIsSecure] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText = "project.gitway.app";

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      while (mounted) {
        setIsSecure(false);
        setTypedText("");

        // Wait before starting to type
        await new Promise((r) => setTimeout(r, 1000));
        if (!mounted) return;

        // Type out the domain
        for (let i = 0; i <= fullText.length; i++) {
          if (!mounted) return;
          setTypedText(fullText.slice(0, i));
          await new Promise((r) => setTimeout(r, 60));
        }

        // Wait a slight beat before securing it
        if (!mounted) return;
        await new Promise((r) => setTimeout(r, 600));
        if (!mounted) return;

        // Trigger secure animation
        setIsSecure(true);

        // Let it sit in the secure state for a few seconds
        await new Promise((r) => setTimeout(r, 4500));
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [fullText]);

  return (
    <div className="flex flex-col md:flex-row xl:flex-col h-full bg-zinc-950 border border-border/50 rounded-3xl overflow-hidden relative">
      {/* Text Content */}
      <div className="flex flex-col items-start text-left pt-8 px-8 md:p-10 xl:pt-8 xl:px-8 z-20 md:w-1/2 xl:w-full justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <ShieldCheck size={14} /> Built-in Security
        </div>

        <h2 className="text-3xl tracking-tight font-bold mb-5 text-foreground">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Zero-Config SSL</span> for every app.
        </h2>

        <ul className="space-y-3">
          {[
            "Auto generates and renews Let's Encrypt certificates",
            "Wildcard SSL/TLS for all custom hostnames",
            "Modern TLS 1.3 encryption enabled by default",
          ].map((feature, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-foreground/80">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* The Browser Mockup */}
      <div className="relative w-full h-[350px] shrink-0 md:h-auto xl:h-[350px] md:w-1/2 xl:w-full flex items-center justify-center mt-auto md:mt-0 xl:mt-auto overflow-hidden p-8 md:py-10 md:px-8 xl:p-0">
        {/* Glow behind */}
        <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Browser Window */}
        <div className="w-full max-w-[450px] bg-[#09090b] border border-border/50 shadow-xl shadow-emerald-500/5 rounded-xl overflow-hidden flex flex-col">

          {/* Browser Header */}
          <div className="bg-[#18181b] border-b border-border/50 px-4 py-3 flex items-center gap-4">
            {/* Traffic Lights */}
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>

            {/* Address Bar */}
            <div className="flex-1 bg-black/40 border border-white/5 rounded-md py-2 px-3 flex items-center justify-center gap-1.5 transition-all duration-500 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {isSecure ? (
                  <motion.div
                    key="secure"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <Lock size={12} className="text-emerald-500" />
                    <span className="text-emerald-500 text-xs font-semibold tracking-wide">https://</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="insecure"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <Unlock size={12} className="text-muted-foreground/50" />
                    <span className="text-muted-foreground/50 text-xs font-medium tracking-wide">http://</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center w-fit relative overflow-hidden text-xs font-mono tracking-tight text-zinc-200">
                <span className={isSecure ? "text-emerald-400" : ""}>{typedText}</span>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="inline-block w-[1.5px] h-3.5 bg-zinc-400 align-middle ml-[2px]"
                  style={{ display: typedText.length === fullText.length && isSecure ? "none" : "inline-block" }}
                />
              </div>
            </div>
          </div>

          {/* Browser Body Mockup */}
          <div className="p-8 h-[220px] bg-black/50 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{
                opacity: isSecure ? 1 : 0.4,
                y: isSecure ? 0 : 5,
                filter: isSecure ? "blur(0px)" : "blur(8px)"
              }}
              transition={{ duration: 0.8, delay: isSecure ? 0.2 : 0 }}
              className="w-full flex flex-col items-center gap-5"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center relative z-10">
                  <ShieldCheck size={32} className="text-black" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-white font-semibold text-lg">Connection is secure</h3>
                <p className="text-sm text-zinc-400">Your information is protected by 256-bit encryption.</p>
              </div>

              <div className="flex gap-2 w-full max-w-[200px] mt-2 justify-center">
                <div className="w-1/2 h-1.5 bg-zinc-800 rounded-full" />
                <div className="w-1/4 h-1.5 bg-emerald-500/50 rounded-full" />
              </div>
            </motion.div>

            {/* Scanline decoration overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
