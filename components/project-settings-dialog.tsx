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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";

type Project = {
  id: number;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  createdAt?: string;
};

interface ProjectSettingsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: () => void;
}

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
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
      setError(null);
      setSubdomainAvailable(null);
      setSubdomainError(null);
    }
  }, [open, project]);

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
      await apiFetchAuth(`/api/projects/${project.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description,
          gitURL,
          gitBranch,
          subdomain,
        }),
      });

      toast({
        title: "Success",
        description: "Project updated successfully",
        variant: "default",
      });

      onProjectUpdated?.();
      onOpenChange(false);
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
                rows={4}
              />
            </div>

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

