"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, ArrowLeft, Terminal } from "lucide-react";

const renderRealLogLine = (line: string, idx: number) => {
  if (!line) return null;
  const match = line.match(/^(\[\d+\/\d+\/\d+, \d+:\d+:\d+ [AP]M\])\s?(.*)/);

  if (match) {
    const timestamp = match[1];
    const content = match[2];

    let contentEl: React.ReactNode = <span className="text-zinc-300">{content}</span>;

    // Syntax highlighting logic
    if (content.includes("View it at") || content.includes("http")) {
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
    } else if (content.includes("✅") || content.includes("done") || content.includes("✨") || content.includes("🚀") || content.includes("✓")) {
      contentEl = <span className="text-emerald-400 font-medium">{content}</span>;
    } else if (content.includes("Progress:") || content.includes("Framework:") || content.includes("Build Command:") || content.includes("→")) {
      contentEl = <span className="text-cyan-400">{content}</span>;
    } else if (content.includes("Update available!") || content.includes("│") || content.includes("╭") || content.includes("╰")) {
      contentEl = <span className="text-yellow-400">{content}</span>;
    } else if (content.includes("🔨") || content.includes("📥") || content.includes("Install Command:")) {
      contentEl = <span className="text-blue-400">{content}</span>;
    }

    return (
      <div className="font-mono text-[13px] leading-snug break-all hover:bg-white/5 px-4 md:px-6 py-0.5 rounded transition-colors group cursor-crosshair flex">
        <span className="text-zinc-600 mr-2 shrink-0 inline-block w-[35px] text-right">
          [{idx + 1}]
        </span>
        <span className="text-zinc-600 mr-3 truncate shrink-0 inline-block group-hover:text-zinc-400 transition-colors w-[180px]">
          {timestamp}
        </span>
        <div className="flex-1">{contentEl}</div>
      </div>
    );
  }

  // Fallback for lines without timestamp
  return (
    <div className="font-mono text-[13px] leading-snug break-all hover:bg-white/5 px-4 md:px-6 py-0.5 rounded transition-colors group cursor-crosshair flex">
      <span className="text-zinc-600 mr-2 shrink-0 inline-block w-[35px] text-right">
        [{idx + 1}]
      </span>
      <div className="text-zinc-300 flex-1">{line}</div>
    </div>
  );
};

export default function LogsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const projectId = params.get("projectId");
  const deploymentId = params.get("deploymentId");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { token, status } = useAuth();
  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Poll deployment status
  const fetchDeploymentStatus = useCallback(async () => {
    if (!projectId || !deploymentId || status !== "authenticated" || !token) return;

    try {
      const deployment = await apiFetchAuth<{
        status: string;
        deployedUrl?: string;
      }>(`/api/projects/${projectId}/deployments/${deploymentId}`, token);

      setDeploymentStatus(deployment.status);
      if (deployment.deployedUrl) {
        setDeploymentUrl(deployment.deployedUrl);
      }

      // Check if deployment is complete
      if (deployment.status === "SUCCESS" || deployment.status === "COMPLETED" || deployment.status === "RUNNING") {
        // Only show success for SUCCESS/COMPLETED, not RUNNING
        if (deployment.status === "SUCCESS" || deployment.status === "COMPLETED") {
          setShowSuccess(true);
          setIsPaused(true); // Stop log fetching
        }
      }

      // Fetch project name if not already fetched
      if (!projectName) {
        try {
          const proj = await apiFetchAuth<{ name?: string }>(`/api/projects/${projectId}`, token);
          if (proj.name) {
            setProjectName(proj.name);
          }
        } catch(e) {
          // ignore error, fallback to ID
          setProjectName(projectId);
        }
      }

    } catch (e: any) {
      console.error("Failed to fetch deployment status:", e);
    }
  }, [projectId, deploymentId, token, status, projectName]);

  const fetchLogs = useCallback(async () => {
    if (!projectId || !deploymentId || status !== "authenticated" || !token || isPaused) return;

    const url = `${process.env.NEXT_PUBLIC_LOG_SERVICE_URL}/logs/${projectId}/${deploymentId}`;

    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/plain, */*",
        },
        cache: "no-store",
      });

      if (!r.ok) throw new Error(await r.text());

      const ct = r.headers.get("content-type") || "";

      if (ct.includes("application/json")) {
        const data = await r.json();
        if (!Array.isArray(data)) {
          setLogs([JSON.stringify(data, null, 2)]);
          return;
        }

        const newLines: string[] = [];
        for (const item of data) {
          const id = item?.id ?? `${item?.timestamp}-${item?.message}`;
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            const ts = item?.timestamp ? new Date(item.timestamp).toLocaleString() : "";
            const raw = typeof item?.message === "string" ? item.message : JSON.stringify(item?.message);

            // Fix 5: messages are batched as \n-separated lines — split each one
            const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
            for (const line of lines) {
              newLines.push(ts ? `[${ts}] ${line}` : line);
            }
          }
        }

        if (newLines.length > 0) {
          setLogs((prev) => {
            const updated = [...prev, ...newLines];
            return updated.slice(-1000);
          });
          setTimeout(scrollToBottom, 100);
        }
      } else {
        const text = await r.text();
        const lines = text.split("\n");
        setLogs((prev) => {
          const updated = [...prev, ...lines.filter((line, idx) =>
            !prev.some(p => p === line && prev.indexOf(p) === prev.length - lines.length + idx)
          )];
          return updated.slice(-1000);
        });
        setTimeout(scrollToBottom, 100);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [projectId, deploymentId, token, status, isPaused, scrollToBottom]);

  // Poll logs
  useEffect(() => {
    if (!projectId || !deploymentId) return;
    if (status !== "authenticated" || !token) return;

    fetchLogs();

    const interval = setInterval(() => {
      if (!isPaused) {
        fetchLogs();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [projectId, deploymentId, token, status, fetchLogs, isPaused]);

  // Poll deployment status
  useEffect(() => {
    if (!projectId || !deploymentId) return;
    if (status !== "authenticated" || !token) return;

    fetchDeploymentStatus();

    const interval = setInterval(() => {
      if (!showSuccess) {
        fetchDeploymentStatus();
      }
    }, 5000); // Poll status every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [projectId, deploymentId, token, status, fetchDeploymentStatus, showSuccess]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  // Normal logs view - MUST be before any conditional returns due to React hooks rules
  const displayContent = useMemo(() => {
    if (status === "loading") {
      return (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      );
    }

    if (!projectId || !deploymentId) {
      return <p className="text-muted-foreground">Pass projectId and deploymentId in query string.</p>;
    }

    if (status !== "authenticated") {
      return <p className="text-muted-foreground">Please sign in to view logs.</p>;
    }

    if (error) {
      return <p className="text-destructive">{error}</p>;
    }

    if (logs.length === 0) {
      return <div className="p-6 text-zinc-500 font-mono text-[13px]">Waiting for active terminal stream...</div>;
    }

    return (
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar">
        {logs.map((line, idx) => (
          <div key={idx}>
            {renderRealLogLine(line, idx)}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    );
  }, [status, projectId, deploymentId, error, logs]);

  // Success screen
  if (showSuccess && deploymentUrl) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/10 p-3">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">🎉 Deployment Successful!</h2>
                <p className="text-muted-foreground">
                  Your app is now live and ready to use
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground mb-2">Live URL:</p>
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-sm flex items-center justify-center gap-2"
                >
                  {deploymentUrl}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={() => window.open(deploymentUrl, "_blank")}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit App
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/project/${projectId}`)}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Project
                </Button>
              </div>

              <details className="pt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  View Build Logs
                </summary>
                <div className="mt-4 bg-muted/50 rounded-lg border p-4 max-h-[40vh] overflow-auto font-mono text-xs text-left">
                  <div className="space-y-1">
                    {logs.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap break-words leading-relaxed">
                        <span className="text-muted-foreground">[{idx + 1}]</span> {line}
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">

      {/* Header Area */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Project Logs
            {deploymentStatus && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${deploymentStatus === "DEPLOYING" || deploymentStatus === "RUNNING"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : deploymentStatus === "SUCCESS" || deploymentStatus === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : deploymentStatus === "FAILED"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                }`}>
                {deploymentStatus}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projectId && deploymentId
              ? `Streaming real-time output for ${projectName || projectId} on deployment id: ${deploymentId}`
              : "View deployment logs"}
          </p>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-xs font-semibold px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-foreground transition-colors"
        >
          {isPaused ? "▶ Resume Stream" : "⏸ Pause Stream"}
        </button>
      </div>

      {/* Terminal Window */}
      <div className="w-full h-[65vh] min-h-[500px] max-h-[800px]">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full w-full relative">

          {/* Top Traffic Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#18181b] z-10 relative">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">
                {projectName ? `${projectName} - production logs` : `bash - production logs`}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
          </div>

          {/* Log Stream Body */}
          <div className="flex flex-col flex-1 overflow-hidden relative z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,180,255,0.01),transparent_80%)] pointer-events-none" />

            {/* Real Content via displayContent */}
            {displayContent}

          </div>
        </div>
      </div>
    </div>
  );
}