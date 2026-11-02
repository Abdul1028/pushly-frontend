"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, GitBranch, GitCommitHorizontal, ScrollText, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetchAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { btn, EnvPill, errorMessage, formatDate, formatRelative, isInProgress, Panel, Segmented, StatusDot, statusInfo } from "@/components/project/ui";

// Every deployment across all projects, newest first. Built from the existing project list and
// per-project deployments endpoints (no backend changes).

type Project = { id: string | number; name: string };
type Deployment = {
  id: number;
  status: string;
  environment?: string;
  gitBranch?: string;
  gitCommitHash?: string;
  gitCommitMessage?: string;
  createdAt?: string;
  deployedAt?: string | null;
};
type Row = Deployment & { project: Project };
type EnvFilter = "ALL" | "PRODUCTION" | "STAGING";
type StatusFilter = "ALL" | "READY" | "BUILDING" | "FAILED";

const PAGE = 30;
const when = (d: Deployment) => new Date(d.createdAt ?? d.deployedAt ?? 0).getTime();

const matchesStatus = (d: Deployment, f: StatusFilter) => {
  if (f === "ALL") return true;
  const tone = statusInfo(d.status).tone;
  if (f === "READY") return tone === "green";
  if (f === "FAILED") return tone === "red";
  return isInProgress(d.status);
};

export default function DeploymentsPage() {
  const { status, token } = useAuth();
  const router = useRouter();
  const [env, setEnv] = useState<EnvFilter>("ALL");
  const [state, setState] = useState<StatusFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const { data, error } = useSWR(
    token ? ["all-deployments", token] : null,
    async () => {
      const projects = await apiFetchAuth<{ content: Project[] }>("/api/projects?page=0&size=20", token!).then((r) => r.content ?? []);
      const lists = await Promise.all(
        projects.map((p) =>
          apiFetchAuth<{ content: Deployment[] }>(`/api/projects/${p.id}/deployments?page=0&size=20`, token!)
            .then((r) => (r.content ?? []).map((d) => ({ ...d, project: p })))
            .catch(() => [] as Row[])
        )
      );
      return { projects, rows: lists.flat().sort((a, b) => when(b) - when(a)) };
    },
    // Refresh on its own while anything is building
    { refreshInterval: (d) => (d?.rows.some((r) => isInProgress(r.status)) ? 6000 : 0), revalidateOnFocus: true }
  );
  const showSkeleton = useDelayedFlag(!data && !error);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (r) =>
        (env === "ALL" || r.environment === env) &&
        matchesStatus(r, state) &&
        (projectFilter === "ALL" || String(r.project.id) === projectFilter) &&
        (!q || [r.gitCommitMessage, r.gitBranch, r.project.name, r.gitCommitHash].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [data, env, state, projectFilter, query]);

  const counts = useMemo(() => {
    const rows = data?.rows ?? [];
    return { building: rows.filter((r) => isInProgress(r.status)).length, failed: rows.filter((r) => statusInfo(r.status).tone === "red").length };
  }, [data]);

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        <div className="mb-6">
          <h1 className="text-title text-label">Deployments</h1>
          <p className="mt-1 text-[15px] text-label-2">
            {data ? (
              <>
                {data.rows.length} across {data.projects.length} project{data.projects.length === 1 ? "" : "s"}
                {counts.building > 0 && <span> · {counts.building} building</span>}
                {counts.failed > 0 && <span> · {counts.failed} failed</span>}
              </>
            ) : (
              "Every build, across all your projects."
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-label-3" aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search commits, branches"
              aria-label="Search deployments"
              className="w-full h-10 rounded-full border border-black/10 bg-white pl-10 pr-4 text-[14px] text-label placeholder:text-label-3 outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 lg:mx-0 lg:px-0">
            <Segmented<EnvFilter>
              label="Environment"
              value={env}
              onChange={(v) => {
                setEnv(v);
                setShown(PAGE);
              }}
              options={[
                { value: "ALL", label: "All" },
                { value: "PRODUCTION", label: "Production" },
                { value: "STAGING", label: "Staging" },
              ]}
            />
            <Segmented<StatusFilter>
              label="Status"
              value={state}
              onChange={(v) => {
                setState(v);
                setShown(PAGE);
              }}
              options={[
                { value: "ALL", label: "Any status" },
                { value: "READY", label: "Ready" },
                { value: "BUILDING", label: "Building" },
                { value: "FAILED", label: "Failed" },
              ]}
            />
            {data && data.projects.length > 1 && (
              <label className="relative shrink-0">
                <span className="sr-only">Project</span>
                <select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setShown(PAGE);
                  }}
                  className="appearance-none h-9 rounded-full bg-fill-2 pl-3.5 pr-8 text-[13px] font-medium text-label outline-none focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
                >
                  <option value="ALL">All projects</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-label-2" aria-hidden />
              </label>
            )}
          </div>
        </div>

        <Panel bodyClassName="p-0 md:p-0">
          {error ? (
            <p className="px-6 py-10 text-center text-[15px] text-label-2">{errorMessage(error, "Couldn’t load deployments.")}</p>
          ) : !data ? (
            showSkeleton ? (
              <ul className="divide-y divide-black/[0.06]" aria-busy="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-center gap-4 px-5 md:px-6 py-4">
                    <div className="h-4 w-20 rounded bg-fill animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-fill animate-pulse" />
                      <div className="h-3 w-1/3 rounded bg-fill animate-pulse" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-40" />
            )
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[17px] font-semibold tracking-[-0.022em]">{data.rows.length === 0 ? "No deployments yet." : "Nothing matches these filters."}</p>
              <p className="mt-1 text-[15px] text-label-2">
                {data.rows.length === 0 ? "Deploy a project and its builds show up here." : "Try a different environment, status or search."}
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-black/[0.06]">
                <AnimatePresence initial={false}>
                  {filtered.slice(0, shown).map((d) => {
                    const commit = d.gitCommitHash && d.gitCommitHash !== "pending" ? d.gitCommitHash.slice(0, 7) : null;
                    return (
                      <motion.li
                        key={`${d.project.id}-${d.id}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 md:px-6 py-3.5"
                      >
                        <div className="w-[88px] sm:w-24 shrink-0">
                          <StatusDot status={d.status} />
                          <p className="mt-1 text-[12px] text-label-3 tabular-nums" title={formatDate(d.createdAt ?? d.deployedAt)}>
                            {formatRelative(d.createdAt ?? d.deployedAt)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link href={`/project/${d.project.id}`} className="text-[14px] font-medium text-label hover:text-link truncate">
                              {d.project.name}
                            </Link>
                            <EnvPill environment={d.environment} />
                          </div>
                          <p className="mt-0.5 text-[13px] text-label-2 truncate">{d.gitCommitMessage || `Deployment #${d.id}`}</p>
                          <p className="mt-0.5 flex items-center gap-3 text-[12px] text-label-3">
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <GitBranch className="size-3 shrink-0" aria-hidden />
                              <span className="truncate">{d.gitBranch ?? "—"}</span>
                            </span>
                            {commit && (
                              <span className="hidden sm:inline-flex items-center gap-1 font-mono">
                                <GitCommitHorizontal className="size-3" aria-hidden />
                                {commit}
                              </span>
                            )}
                          </p>
                        </div>
                        <Link
                          href={`/logs?projectId=${d.project.id}&deploymentId=${d.id}`}
                          className={cn(btn.quiet, "px-3 shrink-0")}
                          aria-label={`Logs for ${d.project.name} deployment ${d.id}`}
                        >
                          <ScrollText className="size-4" aria-hidden />
                          <span className="hidden sm:inline">Logs</span>
                        </Link>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
              {filtered.length > shown && (
                <div className="px-6 py-4 border-t border-black/[0.06] text-center">
                  <button type="button" className={btn.secondary} onClick={() => setShown((n) => n + PAGE)}>
                    Show more ({filtered.length - shown})
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
