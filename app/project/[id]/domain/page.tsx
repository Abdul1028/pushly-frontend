"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../hooks/useAuth";
import { apiFetchAuth } from "../../../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Trash2,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Info,
  Wifi,
} from "lucide-react";

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

function recordVerified(record: DnsRecord, cfHostnameStatus?: string, cfSslStatus?: string): "verified" | "pending" | "unknown" {
  if (record.type === "CNAME") {
    if (cfHostnameStatus === "active") return "verified";
    return "pending";
  }
  if (record.description.toLowerCase().includes("ssl") || record.description.toLowerCase().includes("certificate")) {
    if (cfSslStatus === "active") return "verified";
    return "pending";
  }
  // Ownership TXT shares with hostname status
  if (cfHostnameStatus === "active") return "verified";
  return "pending";
}

function StatusIcon({ state }: { state: "verified" | "pending" | "unknown" }) {
  if (state === "verified") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (state === "pending") return <Clock className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />;
  return <Clock className="h-4 w-4 text-zinc-500 shrink-0" />;
}

function StatusLabel({ state }: { state: "verified" | "pending" | "unknown" }) {
  if (state === "verified") return <span className="text-xs font-medium text-emerald-400">Verified</span>;
  if (state === "pending") return <span className="text-xs font-medium text-amber-400">Pending</span>;
  return <span className="text-xs font-medium text-zinc-500">Waiting</span>;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── DNS Record Row ───────────────────────────────────────────────────────────

function DnsRecordRow({
  record,
  cfHostnameStatus,
  cfSslStatus,
}: {
  record: DnsRecord;
  cfHostnameStatus?: string;
  cfSslStatus?: string;
}) {
  const state = recordVerified(record, cfHostnameStatus, cfSslStatus);
  const isSSL = record.description.toLowerCase().includes("ssl") || record.description.toLowerCase().includes("certificate");
  const isCNAME = record.type === "CNAME";

  return (
    <div className={`rounded-xl border p-4 transition-all ${state === "verified"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-zinc-800 bg-zinc-900/50"
      }`}>
      {/* Record header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${isCNAME ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
            }`}>
            {record.type}
          </span>
          <span className="text-xs text-zinc-500">{record.description}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon state={state} />
          <StatusLabel state={state} />
        </div>
      </div>

      {/* Name */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1 font-medium">Name / Host</p>
        <div className="flex items-center gap-1">
          <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-1 rounded-md flex-1 min-w-0 truncate font-mono">
            {record.name}
          </code>
          <CopyButton value={record.name} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1 font-medium">Value / Points To</p>
        <div className="flex items-center gap-1">
          <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-1 rounded-md flex-1 min-w-0 truncate font-mono">
            {record.value}
          </code>
          <CopyButton value={record.value} />
        </div>
      </div>

      {/* SSL extra note */}
      {isSSL && state === "pending" && (
        <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          SSL certificates can take 2–15 minutes to issue after the challenge is added.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomDomainPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id as string;
  const router = useRouter();
  const { status: authStatus, token } = useAuth();
  const { toast } = useToast();

  // ── State ──────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [domainData, setDomainData] = useState<StatusPayload | null>(null);

  // Form state
  const [domainInput, setDomainInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Polling
  const [polling, setPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastCheckedLabel, setLastCheckedLabel] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Remove dialog
  const [removeDialog, setRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ── Auth redirect ────────────────────────────────
  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  // ── Initial load: check status ───────────────────
  const fetchStatus = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setPolling(true);
    try {
      const data = await apiFetchAuth<StatusPayload>(
        `/api/projects/${projectId}/custom-domain/status`,
        token
      );
      setDomainData(data);
      setLastChecked(new Date());

      // Stop polling when ACTIVE
      if (data.status === "ACTIVE" && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } catch (err: any) {
      // 404 / no domain is fine — stay on NONE
      if (err?.status !== 404) {
        console.error("Status fetch failed:", err);
      }
    } finally {
      if (!silent) setPolling(false);
      setPageLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  // ── Auto-poll every 30s when VERIFYING ──────────
  useEffect(() => {
    if (domainData?.status === "VERIFYING") {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => fetchStatus(true), 30_000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [domainData?.status, fetchStatus]);

  // ── Last checked label ────────────────────────────
  useEffect(() => {
    if (!lastChecked) return;
    const update = () => {
      const secs = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
      if (secs < 5) setLastCheckedLabel("just now");
      else if (secs < 60) setLastCheckedLabel(`${secs}s ago`);
      else setLastCheckedLabel(`${Math.floor(secs / 60)}m ago`);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [lastChecked]);

  // ── Connect domain ────────────────────────────────
  const handleConnect = async () => {
    if (!token || !domainInput.trim()) return;
    setSubmitting(true);
    try {
      const data = await apiFetchAuth<StatusPayload>(
        `/api/projects/${projectId}/custom-domain`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ domain: domainInput.trim() }),
        }
      );
      setDomainData(data);
      setLastChecked(new Date());
      toast({ title: "Domain registered!", description: "Add the DNS records shown below to verify your domain." });
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to register domain";
      toast({ variant: "destructive", title: "Failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manual refresh ────────────────────────────────
  const handleRefresh = async () => {
    setPolling(true);
    await fetchStatus(false);
    toast({ title: "Status refreshed", description: "DNS record statuses updated." });
  };

  // ── Remove domain ─────────────────────────────────
  const handleRemove = async () => {
    if (!token) return;
    setRemoving(true);
    try {
      await apiFetchAuth(`/api/projects/${projectId}/custom-domain`, token, {
        method: "DELETE",
      });
      setDomainData({ domain: "", status: "NONE" });
      setDomainInput("");
      setLastChecked(null);
      toast({ title: "Domain removed", description: "Custom domain has been disconnected." });
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to remove domain";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setRemoving(false);
      setRemoveDialog(false);
    }
  };

  // ── Derived state ─────────────────────────────────
  const currentStatus: DomainStatus = domainData?.status ?? "NONE";
  const hostnameActive = domainData?.cfHostnameStatus === "active";
  const sslActive = domainData?.cfSslStatus === "active";
  const fullyActive = currentStatus === "ACTIVE";

  // ── Loading ───────────────────────────────────────
  if (pageLoading || authStatus === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black">
      {/* Top bar */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-100 gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5 bg-zinc-800" />
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-400 font-medium">Custom Domain</span>
          </div>

          {/* Status badge in header */}
          {currentStatus !== "NONE" && (
            <div className="ml-auto">
              {fullyActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/20 gap-1.5">
                  <Clock className="h-3 w-3" />
                  Verifying
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Custom Domain</h1>
          <p className="text-zinc-500 text-sm">
            Connect your own domain to this project. Traffic will route through Cloudflare with automatic HTTPS.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STATE: NONE — Input form
            ═══════════════════════════════════════════════════════════════ */}
        {currentStatus === "NONE" && (
          <>
            {/* Wareality subdomain pill */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Default Domain</p>
                    <p className="text-zinc-100 font-mono text-sm font-medium">
                      {projectId}.wareality.tech
                    </p>
                  </div>
                  <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Connect form */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-zinc-400" />
                  Connect a Custom Domain
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Use a subdomain like <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">www.yourdomain.com</code>.
                  Apex domains (e.g. <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">yourdomain.com</code>) require a <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">www</code> prefix.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !submitting && handleConnect()}
                    placeholder="www.yourdomain.com"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 font-mono"
                    disabled={submitting}
                  />
                  <Button
                    onClick={handleConnect}
                    disabled={submitting || !domainInput.trim()}
                    className="bg-white text-black hover:bg-zinc-200 font-medium shrink-0"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering…</>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>

                {/* How it works */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">How it works</p>
                  {[
                    { icon: "1", text: "Enter your domain and click Connect" },
                    { icon: "2", text: "Add the 3 DNS records shown at your registrar" },
                    { icon: "3", text: "We verify ownership and issue an SSL certificate automatically" },
                    { icon: "4", text: "Your domain goes live — usually within 5 minutes" },
                  ].map((step) => (
                    <div key={step.icon} className="flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center shrink-0 mt-px font-mono">
                        {step.icon}
                      </span>
                      <p className="text-sm text-zinc-400">{step.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STATE: VERIFYING — DNS records + per-record status
            ═══════════════════════════════════════════════════════════════ */}
        {currentStatus === "VERIFYING" && domainData && (
          <>
            {/* Domain + overall status */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Custom Domain</p>
                    <p className="text-zinc-100 font-mono text-sm font-medium">{domainData.domain}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-zinc-500">Routing</span>
                        {hostnameActive
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          : <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />}
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-xs text-zinc-500">SSL</span>
                        {sslActive
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          : <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DNS Records */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">DNS Records to Add</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Add all 3 records at your domain registrar. DNS changes can take a few minutes to propagate.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {lastChecked && (
                    <span className="text-xs text-zinc-600">Checked {lastCheckedLabel}</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={polling}
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${polling ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {domainData.dnsRecords?.map((record, i) => (
                  <DnsRecordRow
                    key={i}
                    record={record}
                    cfHostnameStatus={domainData.cfHostnameStatus}
                    cfSslStatus={domainData.cfSslStatus}
                  />
                ))}
              </div>
            </div>

            {/* Verification errors */}
            {domainData.verificationErrors && domainData.verificationErrors.length > 0 && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400 mb-1">Verification Issues</p>
                      {domainData.verificationErrors.map((e, i) => (
                        <p key={i} className="text-xs text-red-300/70">{e}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status explanation */}
            <Card className="bg-zinc-900/30 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Wifi className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400 font-medium">Auto-refreshing every 30 seconds</p>
                    <p className="text-xs text-zinc-600">
                      DNS propagation typically takes 1–5 minutes. SSL certificate issuance takes 2–15 minutes after ownership is verified.
                      Your domain starts routing traffic as soon as the CNAME is verified, even if the SSL cert is still being issued.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Remove */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRemoveDialog(true)}
                className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Domain
              </Button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STATE: ACTIVE — Live domain card
            ═══════════════════════════════════════════════════════════════ */}
        {currentStatus === "ACTIVE" && domainData && (
          <>
            {/* Active domain hero */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-400 text-sm font-medium mb-1">Domain is live!</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-zinc-100 font-mono text-base font-semibold truncate">{domainData.domain}</p>
                    <a
                      href={`https://${domainData.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Domain details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-300">DNS Routing</span>
                </div>
                <p className="text-xs text-zinc-500">Traffic routing through Cloudflare</p>
                <Badge className="mt-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">Active</Badge>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-300">SSL Certificate</span>
                </div>
                <p className="text-xs text-zinc-500">HTTPS enabled with automatic renewal</p>
                <Badge className="mt-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">Active</Badge>
              </div>
            </div>

            {/* DNS records (collapsed view) */}
            {domainData.dnsRecords && domainData.dnsRecords.length > 0 && (
              <Card className="bg-zinc-900/30 border-zinc-800">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-sm text-zinc-400 font-medium">Connected DNS Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {domainData.dnsRecords.map((record, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${record.type === "CNAME" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
                        }`}>{record.type}</span>
                      <span className="text-zinc-500 truncate font-mono">{record.name}</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 ml-auto" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Remove */}
            <Separator className="bg-zinc-900" />
            <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Remove Custom Domain</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    This will disconnect your domain and revoke the SSL certificate.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRemoveDialog(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Remove confirmation dialog ── */}
      <AlertDialog open={removeDialog} onOpenChange={setRemoveDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Remove Custom Domain?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This will disconnect <span className="text-zinc-300 font-mono">{domainData?.domain}</span>, delete the Cloudflare hostname, revoke the SSL certificate, and remove it from DNS routing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove Domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
