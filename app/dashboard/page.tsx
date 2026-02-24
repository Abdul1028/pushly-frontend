"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Activity, Settings, Github, GitBranch, ExternalLink, Rocket } from "lucide-react";
import { Loader2 } from "lucide-react";

/* ── Small self-contained component so toast description has its own state ── */
function RedeployButtons({
  onRedeploy,
}: {
  onRedeploy: (env: "STAGING" | "PRODUCTION") => Promise<void>;
}) {
  const [loading, setLoading] = useState<"STAGING" | "PRODUCTION" | null>(null);

  const handle = async (env: "STAGING" | "PRODUCTION") => {
    setLoading(env);
    try {
      await onRedeploy(env);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={!!loading}
        onClick={() => handle("STAGING")}
      >
        {loading === "STAGING" ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Rocket className="h-3.5 w-3.5 mr-1.5" />
        )}
        Redeploy Staging
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs"
        disabled={!!loading}
        onClick={() => handle("PRODUCTION")}
      >
        {loading === "PRODUCTION" ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Rocket className="h-3.5 w-3.5 mr-1.5" />
        )}
        Redeploy Production
      </Button>
    </div>
  );
}

import { PRODUCT_DOMAIN } from "@/lib/config";
import { ProjectSettingsDialog } from "@/components/project-settings-dialog";
import { useToast } from "@/components/ui/use-toast";
import useSWR from 'swr'


type Project = {
  id: number;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  createdAt?: string;
};

export default function DashboardPage() {
  const { status, token } = useAuth();

  // SWR fetcher
  const fetchProjectsFetcher = (token: string) =>
    apiFetchAuth<{ content: Project[] }>("/api/projects?page=0&size=20", token)
      .then(r => r.content ?? []);

  // SWR hook
  const { data: projects, error, isLoading, mutate } = useSWR(
    token ? ["projects", token] : null,
    ([, token]) => fetchProjectsFetcher(token),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // avoid refetch spam
    }
  );



  const router = useRouter();
  const { toast } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const triggerRedeploy = async (
    environment: "STAGING" | "PRODUCTION",
    project: Project,
    dismissToast: () => void
  ) => {
    if (!token) return;
    try {
      // Fetch real latest commit SHA from GitHub branch
      let commitHash = "redeployed";
      if (project.gitURL) {
        try {
          const match = project.gitURL.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?/);
          if (match) {
            const [, owner, repo] = match;
            const branch = project.gitBranch || "main";
            const branches = await apiFetchAuth<{ name: string; commit: { sha: string } }[]>(
              `/api/github/repos/${owner}/${repo}/branches`,
              token
            );
            const branchInfo = branches.find((b) => b.name === branch) ?? branches[0];
            if (branchInfo?.commit?.sha) commitHash = branchInfo.commit.sha;
          }
        } catch {
          // fall back to "redeployed" if GitHub API fails
        }
      }

      const deployment = await apiFetchAuth<{ id: string }>(
        `/api/projects/${project.id}/deployments`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            gitBranch: project.gitBranch || "main",
            gitCommitHash: commitHash,
            environment,
          }),
        }
      );
      await apiFetchAuth(
        `/api/projects/${project.id}/deployments/${deployment.id}/deploy?environment=${environment}`,
        token,
        { method: "POST" }
      );
      dismissToast();
      router.push(`/logs?projectId=${project.id}&deploymentId=${deployment.id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Redeploy failed",
        description: err?.message || "Could not trigger redeploy",
      });
    }
  };

  console.log("SSR running on:", typeof window === "undefined" ? "server" : "client")
  console.log("TOKEN:", token);






  const skeletons = useMemo(() => Array(6).fill(0).map((_, i) => (
    <Card key={i}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  )), []);

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }
  if (isLoading && !projects) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {skeletons}
        </div>
      </div>
    );
  }



  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your projects and deployments</p>
        </div>
        <Button asChild>
          <Link href="/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto mb-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(isLoading && !projects) ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {skeletons}
        </div>
      ) : projects?.length === 0 ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button asChild>
                  <Link href="/new">Create your first project</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {projects?.map((p) => {
            const getInitials = (name: string) => {
              return name
                .split(/[-_\s]/)
                .map((word) => word[0]?.toUpperCase() || "")
                .slice(0, 2)
                .join("");
            };

            const formatDate = (dateString?: string) => {
              if (!dateString) return null;
              const date = new Date(dateString);
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return `${months[date.getMonth()]} ${date.getDate()}`;
            };

            const extractRepoPath = (gitURL?: string) => {
              if (!gitURL) return null;
              try {
                const url = new URL(gitURL);
                const path = url.pathname.replace(/\.git$/, "").replace(/^\//, "");
                return path.length > 30 ? `${path.substring(0, 27)}...` : path;
              } catch {
                return null;
              }
            };

            return (
              <div key={p.id} className="relative group">
                <Link href={`/project/${p.id}`}>
                  <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full relative">
                    {/* Top Right Icons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                        title="Activity"
                      >
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedProject(p);
                          setSettingsOpen(true);
                        }}
                        className="p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                        title="Settings"
                      >
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Project Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                          {getInitials(p.name)}
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Project Name */}
                          <div>
                            <h3 className="text-base font-semibold text-foreground truncate">{p.name}</h3>
                          </div>

                          {/* URL */}
                          {p.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(`https://${p.subdomain}.${PRODUCT_DOMAIN}`, "_blank", "noopener,noreferrer");
                              }}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left w-full"
                            >
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate hover:underline">{p.subdomain}.{PRODUCT_DOMAIN}</span>
                            </button>
                          )}


                          {/* GitHub Link */}
                          {p.gitURL && (
                            <button
                              onClick={() => window.open(p.gitURL, "_blank")}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
                            >
                              <Github className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{extractRepoPath(p.gitURL) || p.gitURL}</span>
                            </button>
                          )}


                          {/* Last Activity */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {p.createdAt && formatDate(p.createdAt) && (
                              <>
                                <span>{formatDate(p.createdAt)}</span>
                                {p.gitBranch && (
                                  <>
                                    <span>•</span>
                                    <GitBranch className="h-3 w-3" />
                                    <span>{p.gitBranch}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>

                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {selectedProject && (
        <ProjectSettingsDialog
          project={selectedProject}
          open={settingsOpen}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            if (!open) setSelectedProject(null);
          }}
          onProjectUpdated={() => mutate()}
          onEnvVarsChanged={() => {
            const p = selectedProject;
            const { dismiss } = toast({
              title: "🔄 Environment variables updated",
              description: (
                <div className="space-y-1 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Redeploy to apply the new values to your build.
                  </p>
                  <RedeployButtons
                    onRedeploy={async (env) => {
                      await triggerRedeploy(env, p, dismiss);
                    }}
                  />
                </div>
              ),
              duration: Infinity,
            });
          }}
        />
      )}
    </div>
  );
}

