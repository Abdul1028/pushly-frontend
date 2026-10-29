"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { STATUS_PAGE_URL } from "@/lib/config";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";

interface HealthService {
  name: string;
  status: string;
}

interface HealthResponse {
  overallStatus: string;
  services: HealthService[];
}

interface CachedStatus {
  data: HealthResponse;
  timestamp: number;
}

const CACHE_KEY = "pushly_system_status";
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const HEALTH_URL = "https://actuator-service-70a533dbaa96.herokuapp.com/api/status/health";

// Load cached status from localStorage
const loadCachedStatus = (): HealthResponse | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp }: CachedStatus = JSON.parse(cached);

    // Ignore cache older than 5 minutes
    if (Date.now() - timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error loading cached status:", err);
    return null;
  }
};

// Save status to localStorage
const saveStatusToCache = (data: HealthResponse) => {
  try {
    const cached: CachedStatus = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (err) {
    console.error("Error saving status to cache:", err);
  }
};

const fetchStatus = async (url: string): Promise<HealthResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch status");
  }
  return response.json();
};

export function SystemStatus() {
  // Stale-while-revalidate: show the last known status, refetch in the background
  // every 30s, when the tab regains focus, and when the network comes back.
  const { data: status, error, isLoading, mutate } = useSWR(HEALTH_URL, fetchStatus, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    onSuccess: saveStatusToCache,
  });

  // Seed from localStorage after mount (reading it during render would break hydration)
  useEffect(() => {
    const cached = loadCachedStatus();
    if (cached) mutate((current) => current ?? cached, { revalidate: false });
  }, [mutate]);

  const loading = isLoading && !status;
  const showSkeleton = useDelayedFlag(loading);

  // Footer link is ~16px tall; the ::after extends the tap area to 44px without changing the look
  const linkClass = cn(
    "relative inline-flex items-center gap-2 text-[12px] text-label-2",
    "after:absolute after:-inset-y-3.5 after:-inset-x-2 after:content-['']"
  );

  const isAllUp = status?.overallStatus === "UP";
  const downServices = status?.services.filter((s) => s.status !== "UP") || [];

  // Only show skeleton if no cached data
  if (loading) {
    return (
      <div className={linkClass} role="status">
        {/* Keeps its loaded size; the gray blocks only appear if loading passes 300ms */}
        <span className={cn("h-2 w-2 rounded-full bg-fill-2 animate-pulse", !showSkeleton && "invisible")} />
        <span className={cn("h-3 w-28 rounded bg-fill-2 animate-pulse", !showSkeleton && "invisible")} />
        <span className="sr-only">Checking system status…</span>
      </div>
    );
  }

  return (
    <a
      href={STATUS_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(linkClass, "hover:text-label hover:underline underline-offset-2")}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          !status ? "bg-label-3" : isAllUp ? "bg-sys-green" : "bg-sys-red"
        )}
      />
      <span>
        {!status && error
          ? "Status unavailable"
          : isAllUp
            ? "All systems normal."
            : `Some systems down: ${downServices.map((s) => s.name).join(", ")}`}
      </span>
    </a>
  );
}

