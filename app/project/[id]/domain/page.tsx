"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, Copy, ExternalLink, Info, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../../../../hooks/useAuth";
import { apiFetchAuth } from "../../../../lib/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { PRODUCT_DOMAIN } from "@/lib/config";
import { useProject } from "@/components/project/project-context";
import { btn, ConfirmDialog, errorMessage, PageHeader, Panel, Spinner } from "@/components/project/ui";

// ─── Types ──────────────────────────────────────────────────────────────────

type DnsRecord = {
  type: "CNAME" | "TXT";
  name: string;
  value: string;
  description: string;
};

type DomainStatus = "NONE" | "VERIFYING" | "ACTIVE" | "FAILED";

type StatusPayload = {
  domain: string;
  status: DomainStatus;
  cfHostnameStatus?: string;
  cfSslStatus?: string;
  dnsRecords?: DnsRecord[];
  verificationErrors?: string[];
  cfHostnameId?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recordVerified(record: DnsRecord, cfHostnameStatus?: string, cfSslStatus?: string): "verified" | "pending" {
  if (record.type === "CNAME") return cfHostnameStatus === "active" ? "verified" : "pending";
  if (record.description.toLowerCase().includes("ssl") || record.description.toLowerCase().includes("certificate")) {
    return cfSslStatus === "active" ? "verified" : "pending";
  }
  // Ownership TXT shares with hostname status
  return cfHostnameStatus === "active" ? "verified" : "pending";
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-label-2">
      <span className="relative flex size-2">
        {!ok && <span className="absolute inset-0 rounded-full bg-sys-orange animate-ping opacity-60" />}
        <span className={cn("relative size-2 rounded-full", ok ? "bg-sys-green" : "bg-sys-orange")} />
      </span>
      {label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={handleCopy} className={cn(btn.icon, "size-8 shrink-0")} aria-label={`Copy ${label}`}>
      {copied ? <Check className="size-4 text-sys-green" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function DnsRecordRow({ record, cfHostnameStatus, cfSslStatus }: { record: DnsRecord; cfHostnameStatus?: string; cfSslStatus?: string }) {
  const state = recordVerified(record, cfHostnameStatus, cfSslStatus);
  const isSSL = record.description.toLowerCase().includes("ssl") || record.description.toLowerCase().includes("certificate");

  return (
    <li className="px-5 md:px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center h-5 px-2 rounded-md bg-fill-2 text-[11px] font-semibold font-mono text-label">{record.type}</span>
          <span className="text-[13px] text-label-2 truncate">{record.description}</span>
        </div>
        <Dot ok={state === "verified"} label={state === "verified" ? "Verified" : "Pending"} />
      </div>
      <div className="mt-3 grid sm:grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-1.5 items-center">
        <span className="text-[12px] text-label-3">Name</span>
        <div className="flex items-center gap-1 min-w-0">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-fill px-3 py-1.5 font-mono text-[13px] text-label">{record.name}</code>
          <CopyButton value={record.name} label="name" />
        </div>
        <span className="text-[12px] text-label-3">Value</span>
        <div className="flex items-center gap-1 min-w-0">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-fill px-3 py-1.5 font-mono text-[13px] text-label">{record.value}</code>
          <CopyButton value={record.value} label="value" />
        </div>
      </div>
      {isSSL && state === "pending" && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-label-3">
          <Info className="size-3.5" aria-hidden />
          Certificates can take 2–15 minutes to issue after this record is added.
        </p>
      )}
    </li>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomDomainPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id as string;
  const { token } = useAuth();
  const { toast } = useToast();
  const { project, mutateProject } = useProject();

  // ── State ──────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [domainData, setDomainData] = useState<StatusPayload | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastCheckedLabel, setLastCheckedLabel] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [removeDialog, setRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ── Status (404 / no domain is fine — stays on NONE) ──
  const fetchStatus = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setPolling(true);
      try {
        const data = await apiFetchAuth<StatusPayload>(`/api/projects/${projectId}/custom-domain/status`, token);
        setDomainData(data);
        setLastChecked(new Date());
        if (data.status === "ACTIVE" && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } catch (err) {
        if ((err as { status?: number })?.status !== 404) console.error("Status fetch failed:", err);
      } finally {
        if (!silent) setPolling(false);
        setPageLoading(false);
      }
    },
    [token, projectId]
  );

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  // ── Auto-poll every 30s while verifying ──
  useEffect(() => {
    if (domainData?.status === "VERIFYING") {
      if (!pollIntervalRef.current) pollIntervalRef.current = setInterval(() => fetchStatus(true), 30_000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [domainData?.status, fetchStatus]);

  // ── "Checked …" label ──
  useEffect(() => {
    if (!lastChecked) return;
    const update = () => {
      const secs = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
      setLastCheckedLabel(secs < 5 ? "just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`);
    };
    const first = setTimeout(update, 0);
    const t = setInterval(update, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [lastChecked]);

  const handleConnect = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token || !domainInput.trim()) return;
    setSubmitting(true);
    try {
      const data = await apiFetchAuth<StatusPayload>(`/api/projects/${projectId}/custom-domain`, token, {
        method: "POST",
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      setDomainData(data);
      setLastChecked(new Date());
      mutateProject();
      toast({ title: "Domain added", description: "Add the DNS records below to verify it." });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn’t add the domain", description: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await fetchStatus(false);
  };

  const handleRemove = async () => {
    if (!token) return;
    setRemoving(true);
    try {
      await apiFetchAuth(`/api/projects/${projectId}/custom-domain`, token, { method: "DELETE" });
      setDomainData({ domain: "", status: "NONE" });
      setDomainInput("");
      setLastChecked(null);
      mutateProject();
      toast({ title: "Domain removed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn’t remove the domain", description: errorMessage(err) });
    } finally {
      setRemoving(false);
      setRemoveDialog(false);
    }
  };

  // ── Derived state ──
  const currentStatus: DomainStatus = domainData?.status ?? "NONE";
  const hostnameActive = domainData?.cfHostnameStatus === "active";
  const sslActive = domainData?.cfSslStatus === "active";
  const defaultDomain = project?.subdomain ? `${project.subdomain}.${PRODUCT_DOMAIN}` : null;

  if (pageLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-8 w-40 rounded-lg bg-fill-2 animate-pulse" />
        <div className="h-28 rounded-2xl bg-white border border-black/[0.06]" />
        <div className="h-48 rounded-2xl bg-white border border-black/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Domains" subtitle="Where people reach this project. HTTPS is set up for you." />

      {/* Domains in use */}
      <Panel bodyClassName="p-0 md:p-0">
        <ul className="divide-y divide-black/[0.06]">
          {defaultDomain && (
            <li className="flex items-center justify-between gap-4 px-5 md:px-6 py-4">
              <div className="min-w-0">
                <a href={`https://${defaultDomain}`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-label hover:text-link">
                  <span className="truncate">{defaultDomain}</span>
                  <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                </a>
                <p className="text-[12px] text-label-3">Pushly subdomain</p>
              </div>
              <Dot ok label="Active" />
            </li>
          )}
          {currentStatus !== "NONE" && domainData?.domain && (
            <li className="flex items-center justify-between gap-4 px-5 md:px-6 py-4">
              <div className="min-w-0">
                <a href={`https://${domainData.domain}`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-label hover:text-link">
                  <span className="truncate">{domainData.domain}</span>
                  <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                </a>
                <p className="text-[12px] text-label-3">Custom domain</p>
              </div>
              <div className="flex items-center gap-3">
                {currentStatus === "ACTIVE" ? (
                  <Dot ok label="Active" />
                ) : (
                  <div className="hidden sm:flex items-center gap-3">
                    <Dot ok={hostnameActive} label="Routing" />
                    <Dot ok={sslActive} label="HTTPS" />
                  </div>
                )}
                <button type="button" className={btn.icon} onClick={() => setRemoveDialog(true)} aria-label="Remove custom domain">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          )}
        </ul>
      </Panel>

      <AnimatePresence mode="wait" initial={false}>
        {/* NONE — connect form */}
        {currentStatus === "NONE" && (
          <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Panel
              title="Add a custom domain"
              description="Use a subdomain like www.yourdomain.com. Apex domains (yourdomain.com) need the www prefix."
            >
              <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-2">
                <input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="www.yourdomain.com"
                  aria-label="Custom domain"
                  className="flex-1 h-11 rounded-xl border border-black/10 bg-white px-3.5 font-mono text-[15px] text-label placeholder:text-label-3 outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
                  disabled={submitting}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className={cn(btn.primary, "h-11 px-5")} disabled={submitting || !domainInput.trim()}>
                  {submitting && <Spinner />}
                  Add domain
                </button>
              </form>
              <ol className="mt-6 grid sm:grid-cols-4 gap-4">
                {["Enter your domain", "Add the DNS records we show you", "We verify it and issue HTTPS", "It goes live, usually in minutes"].map((t, i) => (
                  <li key={t} className="text-[13px] text-label-2">
                    <span className="block text-[12px] font-medium text-label-3 tabular-nums mb-1">Step {i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </Panel>
          </motion.div>
        )}

        {/* VERIFYING — DNS records */}
        {currentStatus === "VERIFYING" && domainData && (
          <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
            <Panel
              title="Add these DNS records"
              description="At your domain registrar. Changes can take a few minutes to spread."
              action={
                <div className="flex items-center gap-2">
                  {lastChecked && <span className="hidden sm:inline text-[12px] text-label-3">Checked {lastCheckedLabel}</span>}
                  <button type="button" className={btn.secondary} onClick={handleRefresh} disabled={polling}>
                    <RefreshCw className={cn("size-4", polling && "animate-spin")} aria-hidden />
                    Check now
                  </button>
                </div>
              }
              bodyClassName="p-0 md:p-0 pt-3 md:pt-3"
              footer={<p className="text-[12px] text-label-3">Checking again every 30 seconds. Traffic routes as soon as the CNAME verifies, even while HTTPS is still issuing.</p>}
            >
              <ul className="divide-y divide-black/[0.06]">
                {domainData.dnsRecords?.map((record, i) => (
                  <DnsRecordRow key={i} record={record} cfHostnameStatus={domainData.cfHostnameStatus} cfSslStatus={domainData.cfSslStatus} />
                ))}
              </ul>
            </Panel>

            {domainData.verificationErrors && domainData.verificationErrors.length > 0 && (
              <Panel title={<span className="text-sys-red">Verification issues</span>}>
                <ul className="space-y-1">
                  {domainData.verificationErrors.map((e, i) => (
                    <li key={i} className="text-[13px] text-label-2">
                      {e}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </motion.div>
        )}

        {/* ACTIVE — connected */}
        {currentStatus === "ACTIVE" && domainData && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Panel title="Connected">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-sys-green shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-[15px] text-label">
                    <span className="font-medium">{domainData.domain}</span> is live with HTTPS.
                  </p>
                  <p className="text-[13px] text-label-2 mt-0.5">Routed through Cloudflare; the certificate renews automatically.</p>
                </div>
              </div>
              {domainData.dnsRecords && domainData.dnsRecords.length > 0 && (
                <ul className="mt-5 space-y-1.5">
                  {domainData.dnsRecords.map((record, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px]">
                      <span className="inline-flex items-center h-5 px-2 rounded-md bg-fill-2 text-[11px] font-semibold font-mono text-label">{record.type}</span>
                      <span className="font-mono text-label-2 truncate">{record.name}</span>
                      <Check className="size-3.5 text-sys-green ml-auto shrink-0" aria-label="Verified" />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={removeDialog}
        onOpenChange={(o) => !removing && setRemoveDialog(o)}
        title="Remove this domain?"
        description={`${domainData?.domain ?? "The domain"} will stop routing to this project and its certificate will be revoked.`}
        confirmLabel="Remove domain"
        tone="danger"
        busy={removing}
        onConfirm={handleRemove}
      />
    </div>
  );
}
