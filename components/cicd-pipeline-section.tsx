"use client";

import { Github, GitPullRequestDraft, MessageSquare, Workflow, ChevronRight } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/config";

export function CicdPipelineSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">

      {/* Left Text */}
      <div className="flex flex-col z-10 w-full">
        <p className="text-eyebrow text-ink-2">Automation</p>

        <h2 className="text-section mt-2">
          Push to deploy.
          <br />
          <span className="text-ink-2">CI/CD, generated.</span>
        </h2>

        <p className="text-[17px] leading-[1.47] text-ink-2 mt-5 mb-9 max-w-lg">
          Skip the YAML. Generate a fully configured GitHub Actions pipeline for your project from
          the developer portal.
        </p>

        <div className="space-y-6">
          {[
            {
              icon: <Github className="text-ink" size={18} />,
              title: "Native GitHub Actions",
              desc: "Seamless integration via secure GitHub Secrets.",
            },
            {
              icon: <GitPullRequestDraft className="text-ink" size={18} />,
              title: "Branch-Based Environments",
              desc: "Main branch triggers Production. Other branches deploy to isolated Staging URLs.",
            },
            {
              icon: <MessageSquare className="text-ink" size={18} />,
              title: "Instant Slack Notifications",
              desc: "Get pinged immediately when a deployment completes or fails.",
            },
          ].map((feature, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-hairline flex flex-shrink-0 items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-ink">{feature.title}</h3>
                <p className="text-[15px] text-ink-2 mt-0.5 leading-[1.47]">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Graphic - Developer Portal Link */}
      <div className="z-10 w-full">
        <div className="relative rounded-[28px] bg-surface border border-hairline p-10 flex flex-col items-center justify-center min-h-[420px] text-center">
          {/* App-icon style mark */}
          <div className="w-20 h-20 rounded-[22px] bg-gradient-to-b from-[#2997ff] to-apple-blue flex items-center justify-center mb-7 shadow-[0_12px_30px_-8px_rgba(0,113,227,0.6)]">
            <Workflow className="text-white" size={36} strokeWidth={1.75} />
          </div>

          <h3 className="text-title text-ink mb-3">{PRODUCT_NAME} Pipeline Builder</h3>
          <p className="text-[17px] text-ink-2 max-w-[300px] leading-[1.47] mb-8">
            Head over to the developer portal to securely generate your project's custom CI/CD integration payload.
          </p>

          <a
            href="https://developers.wareality.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-apple relative z-20"
          >
            Open the developer portal
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
