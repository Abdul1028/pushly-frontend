"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { motion } from "motion/react";
import { ExternalLink, Github, GitBranch, KeyRound, Layers, MoreHorizontal, Plus, Search, Settings } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { btn, errorMessage, formatRelative, isInProgress, repoInfo, statusInfo } from "@/components/project/ui";
import { cn } from "@/lib/utils";

type Project = {
  id: number | string;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  customDomain?: string | null;
  customDomainStatus?: string;
  createdAt?: string;
};

type Deployment = {
  id: number;
  status: string;
  environment?: string;
  deployedAt?: string | null;
  createdAt?: string;
  gitCommitMessage?: string;
};

const isLive = (s?: string) => ["RUNNING", "SUCCESS"].includes((s ?? "").toUpperCase());
const when = (d: Deployment) => new Date(d.createdAt ?? d.deployedAt ?? 0).getTime();

const itemClass =
  "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] text-label outline-none cursor-default select-none data-[highlighted]:bg-black/[0.05]";

// Tinted status badge for the card header: colour carries the status, nothing else does
const BADGE: Record<string, string> = {
  green: "bg-sys-green/[0.12] text-[#1f7a35]",
  orange: "bg-sys-orange/[0.14] text-[#b25000]",
  red: "bg-sys-red/[0.1] text-[#d70015]",
  gray: "bg-black/[0.05] text-label-2",
};

function StatusBadge({ status }: { status?: string }) {
  const info = status ? statusInfo(status) : { label: "No deployments", tone: "gray" as const, live: false };
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-medium whitespace-nowrap", BADGE[info.tone])}>
      <span className="relative flex size-1.5">
        {info.live && <span className="absolute inset-0 rounded-full bg-current animate-ping opacity-60" />}
        <span className="relative size-1.5 rounded-full bg-current" />
      </span>
      {info.label}
    </span>
  );
}

function ProjectCard({ p, token, index }: { p: Project; token: string; index: number }) {
  const reduce = usePrefersReducedMotion();
  const base = `/project/${p.id}`;
  const url = p.customDomain && p.customDomainStatus === "ACTIVE" ? p.customDomain : p.subdomain ? `${p.subdomain}.${PRODUCT_DOMAIN}` : null;
  const repo = repoInfo(p.gitURL);

  // The latest deployment, whatever its outcome — the live one is always "Ready", so it
  // hid failed builds. Refreshes on its own while a build is in progress.
  const { data: deployments, isLoading } = useSWR(
    ["card-deployments", p.id, token],
    async () => {
      try {
        const r = await apiFetchAuth<{ content: Deployment[] }>(`/api/projects/${p.id}/deployments?page=0&size=20`, token);
        return [...(r?.content ?? [])].sort((a, b) => when(b) - when(a));
      } catch {
        return [] as Deployment[];
      }
    },
    { refreshInterval: (data) => (data?.[0] && isInProgress(data[0].status) ? 5000 : 0) }
  );
  const latest = deployments?.[0];
  // When the newest build isn't live, say whether Production is still serving an earlier one
  const servingEarlier =
    latest && !isLive(latest.status) && deployments?.some((d) => d.id !== latest.id && d.environment === "PRODUCTION" && isLive(d.status));
  const envLabel = latest?.environment === "PRODUCTION" ? "Production" : latest?.environment === "STAGING" ? "Staging" : null;

  return (
    <motion.article
      key={reduce ? "static" : "card"}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.6, delay: Math.min(index, 8) * 0.04 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group relative flex flex-col h-full rounded-2xl bg-white border border-black/[0.06] transition-shadow duration-300 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]"
    >
      {/* Whole card opens the project; the repo link and menu sit above this link */}
      <Link href={base} className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-apple-blue" aria-label={`Open ${p.name}`} />

      {/* Header: identity + status */}
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className="size-10 shrink-0 rounded-xl bg-fill grid place-items-center text-[15px] font-semibold text-label uppercase">{p.name[0]}</span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[16px] font-semibold tracking-[-0.022em] text-label truncate leading-tight">{p.name}</h2>
          <p className="mt-0.5 text-[13px] text-label-3 truncate">{url ?? "No domain yet"}</p>
        </div>
        {isLoading ? <span className="h-6 w-16 rounded-full bg-fill animate-pulse shrink-0" /> : <StatusBadge status={latest?.status} />}
      </div>

      {/* Latest deployment */}
      <div className="px-5 pt-4 pb-5 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-fill animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-fill animate-pulse" />
          </div>
        ) : latest ? (
          <>
            <p className="text-[15px] leading-snug text-label line-clamp-1">{latest.gitCommitMessage || `Deployment #${latest.id}`}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-label-3 min-w-0">
              {envLabel && <span className="shrink-0">{envLabel}</span>}
              {envLabel && <span aria-hidden>·</span>}
              <span className="shrink-0 tabular-nums">{formatRelative(latest.createdAt ?? latest.deployedAt)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 min-w-0">
                <GitBranch className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{p.gitBranch ?? "main"}</span>
              </span>
            </p>
            {servingEarlier && <p className="mt-2 text-[12px] text-label-2">Production is still serving an earlier build.</p>}
          </>
        ) : (
          <p className="text-[14px] text-label-3">Deploy this project to see its builds here.</p>
        )}
      </div>

      {/* Footer: repository link + actions */}
      <div className="flex items-center justify-between gap-2 px-5 h-12 border-t border-black/[0.06]">
        {repo ? (
          repo.href ? (
            <a
              href={repo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex items-center gap-1.5 min-w-0 h-9 -ml-1 px-1 rounded-md text-[13px] text-label-2 hover:text-link transition-colors"
              title={`Open ${repo.label} on GitHub`}
            >
              <Github className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{repo.label}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 min-w-0 text-[13px] text-label-2">
              <Github className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{repo.label}</span>
            </span>
          )
        ) : (
          <span />
        )}
        <Menu.Root>
          <Menu.Trigger className={`${btn.icon} relative z-10 -mr-2 shrink-0`} aria-label={`Actions for ${p.name}`}>
            <MoreHorizontal className="size-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[220px] rounded-xl bg-white/95 backdrop-blur-xl p-1.5 border border-black/[0.08] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)] text-label"
            >
              {url && (
                <Menu.Item asChild className={itemClass}>
                  <a href={`https://${url}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 text-label-2" /> Visit
                  </a>
                </Menu.Item>
              )}
              <Menu.Item asChild className={itemClass}>
                <Link href={`${base}/deployments`}>
                  <Layers className="size-4 text-label-2" /> Deployments
                </Link>
              </Menu.Item>
              <Menu.Item asChild className={itemClass}>
                <Link href={`${base}/env`}>
                  <KeyRound className="size-4 text-label-2" /> Environment Variables
                </Link>
              </Menu.Item>
              <Menu.Item asChild className={itemClass}>
                <Link href={`${base}/settings`}>
                  <Settings className="size-4 text-label-2" /> Settings
                </Link>
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </motion.article>
  );
}

export default function DashboardPage() {
  const { status, token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: projects, error, isLoading } = useSWR(
    token ? ["projects", token] : null,
    ([, t]) => apiFetchAuth<{ content: Project[] }>("/api/projects?page=0&size=20", t).then((r) => r.content ?? []),
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );
  const showSkeleton = useDelayedFlag(isLoading && !projects);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!projects || !q) return projects ?? [];
    return projects.filter((p) => [p.name, p.subdomain, p.gitURL].some((v) => v?.toLowerCase().includes(q)));
  }, [projects, query]);

  if (status !== "authenticated" || !token) return <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)]" />;

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-title text-label">Projects</h1>
            <p className="mt-1 text-[15px] text-label-2 tabular-nums">
              {projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "\u00a0"}
            </p>
          </div>
          <Link href="/new" className={`${btn.primary} shrink-0 px-3.5 sm:px-4`} aria-label="New project">
            <Plus className="size-4" aria-hidden />
            <span className="hidden min-[400px]:inline">New project</span>
          </Link>
        </div>

        {projects && projects.length > 3 && (
          <div className="relative mb-6 w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-label-3" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="w-full h-10 rounded-full border border-black/10 bg-white pl-10 pr-4 text-[14px] text-label placeholder:text-label-3 outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
            />
          </div>
        )}

        {error ? (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6">
            <p className="text-[15px] font-medium text-label">We couldn’t load your projects.</p>
            <p className="mt-1 text-[13px] text-label-2">{errorMessage(error)}</p>
          </div>
        ) : !projects ? (
          showSkeleton ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[196px] rounded-2xl bg-white border border-black/[0.06] p-5">
                  <div className="flex gap-3">
                    <div className="size-10 rounded-xl bg-fill animate-pulse" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-1/2 rounded bg-fill animate-pulse" />
                      <div className="h-3 w-2/3 rounded bg-fill animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ) : projects.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-16 text-center">
            <p className="text-title text-label">Ship your first project.</p>
            <p className="mt-2 text-[15px] text-label-2">Connect a Git repository and get a live URL in minutes.</p>
            <Link href="/new" className={`${btn.primary} mt-6`}>
              <Plus className="size-4" aria-hidden />
              New project
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-label-2">No projects match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((p, i) => (
              <ProjectCard key={p.id} p={p} token={token} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
