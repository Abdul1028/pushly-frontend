"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Github, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/api";
import { GITHUB_CLIENT_ID, PRODUCT_NAME } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { btn, ConfirmDialog, Panel, Spinner } from "@/components/project/ui";

// Account settings in the pushly-ui style: one centred column, like an Apple account page.
// Same endpoints as before (GitHub status/connect/disconnect, logout); no backend changes.

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6 py-3.5 first:pt-0 last:pb-0">
      <span className="text-[13px] text-label-2 shrink-0">{label}</span>
      <div className="text-[15px] text-label min-w-0 sm:text-right">{children}</div>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="font-mono text-[13px] truncate">{value}</span>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={cn(btn.icon, "size-8 shrink-0")}
        aria-label="Copy account ID"
      >
        {copied ? <Check className="size-4 text-sys-green" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

/* ── GitHub (logic carried over from the old GitHubConnectionCard) ── */

function GitHubPanel({ token }: { token: string | null }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/github/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setConnected(!!data.connected);
        setUsername(data.githubUsername || "");
      }
    } catch (e) {
      console.error("Failed to check GitHub status:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Result of the GitHub OAuth round trip (?github=connected|error)
  useEffect(() => {
    const result = searchParams?.get("github");
    if (!result) return;
    if (result === "connected") {
      toast({ title: "GitHub connected" });
      void checkStatus();
    } else if (result === "error") {
      toast({ variant: "destructive", title: "GitHub connection failed", description: searchParams?.get("message") || undefined });
    }
    window.history.replaceState({}, "", "/settings");
  }, [searchParams, toast, checkStatus]);

  const connect = () => {
    if (!token) return;
    // JWT goes as the OAuth state (tokens live in localStorage, not cookies)
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,read:user&state=${encodeURIComponent(token)}`;
  };

  const disconnect = async () => {
    if (!token) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/github`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setConnected(false);
      setUsername("");
      setConfirm(false);
      toast({ title: "GitHub disconnected" });
    } catch {
      toast({ variant: "destructive", title: "Couldn’t disconnect GitHub" });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Panel title="GitHub" description="Import private repositories and let pushes deploy automatically.">
      {loading ? (
        <div className="h-11 rounded-xl bg-fill animate-pulse" />
      ) : connected ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-11 rounded-full bg-label text-white grid place-items-center shrink-0">
              <Github className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-label truncate">{username ? `@${username}` : "Connected"}</p>
              <p className="inline-flex items-center gap-1.5 text-[13px] text-label-2">
                <span className="size-2 rounded-full bg-sys-green" /> Connected
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {username && (
              <a href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer" className={btn.secondary}>
                View profile
              </a>
            )}
            <button type="button" className={btn.dangerQuiet} onClick={() => setConfirm(true)}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[15px] text-label-2">Not connected. Public repositories still work with a Git URL.</p>
          <button type="button" className={cn(btn.primary, "shrink-0")} onClick={connect}>
            <Github className="size-4" aria-hidden />
            Connect GitHub
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => !disconnecting && setConfirm(o)}
        title="Disconnect GitHub?"
        description="Pushly will lose access to your private repositories until you connect again."
        confirmLabel="Disconnect"
        tone="danger"
        busy={disconnecting}
        onConfirm={disconnect}
      />
    </Panel>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, status, logout } = useAuth();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      if (token) {
        // Logout returns plain text, so this isn't parsed; local sign-out happens regardless
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }).catch((e) => console.error("Backend logout failed:", e));
      }
      await logout();
      toast({ title: "Signed out" });
      router.push("/");
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Couldn’t sign out" });
      setSigningOut(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const initials = ((user?.firstName?.[0] ?? user?.email?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

  if (status !== "authenticated") {
    return (
      <div className="appearance-light bg-fill min-h-[calc(100svh-3rem)]">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-10 space-y-5" aria-busy="true">
          <div className="h-20 rounded-2xl bg-white/60" />
          <div className="h-48 rounded-2xl bg-white/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="appearance-light bg-fill text-label min-h-[calc(100svh-3rem)]">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-8 sm:py-12 space-y-5">
        {/* Account header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left pb-3">
          <span className="size-20 rounded-full bg-gradient-to-b from-[#8e8e93] to-[#636366] text-white grid place-items-center text-[28px] font-semibold tracking-[-0.02em] shrink-0" aria-hidden>
            {initials || "·"}
          </span>
          <div className="min-w-0">
            <h1 className="text-title text-label truncate">{fullName || user?.email}</h1>
            <p className="mt-1 text-[15px] text-label-2 truncate">{user?.email}</p>
          </div>
        </div>

        <Panel title="Profile" description={`How you appear on ${PRODUCT_NAME}.`} footer={<p className="text-[12px] text-label-3">Changing your name or email isn’t available yet.</p>}>
          <div className="divide-y divide-black/[0.06]">
            <Row label="First name">{user?.firstName || "—"}</Row>
            <Row label="Last name">{user?.lastName || "—"}</Row>
            <Row label="Email">{user?.email}</Row>
            {user?.role && <Row label="Role"><span className="capitalize">{user.role.toLowerCase()}</span></Row>}
            {user?.id != null && (
              <Row label="Account ID">
                <CopyValue value={String(user.id)} />
              </Row>
            )}
          </div>
        </Panel>

        {/* useSearchParams needs a Suspense boundary */}
        <Suspense fallback={<Panel title="GitHub"><div className="h-11 rounded-xl bg-fill animate-pulse" /></Panel>}>
          <GitHubPanel token={token} />
        </Suspense>

        <Panel title="Session" description="You’re signed in on this device.">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[15px] text-label min-w-0">
              <span className="size-2 rounded-full bg-sys-green shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            <button type="button" className={cn(btn.secondary, "shrink-0")} onClick={signOut} disabled={signingOut}>
              {signingOut ? <Spinner /> : <LogOut className="size-4" aria-hidden />}
              Sign out
            </button>
          </div>
        </Panel>

        <Panel title={<span className="text-sys-red">Delete account</span>} description="Removes your account, projects and deployments for good.">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[13px] text-label-2">Not available here yet. Contact support to delete your account.</p>
            <button type="button" className={cn(btn.dangerQuiet, "shrink-0")} disabled>
              Delete account
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
