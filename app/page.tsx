"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_NAME } from "@/lib/config";
import { SystemStatus } from "@/components/system-status";
import {
  Rocket,
  Zap,
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

const features = [
  {
    icon: Code,
    title: "Framework Support",
    description: "Deploy Create React App, Vite, Astro, and more with zero configuration",
  },
  {
    icon: Package,
    title: "Package Manager Support",
    description: "Works seamlessly with npm, pnpm, and yarn. Your choice, our platform.",
  },
  {
    icon: Terminal,
    title: "Real-time Logs",
    description: "Monitor your deployments with live streaming logs and instant updates",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description: "Connect your GitHub repos and deploy automatically on every push",
  },
  {
    icon: Clock,
    title: "Fast Deployments",
    description: "Get your webapp live in seconds with our optimized build pipeline",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security with SSL certificates and secure connections",
  },
  {
    icon: Globe,
    title: "Global CDN",
    description: "Serve your content from edge locations worldwide for lightning-fast performance",
  },
  {
    icon: Activity,
    title: "Performance Monitoring",
    description: "Track metrics, uptime, and performance analytics in real-time",
  },
];

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

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full max-w-7xl">
        <div className="flex flex-col items-center justify-center text-center space-y-6 mx-auto w-full">
          <Badge variant="secondary" className="mb-4">
            <Rocket className="h-3 w-3 mr-1" />
            Make Your Webapp Live
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl max-w-4xl mx-auto">
            Deploy Your Projects
            <br />
            <span className="text-primary">In Seconds</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground px-4">
            {PRODUCT_NAME} supports your favorite frameworks and package managers. 
            Get real-time logs, instant deployments, and make your webapp live with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 items-center justify-center">
            <Button size="lg" onClick={() => router.push("/register")} className="text-lg px-8 w-full sm:w-auto">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/login")}
              className="text-lg px-8 w-full sm:w-auto"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Frameworks & Package Managers */}
      <section className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Supported Frameworks
                </CardTitle>
                <CardDescription>
                  Deploy your favorite frameworks with zero configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {frameworks.map((framework) => (
                    <Badge key={framework.name} variant="outline" className={framework.color}>
                      {framework.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Package Managers
                </CardTitle>
                <CardDescription>
                  Use your preferred package manager, we support them all
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {packageManagers.map((pm) => (
                    <div key={pm.name} className="flex items-center gap-2">
                      <span className="text-2xl">{pm.icon}</span>
                      <span className="font-medium">{pm.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full max-w-7xl">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Everything You Need to Deploy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Powerful features to get your webapp live, monitor performance, and scale effortlessly
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Real-time Logs Feature */}
      <section className="border-t bg-muted/50">
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
