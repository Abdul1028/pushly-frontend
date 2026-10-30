"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, X } from "lucide-react";
import { apiFetchAuth } from "@/lib/api";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";
import { useProject, type Project } from "@/components/project/project-context";
import { btn, ConfirmDialog, errorMessage, PageHeader, Panel, Spinner, TextAreaField, TextField } from "@/components/project/ui";

type Form = {
  name: string;
  description: string;
  subdomain: string;
  gitURL: string;
  gitBranch: string;
  customInstallCommand: string;
  customBuildCommand: string;
  customOutputDirectory: string;
};

const fromProject = (p: Project): Form => ({
  name: p.name ?? "",
  description: p.description ?? "",
  subdomain: p.subdomain ?? "",
  gitURL: p.gitURL ?? "",
  gitBranch: p.gitBranch ?? "main",
  customInstallCommand: p.customInstallCommand ?? "",
  customBuildCommand: p.customBuildCommand ?? "",
  customOutputDirectory: p.customOutputDirectory ?? "",
});

export default function ProjectSettingsPage() {
  const { project } = useProject();
  if (!project) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-8 w-40 rounded-lg bg-fill-2 animate-pulse" />
        <div className="h-64 rounded-2xl bg-white border border-black/[0.06]" />
      </div>
    );
  }
  // Remount the form whenever the saved project changes, so it starts from the stored values
  return <SettingsForm key={project.updatedAt ?? project.id} project={project} />;
}

function SettingsForm({ project }: { project: Project }) {
  const { id, token, mutateProject } = useProject();
  const { toast } = useToast();
  const router = useRouter();
  const initial = fromProject(project);
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<{ value: string; available: boolean; message?: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // Subdomain availability, checked 500ms after typing stops (same endpoint as before)
  const subChanged = !!form.subdomain && form.subdomain !== project.subdomain;
  useEffect(() => {
    if (!subChanged || !token) return;
    const value = form.subdomain;
    const t = setTimeout(async () => {
      try {
        const r = await apiFetchAuth<{ available: boolean; message?: string }>(
          `/api/projects/domain-available?domain=${encodeURIComponent(value)}`,
          token
        );
        setCheck({ value, available: r.available, message: r.message });
      } catch (e) {
        setCheck({ value, available: false, message: errorMessage(e, "Couldn’t check availability.") });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.subdomain, subChanged, token]);
  const subStatus = !subChanged ? "unchanged" : check?.value !== form.subdomain ? "checking" : check.available ? "available" : "taken";

  const save = async () => {
    if (subStatus === "checking" || subStatus === "taken") return;
    setSaving(true);
    try {
      // Same PUT and body shape the old settings dialog sent
      const updated = await apiFetchAuth<Project>(`/api/projects/${id}`, token!, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          gitURL: form.gitURL,
          gitBranch: form.gitBranch,
          subdomain: form.subdomain,
          customBuildCommand: form.customBuildCommand.trim() || null,
          customInstallCommand: form.customInstallCommand.trim() || null,
          customOutputDirectory: form.customOutputDirectory.trim() || null,
        }),
      });
      mutateProject(updated && typeof updated === "object" ? updated : undefined);
      toast({ title: "Settings saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn’t save settings", description: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setDeleting(true);
    try {
      await apiFetchAuth(`/api/projects/${id}`, token!, { method: "DELETE" });
      toast({ title: `${project.name} deleted` });
      router.push("/dashboard");
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn’t delete the project", description: errorMessage(e) });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title="Settings" subtitle="How this project is named, built and served." />

      <Panel title="General">
        <div className="space-y-4">
          <TextField label="Project name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What this project is for"
            rows={3}
          />
        </div>
      </Panel>

      <Panel
        title="Domain"
        description="Your project’s address on Pushly."
        footer={
          <Link href={`/project/${id}/domain`} className="inline-flex items-center gap-0.5 text-[13px] text-link hover:underline">
            Connect a custom domain <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        }
      >
        <TextField
          label="Subdomain"
          mono
          value={form.subdomain}
          onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          aria-invalid={subStatus === "taken"}
          trailing={
            subStatus === "checking" ? (
              <Spinner className="text-label-3" />
            ) : subStatus === "available" ? (
              <Check className="size-4 text-sys-green" aria-label="Available" />
            ) : subStatus === "taken" ? (
              <X className="size-4 text-sys-red" aria-label="Not available" />
            ) : null
          }
          hint={
            subStatus === "taken" ? (
              <span className="text-sys-red">{check?.message || "That subdomain is taken."}</span>
            ) : (
              <span>
                <span className="font-mono text-label-2">
                  {form.subdomain || "your-project"}.{PRODUCT_DOMAIN}
                </span>
                {subStatus === "available" && <span className="text-[#248a3d]"> is available</span>}
              </span>
            )
          }
        />
      </Panel>

      <Panel title="Git" description="Where Pushly pulls your code from.">
        <div className="grid sm:grid-cols-[minmax(0,1fr)_200px] gap-4">
          <TextField label="Repository URL" mono value={form.gitURL} onChange={(e) => set("gitURL", e.target.value)} placeholder="https://github.com/you/repo.git" />
          <TextField label="Production branch" mono value={form.gitBranch} onChange={(e) => set("gitBranch", e.target.value)} placeholder="main" />
        </div>
      </Panel>

      <Panel title="Build & output" description="Leave these empty and Pushly detects them from your framework.">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Install command" mono value={form.customInstallCommand} onChange={(e) => set("customInstallCommand", e.target.value)} placeholder="Auto-detected" />
          <TextField label="Build command" mono value={form.customBuildCommand} onChange={(e) => set("customBuildCommand", e.target.value)} placeholder="Auto-detected" />
          <TextField
            label="Output directory"
            mono
            value={form.customOutputDirectory}
            onChange={(e) => set("customOutputDirectory", e.target.value)}
            placeholder="Auto-detected"
            hint="For example dist, out, build or public."
          />
        </div>
      </Panel>

      <Panel
        title="Environment variables"
        description="Keys and secrets for your build."
        action={
          <Link href={`/project/${id}/env`} className={btn.secondary}>
            Manage
          </Link>
        }
      />

      <Panel title={<span className="text-sys-red">Delete project</span>} description="Removes the project and all of its deployments. This can’t be undone.">
        <button type="button" className={btn.dangerQuiet} onClick={() => setDeleteOpen(true)}>
          Delete {project.name}
        </button>
      </Panel>

      {/* Save bar: rises from the bottom when there are unsaved changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed z-40 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[560px]"
          >
            <div className="material-light flex items-center justify-between gap-3 rounded-2xl border border-black/10 pl-5 pr-2 py-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)]">
              <p className="text-[14px] text-label">You have unsaved changes.</p>
              <div className="flex items-center gap-1.5">
                <button type="button" className={btn.quiet} onClick={() => setForm(initial)} disabled={saving}>
                  Discard
                </button>
                <button
                  type="button"
                  className={btn.primary}
                  onClick={save}
                  disabled={saving || !form.name.trim() || subStatus === "checking" || subStatus === "taken"}
                >
                  {saving && <Spinner />}
                  Save changes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (deleting) return;
          setDeleteOpen(o);
          if (!o) setConfirmName("");
        }}
        title={`Delete ${project.name}?`}
        description="Every deployment of this project will be removed. This can’t be undone."
        confirmLabel="Delete project"
        tone="danger"
        busy={deleting}
        confirmDisabled={confirmName !== project.name}
        onConfirm={del}
      >
        <TextField
          label={`Type “${project.name}” to confirm`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          autoComplete="off"
          mono
        />
      </ConfirmDialog>
    </div>
  );
}
