"use client";

import { useState, useEffect } from "react";
import { Github, Loader2, AlertCircle, Check } from "lucide-react";
import { GITHUB_CLIENT_ID } from "@/lib/config";
import { API_BASE_URL } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import { btn } from "@/components/project/ui";
import { cn } from "@/lib/utils";

interface GitHubConnectionCardProps {
  token: string | null;
}

export function GitHubConnectionCard({ token }: GitHubConnectionCardProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check GitHub connection status
  const checkGitHubStatus = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/github/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGithubConnected(data.connected);
        setGithubUsername(data.githubUsername || "");
      }
    } catch (error) {
      console.error("Failed to check GitHub status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check for OAuth callback results
  useEffect(() => {
    const githubParam = searchParams?.get("github");
    const message = searchParams?.get("message");

    if (githubParam === "connected") {
      toast({
        title: "GitHub connected",
        description: "Your GitHub account has been successfully connected.",
      });
      window.history.replaceState({}, "", "/settings");
      checkGitHubStatus();
    } else if (githubParam === "error") {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: message || "Failed to connect GitHub account.",
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    checkGitHubStatus();
  }, [token]);

  const connectGitHub = () => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to connect GitHub.",
      });
      return;
    }

    // Pass JWT token as state parameter
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,read:user&state=${encodeURIComponent(token)}`;
    window.location.href = githubAuthUrl;
  };

  const disconnectGitHub = async () => {
    if (!token) return;

    setDisconnecting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/github`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setGithubConnected(false);
        setGithubUsername("");
        toast({
          title: "GitHub disconnected",
          description: "Your GitHub account has been disconnected.",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to disconnect GitHub account.";
      toast({
        variant: "destructive",
        title: "Disconnection failed",
        description: msg,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-label-3" />
      </div>
    );
  }

  if (githubConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-fill border border-black/[0.06]">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="size-10 rounded-xl bg-white border border-black/[0.08] grid place-items-center shrink-0">
              <Github className="size-5 text-label" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-medium text-label truncate">@{githubUsername}</p>
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-md bg-sys-green/10 text-[11px] font-medium text-sys-green shrink-0">
                  <Check className="size-3" aria-hidden /> Connected
                </span>
              </div>
              <p className="text-[13px] text-label-2 truncate mt-0.5">
                Private repositories and automatic webhooks enabled
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={disconnectGitHub}
            disabled={disconnecting}
            className={btn.dangerQuiet}
          >
            {disconnecting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Disconnecting…
              </>
            ) : (
              <>
                <AlertCircle className="size-4" aria-hidden />
                Disconnect GitHub
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3.5 p-4 rounded-xl bg-fill border border-black/[0.06]">
        <span className="size-10 rounded-xl bg-white border border-black/[0.08] grid place-items-center shrink-0 mt-0.5">
          <Github className="size-5 text-label-2" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-label">Link your GitHub account</p>
          <p className="text-[13px] text-label-2 mt-0.5 leading-relaxed">
            Connect to effortlessly import your public and private repositories, auto-detect frameworks, and deploy on push.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={connectGitHub}
        className={cn(btn.primary, "h-10 px-5 text-[14px]")}
      >
        <Github className="size-4" aria-hidden />
        Connect GitHub
      </button>
    </div>
  );
}
