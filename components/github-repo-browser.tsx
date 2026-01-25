"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Github, Loader2, RefreshCw, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface GitHubRepoBrowserProps {
    token: string | null;
    onSelectRepo: (repoUrl: string, defaultBranch: string) => void;
}

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    clone_url: string;
    default_branch: string;
    private: boolean;
    description: string | null;
    updated_at: string;
    stargazers_count?: number;
}

export function GitHubRepoBrowser({ token, onSelectRepo }: GitHubRepoBrowserProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [githubConnected, setGithubConnected] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        checkGitHubConnection();
    }, [token]);

    useEffect(() => {
        // Filter repos based on search query
        if (searchQuery.trim() === "") {
            setFilteredRepos(repos);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredRepos(
                repos.filter(
                    (repo) =>
                        repo.name.toLowerCase().includes(query) ||
                        repo.full_name.toLowerCase().includes(query) ||
                        (repo.description && repo.description.toLowerCase().includes(query))
                )
            );
        }
    }, [searchQuery, repos]);

    const checkGitHubConnection = async () => {
        if (!token) return;

        try {
            const response = await fetch('https://api.wareality.tech/api/users/github/status', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setGithubConnected(data.connected);
                if (data.connected) {
                    fetchRepos();
                }
            }
        } catch (err) {
            console.error("Failed to check GitHub connection:", err);
        }
    };

    const fetchRepos = async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            // Call Next.js API route with JWT in Authorization header
            const response = await fetch('/api/github/repos', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch repositories');
            }

            const data = await response.json();
            setRepos(data);
            setFilteredRepos(data);
        } catch (err: any) {
            setError(err?.message || "Failed to fetch repositories");
        } finally {
            setLoading(false);
        }
    };

    if (!githubConnected) {
        return (
            <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                        <Github className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Connect GitHub to browse repositories</p>
                        <p className="text-xs text-muted-foreground mb-3">
                            Link your GitHub account in settings to quickly select repositories
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = "/settings"}
                        >
                            <Github className="mr-2 h-3.5 w-3.5" />
                            Go to Settings
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading && repos.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <p className="text-sm font-medium">Your GitHub Repositories</p>
                    <Badge variant="secondary" className="text-xs">Connected</Badge>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchRepos}
                    disabled={loading}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
                    {error}
                </div>
            )}

            {repos.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            )}

            {repos.length === 0 && !error && !loading && (
                <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    <p className="mb-2">No repositories found</p>
                    <p className="text-xs">Create a repository on GitHub first</p>
                </div>
            )}

            {filteredRepos.length === 0 && repos.length > 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    <p>No repositories match "{searchQuery}"</p>
                </div>
            )}

            {filteredRepos.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {filteredRepos.map((repo) => (
                        <button
                            key={repo.id}
                            onClick={() => onSelectRepo(repo.clone_url, repo.default_branch)}
                            className="w-full p-3 text-left rounded-lg border hover:bg-accent hover:border-primary/50 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-sm truncate group-hover:text-primary">
                                            {repo.name}
                                        </p>
                                        {repo.private && (
                                            <Badge variant="secondary" className="text-xs">
                                                🔒 Private
                                            </Badge>
                                        )}
                                        {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                ⭐ {repo.stargazers_count}
                                            </span>
                                        )}
                                    </div>
                                    {repo.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                            {repo.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">
                                            {repo.full_name}
                                        </p>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <p className="text-xs text-muted-foreground">
                                            {repo.default_branch}
                                        </p>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
