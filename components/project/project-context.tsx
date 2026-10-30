"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { apiFetchAuth } from "@/lib/api";
import { isInProgress } from "./ui";

// One place for a project's data, shared by every section of the project workspace.
// Same endpoints the old project page and settings dialog used — no backend changes.

export type Project = {
  id: string;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  customDomain?: string | null;
  customDomainStatus?: "NONE" | "VERIFYING" | "ACTIVE" | "FAILED" | string;
  customBuildCommand?: string | null;
  customInstallCommand?: string | null;
  customOutputDirectory?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Deployment = {
  id: number;
  status: string;
  environment?: "PRODUCTION" | "STAGING" | string;
  lastAction?: "DEPLOYED" | "PROMOTED" | "ROLLBACKED" | null;
  gitCommitHash?: string;
  gitCommitMessage?: string;
  gitBranch?: string;
  createdAt?: string;
  updatedAt?: string;
  deployedAt?: string | null;
  deployedUrl?: string | null;
  version?: string;
};

type Active = { PRODUCTION?: number; STAGING?: number };

type Ctx = {
  id: string;
  token: string | null;
  project?: Project;
  projectError?: unknown;
  deployments?: Deployment[];
  active?: Active;
  /** Deployments newest first */
  sorted: Deployment[];
  production?: Deployment;
  staging?: Deployment;
  refresh: () => Promise<void>;
  mutateProject: (p?: Project) => void;
  /** Create a deployment and start it right away (same calls as the dashboard's redeploy) */
  deploy: (environment: "STAGING" | "PRODUCTION", gitBranch: string, gitCommitHash?: string) => Promise<{ id: string | number }>;
  deployExisting: (deploymentId: number, environment: string) => Promise<void>;
  promote: (deploymentId: number) => Promise<void>;
  rollback: (deploymentId: number) => Promise<void>;
  remove: (deploymentId: number) => Promise<void>;
};

const ProjectContext = createContext<Ctx | null>(null);

const time = (d: Deployment) => new Date(d.deployedAt ?? d.createdAt ?? 0).getTime();

export function ProjectProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const { token } = useAuth();

  const project = useSWR(token ? ["project", id, token] : null, () => apiFetchAuth<Project>(`/api/projects/${id}`, token!), {
    revalidateOnFocus: true,
  });

  // Poll while something is building so statuses update on their own
  const deployments = useSWR(
    token ? ["deployments", id, token] : null,
    () => apiFetchAuth<{ content: Deployment[] }>(`/api/projects/${id}/deployments?page=0&size=20`, token!).then((r) => r.content ?? []),
    { refreshInterval: (data) => (data?.some((d) => isInProgress(d.status)) ? 4000 : 0) }
  );

  // 404 from /active simply means nothing is live yet
  const active = useSWR(token ? ["active", id, token] : null, async () => {
    try {
      const res = await apiFetchAuth<{ PRODUCTION?: { id: number } | null; STAGING?: { id: number } | null }>(
        `/api/projects/${id}/deployments/active`,
        token!
      );
      return { PRODUCTION: res?.PRODUCTION?.id, STAGING: res?.STAGING?.id } as Active;
    } catch (e) {
      if ((e as { status?: number })?.status === 404) return {} as Active;
      throw e;
    }
  });

  const refresh = useCallback(async () => {
    await Promise.all([deployments.mutate(), active.mutate(), project.mutate()]);
  }, [deployments, active, project]);

  const sorted = useMemo(() => [...(deployments.data ?? [])].sort((a, b) => time(b) - time(a)), [deployments.data]);
  const production = sorted.find((d) => d.id === active.data?.PRODUCTION);
  const staging = sorted.find((d) => d.id === active.data?.STAGING);

  const value = useMemo<Ctx>(() => {
    const call = (path: string, init?: RequestInit) => apiFetchAuth(path, token!, init);
    return {
      id,
      token,
      project: project.data,
      projectError: project.error,
      deployments: deployments.data,
      active: active.data,
      sorted,
      production,
      staging,
      refresh,
      mutateProject: (p) => void project.mutate(p, { revalidate: !p }),
      deploy: async (environment, gitBranch, gitCommitHash) => {
        const created = await apiFetchAuth<{ id: string | number }>(`/api/projects/${id}/deployments`, token!, {
          method: "POST",
          // Build server resolves the real SHA after cloning when none is given
          body: JSON.stringify({ gitBranch, gitCommitHash: gitCommitHash?.trim() || "pending", environment }),
        });
        await call(`/api/projects/${id}/deployments/${created.id}/deploy?environment=${environment}`, { method: "POST" });
        void refresh();
        return created;
      },
      deployExisting: async (deploymentId, environment) => {
        await call(`/api/projects/${id}/deployments/${deploymentId}/deploy?environment=${environment}`, { method: "POST" });
        await refresh();
      },
      promote: async (deploymentId) => {
        await call(`/api/projects/${id}/deployments/${deploymentId}/promote`, { method: "POST" });
        await refresh();
      },
      rollback: async (deploymentId) => {
        await call(`/api/projects/${id}/deployments/${deploymentId}/rollback`, { method: "POST" });
        await refresh();
      },
      remove: async (deploymentId) => {
        await call(`/api/projects/${id}/deployments/${deploymentId}`, { method: "DELETE" });
        await refresh();
      },
    };
  }, [id, token, project, deployments.data, active.data, sorted, production, staging, refresh]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider");
  return ctx;
}

/** The project's public URLs */
export function projectUrls(project: Project | undefined, domain: string) {
  if (!project) return { primary: undefined as string | undefined, subdomain: undefined as string | undefined, custom: undefined as string | undefined };
  const subdomain = project.subdomain ? `${project.subdomain}.${domain}` : undefined;
  const custom = project.customDomain && project.customDomainStatus === "ACTIVE" ? project.customDomain : undefined;
  return { primary: custom ?? subdomain, subdomain, custom };
}
