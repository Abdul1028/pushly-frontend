"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Github, Lock, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { btn, formatRelative } from "./ui";

// Pick a GitHub repository and branch (same endpoints as the old GitHubRepoBrowser).

type Repo = {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
};

export type PickedRepo = { fullName: string; cloneUrl: string; defaultBranch: string; private: boolean };

export function RepoPicker({
  token,
  picked,
  onPick,
  branch,
  onBranchChange,
  disabled,
}: {
  token: string | null;
  picked: PickedRepo | null;
  onPick: (repo: PickedRepo | null) => void;
  branch: string;
  onBranchChange: (b: string) => void;
  disabled?: boolean;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<string[] | null>(null);

  // GitHub connected? Then load repositories
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/github/status`, { headers: { Authorization: `Bearer ${token}` } });
        const data = res.ok ? await res.json() : { connected: false };
        if (cancelled) return;
        setConnected(!!data.connected);
        if (!data.connected) return;
        const r = await fetch("/api/github/repos", { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Couldn’t load your repositories.");
        const list = (await r.json()) as Repo[];
        if (!cancelled) setRepos(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn’t load your repositories.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Branches of the picked repository
  useEffect(() => {
    if (!token || !picked) return;
    let cancelled = false;
    const [owner, repo] = picked.fullName.split("/");
    fetch(`/api/github/repos/${owner}/${repo}/branches`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { name: string }[]) => !cancelled && setBranches(list.map((b) => b.name)))
      .catch(() => !cancelled && setBranches([]));
    return () => {
      cancelled = true;
    };
  }, [token, picked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (repos ?? []).filter((r) => !q || r.full_name.toLowerCase().includes(q));
  }, [repos, query]);

  if (connected === false) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-black/15 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-full bg-fill grid place-items-center shrink-0">
            <Github className="size-5 text-label" aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-medium text-label">Connect GitHub to import</p>
            <p className="text-[13px] text-label-2">Or switch to Git URL to use any public repository.</p>
          </div>
        </div>
        <Link href="/settings" className={cn(btn.secondary, "shrink-0")}>
          Connect in Settings
        </Link>
      </div>
    );
  }

  // Picked: show it with its branch, and a way back to the list
  if (picked) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="size-9 rounded-full bg-label text-white grid place-items-center shrink-0">
            <Github className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-label truncate">{picked.fullName}</p>
            <p className="text-[12px] text-label-3">{picked.private ? "Private repository" : "Public repository"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Branch</span>
            <select
              value={branch}
              onChange={(e) => onBranchChange(e.target.value)}
              disabled={disabled || !branches}
              className="appearance-none h-9 rounded-full border border-black/10 bg-white pl-3.5 pr-8 font-mono text-[13px] text-label outline-none focus:border-apple-blue focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)]"
            >
              {(branches && branches.length ? branches : [branch]).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-label-3" aria-hidden />
          </label>
          <button type="button" className={btn.quiet} onClick={() => onPick(null)} disabled={disabled}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 overflow-hidden">
      <div className="relative border-b border-black/[0.06]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-label-3" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your repositories"
          aria-label="Search repositories"
          className="w-full h-11 pl-10 pr-4 bg-white text-[15px] text-label placeholder:text-label-3 outline-none"
        />
      </div>
      <ul className="max-h-[320px] overflow-y-auto divide-y divide-black/[0.06]">
        {error ? (
          <li className="px-4 py-6 text-[14px] text-sys-red">{error}</li>
        ) : !repos ? (
          [0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-3.5 w-1/2 rounded bg-fill animate-pulse" />
            </li>
          ))
        ) : filtered.length === 0 ? (
          <li className="px-4 py-6 text-[14px] text-label-2">No repositories match “{query}”.</li>
        ) : (
          filtered.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-label truncate">
                  <span className="text-label-3">{r.full_name.split("/")[0]}/</span>
                  <span className="font-medium">{r.name}</span>
                  {r.private && <Lock className="inline size-3 ml-1.5 -mt-0.5 text-label-3" aria-label="Private" />}
                </p>
                <p className="text-[12px] text-label-3">Updated {formatRelative(r.updated_at)}</p>
              </div>
              <button
                type="button"
                className={cn(btn.secondary, "h-8 px-3 text-[13px]")}
                disabled={disabled}
                onClick={() => {
                  onPick({ fullName: r.full_name, cloneUrl: r.clone_url, defaultBranch: r.default_branch, private: r.private });
                  onBranchChange(r.default_branch);
                }}
              >
                Import
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
