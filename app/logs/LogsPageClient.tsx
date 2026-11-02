"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Check, CheckCircle2, ChevronLeft, Copy, ExternalLink, GitBranch, GitCommitHorizontal, Pause, Play, XCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { cn } from "@/lib/utils";
import { btn, EnvPill, isInProgress, StatusDot } from "@/components/project/ui";

// Build logs in the pushly-ui style: a light console with line numbers and timestamps, that
// follows new output, plus a calm result banner. Same log-service and status polling as before.

type DeploymentInfo = {
  status: string;
  deployedUrl?: string | null;
  environment?: string;
  gitBranch?: string;
  gitCommitHash?: string;
  gitCommitMessage?: string;
};

const DONE_OK = ["SUCCESS", "COMPLETED"];
const DONE_BAD = ["FAILED", "STOPPED"];

// Colour only where it carries meaning
function lineTone(text: string) {
  if (/\b(error|failed|fatal|err!)\b/i.test(text) || text.includes("❌")) return "text-sys-red";
  if (/\bwarn(ing)?\b/i.test(text)) return "text-[#c93400]";
  if (/(✅|✨|🚀|✓|\bdone\b|\bsuccess)/i.test(text)) return "text-[#248a3d]";
  return "text-label";
}

function LogLine({ line, n }: { line: string; n: number }) {
  const m = line.match(/^\[(\d+\/\d+\/\d+, \d+:\d+:\d+(?: [AP]M)?)\]\s?(.*)/);
  const ts = m?.[1];
  const text = m ? m[2] : line;
  const url = text.match(/(https?:\/\/[^\s]+)/)?.[1];
  const body = url ? (
    <>
      {text.split(url)[0]}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-2">
        {url}
      </a>
      {text.split(url)[1]}
    </>
  ) : (
    text
  );
  return (
    <div className="flex gap-3 px-4 md:px-5 py-px hover:bg-black/[0.03]">
      <span className="w-8 shrink-0 text-right text-label-3 select-none tabular-nums">{n}</span>
      {ts && <span className="hidden md:inline w-[168px] shrink-0 text-label-3 select-none tabular-nums">{ts}</span>}
      <span className={cn("flex-1 min-w-0 whitespace-pre-wrap break-words", lineTone(text))}>{body}</span>
    </div>
  );
}

export default function LogsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const projectId = params.get("projectId");
  const deploymentId = params.get("deploymentId");
  const { token, status } = useAuth();

  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const [copied, setCopied] = useState(false);
  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const consoleRef = useRef<HTMLDivElement>(null);

  const st = (deployment?.status ?? "").toUpperCase();
  const finished = DONE_OK.includes(st) || DONE_BAD.includes(st);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Project name for the back link
  useEffect(() => {
    if (!projectId || !token) return;
    apiFetchAuth<{ name?: string }>(`/api/projects/${projectId}`, token)
      .then((p) => setProjectName(p?.name ?? null))
      .catch(() => setProjectName(null));
  }, [projectId, token]);

  const fetchDeploymentStatus = useCallback(async () => {
    if (!projectId || !deploymentId || !token) return;
    try {
      const d = await apiFetchAuth<DeploymentInfo>(`/api/projects/${projectId}/deployments/${deploymentId}`, token);
      setDeployment(d);
    } catch (e) {
      console.error("Failed to fetch deployment status:", e);
    }
  }, [projectId, deploymentId, token]);

  const fetchLogs = useCallback(async () => {
    if (!projectId || !deploymentId || !token) return;
    const url = `${process.env.NEXT_PUBLIC_LOG_SERVICE_URL}/logs/${projectId}/${deploymentId}`;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "text/plain, */*" }, cache: "no-store" });
      if (!r.ok) throw new Error((await r.text()) || `Logs request failed (${r.status})`);
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
          if (seenIdsRef.current.has(id)) continue;
          seenIdsRef.current.add(id);
          const ts = item?.timestamp ? new Date(item.timestamp).toLocaleString() : "";
          const raw = typeof item?.message === "string" ? item.message : JSON.stringify(item?.message);
          // Messages arrive batched as \n-separated lines
          for (const line of raw.split("\n").map((l: string) => l.trim()).filter(Boolean)) newLines.push(ts ? `[${ts}] ${line}` : line);
        }
        if (newLines.length > 0) setLogs((prev) => [...prev, ...newLines].slice(-1000));
      } else {
        const lines = (await r.text()).split("\n");
        setLogs((prev) =>
          [...prev, ...lines.filter((line, idx) => !prev.some((p) => p === line && prev.indexOf(p) === prev.length - lines.length + idx))].slice(-1000)
        );
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load logs.");
    }
  }, [projectId, deploymentId, token]);

  // Logs every 3s until paused or finished (one last fetch after finishing catches the final lines)
  useEffect(() => {
    if (!projectId || !deploymentId || status !== "authenticated" || !token || isPaused) return;
    void fetchLogs();
    if (finished) return;
    const t = setInterval(fetchLogs, 3000);
    return () => clearInterval(t);
  }, [projectId, deploymentId, status, token, isPaused, finished, fetchLogs]);

  // Status every 5s until the build has finished
  useEffect(() => {
    if (!projectId || !deploymentId || status !== "authenticated" || !token || finished) return;
    void fetchDeploymentStatus();
    const t = setInterval(fetchDeploymentStatus, 5000);
    return () => clearInterval(t);
  }, [projectId, deploymentId, status, token, finished, fetchDeploymentStatus]);

  // Follow the newest line unless the reader has scrolled up
  useEffect(() => {
    const el = consoleRef.current;
    if (el && follow) el.scrollTop = el.scrollHeight;
  }, [logs, follow]);

  const onConsoleScroll = () => {
    const el = consoleRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom !== follow) setFollow(nearBottom);
  };

  const copyLogs = async () => {
    await navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commit = deployment?.gitCommitHash && deployment.gitCommitHash !== "pending" ? deployment.gitCommitHash.slice(0, 7) : null;
  const live = DONE_OK.includes(st);
  const failed = DONE_BAD.includes(st);

  if (!projectId || !deploymentId) {
    return (
      <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)] grid place-items-center px-4">
        <p className="text-[15px] text-label-2">Open logs from a deployment to see its build output.</p>
      </div>
    );
  }

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 sm:py-10 space-y-5">
        <Link
          href={`/project/${projectId}/deployments`}
          className="inline-flex items-center gap-1 h-8 -ml-1 pr-2 text-[13px] text-label-2 hover:text-label transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {projectName ?? "Project"}
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-title text-label">Build logs</h1>
              {deployment && <StatusDot status={deployment.status} className="text-[14px] text-label" />}
            </div>
            <p className="mt-2 flex items-center gap-2 flex-wrap text-[13px] text-label-2">
              <span className="tabular-nums">Deployment #{deploymentId}</span>
              {deployment?.environment && <EnvPill environment={deployment.environment} />}
              {deployment?.gitBranch && (
                <span className="inline-flex items-center gap-1 font-mono text-[12px]">
                  <GitBranch className="size-3.5" aria-hidden />
                  {deployment.gitBranch}
                </span>
              )}
              {commit && (
                <span className="inline-flex items-center gap-1 font-mono text-[12px]">
                  <GitCommitHorizontal className="size-3.5" aria-hidden />
                  {commit}
                </span>
              )}
              {deployment?.gitCommitMessage && <span className="truncate max-w-[340px] text-label-3">{deployment.gitCommitMessage}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!finished && (
              <button type="button" className={btn.secondary} onClick={() => setIsPaused((p) => !p)}>
                {isPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                {isPaused ? "Resume" : "Pause"}
              </button>
            )}
            <button type="button" className={btn.secondary} onClick={copyLogs} disabled={logs.length === 0}>
              {copied ? <Check className="size-4 text-sys-green" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
            {deployment?.deployedUrl && (
              <a href={deployment.deployedUrl} target="_blank" rel="noopener noreferrer" className={btn.primary}>
                Visit
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>

        {/* Result */}
        <AnimatePresence initial={false}>
          {(live || failed) && (
            <motion.div
              key={live ? "live" : "failed"}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.45 }}
              className="rounded-2xl bg-white border border-black/[0.06] px-5 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                {live ? <CheckCircle2 className="size-6 text-sys-green shrink-0" aria-hidden /> : <XCircle className="size-6 text-sys-red shrink-0" aria-hidden />}
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-label">{live ? "Deployed. Your app is live." : "This build didn’t finish."}</p>
                  {live && deployment?.deployedUrl ? (
                    <a href={deployment.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-link hover:underline break-all">
                      {deployment.deployedUrl.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <p className="text-[13px] text-label-2">The last lines below usually say why.</p>
                  )}
                </div>
              </div>
              <Link href={`/project/${projectId}`} className={cn(btn.secondary, "shrink-0")}>
                Back to project
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Console */}
        <section className="relative rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 h-11 border-b border-black/[0.06]">
            <p className="text-[13px] font-medium text-label">Output</p>
            <p className="flex items-center gap-2 text-[12px] text-label-3 tabular-nums">
              {!finished && !isPaused && deployment && isInProgress(deployment.status) && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-sys-orange animate-pulse" /> Streaming
                </span>
              )}
              {isPaused && !finished && <span>Paused</span>}
              <span>
                {logs.length} line{logs.length === 1 ? "" : "s"}
              </span>
            </p>
          </div>

          <div
            ref={consoleRef}
            onScroll={onConsoleScroll}
            className="h-[62svh] min-h-[360px] max-h-[760px] overflow-y-auto bg-[#fbfbfd] py-3 font-mono text-[12.5px] leading-[1.7]"
            role="log"
            aria-live="polite"
            aria-label="Build output"
          >
            {error ? (
              <p className="px-5 text-sys-red">{error}</p>
            ) : logs.length === 0 ? (
              <p className="px-5 inline-flex items-center gap-2 text-label-3">
                <span className="size-1.5 rounded-full bg-label-3 animate-pulse" />
                Waiting for the build to start…
              </p>
            ) : (
              logs.map((line, i) => <LogLine key={i} line={line} n={i + 1} />)
            )}
          </div>

          {/* Back to the newest output after scrolling up */}
          <AnimatePresence>
            {!follow && logs.length > 0 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                onClick={() => setFollow(true)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-label/90 text-white text-[13px] backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
              >
                <ArrowDown className="size-4" aria-hidden />
                Jump to latest
              </motion.button>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
