"use client";
import { useState, useEffect } from "react";
import { Github, Loader2, RefreshCw, Search, GitBranch, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { btn } from "@/components/project/ui";

interface GitHubRepoBrowserProps {
    token: string | null;
    onSelectRepo: (repoUrl: string, defaultBranch: string) => void;
    onBranchChange?: (branch: string) => void;
    selectedRepoFullName?: string;
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

interface GitHubBranch {
    name: string;
    commit: {
        sha: string;
    };
    protected: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.wareality.tech';

export function GitHubRepoBrowser({ token, onSelectRepo, onBranchChange, selectedRepoFullName }: GitHubRepoBrowserProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
    const [branches, setBranches] = useState<GitHubBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
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

    // Fetch branches when repo is selected
    useEffect(() => {
        if (selectedRepoFullName) {
            fetchBranches(selectedRepoFullName);
        }
    }, [selectedRepoFullName]);

    const checkGitHubConnection = async () => {
        if (!token) return;

        try {
            const response = await fetch(`${BASE_URL}/api/users/github/status`, {
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to fetch repositories");
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async (fullName: string) => {
        if (!token) return;

        const [owner, repo] = fullName.split('/');
        setLoadingBranches(true);

        try {
            const response = await fetch(`/api/github/repos/${owner}/${repo}/branches`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch branches');
            }

            const data = await response.json();
            setBranches(data);
        } catch (err: unknown) {
            console.error('Failed to fetch branches:', err);
            setBranches([]);
        } finally {
            setLoadingBranches(false);
        }
    };

    const handleBranchChange = (branch: string) => {
        setSelectedBranch(branch);
        if (onBranchChange) {
            onBranchChange(branch);
        }
    };

    /* ── Not connected ── */
    if (!githubConnected) {
        return (
            <div className="rounded-xl border border-dashed border-black/[0.12] bg-fill/50 p-5">
                <div className="flex items-start gap-3.5">
                    <span className="size-9 shrink-0 rounded-lg bg-fill-2 grid place-items-center">
                        <Github className="size-4 text-label-2" aria-hidden />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-label">Connect GitHub to browse repositories</p>
                        <p className="mt-1 text-[13px] text-label-2">
                            Link your GitHub account in settings to quickly select repositories.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.href = "/settings"}
                            className={cn(btn.secondary, "mt-3")}
                        >
                            <Github className="size-4" aria-hidden />
                            Go to Settings
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Loading ── */
    if (loading && repos.length === 0) {
        return (
            <div className="py-10 flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-label-3" />
            </div>
        );
    }

    /* ── Repo list ── */
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Github className="size-4 text-label-2" aria-hidden />
                    <p className="text-[14px] font-medium text-label">Your repositories</p>
                    <span className="inline-flex items-center h-5 px-2 rounded-md bg-sys-green/10 text-[11px] font-medium text-sys-green">
                        Connected
                    </span>
                </div>
                <button
                    type="button"
                    onClick={fetchRepos}
                    disabled={loading}
                    className={btn.icon}
                    aria-label="Refresh repositories"
                >
                    <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                </button>
            </div>

            {error && (
                <div className="rounded-xl bg-white border border-sys-red/20 px-4 py-3 text-[13px] text-sys-red">
                    {error}
                </div>
            )}

            {repos.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-label-3" aria-hidden />
                    <input
                        type="text"
                        placeholder="Search repositories…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 rounded-xl border border-black/10 bg-white pl-10 pr-4 text-[14px] text-label placeholder:text-label-3 outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
                    />
                </div>
            )}

            {repos.length === 0 && !error && !loading && (
                <div className="rounded-xl border border-dashed border-black/[0.12] px-6 py-10 text-center">
                    <p className="text-[15px] text-label-2">No repositories found.</p>
                    <p className="mt-1 text-[13px] text-label-3">Create a repository on GitHub first.</p>
                </div>
            )}

            {filteredRepos.length === 0 && repos.length > 0 && (
                <p className="py-8 text-center text-[14px] text-label-2">
                    No repositories match &ldquo;{searchQuery}&rdquo;.
                </p>
            )}

            {filteredRepos.length > 0 && (
                <div className="rounded-xl border border-black/[0.08] divide-y divide-black/[0.06] max-h-[320px] overflow-y-auto">
                    {filteredRepos.map((repo) => {
                        const isSelected = selectedRepoFullName === repo.full_name;
                        return (
                            <button
                                type="button"
                                key={repo.id}
                                onClick={() => {
                                    onSelectRepo(repo.clone_url, repo.default_branch);
                                    setSelectedBranch(repo.default_branch);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors",
                                    isSelected
                                        ? "bg-apple-blue/[0.04]"
                                        : "hover:bg-fill/60"
                                )}
                            >
                                <span className="size-9 shrink-0 rounded-lg bg-fill grid place-items-center text-[13px] font-semibold text-label uppercase">
                                    {repo.name[0]}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={cn("text-[14px] font-medium truncate", isSelected ? "text-apple-blue" : "text-label")}>
                                            {repo.name}
                                        </p>
                                        {repo.private && (
                                            <Lock className="size-3 text-label-3 shrink-0" aria-hidden />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[12px] text-label-3 truncate">{repo.full_name}</p>
                                        <span className="text-[12px] text-label-3">·</span>
                                        <p className="text-[12px] text-label-3 shrink-0">{repo.default_branch}</p>
                                    </div>
                                </div>
                                {isSelected && (
                                    <span className="size-5 shrink-0 rounded-full bg-apple-blue grid place-items-center">
                                        <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Branch Selector */}
            {selectedRepoFullName && branches.length > 0 && (
                <div className="rounded-xl bg-fill p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                        <GitBranch className="size-4 text-label-2" aria-hidden />
                        <p className="text-[14px] font-medium text-label">Select branch</p>
                    </div>
                    <select
                        value={selectedBranch}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        className="block w-full h-10 rounded-xl border border-black/10 bg-white px-3.5 text-[14px] text-label outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                    >
                        {branches.map((branch) => (
                            <option key={branch.name} value={branch.name}>
                                {branch.name}{branch.protected ? " (protected)" : ""}
                            </option>
                        ))}
                    </select>
                    <p className="text-[12px] text-label-3">
                        {branches.length} branch{branches.length !== 1 ? "es" : ""} available.
                    </p>
                </div>
            )}

            {loadingBranches && (
                <div className="rounded-xl bg-fill p-4 flex items-center gap-2.5">
                    <Loader2 className="size-4 animate-spin text-label-3" />
                    <p className="text-[13px] text-label-2">Loading branches…</p>
                </div>
            )}
        </div>
    );
}
