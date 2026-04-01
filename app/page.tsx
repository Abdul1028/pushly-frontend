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
      <section className="relative overflow-hidden bg-background py-6 lg:py-8 flex items-center">

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
      <section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full max-w-7xl">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Real-time Logs</CardTitle>
              </div>
              <CardDescription className="text-base">
                Monitor your deployments with live streaming logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background border rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <div className="text-muted-foreground">
                  <span className="text-green-500">$</span> {PRODUCT_NAME.toLowerCase()} deploy
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-blue-400">→ Building your project...</div>
                  <div className="text-green-400">✓ Build completed successfully</div>
                  <div className="text-blue-400">→ Deploying to production...</div>
                  <div className="text-green-400">✓ Your webapp is now live!</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full max-w-7xl">
        <Card className="bg-primary text-primary-foreground border-primary max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4">Ready to Make Your Webapp Live?</CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg">
              Join developers who trust {PRODUCT_NAME} to deploy their projects
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {[
                "Zero configuration",
                "Instant deployments",
                "Real-time monitoring",
                "Global CDN",
              ].map((item) => (
                <Badge key={item} variant="secondary" className="bg-primary-foreground/10 text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {item}
                </Badge>
              ))}
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => router.push("/register")}
              className="text-lg px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>




    </div>
  );
}
