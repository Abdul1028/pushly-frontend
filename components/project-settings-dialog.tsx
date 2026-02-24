"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetchAuth } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, Settings2, ChevronDown, KeyRound } from "lucide-react";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";
import { EnvVarsEditor, EnvVar, RESERVED_ENV_KEYS } from "@/components/env-vars-editor";

type Project = {
  id: number | string;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  customBuildCommand?: string;
  customInstallCommand?: string;
  customOutputDirectory?: string;
  createdAt?: string;
};

interface ProjectSettingsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: () => void;
  onEnvVarsChanged?: () => void;  // called only when env vars were actually modified
}

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
  onEnvVarsChanged,
}: ProjectSettingsDialogProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [gitURL, setGitURL] = useState(project.gitURL || "");
  const [gitBranch, setGitBranch] = useState(project.gitBranch || "main");
  const [subdomain, setSubdomain] = useState(project.subdomain || "");

  // Build config
  const [buildConfigOpen, setBuildConfigOpen] = useState(
    !!(project.customBuildCommand || project.customInstallCommand || project.customOutputDirectory)
  );
  const [customBuildCommand, setCustomBuildCommand] = useState(project.customBuildCommand || "");
  const [customInstallCommand, setCustomInstallCommand] = useState(project.customInstallCommand || "");
  const [customOutputDirectory, setCustomOutputDirectory] = useState(project.customOutputDirectory || "");

  // Env vars
  const [envVarsOpen, setEnvVarsOpen] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [initialEnvVars, setInitialEnvVars] = useState<EnvVar[]>([]);
  const [loadingEnvVars, setLoadingEnvVars] = useState(false);

  // Subdomain validation states
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Reset form when project or dialog opens
  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description || "");
      setGitURL(project.gitURL || "");
      setGitBranch(project.gitBranch || "main");
      setSubdomain(project.subdomain || "");
      setCustomBuildCommand(project.customBuildCommand || "");
      setCustomInstallCommand(project.customInstallCommand || "");
      setCustomOutputDirectory(project.customOutputDirectory || "");
      setBuildConfigOpen(!!(project.customBuildCommand || project.customInstallCommand || project.customOutputDirectory));
      setError(null);
      setSubdomainAvailable(null);
      setSubdomainError(null);
    }
  }, [open, project]);

  // Fetch env vars when dialog opens
  useEffect(() => {
    if (!open || !token) return;
    setLoadingEnvVars(true);
    apiFetchAuth(`/api/projects/${project.id}/env-vars`, token)
      .then((data: any) => {
        const vars = Array.isArray(data)
          ? data.map((e: any) => ({ key: e.key, value: e.value }))
          : [];
        setEnvVars(vars);
        setInitialEnvVars(vars);  // snapshot for change detection
        if (vars.length > 0) setEnvVarsOpen(true);
      })
      .catch(() => setEnvVars([]))
      .finally(() => setLoadingEnvVars(false));
  }, [open, project.id, token]);

  // Debounced subdomain validation
  useEffect(() => {
    if (!token || !subdomain || subdomain === project.subdomain) {
      setSubdomainAvailable(null);
      setSubdomainError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingSubdomain(true);
      setSubdomainError(null);

      try {
        const response = await apiFetchAuth(
          `/api/projects/domain-available?domain=${encodeURIComponent(subdomain)}`,
          token
        ) as { available: boolean; message: string };

        setSubdomainAvailable(response.available);
        if (!response.available) {
          setSubdomainError(response.message || "Subdomain is not available");
        }
      } catch (err: any) {
        setSubdomainError(err?.message || "Failed to check subdomain availability");
        setSubdomainAvailable(false);
      } finally {
        setCheckingSubdomain(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [subdomain, token, project.subdomain]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate subdomain availability if changed
    if (subdomain && subdomain !== project.subdomain) {
      if (subdomainAvailable === false || subdomainError) {
        setError(subdomainError || "Please choose an available subdomain");
        return;
      }
      if (checkingSubdomain) {
        setError("Please wait while we check subdomain availability");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update project settings + build config
      await apiFetchAuth(`/api/projects/${project.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description,
          gitURL,
          gitBranch,
          subdomain,
          customBuildCommand: customBuildCommand.trim() || null,
          customInstallCommand: customInstallCommand.trim() || null,
          customOutputDirectory: customOutputDirectory.trim() || null,
        }),
      });

      // 2. Bulk-sync env vars
      const cleanVars = envVars.filter(
        (v) => v.key.trim() && !RESERVED_ENV_KEYS.has(v.key.toUpperCase())
      );
      await apiFetchAuth(`/api/projects/${project.id}/env-vars`, token, {
        method: "PUT",
        body: JSON.stringify(cleanVars),
      });

      // 3. Detect if env vars actually changed vs what was loaded
      const envChanged =
        cleanVars.length !== initialEnvVars.length ||
        cleanVars.some(
          (v, i) =>
            v.key !== initialEnvVars[i]?.key ||
            v.value !== initialEnvVars[i]?.value
        );

      toast({
        title: "Success",
        description: "Project updated successfully",
        variant: "default",
      });

      onProjectUpdated?.();
      onOpenChange(false);
      if (envChanged) onEnvVarsChanged?.();
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to update project";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== project.name) return;
    if (!token) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await apiFetchAuth(`/api/projects/${project.id}`, token, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Project deleted successfully",
        variant: "default",
      });

      onOpenChange(false);
      setDeleteOpen(false);
      router.push("/dashboard");
      onProjectUpdated?.();
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to delete project";
      setDeleteError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Update your project configuration and settings.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-awesome-project"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="my-project"
                  disabled={loading}
                  className={subdomainError && subdomain !== project.subdomain ? "border-destructive" : ""}
                />
                {checkingSubdomain && subdomain && subdomain !== project.subdomain && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!checkingSubdomain && subdomain && subdomain !== project.subdomain && subdomainAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!checkingSubdomain && subdomain && subdomain !== project.subdomain && subdomainAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              {subdomain && subdomain !== project.subdomain && subdomainError && (
                <p className="text-xs text-destructive">
                  {subdomainError}
                </p>
              )}
              {subdomain && subdomain === project.subdomain && (
                <p className="text-xs text-muted-foreground">
                  Current: {subdomain}.{PRODUCT_DOMAIN}
                </p>
              )}
              {subdomain && subdomain !== project.subdomain && subdomainAvailable === true && (
                <p className="text-xs text-green-600">
                  ✓ {subdomain}.{PRODUCT_DOMAIN} is available
                </p>
              )}
              {!subdomain && (
                <p className="text-xs text-muted-foreground">
                  Choose a subdomain for your project
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitURL">Git URL</Label>
              <Input
                id="gitURL"
                value={gitURL}
                onChange={(e) => setGitURL(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitBranch">Git Branch</Label>
              <Input
                id="gitBranch"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="main"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project"
                disabled={loading}
                rows={3}
              />
            </div>

            {/* ── Build Configuration (collapsible) ── */}
            <Collapsible open={buildConfigOpen} onOpenChange={setBuildConfigOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm group py-1"
                >
                  <div className="h-px flex-1 bg-border" />
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                    <Settings2 className="h-3.5 w-3.5" />
                    Build Configuration
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${buildConfigOpen ? "rotate-180" : ""
                        }`}
                    />
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-1">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Override the auto-detected build settings. Leave blank for automatic detection.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="s-installCmd" className="text-sm">Install Command</Label>
                      <Input
                        id="s-installCmd"
                        value={customInstallCommand}
                        onChange={(e) => setCustomInstallCommand(e.target.value)}
                        placeholder="npm install"
                        disabled={loading}
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-buildCmd" className="text-sm">Build Command</Label>
                      <Input
                        id="s-buildCmd"
                        value={customBuildCommand}
                        onChange={(e) => setCustomBuildCommand(e.target.value)}
                        placeholder="npm run build"
                        disabled={loading}
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-outputDir" className="text-sm">Output Directory</Label>
                    <Input
                      id="s-outputDir"
                      value={customOutputDirectory}
                      onChange={(e) => setCustomOutputDirectory(e.target.value)}
                      placeholder="dist"
                      disabled={loading}
                      className="h-9 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">e.g. dist, out, build, public</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Environment Variables (collapsible) ── */}
            <Collapsible open={envVarsOpen} onOpenChange={setEnvVarsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm group py-1"
                >
                  <div className="h-px flex-1 bg-border" />
                  <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                    <KeyRound className="h-3.5 w-3.5" />
                    Environment Variables
                    {loadingEnvVars ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : envVars.filter(v => v.key.trim()).length > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {envVars.filter(v => v.key.trim()).length}
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${envVarsOpen ? "rotate-180" : ""
                        }`}
                    />
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1">
                {loadingEnvVars ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <EnvVarsEditor
                    value={envVars}
                    onChange={setEnvVars}
                    disabled={loading}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete a project, there is no going back. Please be certain.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={loading}
                >
                  Delete Project
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>Delete Project</DialogTitle>
            </div>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project and all associated deployments.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {deleteError}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold">{project.name}</span> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={project.name}
                disabled={deleting}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmText !== project.name}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

