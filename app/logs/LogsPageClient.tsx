"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogsPage() {
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const deploymentId = params.get("deploymentId");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { token, status } = useAuth();
  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
            // Limit to last 1000 lines for performance
            return updated.slice(-1000);
          });
          // Auto-scroll if near bottom
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

  useEffect(() => {
    if (!projectId || !deploymentId) return;
    if (status !== "authenticated" || !token) return;

    // Initial fetch immediately
    fetchLogs();
    
    // Poll every 3 seconds (reduced from 2 seconds for better performance)
    const interval = setInterval(() => {
      if (!isPaused) {
        fetchLogs();
      }
    }, 3000);
    
    return () => {
      clearInterval(interval);
    };
  }, [projectId, deploymentId, token, status, fetchLogs, isPaused]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs</CardTitle>
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