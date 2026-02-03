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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Play, RotateCcw, Square, FileText, ExternalLink, GitCommitHorizontal, GitBranch, Trash2, ArrowUp } from "lucide-react";
import { compare } from "swr/_internal";
type Deployment = {
  id: number;
  status: string;
  environment?: string;
  lastAction?: 'DEPLOYED' | 'PROMOTED' | 'ROLLBACKED' | null;
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

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; deploymentId?: number; environment?: string }>({ open: false });
  const [activeBlockDialog, setActiveBlockDialog] = useState<{ open: boolean; environment?: string }>({ open: false });
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message?: string }>({ open: false });
  const [promoteDialog, setPromoteDialog] = useState<{ open: boolean; deployment?: Deployment }>({ open: false });
  const [rollbackDialog, setRollbackDialog] = useState<{ open: boolean; deployment?: Deployment }>({ open: false });



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


  const stop = useCallback((deploymentId: number, environment?: string) => {
    if (!token) return;

    const isActiveProduction = activeDeployments?.PRODUCTION === deploymentId;
    const isActiveStaging = activeDeployments?.STAGING === deploymentId;

    if (isActiveProduction || isActiveStaging) {
      const envName = isActiveProduction ? "Production" : "Staging";
      setActiveBlockDialog({ open: true, environment: envName });
      return;
    }

    setDeleteDialog({ open: true, deploymentId, environment });
  }, [token, activeDeployments]);

  const confirmDelete = useCallback(async () => {
    if (!token || !deleteDialog.deploymentId) return;

    setBusy(true);
    setError(null);
    setDeleteDialog({ open: false });

    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${deleteDialog.deploymentId}`, token, { method: "DELETE" });
      setSuccessDialog({ open: true, message: "Deployment deleted successfully!" });
      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      console.log("error is: ", e)
      if (e.status === 400 && e.data?.message === "Cannot delete active deployment") {
        setActiveBlockDialog({ open: true, environment: deleteDialog.environment || "" });
      } else {
        setError("Failed to delete deployment: " + (e.message || "Unknown error"));
      }
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments, fetchActiveDeployments, deleteDialog]);

  const confirmPromote = useCallback(async () => {
    if (!token || !promoteDialog.deployment) return;

    setBusy(true);
    setError(null);
    setPromoteDialog({ open: false });

    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${promoteDialog.deployment.id}/promote`, token, { method: "POST" });
      setSuccessDialog({ open: true, message: "Successfully promoted to Production!" });
      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      setError("Failed to promote deployment: " + (e.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments, fetchActiveDeployments, promoteDialog]);

  const confirmRollback = useCallback(async () => {
    if (!token || !rollbackDialog.deployment) return;

    setBusy(true);
    setError(null);
    setRollbackDialog({ open: false });

    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${rollbackDialog.deployment.id}/rollback`, token, { method: "POST" });
      setSuccessDialog({ open: true, message: "Successfully rolled back Production!" });
      await fetchDeployments();
      await fetchActiveDeployments();
    } catch (e: any) {
      setError("Failed to rollback deployment: " + (e.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments, fetchActiveDeployments, rollbackDialog]);

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
            <div className="space-y-6">
              {/* Group deployments by environment */}
              {(() => {
                const prodDeployments = deployments
                  .filter(d => d.environment === "PRODUCTION")
                  .sort((a, b) =>
                    (b.deployedAt ? new Date(b.deployedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0) -
                    (a.deployedAt ? new Date(a.deployedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0)
                  );
                const stagingDeployments = deployments
                  .filter(d => d.environment === "STAGING")
                  .sort((a, b) =>
                    (b.deployedAt ? new Date(b.deployedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0) -
                    (a.deployedAt ? new Date(a.deployedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0)
                  );

                return (
                  <>
                    {/* Production Deployments */}
                    {prodDeployments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-400" />
                          <h3 className="text-sm font-semibold text-white">Production</h3>
                          <span className="text-xs text-neutral-500">({prodDeployments.length})</span>
                        </div>
                        <div className="space-y-3">
                          {prodDeployments.map((d) => {
                            const isActiveProd = activeDeployments?.PRODUCTION === d.id;
                            return (
                              <Collapsible key={d.id} defaultOpen={false}>
                                <div className={`border rounded-lg backdrop-blur-sm hover:bg-white/[0.04] transition-all overflow-hidden ${isActiveProd
                                  ? 'border-green-500/30 bg-green-500/5'
                                  : 'border-white/10 bg-white/[0.02]'
                                  }`}>
                                  {/* NEW 2-ROW HEADER */}
                                  <div className="px-4 sm:px-6 py-3 space-y-2.5">
                                    {/* Row 1: Status + Branch + Active Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <Badge
                                          variant={getStatusColor(d.status)}
                                          className="text-xs font-medium px-2 py-0.5 flex-shrink-0"
                                        >
                                          {d.status}
                                        </Badge>
                                        <code className="text-white font-medium text-sm truncate">
                                          {d.gitBranch || "N/A"}
                                        </code>
                                      </div>
                                      {isActiveProd && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full border bg-green-500/15 text-green-400 border-green-500/30 shadow-sm shadow-black/20 backdrop-blur-sm flex-shrink-0">
                                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                          Active
                                        </span>
                                      )}
                                      {d.lastAction === 'PROMOTED' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full border bg-green-500/10 text-green-400 border-green-500/20 flex-shrink-0">
                                          <ArrowUp className="h-2.5 w-2.5" />
                                          Promoted
                                        </span>
                                      )}
                                      {d.lastAction === 'ROLLBACKED' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 flex-shrink-0">
                                          <RotateCcw className="h-2.5 w-2.5" />
                                          Rollbacked
                                        </span>
                                      )}
                                    </div>

                                    {/* Row 2: Environment + Commit + Time */}
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                      <div className="flex items-center gap-1.5 text-green-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                        <span className="font-medium">Production</span>
                                      </div>
                                      {d.gitCommitHash && (
                                        <>
                                          <span className="text-neutral-700">•</span>
                                          <div className="flex items-center gap-1.5">
                                            <GitCommitHorizontal className="h-3 w-3 text-neutral-500" />
                                            <code title={d.gitCommitHash} className="text-neutral-400 font-mono">
                                              {d.gitCommitHash.substring(0, 7)}
                                            </code>
                                          </div>
                                        </>
                                      )}
                                      {d.deployedAt && (
                                        <>
                                          <span className="text-neutral-700">•</span>
                                          <span className="text-neutral-500" title={new Date(d.deployedAt).toLocaleString()}>
                                            {formatRelativeDate(d.deployedAt)}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Row 3: Actions */}
                                    <div className="flex items-center gap-2 pt-1">
                                      {/* Deploy button (for non-RUNNING and non-SUCCESS deployments) */}
                                      {d.status !== "RUNNING" && d.status !== "SUCCESS" && (
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
                                      {/* Promote to Production button (only for STAGING RUNNING deployments) */}
                                      {d.environment === "STAGING" && d.status === "RUNNING" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPromoteDialog({ open: true, deployment: d })}
                                          disabled={busy}
                                          className="h-8 bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700 text-xs px-3 font-medium"
                                        >
                                          <ArrowUp className="h-3 w-3 mr-1.5" />
                                          Promote to Production
                                        </Button>
                                      )}
                                      {/* Rollback button (only for NON-ACTIVE PRODUCTION RUNNING/SUCCESS deployments) */}
                                      {d.environment === "PRODUCTION" && !isActiveProd && (d.status === "RUNNING" || d.status === "SUCCESS") && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setRollbackDialog({ open: true, deployment: d })}
                                          disabled={busy}
                                          className="h-8 border-yellow-600/50 bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-600 text-xs px-3"
                                        >
                                          <RotateCcw className="h-3 w-3 mr-1.5" />
                                          Rollback
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => stop(d.id, d.environment)}
                                        disabled={busy}
                                        className="h-8 w-8 flex items-center justify-center border-white/10 bg-transparent text-white hover:bg-white/5"
                                        title="Delete deployment"
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

                                  {/* COMPACT DETAILS */}
                                  <CollapsibleContent>
                                    <div className="px-4 sm:px-6 py-4 bg-white/[0.01] space-y-3 border-t border-white/10">
                                      {/* Compact 2-column grid */}
                                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        {d.version && (
                                          <>
                                            <div className="text-neutral-500">Version</div>
                                            <div className="text-white font-mono text-xs truncate" title={d.version}>{d.version}</div>
                                          </>
                                        )}
                                        {d.createdAt && (
                                          <>
                                            <div className="text-neutral-500">Created</div>
                                            <div className="text-white text-xs">
                                              {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </>
                                        )}
                                        {d.deployedAt && (
                                          <>
                                            <div className="text-neutral-500">Deployed</div>
                                            <div className="text-white text-xs">
                                              {new Date(d.deployedAt).toLocaleDateString()} {new Date(d.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* URL - full width */}
                                      {d.deployedUrl && (
                                        <div className="pt-2 border-t border-white/5">
                                          <div className="text-neutral-500 text-xs mb-1">Deployed URL</div>
                                          <a
                                            href={d.deployedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-white hover:text-neutral-300 flex items-center gap-2 group transition-colors break-all"
                                          >
                                            <span>{d.deployedUrl}</span>
                                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                                          </a>
                                        </div>
                                      )}

                                      {/* ARN - collapsible */}
                                      {d.ecsTaskArn && (
                                        <details className="text-xs pt-2 border-t border-white/5">
                                          <summary className="cursor-pointer text-neutral-400 hover:text-white transition-colors select-none">
                                            ECS Task ARN
                                          </summary>
                                          <code className="text-neutral-500 break-all leading-relaxed block mt-2 text-[10px]">
                                            {d.ecsTaskArn}
                                          </code>
                                        </details>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Staging Deployments */}
                    {stagingDeployments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-400" />
                          <h3 className="text-sm font-semibold text-white">Staging</h3>
                          <span className="text-xs text-neutral-500">({stagingDeployments.length})</span>
                        </div>
                        <div className="space-y-3">
                          {stagingDeployments.map((d) => {
                            const isActiveStaging = activeDeployments?.STAGING === d.id;
                            return (
                              <Collapsible key={d.id} defaultOpen={false}>
                                <div className={`border rounded-lg backdrop-blur-sm hover:bg-white/[0.04] transition-all overflow-hidden ${isActiveStaging
                                  ? 'border-yellow-500/30 bg-yellow-500/5'
                                  : 'border-white/10 bg-white/[0.02]'
                                  }`}>
                                  {/* NEW 2-ROW HEADER */}
                                  <div className="px-4 sm:px-6 py-3 space-y-2.5">
                                    {/* Row 1: Status + Branch + Active Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <Badge
                                          variant={getStatusColor(d.status)}
                                          className="text-xs font-medium px-2 py-0.5 flex-shrink-0"
                                        >
                                          {d.status}
                                        </Badge>
                                        <code className="text-white font-medium text-sm truncate">
                                          {d.gitBranch || "N/A"}
                                        </code>
                                      </div>
                                      {isActiveStaging && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full border bg-yellow-500/15 text-yellow-400 border-yellow-500/30 shadow-sm shadow-black/20 backdrop-blur-sm flex-shrink-0">
                                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                          Active
                                        </span>
                                      )}
                                    </div>

                                    {/* Row 2: Environment + Commit + Time */}
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                      <div className="flex items-center gap-1.5 text-yellow-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                        <span className="font-medium">Staging</span>
                                      </div>
                                      {d.gitCommitHash && (
                                        <>
                                          <span className="text-neutral-700">•</span>
                                          <div className="flex items-center gap-1.5">
                                            <GitCommitHorizontal className="h-3 w-3 text-neutral-500" />
                                            <code title={d.gitCommitHash} className="text-neutral-400 font-mono">
                                              {d.gitCommitHash.substring(0, 7)}
                                            </code>
                                          </div>
                                        </>
                                      )}
                                      {d.deployedAt && (
                                        <>
                                          <span className="text-neutral-700">•</span>
                                          <span className="text-neutral-500" title={new Date(d.deployedAt).toLocaleString()}>
                                            {formatRelativeDate(d.deployedAt)}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Row 3: Actions */}
                                    <div className="flex items-center gap-2 pt-1">
                                      {/* Deploy button (for non-RUNNING and non-SUCCESS deployments) */}
                                      {d.status !== "RUNNING" && d.status !== "SUCCESS" && (
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
                                      {/* Promote to Production button (only for STAGING RUNNING/SUCCESS deployments) */}
                                      {(d.status === "RUNNING" || d.status === "SUCCESS") && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPromoteDialog({ open: true, deployment: d })}
                                          disabled={busy}
                                          className="h-8 bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700 text-xs px-3 font-medium"
                                        >
                                          <ArrowUp className="h-3 w-3 mr-1.5" />
                                          Promote to Production
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => stop(d.id, d.environment)}
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

                                  {/* COMPACT DETAILS */}
                                  <CollapsibleContent>
                                    <div className="px-4 sm:px-6 py-4 bg-white/[0.01] space-y-3 border-t border-white/10">
                                      {/* Compact 2-column grid */}
                                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                        {d.version && (
                                          <>
                                            <div className="text-neutral-500">Version</div>
                                            <div className="text-white font-mono text-xs truncate" title={d.version}>{d.version}</div>
                                          </>
                                        )}
                                        {d.createdAt && (
                                          <>
                                            <div className="text-neutral-500">Created</div>
                                            <div className="text-white text-xs">
                                              {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </>
                                        )}
                                        {d.deployedAt && (
                                          <>
                                            <div className="text-neutral-500">Deployed</div>
                                            <div className="text-white text-xs">
                                              {new Date(d.deployedAt).toLocaleDateString()} {new Date(d.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* URL - full width */}
                                      {d.deployedUrl && (
                                        <div className="pt-2 border-t border-white/5">
                                          <div className="text-neutral-500 text-xs mb-1">Deployed URL</div>
                                          <a
                                            href={d.deployedUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm text-white hover:text-neutral-300 flex items-center gap-2 group transition-colors break-all"
                                          >
                                            <span>{d.deployedUrl}</span>
                                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                                          </a>
                                        </div>
                                      )}

                                      {/* ARN - collapsible */}
                                      {d.ecsTaskArn && (
                                        <details className="text-xs pt-2 border-t border-white/5">
                                          <summary className="cursor-pointer text-neutral-400 hover:text-white transition-colors select-none">
                                            ECS Task ARN
                                          </summary>
                                          <code className="text-neutral-500 break-all leading-relaxed block mt-2 text-[10px]">
                                            {d.ecsTaskArn}
                                          </code>
                                        </details>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>







      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent className="bg-neutral-950 border-red-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-white text-xl">Delete Deployment?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-base pt-2">
              Are you sure you want to delete this deployment?
              {deleteDialog.environment && (
                <span className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/10 block">
                  <span className="text-xs text-neutral-500 block">Environment</span>
                  <span className="text-sm text-white font-medium mt-1 block">{deleteDialog.environment}</span>
                </span>
              )}
              <span className="mt-4 text-sm text-red-400 block">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialog({ open: false })}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Deployment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active Deployment Block Dialog */}
      <AlertDialog open={activeBlockDialog.open} onOpenChange={(open) => setActiveBlockDialog({ ...activeBlockDialog, open })}>
        <AlertDialogContent className="bg-neutral-950 border-yellow-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-white text-xl">Cannot Delete Active Deployment</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-base pt-2">
              This deployment is currently live in <span className="text-yellow-400 font-medium">{activeBlockDialog.environment}</span>.
              <span className="mt-4 block">
                Please promote or rollback to another deployment before deleting this one.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setActiveBlockDialog({ open: false })}
              className="bg-white text-black hover:bg-neutral-200"
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog.open} onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}>
        <AlertDialogContent className="bg-neutral-950 border-green-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-white text-xl">Success!</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-base pt-2">
              {successDialog.message || "Operation completed successfully"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setSuccessDialog({ open: false })}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to Production Dialog */}
      <AlertDialog open={promoteDialog.open} onOpenChange={(open) => setPromoteDialog({ ...promoteDialog, open })}>
        <AlertDialogContent className="bg-neutral-950 border-green-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-white text-xl">Promote to Production?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-base pt-2">
              Are you sure you want to promote this staging deployment to production?
              {promoteDialog.deployment && (
                <span className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/10 block">
                  <span className="text-xs text-neutral-500 block">Deployment</span>
                  <span className="text-sm text-white font-medium mt-1 block">
                    {promoteDialog.deployment.gitBranch || 'Unknown'} • {promoteDialog.deployment.gitCommitHash?.substring(0, 7) || 'N/A'}
                  </span>
                </span>
              )}
              <span className="mt-4 text-sm text-green-400 block">This will make it the live deployment.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setPromoteDialog({ open: false })}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPromote}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Promote to Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Production Dialog */}
      <AlertDialog open={rollbackDialog.open} onOpenChange={(open) => setRollbackDialog({ ...rollbackDialog, open })}>
        <AlertDialogContent className="bg-neutral-950 border-yellow-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-white text-xl">Rollback Production?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-base pt-2">
              Are you sure you want to rollback production to this deployment?
              {rollbackDialog.deployment && (
                <span className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/10 block">
                  <span className="text-xs text-neutral-500 block">Target Deployment</span>
                  <span className="text-sm text-white font-medium mt-1 block">
                    {rollbackDialog.deployment.gitBranch || 'Unknown'} • {rollbackDialog.deployment.gitCommitHash?.substring(0, 7) || 'N/A'}
                  </span>
                </span>
              )}
              <span className="mt-4 text-sm text-yellow-400 block">Current active deployment will be replaced.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setRollbackDialog({ open: false })}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRollback}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rollback Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

}
