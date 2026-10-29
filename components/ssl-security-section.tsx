"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Lock, Unlock, ShieldCheck } from "lucide-react";

export function SslSecuritySection() {
  const reduceMotion = usePrefersReducedMotion();
  const [secureState, setIsSecure] = useState(false);
  const [typedState, setTypedText] = useState("");
  const fullText = "project.pushly.app";
  // Reduced motion: hold the secured end state instead of re-typing on a loop
  const isSecure = reduceMotion || secureState;
  const typedText = reduceMotion ? fullText : typedState;

  useEffect(() => {
    if (reduceMotion) return;
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
  }, [fullText, reduceMotion]);

  return (
    <div className="flex flex-col md:flex-row lg:flex-col h-full bg-surface border border-hairline rounded-[28px] overflow-hidden relative">
      {/* Text Content */}
      <div className="flex flex-col items-start text-left pt-9 px-8 md:p-10 lg:pt-9 lg:px-9 z-20 md:w-1/2 lg:w-full justify-center">
        <p className="text-[15px] font-semibold text-ink-2">Security</p>

        <h3 className="text-title mt-1.5 mb-4 text-ink">
          Automatic HTTPS for every app.
        </h3>

        <ul className="space-y-3">
          {[
            "Auto generates and renews Let's Encrypt certificates",
            "Wildcard SSL/TLS for all custom hostnames",
            "Modern TLS 1.3 encryption enabled by default",
          ].map((feature, idx) => (
            <li key={idx} className="flex items-center gap-3 text-[15px] text-ink-2">
              <div className="w-1.5 h-1.5 rounded-full bg-apple-green" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* The Browser Mockup */}
      <div className="relative w-full h-[350px] shrink-0 md:h-auto lg:h-[350px] md:w-1/2 lg:w-full flex items-center justify-center mt-auto md:mt-0 lg:mt-auto overflow-hidden p-8 md:py-10 md:px-8 lg:px-8 lg:pb-8 lg:pt-4">
        {/* Glow behind */}

        {/* Browser Window */}
        <div className="window w-full max-w-[450px] flex flex-col">

          {/* Browser Header */}
          <div className="bg-surface-2 border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-4">
            {/* Traffic Lights */}
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>

            {/* Address Bar */}
            <div className="flex-1 bg-black/50 border border-white/5 rounded-lg py-1.5 px-3 flex items-center justify-center gap-1.5 transition-all duration-500 overflow-hidden relative">
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
                    <Lock size={12} className="text-apple-green" />
                    <span className="text-apple-green text-xs font-semibold tracking-wide">https://</span>
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
                <span className={isSecure ? "text-apple-green" : ""}>{typedText}</span>
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
          <div className="p-8 h-[220px] bg-black flex flex-col items-center justify-center relative overflow-hidden">
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
                <div className="absolute inset-0 bg-apple-green/25 blur-xl rounded-full" />
                <div className="w-16 h-16 rounded-full bg-apple-green flex items-center justify-center relative z-10">
                  <ShieldCheck size={32} className="text-black" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h4 className="text-ink font-semibold text-lg">Connection is secure</h4>
                <p className="text-sm text-ink-2">Your information is protected by 256-bit encryption.</p>
              </div>

              <div className="flex gap-2 w-full max-w-[200px] mt-2 justify-center">
                <div className="w-1/2 h-1.5 bg-zinc-800 rounded-full" />
                <div className="w-1/4 h-1.5 bg-apple-green/50 rounded-full" />
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
