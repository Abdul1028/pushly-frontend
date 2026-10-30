"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Rocket, X } from "lucide-react";
import { useProject } from "./project-context";
import { btn, errorMessage, Segmented, Spinner, TextField } from "./ui";

type Env = "STAGING" | "PRODUCTION";

// Start a deployment: pick branch, optional commit and environment, then watch it build.
export function NewDeploymentButton({ className, label = "New deployment" }: { className?: string; label?: string }) {
  const { project, deploy, id } = useProject();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [env, setEnv] = useState<Env>("STAGING");
  const [branch, setBranch] = useState("");
  const [commit, setCommit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setBranch(project?.gitBranch || "main");
      setCommit("");
      setError(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await deploy(env, branch.trim() || "main", commit);
      setOpen(false);
      // Straight to the live build output
      router.push(`/logs?projectId=${id}&deploymentId=${created.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn’t start the deployment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className={className ?? btn.primary}>
        <Rocket className="size-4" aria-hidden />
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white text-label shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
          <form onSubmit={submit} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-[19px] font-semibold tracking-[-0.022em]">New deployment</Dialog.Title>
                <Dialog.Description className="mt-1 text-[15px] text-label-2">
                  Build {project?.name ?? "this project"} from a branch and ship it.
                </Dialog.Description>
              </div>
              <Dialog.Close className={btn.icon} aria-label="Close">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <span className="block text-[13px] font-medium text-label">Environment</span>
                <Segmented<Env>
                  label="Environment"
                  value={env}
                  onChange={setEnv}
                  options={[
                    { value: "STAGING", label: "Staging" },
                    { value: "PRODUCTION", label: "Production" },
                  ]}
                />
              </div>
              <TextField label="Branch" mono value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" required disabled={busy} />
              <TextField
                label="Commit"
                mono
                value={commit}
                onChange={(e) => setCommit(e.target.value)}
                placeholder="Latest on the branch"
                hint="Optional. Leave empty to build the newest commit."
                disabled={busy}
              />
              {error && <p className="text-[13px] text-sys-red" role="alert">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close className={btn.secondary} type="button" disabled={busy}>
                Cancel
              </Dialog.Close>
              <button type="submit" className={btn.primary} disabled={busy}>
                {busy ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
                Deploy to {env === "PRODUCTION" ? "Production" : "Staging"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
