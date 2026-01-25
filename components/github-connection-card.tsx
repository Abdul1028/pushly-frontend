"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Github, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { GITHUB_CLIENT_ID } from "@/lib/config";
import { API_BASE_URL } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";

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

    // Check for OAuth callback results
    useEffect(() => {
        const githubParam = searchParams?.get("github");
        const message = searchParams?.get("message");

        if (githubParam === "connected") {
            toast({
                title: "GitHub Connected!",
                description: "Your GitHub account has been successfully connected.",
            });
            // Clear URL params
            window.history.replaceState({}, "", "/settings");
            checkGitHubStatus();
        } else if (githubParam === "error") {
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description: message || "Failed to connect GitHub account.",
            });
            // Clear URL params
            window.history.replaceState({}, "", "/settings");
        }
    }, [searchParams, toast]);

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

    useEffect(() => {
        checkGitHubStatus();
    }, [token]);

    const connectGitHub = () => {
        if (!token) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "Please log in to connect GitHub.",
            });
            return;
        }

        // Pass JWT token as state parameter (since we use localStorage, not server-side cookies)
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
                    title: "GitHub Disconnected",
                    description: "Your GitHub account has been disconnected.",
                });
            } else {
                throw new Error("Failed to disconnect");
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Disconnection Failed",
                description: "Failed to disconnect GitHub account.",
            });
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (githubConnected) {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Github className="h-4 w-4" />
                                    <p className="font-semibold">Connected to GitHub</p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">@{githubUsername}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You can now deploy private repositories and access your GitHub repos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    variant="destructive"
                    onClick={disconnectGitHub}
                    disabled={disconnecting}
                    className="w-full sm:w-auto"
                >
                    {disconnecting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Disconnecting...
                        </>
                    ) : (
                        <>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Disconnect GitHub
                        </>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Github className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold mb-1">Connect GitHub</p>
                        <p className="text-sm text-muted-foreground">
                            Link your GitHub account to access private repositories, browse your repos, and enable seamless deployments.
                        </p>
                    </div>
                </div>
            </div>

            <Button onClick={connectGitHub} className="w-full sm:w-auto">
                <Github className="mr-2 h-4 w-4" />
                Connect GitHub Account
            </Button>
        </div>
    );
}
