"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { Check, X, Loader2, AlertCircle, ExternalLink, Info, Github, Rocket } from "lucide-react";
import { GitHubRepoBrowser } from "@/components/github-repo-browser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

/* ---------------- constants ---------------- */

const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "status",
  "docs",
  "developer",
  "developers",
  "support",
  "auth",
  "dashboard",
];

/* ---------------- component ---------------- */

export default function NewProjectPage() {
  const { status, token } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [subdomain, setSubdomain] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  // Auto-deploy options
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(true);
  const [autoDeployEnv, setAutoDeployEnv] = useState<"STAGING" | "PRODUCTION">("STAGING");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // domain validation state
  const [domainStatus, setDomainStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid" | "reserved" | "short"
  >("idle");

  /* ---------------- domain validation ---------------- */

  useEffect(() => {
    if (!subdomain) {
      setDomainStatus("idle");
      return;
    }

    if (subdomain.length < 4) {
      setDomainStatus("short");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      setDomainStatus("invalid");
      return;
    }

    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      setDomainStatus("reserved");
      return;
    }

    setDomainStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetchAuth<{
          available: boolean;
        }>(
          `/api/projects/domain-available?domain=${subdomain}`,
          token!
        );

        setDomainStatus(res.available ? "available" : "taken");
      } catch {
        setDomainStatus("taken");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain, token]);

  /* ---------------- submit ---------------- */

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (domainStatus !== "available") {
      setError("Please choose a valid and available subdomain");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = {
        name,
        description,
        gitURL,
        gitBranch,
        subdomain,
        autoDeployEnabled,
        autoDeployEnv: autoDeployEnabled ? autoDeployEnv : null,
      };

      const res = await apiFetchAuth<{
        id: string;
        deploymentId?: string;
      }>("/api/projects", token, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Redirect based on whether auto-deploy is enabled
      if (autoDeployEnabled && res.deploymentId) {
        // Redirect to logs page to show live build progress
        router.replace(`/logs?projectId=${res.id}&deploymentId=${res.deploymentId}`);
      } else {
        router.replace(`/project/${res.id}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- status indicator component ---------------- */

  const DomainStatusIndicator = () => {
    if (!subdomain) return null;

    const statusConfig = {
      checking: {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: "Checking availability...",
        color: "text-muted-foreground",
        bgColor: "bg-muted/50 border-muted",
      },
      available: {
        icon: <Check className="w-4 h-4" />,
        text: "Available",
        color: "text-green-400",
        bgColor: "bg-green-500/10 border-green-500/30",
      },
      taken: {
        icon: <X className="w-4 h-4" />,
        text: "Already taken",
        color: "text-destructive",
        bgColor: "bg-destructive/10 border-destructive/30",
      },
      reserved: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: "Reserved keyword",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10 border-amber-500/30",
      },
      short: {
        icon: <Info className="w-4 h-4" />,
        text: "Minimum 4 characters required",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10 border-amber-500/30",
      },
      invalid: {
        icon: <X className="w-4 h-4" />,
        text: "Only lowercase letters, numbers, and hyphens allowed",
        color: "text-destructive",
        bgColor: "bg-destructive/10 border-destructive/30",
      },
    };

    const config = statusConfig[domainStatus as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <div
        className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-md border ${config.bgColor} ${config.color} text-sm font-medium transition-all`}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  if (status !== "authenticated") return null;

  /* ---------------- render ---------------- */

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="text-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">New Project</CardTitle>
          <CardDescription className="text-sm">
            Deploy your application in minutes with custom subdomain
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Project name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                required
                disabled={loading}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify your project
              </p>
            </div>

            {/* Subdomain */}
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-sm font-medium">
                Subdomain <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="my-awesome-project"
                disabled={loading}
                className="h-10"
              />

              {subdomain && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-md">
                  <span className="text-sm font-mono">
                    https://{subdomain}.{PRODUCT_DOMAIN}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}

              <DomainStatusIndicator />

              {!subdomain && (
                <p className="text-xs text-muted-foreground">
                  Choose a unique subdomain for your project (min. 4 characters)
                </p>
              )}
            </div>

            {/* Git Configuration with Tabs */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground">Repository Source</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="github" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="github" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <span>Import from GitHub</span>
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>Manual Git URL</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="github" className="space-y-4 mt-4">
                  <GitHubRepoBrowser
                    token={token}
                    selectedRepoFullName={selectedRepo}
                    onSelectRepo={(url, branch) => {
                      setGitURL(url);
                      setGitBranch(branch);
                      const match = url.match(/github\.com[:/]([^/]+\/[^/.]+)(\.git)?/);
                      if (match) {
                        setSelectedRepo(match[1]);
                      }
                      const repoName = url.split('/').pop()?.replace('.git', '') || '';
                      if (repoName && !name) {
                        setName(repoName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                      }
                      if (repoName && !subdomain) {
                        setSubdomain(repoName.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      }
                    }}
                    onBranchChange={(branch) => {
                      setGitBranch(branch);
                    }}
                  />

                  {gitURL && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Selected Repository:</p>
                      <p className="text-sm font-mono truncate">{gitURL}</p>
                      <p className="text-xs text-muted-foreground mt-1">Branch: {gitBranch}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium" htmlFor="gitURL">
                      Repository URL
                    </Label>
                    <Input
                      id="gitURL"
                      value={gitURL}
                      onChange={(e) => setGitURL(e.target.value)}
                      placeholder="https://github.com/username/repo.git"
                      disabled={loading}
                      className="h-10 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the Git URL from GitHub, GitLab, Bitbucket, or any Git provider
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium" htmlFor="gitBranch">
                      Branch
                    </Label>
                    <Input
                      id="gitBranch"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      disabled={loading}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Branch to deploy from (defaults to "main")
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project..."
                rows={4}
                disabled={loading}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Help your team understand what this project is for
              </p>
            </div>

            {/* Auto-Deploy Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground">Deployment Options</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoDeploy"
                    checked={autoDeployEnabled}
                    onChange={(e) => setAutoDeployEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="autoDeploy" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      Auto-deploy after project creation
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically trigger your first deployment to see your app live immediately
                    </p>
                  </div>
                </div>

                {autoDeployEnabled && (
                  <div className="pl-7 space-y-3 pt-2">
                    <Label className="text-sm font-medium">Deploy to:</Label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="autoDeployEnv"
                          value="STAGING"
                          checked={autoDeployEnv === "STAGING"}
                          onChange={() => setAutoDeployEnv("STAGING")}
                          className="mt-0.5 h-4 w-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Staging</span>
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Test environment for previewing changes before going live
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="autoDeployEnv"
                          value="PRODUCTION"
                          checked={autoDeployEnv === "PRODUCTION"}
                          onChange={() => setAutoDeployEnv("PRODUCTION")}
                          className="mt-0.5 h-4 w-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Production</span>
                            <Badge variant="outline" className="text-xs">Live</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Deploy directly to production (choose if you're confident)
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Tip:</strong> We recommend deploying to Staging first to test your build before promoting to Production.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold"
                disabled={
                  loading ||
                  !name ||
                  !subdomain ||
                  domainStatus === "checking" ||
                  domainStatus !== "available"
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {autoDeployEnabled ? `Creating & Deploying to ${autoDeployEnv === 'PRODUCTION' ? 'Production' : 'Staging'}...` : 'Creating Project...'}
                  </>
                ) : (
                  <>
                    {autoDeployEnabled ? (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Create & Deploy to {autoDeployEnv === 'PRODUCTION' ? 'Production' : 'Staging'}
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </>
                )}
              </Button>

              {domainStatus !== "available" && subdomain && domainStatus !== "checking" && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Please choose an available subdomain to continue
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}