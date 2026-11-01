"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Info,
  Github,
  Rocket,
  ChevronDown,
  Settings2,
  KeyRound,
  Link2,
  GitBranch,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PageHeader, TextField, TextAreaField, Spinner } from "@/components/project/ui";
import { GitHubRepoBrowser } from "@/components/github-repo-browser";
import { EnvVarsEditor, EnvVar, RESERVED_ENV_KEYS } from "@/components/env-vars-editor";
import { cn } from "@/lib/utils";

/* ---------------- constants ---------------- */

const RESERVED_SUBDOMAINS = [
  "www", "api", "admin", "status", "docs", "developer",
  "developers", "support", "auth", "dashboard",
];

/* ---------------- section wrapper ---------------- */

function Section({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-white border border-black/[0.06] overflow-hidden", className)}>
      <div className="px-5 md:px-6 pt-5 md:pt-6">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="size-[18px] text-label-2" aria-hidden />}
          <h2 className="text-[17px] font-semibold tracking-[-0.022em] text-label">{title}</h2>
        </div>
        {description && <p className="mt-1.5 text-[13px] text-label-2">{description}</p>}
      </div>
      <div className="px-5 md:px-6 py-5 md:py-6">{children}</div>
    </section>
  );
}

/* ---------------- collapsible section ---------------- */

function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-5 md:px-6 py-4 md:py-5 text-left group"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="size-[18px] text-label-2" aria-hidden />
          <span className="text-[17px] font-semibold tracking-[-0.022em] text-label">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex items-center h-5 px-2 rounded-md bg-fill-2 text-[11px] font-medium text-label-2 tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-label-3 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6 border-t border-black/[0.06] pt-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------------- domain status indicator ---------------- */

function DomainStatus({ status, subdomain }: { status: string; subdomain: string }) {
  if (!subdomain || status === "idle") return null;

  const configs: Record<string, { icon: React.ReactNode; text: string; tone: string }> = {
    checking: { icon: <Loader2 className="size-4 animate-spin" />, text: "Checking availability…", tone: "text-label-2" },
    available: { icon: <Check className="size-4" />, text: "Available", tone: "text-sys-green" },
    taken: { icon: <X className="size-4" />, text: "Already taken", tone: "text-sys-red" },
    reserved: { icon: <AlertCircle className="size-4" />, text: "Reserved keyword", tone: "text-sys-orange" },
    short: { icon: <Info className="size-4" />, text: "Minimum 4 characters required", tone: "text-sys-orange" },
    invalid: { icon: <X className="size-4" />, text: "Only lowercase letters, numbers, and hyphens", tone: "text-sys-red" },
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <div className={cn("flex items-center gap-2 text-[13px] font-medium mt-2", config.tone)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

/* ---------------- repo source tab bar ---------------- */

function TabBar({
  value,
  onChange,
}: {
  value: "github" | "manual";
  onChange: (v: "github" | "manual") => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-fill-2">
      <button
        type="button"
        onClick={() => onChange("github")}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-medium transition-all duration-150",
          value === "github"
            ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            : "text-label-2 hover:text-label"
        )}
      >
        <Github className="size-4" aria-hidden />
        Import from GitHub
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-medium transition-all duration-150",
          value === "manual"
            ? "bg-white text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            : "text-label-2 hover:text-label"
        )}
      >
        <Link2 className="size-4" aria-hidden />
        Manual URL
      </button>
    </div>
  );
}

/* ---------------- toggle switch ---------------- */

function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3.5 cursor-pointer group">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 mt-0.5 w-[42px] h-[26px] rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apple-blue",
          checked ? "bg-sys-green" : "bg-fill-2"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200",
            checked && "translate-x-4"
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-label">{label}</p>
        {description && <p className="mt-0.5 text-[13px] text-label-2">{description}</p>}
      </div>
    </label>
  );
}

/* ---------------- radio option card ---------------- */

function RadioCard({
  selected,
  onChange,
  label,
  description,
  tag,
  name,
  value,
}: {
  selected: boolean;
  onChange: () => void;
  label: string;
  description: string;
  tag?: string;
  name: string;
  value: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all duration-150",
        selected
          ? "border-apple-blue bg-apple-blue/[0.04] shadow-[0_0_0_1px_rgba(0,113,227,0.3)]"
          : "border-black/[0.08] hover:border-black/[0.15] hover:bg-fill/50"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className={cn(
          "mt-0.5 size-[18px] shrink-0 rounded-full border-2 grid place-items-center transition-colors",
          selected ? "border-apple-blue" : "border-black/20"
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-apple-blue" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-label">{label}</span>
          {tag && (
            <span
              className={cn(
                "inline-flex items-center h-5 px-2 rounded-md text-[11px] font-medium",
                tag === "Recommended" ? "bg-sys-green/10 text-sys-green" : "bg-fill-2 text-label-2"
              )}
            >
              {tag}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-label-2">{description}</p>
      </div>
    </label>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */

export default function NewProjectPage() {
  const { status, token } = useAuth();
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [subdomain, setSubdomain] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repoTab, setRepoTab] = useState<"github" | "manual">("github");

  // Build config overrides
  const [buildConfigOpen, setBuildConfigOpen] = useState(false);
  const [customBuildCommand, setCustomBuildCommand] = useState("");
  const [customInstallCommand, setCustomInstallCommand] = useState("");
  const [customOutputDirectory, setCustomOutputDirectory] = useState("");

  // Environment variables
  const [envVarsOpen, setEnvVarsOpen] = useState(false);
  const [envVariables, setEnvVariables] = useState<EnvVar[]>([]);

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
      // Filter out blank rows and reserved keys before sending
      const cleanEnvVars = envVariables
        .filter(v => v.key.trim() && !RESERVED_ENV_KEYS.has(v.key.toUpperCase()));

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") return <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)]" />;

  /* ---------------- render ---------------- */

  const envCount = envVariables.filter(v => v.key.trim()).length;

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[680px] px-4 sm:px-6 py-8 lg:py-12">
        <PageHeader
          title="New project."
          subtitle="Connect a repository and get a live URL in minutes."
        />

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {/* ── Error banner ── */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="error"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl bg-white border border-sys-red/20 p-4 flex items-start gap-3">
                  <AlertCircle className="size-4 text-sys-red shrink-0 mt-0.5" aria-hidden />
                  <p className="text-[14px] text-label">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Project details ── */}
          <Section title="Project" icon={Rocket}>
            <div className="space-y-5">
              <TextField
                label="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                required
                disabled={loading}
                autoFocus
              />

              <div className="space-y-1.5">
                <label htmlFor="subdomain" className="block text-[13px] font-medium text-label">
                  Subdomain
                </label>
                <div className="flex items-stretch">
                  <input
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) =>
                      setSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="my-project"
                    disabled={loading}
                    className="block flex-1 h-11 rounded-l-xl border border-r-0 border-black/10 bg-white px-3.5 text-[15px] text-label placeholder:text-label-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] focus:z-10 disabled:opacity-60"
                  />
                  <div className="flex items-center h-11 px-3.5 rounded-r-xl border border-black/10 bg-fill text-[14px] text-label-2 font-mono whitespace-nowrap">
                    .{PRODUCT_DOMAIN}
                  </div>
                </div>

                {subdomain && domainStatus === "available" && (
                  <div className="flex items-center gap-1.5 mt-2 text-[13px] text-label-2">
                    <ExternalLink className="size-3.5" aria-hidden />
                    <span className="font-mono">https://{subdomain}.{PRODUCT_DOMAIN}</span>
                  </div>
                )}

                <DomainStatus status={domainStatus} subdomain={subdomain} />

                {!subdomain && (
                  <p className="text-[12px] text-label-3">
                    Choose a unique subdomain for your project (min. 4 characters).
                  </p>
                )}
              </div>

              <TextAreaField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project…"
                rows={2}
                disabled={loading}
                hint="Optional. Helps your team understand what this project is for."
              />
            </div>
          </Section>

          {/* ── Repository source ── */}
          <Section title="Repository" description="Where your code lives." icon={Github}>
            <div className="space-y-5">
              <TabBar value={repoTab} onChange={setRepoTab} />

              {repoTab === "github" ? (
                <div className="space-y-4">
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
                    <div className="flex items-center gap-3 rounded-xl bg-fill p-4">
                      <GitBranch className="size-4 text-label-2 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-label truncate font-mono">{gitURL}</p>
                        <p className="text-[12px] text-label-3 mt-0.5">Branch: {gitBranch}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <TextField
                    label="Repository URL"
                    value={gitURL}
                    onChange={(e) => setGitURL(e.target.value)}
                    placeholder="https://github.com/username/repo.git"
                    disabled={loading}
                    mono
                    hint="Enter the Git URL from GitHub, GitLab, Bitbucket, or any Git provider."
                  />
                  <TextField
                    label="Branch"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="main"
                    disabled={loading}
                    hint='Branch to deploy from (defaults to "main").'
                  />
                </div>
              )}
            </div>
          </Section>

          {/* ── Build configuration (collapsible) ── */}
          <CollapsibleSection
            title="Build settings"
            icon={Settings2}
            open={buildConfigOpen}
            onToggle={() => setBuildConfigOpen((v) => !v)}
          >
            <div className="space-y-5">
              <p className="text-[13px] text-label-2">
                Override auto-detected build settings. Leave blank to let Pushly detect them from your framework.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  label="Install command"
                  value={customInstallCommand}
                  onChange={(e) => setCustomInstallCommand(e.target.value)}
                  placeholder="npm install"
                  disabled={loading}
                  mono
                />
                <TextField
                  label="Build command"
                  value={customBuildCommand}
                  onChange={(e) => setCustomBuildCommand(e.target.value)}
                  placeholder="npm run build"
                  disabled={loading}
                  mono
                />
              </div>
              <TextField
                label="Output directory"
                value={customOutputDirectory}
                onChange={(e) => setCustomOutputDirectory(e.target.value)}
                placeholder="dist"
                disabled={loading}
                mono
                hint="The folder your build outputs to (e.g. dist, out, build, public)."
              />
            </div>
          </CollapsibleSection>

          {/* ── Environment variables (collapsible) ── */}
          <CollapsibleSection
            title="Environment variables"
            icon={KeyRound}
            badge={envCount}
            open={envVarsOpen}
            onToggle={() => setEnvVarsOpen((v) => !v)}
          >
            <EnvVarsEditor
              value={envVariables}
              onChange={setEnvVariables}
              disabled={loading}
            />
          </CollapsibleSection>

          {/* ── Deployment options ── */}
          <Section title="Deployment" icon={Rocket}>
            <div className="space-y-5">
              <Toggle
                id="autoDeploy"
                checked={autoDeployEnabled}
                onChange={setAutoDeployEnabled}
                label="Deploy after creation"
                description="Automatically trigger your first deployment to see your app live immediately."
              />

              {autoDeployEnabled && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                  className="space-y-3 pl-[54px]"
                >
                  <p className="text-[13px] font-medium text-label">Deploy to</p>
                  <div className="space-y-2.5">
                    <RadioCard
                      name="autoDeployEnv"
                      value="STAGING"
                      selected={autoDeployEnv === "STAGING"}
                      onChange={() => setAutoDeployEnv("STAGING")}
                      label="Staging"
                      tag="Recommended"
                      description="Test environment for previewing changes before going live."
                    />
                    <RadioCard
                      name="autoDeployEnv"
                      value="PRODUCTION"
                      selected={autoDeployEnv === "PRODUCTION"}
                      onChange={() => setAutoDeployEnv("PRODUCTION")}
                      label="Production"
                      tag="Live"
                      description="Deploy directly to production — choose if you're confident."
                    />
                  </div>
                  <p className="text-[12px] text-label-3">
                    We recommend deploying to Staging first to test your build before promoting to Production.
                  </p>
                </motion.div>
              )}
            </div>
          </Section>

          {/* ── Submit ── */}
          <div className="pt-2 pb-4">
            <button
              type="submit"
              disabled={
                loading ||
                !name ||
                !subdomain ||
                domainStatus === "checking" ||
                domainStatus !== "available"
              }
              className="btn-apple w-full h-[50px] text-[17px] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Spinner />
                  {autoDeployEnabled
                    ? `Creating & deploying to ${autoDeployEnv === "PRODUCTION" ? "Production" : "Staging"}…`
                    : "Creating project…"
                  }
                </>
              ) : autoDeployEnabled ? (
                <>
                  <Rocket className="size-4" aria-hidden />
                  Create and deploy
                </>
              ) : (
                "Create project"
              )}
            </button>

            {domainStatus !== "available" && subdomain && domainStatus !== "checking" && (
              <p className="mt-3 text-center text-[13px] text-label-2">
                Please choose an available subdomain to continue.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
