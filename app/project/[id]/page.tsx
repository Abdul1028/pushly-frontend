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
import { Separator } from "@/components/ui/separator";
import { Play, RotateCcw, Square, FileText, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && token) {
      fetchDeployments();
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments]);

  const rollback = useCallback(async (deploymentId: number) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${deploymentId}/rollback`, token, { method: "POST" });
      await fetchDeployments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments]);

  const stop = useCallback(async (deploymentId: number) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetchAuth(`/api/projects/${id}/deployments/${deploymentId}/stop`, token, { method: "POST" });
      await fetchDeployments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [token, id, fetchDeployments]);

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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <div className="flex flex-col gap-6 mb-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project #{id}</h1>
          <p className="text-muted-foreground mt-1">Manage deployments and configurations</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create Deployment</CardTitle>
            <CardDescription>Deploy a new version of your project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Git Commit Hash</label>
                  <Input
                    value={gitCommitHash}
                    onChange={(e) => setGitCommitHash(e.target.value)}
                    placeholder="abc123..."
                    disabled={busy}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Git Branch</label>
                  <Input
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="main"
                    disabled={busy}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Environment</label>
                  <Select
                    value={targetEnv}
                    onValueChange={(v: "STAGING" | "PRODUCTION") => setTargetEnv(v)}
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAGING">Staging</SelectItem>
                      <SelectItem value="PRODUCTION">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={createDeployment} disabled={busy} className="w-full sm:w-auto">
                  <Play className="h-4 w-4 mr-2" />
                  {busy ? "Working…" : "Deploy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto mb-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold">Deployments</h2>
        {!deployments ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground">No deployments yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deployments.map((d) => (
              <Card key={d.id} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {d.gitBranch ?? "branch"} • {d.environment ?? "ENV"}
                        </CardTitle>
                        <Badge variant={getStatusColor(d.status)}>{d.status}</Badge>
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {d.gitCommitHash ?? "commit"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => deployTo(d.environment!, d.id)}
                        disabled={busy}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Deploy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rollback(d.id)}
                        disabled={busy}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => stop(d.id)}
                        disabled={busy}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/logs?projectId=${id}&deploymentId=${d.id}`}>
                          <FileText className="h-3 w-3 mr-1" />
                          Logs
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {d.version && (
                      <div>
                        <span className="text-muted-foreground">Version:</span>{" "}
                        <span className="font-mono">{d.version}</span>
                      </div>
                    )}
                    {d.deployedUrl && (
                      <div>
                        <span className="text-muted-foreground">URL:</span>{" "}
                        <a
                          href={d.deployedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {d.deployedUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {d.createdAt && (
                      <div>
                        <span className="text-muted-foreground">Created:</span>{" "}
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                    )}
                    {d.updatedAt && (
                      <div>
                        <span className="text-muted-foreground">Updated:</span>{" "}
                        {new Date(d.updatedAt).toLocaleString()}
                      </div>
                    )}
                    {d.deployedAt && (
                      <div>
                        <span className="text-muted-foreground">Deployed:</span>{" "}
                        {new Date(d.deployedAt).toLocaleString()}
                      </div>
                    )}
                    {d.ecsTaskArn && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">ECS Task ARN:</span>{" "}
                        <span className="font-mono break-all text-xs">{d.ecsTaskArn}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}