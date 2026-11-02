"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Rocket, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { cn } from "@/lib/utils";
import { RESERVED_ENV_KEYS } from "@/components/env-vars-editor";
import { EnvRowsList, useEnvRows } from "@/components/project/env-rows";
import { RepoPicker, type PickedRepo } from "@/components/project/repo-picker";
import { btn, errorMessage, Panel, Segmented, Spinner, TextAreaField, TextField } from "@/components/project/ui";

/* ---------------- constants ---------------- */

const RESERVED_SUBDOMAINS = ["www", "api", "admin", "status", "docs", "developer", "developers", "support", "auth", "dashboard"];

type Source = "github" | "url";
type Env = "STAGING" | "PRODUCTION";

/* ---------------- small pieces ---------------- */

// Apple-style switch
function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-sys-green" : "bg-fill-2"
      )}
    >
      <motion.span
        className="absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
      />
    </button>
  );
}

// Section that opens and closes in place
function Disclosure({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-5 text-left"
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.022em] text-label">
            {title}
            {badge}
          </h2>
          <p className="mt-1 text-[13px] text-label-2">{description}</p>
        </div>
        <ChevronDown className={cn("size-5 text-label-3 shrink-0 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------------- page ---------------- */

export default function NewProjectPage() {
  const { status, token } = useAuth();
  const router = useRouter();

  const [source, setSource] = useState<Source>("github");
  const [picked, setPicked] = useState<PickedRepo | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [description, setDescription] = useState("");

  const [customInstallCommand, setCustomInstallCommand] = useState("");
  const [customBuildCommand, setCustomBuildCommand] = useState("");
  const [customOutputDirectory, setCustomOutputDirectory] = useState("");
  const env = useEnvRows();

  const [autoDeployEnabled, setAutoDeployEnabled] = useState(true);
  const [autoDeployEnv, setAutoDeployEnv] = useState<Env>("STAGING");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState<{ value: string; available: boolean } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const gitURL = source === "github" ? picked?.cloneUrl ?? "" : manualUrl;

  // Picking a repository fills in a name and subdomain if they're still empty
  const onPick = (repo: PickedRepo | null) => {
    setPicked(repo);
    if (!repo) return;
    const repoName = repo.fullName.split("/")[1] ?? "";
    if (!name) setName(repoName.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));
    if (!subdomain) setSubdomain(repoName.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  /* ---------------- subdomain validation ---------------- */

  const localProblem = !subdomain
    ? "empty"
    : subdomain.length < 4
      ? "short"
      : !/^[a-z0-9-]+$/.test(subdomain)
        ? "invalid"
        : RESERVED_SUBDOMAINS.includes(subdomain)
          ? "reserved"
          : null;

  useEffect(() => {
    if (localProblem || !token) return;
    const value = subdomain;
    const t = setTimeout(async () => {
      try {
        const res = await apiFetchAuth<{ available: boolean }>(`/api/projects/domain-available?domain=${value}`, token);
        setCheck({ value, available: res.available });
      } catch {
        setCheck({ value, available: false });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [subdomain, localProblem, token]);

  const domainStatus = localProblem ?? (check?.value !== subdomain ? "checking" : check.available ? "available" : "taken");
  const domainHint: Record<string, { text: string; tone: "muted" | "ok" | "bad" | "warn" }> = {
    empty: { text: "At least 4 characters: lowercase letters, numbers and hyphens.", tone: "muted" },
    short: { text: "At least 4 characters.", tone: "warn" },
    invalid: { text: "Only lowercase letters, numbers and hyphens.", tone: "bad" },
    reserved: { text: "That name is reserved.", tone: "warn" },
    checking: { text: "Checking availability…", tone: "muted" },
    available: { text: "Available", tone: "ok" },
    taken: { text: "Already taken", tone: "bad" },
  };

  /* ---------------- submit (same request as before) ---------------- */

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (domainStatus !== "available") {
      setError("Choose an available subdomain first.");
      return;
    }
    if (!gitURL) {
      setError("Choose a repository first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cleanEnvVars = env.clean.filter((v) => !RESERVED_ENV_KEYS.has(v.key.toUpperCase()));
      const body = {
        name,
        description,
        gitURL,
        gitBranch,
        subdomain,
        autoDeployEnabled,
        autoDeployEnv: autoDeployEnabled ? autoDeployEnv : null,
        customBuildCommand: customBuildCommand.trim() || null,
        customInstallCommand: customInstallCommand.trim() || null,
        customOutputDirectory: customOutputDirectory.trim() || null,
        envVariables: cleanEnvVars.length > 0 ? cleanEnvVars : undefined,
      };
      const res = await apiFetchAuth<{ id: string; deploymentId?: string }>("/api/projects", token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Watch the first build, or open the new project
      if (autoDeployEnabled && res.deploymentId) router.replace(`/logs?projectId=${res.id}&deploymentId=${res.deploymentId}`);
      else router.replace(`/project/${res.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn’t create the project."));
      setLoading(false);
    }
  }

  if (status !== "authenticated") return <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)]" />;

  const ready = !!name.trim() && domainStatus === "available" && !!gitURL && !env.hasProblems;
  const envName = autoDeployEnv === "PRODUCTION" ? "Production" : "Staging";
  const hint = domainHint[domainStatus];
  const varCount = env.clean.length;
  const buildCount = [customInstallCommand, customBuildCommand, customOutputDirectory].filter((v) => v.trim()).length;

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <form onSubmit={onSubmit} className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        <div className="mb-2">
          <h1 className="text-title text-label">New project</h1>
          <p className="mt-1.5 text-[15px] text-label-2">Import a repository and Pushly builds it, picks a URL and ships it.</p>
        </div>

        {/* 1. Repository */}
        <Panel
          title="Repository"
          description="Where your code lives."
          action={
            <Segmented<Source>
              label="Repository source"
              value={source}
              onChange={setSource}
              options={[
                { value: "github", label: "GitHub" },
                { value: "url", label: "Git URL" },
              ]}
            />
          }
        >
          {source === "github" ? (
            <RepoPicker token={token} picked={picked} onPick={onPick} branch={gitBranch} onBranchChange={setGitBranch} disabled={loading} />
          ) : (
            <div className="grid sm:grid-cols-[minmax(0,1fr)_180px] gap-4">
              <TextField
                label="Repository URL"
                mono
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://github.com/you/repo.git"
                hint="GitHub, GitLab, Bitbucket or any Git host."
                disabled={loading}
              />
              <TextField label="Branch" mono value={gitBranch} onChange={(e) => setGitBranch(e.target.value)} placeholder="main" disabled={loading} />
            </div>
          )}
        </Panel>

        {/* 2. Project */}
        <Panel title="Project" description="How it’s named and where it lives.">
          <div className="space-y-4">
            <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My project" required disabled={loading} />
            <div className="space-y-1.5">
              <TextField
                label="Subdomain"
                mono
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-project"
                aria-invalid={hint.tone === "bad"}
                disabled={loading}
                trailing={
                  domainStatus === "checking" ? (
                    <Spinner className="text-label-3" />
                  ) : domainStatus === "available" ? (
                    <Check className="size-4 text-sys-green" aria-hidden />
                  ) : hint.tone === "bad" ? (
                    <X className="size-4 text-sys-red" aria-hidden />
                  ) : null
                }
              />
              {/* Live preview of the address */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-fill font-mono text-[12px] text-label-2 max-w-full truncate">
                  https://{subdomain || "your-project"}.{PRODUCT_DOMAIN}
                </span>
                <span
                  className={cn(
                    "text-[12px]",
                    hint.tone === "ok" && "text-[#248a3d]",
                    hint.tone === "bad" && "text-sys-red",
                    hint.tone === "warn" && "text-[#c93400]",
                    hint.tone === "muted" && "text-label-3"
                  )}
                >
                  {hint.text}
                </span>
              </div>
            </div>
            <TextAreaField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project is for (optional)"
              rows={2}
              disabled={loading}
            />
          </div>
        </Panel>

        {/* 3. Build & output (optional) */}
        <Disclosure
          title="Build & output"
          description="Optional. Pushly detects these from your framework."
          badge={buildCount > 0 ? <span className="text-[12px] font-normal text-label-3">{buildCount} set</span> : undefined}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Install command" mono value={customInstallCommand} onChange={(e) => setCustomInstallCommand(e.target.value)} placeholder="Auto-detected" disabled={loading} />
            <TextField label="Build command" mono value={customBuildCommand} onChange={(e) => setCustomBuildCommand(e.target.value)} placeholder="Auto-detected" disabled={loading} />
            <TextField
              label="Output directory"
              mono
              value={customOutputDirectory}
              onChange={(e) => setCustomOutputDirectory(e.target.value)}
              placeholder="Auto-detected"
              hint="For example dist, out, build or public."
              disabled={loading}
            />
          </div>
        </Disclosure>

        {/* 4. Environment variables (optional) */}
        <Disclosure
          title="Environment variables"
          description="Optional. Paste a .env file into a key field to add them all."
          badge={varCount > 0 ? <span className="text-[12px] font-normal text-label-3 tabular-nums">{varCount}</span> : undefined}
        >
          <EnvRowsList env={env} disabled={loading} emptyText="No variables. Add one if your build needs it." />
        </Disclosure>

        {/* 5. Deploy */}
        <Panel title="Deploy">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] text-label">Deploy right away</p>
              <p className="text-[13px] text-label-2">Start the first build as soon as the project is created.</p>
            </div>
            <Switch checked={autoDeployEnabled} onChange={setAutoDeployEnabled} label="Deploy right away" disabled={loading} />
          </div>
          <AnimatePresence initial={false}>
            {autoDeployEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="overflow-hidden"
              >
                <div className="pt-5 mt-5 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] text-label">Environment</p>
                    <p className="text-[13px] text-label-2">
                      {autoDeployEnv === "STAGING" ? "Recommended: check it on Staging, then promote." : "Goes straight to your live URL."}
                    </p>
                  </div>
                  <Segmented<Env>
                    label="Deploy to"
                    value={autoDeployEnv}
                    onChange={setAutoDeployEnv}
                    options={[
                      { value: "STAGING", label: "Staging" },
                      { value: "PRODUCTION", label: "Production" },
                    ]}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        {error && (
          <p className="text-[14px] text-sys-red" role="alert">
            {error}
          </p>
        )}

        <div className="pt-1">
          <button type="submit" className={cn(btn.primary, "w-full h-12 text-[16px]")} disabled={loading || !ready}>
            {loading ? <Spinner /> : autoDeployEnabled ? <Rocket className="size-4" aria-hidden /> : null}
            {loading
              ? autoDeployEnabled
                ? `Creating and deploying to ${envName}…`
                : "Creating project…"
              : autoDeployEnabled
                ? `Create and deploy to ${envName}`
                : "Create project"}
          </button>
          {!ready && !loading && (
            <p className="mt-3 text-center text-[13px] text-label-3">
              {!gitURL ? "Choose a repository to continue." : !name.trim() ? "Give your project a name." : domainStatus !== "available" ? "Pick an available subdomain." : "Fix the highlighted variables."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
