"use client";

import { motion } from "motion/react";
import { Github, GitPullRequestDraft, Webhook, MessageSquare, Workflow } from "lucide-react";

export function CicdPipelineSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center bg-zinc-950 border border-border/50 rounded-3xl p-6 md:p-10 lg:p-12 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.03),transparent_50%)] pointer-events-none" />

      {/* Left Text */}
      <div className="flex flex-col z-10 w-full">
        <div className="inline-flex items-center w-fit gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <Workflow size={14} /> Full Automation
        </div>

        <h2 className="text-3xl md:text-4xl tracking-tight font-bold mb-6 text-foreground">
          Push to deploy.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Automated CI/CD.</span>
        </h2>

        <p className="text-muted-foreground text-[16px] leading-relaxed mb-8 max-w-lg">
          No need to manually write YAML scripts. Automatically generate fully-configured GitHub Actions pipelines for your absolute specific project needs using our dedicated developer portal.
        </p>

        <div className="space-y-6">
          {[
            {
              icon: <Github className="text-zinc-100" size={18} />,
              title: "Native GitHub Actions",
              desc: "Seamless integration via secure GitHub Secrets.",
            },
            {
              icon: <GitPullRequestDraft className="text-emerald-400" size={18} />,
              title: "Branch-Based Environments",
              desc: "Main branch triggers Production. Other branches deploy to isolated Staging URLs.",
            },
            {
              icon: <MessageSquare className="text-cyan-400" size={18} />,
              title: "Instant Slack Notifications",
              desc: "Get pinged immediately when a deployment completes or fails.",
            },
          ].map((feature, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex flex-shrink-0 items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Graphic - Developer Portal Link */}
      <div className="z-10 w-full">
        <div className="relative group rounded-xl overflow-hidden shadow-2xl bg-gradient-to-b from-zinc-900/50 to-[#0c0c0e] border border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] mb-8 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
              <Workflow className="text-emerald-400 z-10 animate-pulse" size={32} />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-3">Pushly Pipeline Builder</h3>
          <p className="text-muted-foreground max-w-[280px] leading-relaxed mb-8">
            Head over to the developer portal to securely generate your project's custom CI/CD integration payload.
          </p>

          <a
            href="https://developers.wareality.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 group/btn relative z-20"
          >
            Open developers.wareality.tech
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              →
            </motion.span>
          </a>
        </div>
      </div>
    </div>
  );
}
