"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetchAuth } from "../../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Play, RotateCcw, Square, FileText, ExternalLink, GitCommitHorizontal, GitBranch, Trash2 } from "lucide-react";
import { compare } from "swr/_internal";

type Deployment = {
  id: number;
  status: string;
  environment?: string;
  gitCommitHash?: string;
  gitBranch?: string;
  createdAt?: string;
  updatedAt?: string;
  deployedAt?: string | null;
  deployedUrl?: string | null;
  version?: string;
  ecsTaskArn?: string | null;
};

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return "yesterday";
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  if (diff < month) return `${Math.floor(diff / week)}w ago`;
  if (diff < year) return `${Math.floor(diff / month)}mo ago`;
  return `${Math.floor(diff / year)}y ago`;
}


export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();
  const { status, token } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetEnv, setTargetEnv] = useState<"STAGING" | "PRODUCTION">("STAGING");
  const [gitCommitHash, setGitCommitHash] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [activeDeployments, setActiveDeployments] = useState<{
    PRODUCTION?: number;
    STAGING?: number;
  } | null>(null);



  const fetchDeployments = useCallback(async () => {
    if (!token || !id) return;
    try {
      const all = await apiFetchAuth<{ content: Deployment[] }>(`/api/projects/${id}/deployments?page=0&size=20`, token);
      setDeployments(all.content ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token, id]);


  // const fetchActiveDeployments = useCallback(async () => {
  //   if (!token || !id) return;

  //   const res = await apiFetchAuth<{
  //     PRODUCTION?: { id: number } | null;
  //     STAGING?: { id: number } | null;
  //   }>(`/api/projects/${id}/deployments/active`, token);

  //   setActiveDeployments({
  //     PRODUCTION: res.PRODUCTION?.id,
  //     STAGING: res.STAGING?.id,
  //   });
  // }, [token, id]);
  const fetchActiveDeployments = useCallback(async () => {
    if (!token || !id) return;

    try {
      const res = await apiFetchAuth<{
        PRODUCTION?: { id: number } | null;
        STAGING?: { id: number } | null;
      }>(`/api/projects/${id}/deployments/active`, token);

      setActiveDeployments({
        PRODUCTION: res.PRODUCTION?.id,
        STAGING: res.STAGING?.id,
      });

    } catch (e: any) {
      // If backend returns 404 => no active deployments
      console.log("active error: ", e)
      if (e.status === 404) {
        setActiveDeployments({});
        setError("No active deployments for this project.");
        console.log("no deployments")
        return;
      }

      // If something else happened → show error
      setError("Failed to load active deployments.");
    }
  }, [token, id]);






  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && token) {
      fetchDeployments();
      fetchActiveDeployments();
    }
  }, [status, token, id, router, fetchDeployments]);


  const createDeployment = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetchAuth(`/api/projects/${id}/deployments`, token, {
        method: "POST",
        body: JSON.stringify({ gitCommitHash, gitBranch, environment: targetEnv }),
      });
      await fetchDeployments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, gitCommitHash, gitBranch, targetEnv, fetchDeployments]);

  const deployTo = useCallback(async (env: string, deploymentId: number) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${deploymentId}/deploy?environment=${env}`, token, { method: "POST" });
      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments]);



  const rollback = useCallback(async (deploymentId: number, environment: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);

    try {
      await apiFetchAuth(
        `/api/projects/${id}/deployments/${deploymentId}/rollback?environment=${environment}`,
        token,
        { method: "POST" }
      );

      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments]);


  const stop = useCallback(async (deploymentId: number) => {
    console.log("api called baby")
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      console.log("deleting")
      console.log(deploymentId)
      console.log(id)
      await apiFetchAuth(`/api/projects/${id}/deployments/${deploymentId}`, token, { method: "DELETE" });
      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      console.log("error is: ", e)
      if (e.status === 400 && e.data?.message === "Cannot delete active deployment") {
        console.log("hit")
        setError("This deployment is currently active. Promote or rollback another deployment before deleting.");
      } else {
        setError("Failed to delete deployment.");
      }
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments, fetchActiveDeployments]);

  const getStatusColor = useMemo(() => (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes("success") || lower.includes("running")) return "default";
    if (lower.includes("fail") || lower.includes("error")) return "destructive";
    return "secondary";
  }, []);

  if (status !== "authenticated") {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center backdrop-blur-sm">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    Project #{id}
                  </h1>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDeployments}
                className="border-white/10 bg-transparent text-white hover:bg-white/5 hover:border-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            </div>
            <p className="text-sm text-neutral-500">Manage deployments across environments</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-400 text-sm">⚠</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Deployment Section */}
        <div className="mb-10">
          <div className="border border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">New Deployment</h2>
              <p className="text-sm text-neutral-500 mt-1">Configure and deploy your application</p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Commit Hash
                    </label>
                    <Input
                      value={gitCommitHash}
                      onChange={(e) => setGitCommitHash(e.target.value)}
                      placeholder="abc123..."
                      disabled={busy}
                      className="h-10 font-mono text-sm bg-black border-white/10 text-white placeholder:text-neutral-600 focus:border-white/30 focus:ring-0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Branch
                    </label>
                    <Input
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      disabled={busy}
                      className="h-10 font-mono text-sm bg-black border-white/10 text-white placeholder:text-neutral-600 focus:border-white/30 focus:ring-0"
                    />
                  </div>
                </div>

                {/* Environment Selection with Visual Cards */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Target Environment
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetEnv("STAGING")}
                      disabled={busy}
                      className={`p-4 rounded-lg border transition-all text-left ${targetEnv === "STAGING"
                        ? "border-white/30 bg-white/5"
                        : "border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.02]"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${targetEnv === "STAGING" ? "bg-yellow-400" : "bg-white/20"}`} />
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">Staging</div>
                          <div className="text-xs text-neutral-500 mt-0.5">Test environment</div>
                        </div>
                        {targetEnv === "STAGING" && (
                          <div className="text-xs text-white/60">✓</div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetEnv("PRODUCTION")}
                      disabled={busy}
                      className={`p-4 rounded-lg border transition-all text-left ${targetEnv === "PRODUCTION"
                        ? "border-white/30 bg-white/5"
                        : "border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.02]"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${targetEnv === "PRODUCTION" ? "bg-green-400" : "bg-white/20"}`} />
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">Production</div>
                          <div className="text-xs text-neutral-500 mt-0.5">Live environment</div>
                        </div>
                        {targetEnv === "PRODUCTION" && (
                          <div className="text-xs text-white/60">✓</div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Deploy Button */}
                <div className="pt-2">
                  <Button
                    onClick={createDeployment}
                    disabled={busy}
                    className="w-full h-11 bg-white text-black hover:bg-neutral-200 font-medium transition-all disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Deploy Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deployments List */}
        <div className="space-y-4">
          {/* Header with count dot */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Deployments</h2>
            {deployments && deployments.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="text-neutral-500">•</span>
                <span className="font-medium">
                  {deployments.length} {deployments.length === 1 ? "deployment" : "deployments"}
                </span>
              </div>
            )}
          </div>

          {!deployments ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="border border-white/10 rounded-lg bg-white/[0.02] p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32 bg-white/10" />
                    <Skeleton className="h-4 w-48 bg-white/10" />
                    <Skeleton className="h-20 w-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : deployments.length === 0 ? (
            <div className="border border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-sm py-16">
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-neutral-600" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">No deployments yet</h3>
                  <p className="text-sm text-neutral-500 mt-1">Deploy your first version to get started</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">

              {

                deployments
                  .slice()
                  .sort((a, b) =>
                    (b.deployedAt ? new Date(b.deployedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0) -
                    (a.deployedAt ? new Date(a.deployedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0)
                  )
                  .map((d) => {

                    const isActiveProd = activeDeployments?.PRODUCTION === d.id;
                    const isActiveStaging = activeDeployments?.STAGING === d.id;

                    return (
                      <Collapsible key={d.id} defaultOpen={false}>
                        <div className="border border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-all overflow-hidden">

                          {/* HEADER */}
                          <div className="px-4 sm:px-6 py-3 border-b border-white/10 space-y-2">

                            {/* metadata row + chip */}
                            <div className="flex items-start justify-between gap-2 w-full flex-wrap">

                              {/* left metadata column */}
                              <div className="flex items-center gap-2.5 text-xs flex-wrap">

                                <Badge
                                  variant={getStatusColor(d.status)}
                                  className="text-xs font-medium px-2 py-0.5"
                                >
                                  {d.status}
                                </Badge>

                                {d.environment === "PRODUCTION" ? (
                                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                    <span className="font-medium">Production</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                    <span className="font-medium">Staging</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                  <GitBranch className="h-3 w-3 text-neutral-500" />
                                  <code className="text-white font-mono">{d.gitBranch || "N/A"}</code>
                                </div>

                                <span className="text-neutral-700">•</span>

                                <div className="flex items-center gap-1.5 min-w-0">
                                  <GitCommitHorizontal className="h-3 w-3 text-neutral-500" />
                                  <code
                                    title={d.gitCommitHash}
                                    className="text-neutral-400 font-mono truncate"
                                  >
                                    {d.gitCommitHash ? d.gitCommitHash.substring(0, 7) : "N/A"}
                                  </code>


                                </div>

                                {d.deployedAt && (
                                  <>
                                    <span className="text-neutral-700">•</span>
                                    <span className="flex items-center gap-1.5 text-neutral-500">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
                                      </svg>
                                      <span title={new Date(d.deployedAt).toLocaleString()}>
                                        {formatRelativeDate(d.deployedAt)}
                                      </span>

                                    </span>
                                  </>
                                )}
                              </div>

                              {/* right chip */}

                              {(isActiveProd || isActiveStaging) && (
                                <span
                                  className={`
      inline-flex items-center gap-1.5
      px-2.5 py-1 text-[10px] font-medium
      rounded-full border shadow-sm shadow-black/20 backdrop-blur-sm
      ${isActiveProd
                                      ? "bg-green-500/15 text-green-400 border-green-500/30"
                                      : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                    }
    `}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${isActiveProd ? "bg-green-400" : "bg-yellow-400"
                                      }`}
                                  />

                                  {isActiveProd && "Current • Prod"}
                                  {isActiveStaging && "Current • Stage"}
                                </span>
                              )}





                            </div>

                            {/* actions row + toggle */}
                            <div className="flex items-center gap-2 w-full">
                              {d.status !== "RUNNING" && (
                                <Button
                                  size="sm"
                                  onClick={() => deployTo(d.environment!, d.id)}
                                  disabled={busy}
                                  className="h-8 bg-white text-black hover:bg-neutral-200 text-xs px-3 font-medium"
                                >
                                  <Play className="h-3 w-3 mr-1.5" />
                                  Deploy
                                </Button>
                              )}

                              {
                                d.status !== "DEPLOYING" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rollback(d.id, d.environment!)}
                                    disabled={busy}
                                    className="h-8 border-white/10 bg-transparent text-white hover:bg-white/5 text-xs px-3"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1.5" />
                                    Rollback
                                  </Button>

                                )
                              }

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log("called")
                                  stop(d.id)
                                }
                                }
                                disabled={busy}
                                className="h-8 w-8 flex items-center justify-center border-white/10 bg-transparent text-white hover:bg-white/5"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-8 w-8 flex items-center justify-center border-white/10 bg-transparent text-white hover:bg-white/5"
                              >
                                <Link href={`/logs?projectId=${id}&deploymentId=${d.id}`}>
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>

                              {/* collapsible trigger right aligned */}
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 ml-auto flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5"
                                >
                                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          {/* DETAILS GRID */}
                          <CollapsibleContent>
                            <div className="px-4 sm:px-6 py-4 border-t border-white/10 bg-white/[0.01]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {d.version && (
                                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <div className="h-8 w-8 rounded border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-white">V</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-neutral-500 mb-0.5">Version</p>
                                      <p className="font-mono text-sm text-white truncate">{d.version}</p>
                                    </div>
                                  </div>
                                )}

                                {d.createdAt && (
                                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <div className="h-8 w-8 rounded border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs">📅</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-neutral-500 mb-0.5">Created</p>
                                      <p className="text-sm text-white truncate">
                                        {new Date(d.createdAt).toLocaleDateString()}{" "}
                                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {d.deployedAt && (
                                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <div className="h-8 w-8 rounded border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs">🚀</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-neutral-500 mb-0.5">Deployed</p>
                                      <p className="text-sm text-white truncate">
                                        {new Date(d.deployedAt).toLocaleDateString()}{" "}
                                        {new Date(d.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {d.deployedUrl && (
                                  <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <div className="h-8 w-8 rounded border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <ExternalLink className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-neutral-500 mb-0.5">Deployed URL</p>
                                      <a
                                        href={d.deployedUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-white hover:text-neutral-300 flex items-center gap-1.5 group transition-colors"
                                      >
                                        <span className="truncate">{d.deployedUrl}</span>
                                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {d.ecsTaskArn && (
                                  <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <div className="h-8 w-8 rounded border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-white">ARN</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-neutral-500 mb-1">ECS Task ARN</p>
                                      <p className="font-mono text-xs text-white/80 break-all leading-relaxed">
                                        {d.ecsTaskArn}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
            </div>
          )}
        </div>





      </div>
    </div>
  )

}
