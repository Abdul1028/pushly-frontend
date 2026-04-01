"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_NAME } from "@/lib/config";
import { SystemStatus } from "@/components/system-status";
import { DeployPipelineAnimation } from "@/components/deploy-pipeline-animation";
import { FrameworksAutoDetect } from "@/components/frameworks-auto-detect";
import { CustomConfigSection } from "@/components/custom-config-section";
import { GlobalEdgeSection } from "@/components/global-edge-section";
import { SslSecuritySection } from "@/components/ssl-security-section";
import { RealTimeLogsSection } from "@/components/realtime-logs-section";
import { CicdPipelineSection } from "@/components/cicd-pipeline-section";
import GlobeDemo from "@/components/globe-demo";
import {
  Code,
  Terminal,
  Package,
  GitBranch,
  Clock,
  Shield,
  Globe,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";



const frameworks = [
  { name: "Create React App", color: "bg-blue-500/10 text-blue-500" },
  { name: "Vite", color: "bg-purple-500/10 text-purple-500" },
  { name: "Astro", color: "bg-orange-500/10 text-orange-500" },
  { name: "Next.js", color: "bg-black dark:bg-white text-white dark:text-black" },
];

const packageManagers = [
  { name: "npm", icon: "📦" },
  { name: "pnpm", icon: "📦" },
  { name: "yarn", icon: "🧶" },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] w-full">
      {/* System Status Bar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full max-w-7xl flex justify-end">
        <SystemStatus />
      </div>

      {/* ── Hero Section — Immersive Animated (Stitch Design) ── */}
      <section className="relative overflow-hidden bg-background py-27 lg:py-10 flex items-center">

        <div className=" mx-auto px-4 sm:px-8 lg:px-10 w-full max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">

            {/* Left: Text content */}
            <div className="flex flex-col">
              {/* Animated badge */}
              <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold tracking-widest uppercase text-primary mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Now Supporting Next.js 14
              </div>

              {/* Headline */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-3 text-foreground">
                Push code. <br />
                <span className="neon-text-gradient">Get a live URL in seconds.</span>
              </h1>

              {/* Subtext */}
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed mb-5">
                From Git push to global deployment — instantly. Our high-performance
                edge network ensures your applications are delivered with zero
                latency and infinite scalability.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_20px_hsl(var(--primary)/0.3)] group"
                >
                  Start Deploying
                  <svg className="group-hover:translate-x-1 transition-transform" fill="none" height={20} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}>
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-card border border-border rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-accent transition-all text-foreground"
                >
                  Sign In
                  <svg fill="none" height={20} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}>
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1={15} x2={3} y1={12} y2={12} />
                  </svg>
                </button>
              </div>

            </div>

            {/* Right: Animated Deploy Pipeline */}
            <DeployPipelineAnimation />

          </div>
        </div>
      </section>

      {/* Frameworks Auto Detect UI */}
      <FrameworksAutoDetect />

      {/* Custom gitway.config.json Section */}
      <CustomConfigSection />

      {/* Infrastructure Features: CDN & SSL */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full max-w-7xl">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start h-full">
          <GlobalEdgeSection />
          <SslSecuritySection />
        </div>
      </section>


      {/* Real-time Logs Feature */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full max-w-7xl">
        <RealTimeLogsSection />
      </section>

      {/* CI/CD Pipeline Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full max-w-7xl">
        <CicdPipelineSection />
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full max-w-7xl">
        <div className="relative rounded-3xl overflow-hidden bg-zinc-950 border border-white/10 px-6 py-20 text-center shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.1),transparent_70%)] pointer-events-none" />

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 relative z-10">
            Ready to make your webapp <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">live?</span>
          </h2>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 relative z-10 leading-relaxed">
            Join the developers who trust {PRODUCT_NAME} for their frontend infrastructure. Built for absolute speed, zero configuration, and global scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Button
              size="lg"
              onClick={() => router.push("/register")}
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors gap-2 font-semibold"
            >
              Start Deploying for Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full border border-white/10 text-white hover:text-white hover:bg-white/5 transition-colors font-medium bg-transparent"
            >
              Sign In
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-zinc-500 font-medium relative z-10">
            {[
              "Zero configuration",
              "Global Edge Network",
              "Automatic SSL/TLS",
              "CI/CD Pipelines",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>




    </div>
  );
}
