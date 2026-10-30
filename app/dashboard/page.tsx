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
import { btn, errorMessage, formatRelative, PageHeader, StatusDot } from "@/components/project/ui";

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

type LiveDeployment = { id: number; status: string; deployedAt?: string | null; createdAt?: string; gitCommitMessage?: string };

const repoPath = (gitURL?: string) => {
  if (!gitURL) return null;
  try {
    return new URL(gitURL).pathname.replace(/\.git$/, "").replace(/^\//, "");
  } catch {
    return gitURL;
  }
};

const itemClass =
  "flex items-center gap-2.5 h-9 px-3 rounded-lg text-[14px] text-label outline-none cursor-default select-none data-[highlighted]:bg-black/[0.05]";

function ProjectCard({ p, token, index }: { p: Project; token: string; index: number }) {
  const reduce = usePrefersReducedMotion();
  const base = `/project/${p.id}`;
  const url = p.customDomain && p.customDomainStatus === "ACTIVE" ? p.customDomain : p.subdomain ? `${p.subdomain}.${PRODUCT_DOMAIN}` : null;
  const repo = repoPath(p.gitURL);

  // What's live in Production for this project (404 = nothing yet)
  const { data: live, isLoading } = useSWR(["live", p.id, token], async () => {
    try {
      const r = await apiFetchAuth<{ PRODUCTION?: LiveDeployment | null }>(`/api/projects/${p.id}/deployments/active`, token);
      return r?.PRODUCTION ?? null;
    } catch {
      return null;
    }
  });

  return (
    <motion.article
      key={reduce ? "static" : "card"}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.6, delay: Math.min(index, 8) * 0.04 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group relative rounded-2xl bg-white border border-black/[0.06] p-5 transition-shadow duration-300 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]"
    >
      {/* Whole card opens the project; the menu sits above this link */}
      <Link href={base} className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-apple-blue" aria-label={`Open ${p.name}`} />

      <div className="flex items-start gap-3">
        <span className="size-10 shrink-0 rounded-xl bg-fill grid place-items-center text-[15px] font-semibold text-label uppercase">{p.name[0]}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.022em] text-label truncate">{p.name}</h2>
          {url && <p className="text-[13px] text-label-3 truncate">{url}</p>}
        </div>
        <Menu.Root>
          <Menu.Trigger className={`${btn.icon} relative z-10 -mr-2 -mt-1`} aria-label={`Actions for ${p.name}`}>
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

      {/* Latest production state */}
      <div className="mt-5 min-h-[44px]">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3.5 w-16 rounded bg-fill animate-pulse" />
            <div className="h-3.5 w-3/4 rounded bg-fill animate-pulse" />
          </div>
        ) : live ? (
          <>
            <div className="flex items-center gap-2">
              <StatusDot status={live.status} />
              <span className="text-[12px] text-label-3">· {formatRelative(live.deployedAt ?? live.createdAt)}</span>
            </div>
            <p className="mt-1 text-[14px] text-label truncate">{live.gitCommitMessage || `Deployment #${live.id}`}</p>
          </>
        ) : (
          <p className="text-[13px] text-label-3">No production deployment yet</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-black/[0.06] flex items-center gap-3 text-[12px] text-label-3 min-w-0">
        {repo && (
          <span className="inline-flex items-center gap-1 min-w-0">
            <Github className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{repo}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 shrink-0">
          <GitBranch className="size-3.5" aria-hidden />
          {p.gitBranch ?? "main"}
        </span>
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
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="Projects"
          subtitle={projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : " "}
          actions={
            <Link href="/new" className={btn.primary}>
              <Plus className="size-4" aria-hidden />
              New project
            </Link>
          }
        />

        {projects && projects.length > 3 && (
          <div className="relative mb-6 max-w-sm">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <ProjectCard key={p.id} p={p} token={token} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
