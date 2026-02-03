"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, ArrowLeft } from "lucide-react";

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

  // New: Track deployment status
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
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
    } catch (e: any) {
      console.error("Failed to fetch deployment status:", e);
    }
  }, [projectId, deploymentId, token, status]);

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
            const msg = typeof item?.message === "string" ? item.message : JSON.stringify(item?.message);
            newLines.push(ts ? `[${ts}] ${msg}` : msg);
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
      return <p className="text-muted-foreground">No logs available yet.</p>;
    }

    return (
      <div className="space-y-1">
        {logs.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-words text-sm font-mono leading-relaxed">
            <span className="text-muted-foreground">[{idx + 1}]</span> {line}
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Deployment Logs
                {deploymentStatus && (
                  <span className={`text-sm px-2 py-1 rounded-full ${deploymentStatus === "DEPLOYING" || deploymentStatus === "RUNNING"
                    ? "bg-blue-500/10 text-blue-500"
                    : deploymentStatus === "SUCCESS" || deploymentStatus === "COMPLETED"
                      ? "bg-green-500/10 text-green-500"
                      : deploymentStatus === "FAILED"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-gray-500/10 text-gray-500"
                    }`}>
                    {deploymentStatus}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {projectId && deploymentId
                  ? `Project: ${projectId} • Deployment: ${deploymentId}`
                  : "View deployment logs"}
              </CardDescription>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg border p-4 max-h-[70vh] overflow-auto font-mono text-xs">
            {displayContent}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}