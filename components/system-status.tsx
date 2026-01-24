"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { STATUS_PAGE_URL } from "@/lib/config";

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

export function SystemStatus() {
  const [status, setStatus] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached status from localStorage
  const loadCachedStatus = (): HealthResponse | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp }: CachedStatus = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Ignore cache older than 5 minutes
      if (age > CACHE_MAX_AGE) {
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
    if (typeof window === "undefined") return;

    try {
      const cached: CachedStatus = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (err) {
      console.error("Error saving status to cache:", err);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        "https://actuator-service-70a533dbaa96.herokuapp.com/api/status/health",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }

      const data: HealthResponse = await response.json();

      // Update state
      setStatus(data);
      setError(null);

      // Save to cache for next time
      saveStatusToCache(data);
    } catch (err) {
      setError("Failed to fetch status");
      console.error("Error fetching system status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Try to load from cache first (instant display)
    const cached = loadCachedStatus();
    if (cached) {
      setStatus(cached);
      setLoading(false); // Show cached data immediately
    }

    // 2. Fetch fresh data in background (updates when ready)
    fetchStatus();

    // 3. Continue refreshing every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    window.open(STATUS_PAGE_URL, "_blank", "noopener,noreferrer");
  };

  const isAllUp = status?.overallStatus === "UP";
  const downServices = status?.services.filter((s) => s.status !== "UP") || [];

  // Only show skeleton if no cached data
  if (loading && !status) {
    return (
      <Card
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-muted/30 backdrop-blur-sm border",
          "cursor-pointer transition-all hover:opacity-80"
        )}
        onClick={handleClick}
      >
        <Skeleton className="h-2 w-2 rounded-full" />
        <span className="text-sm text-muted-foreground">Checking system status…</span>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-muted/30 backdrop-blur-sm border",
        "cursor-pointer transition-all hover:opacity-80 hover:scale-105"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          isAllUp ? "bg-green-500" : "bg-red-500"
        )}
      />
      <span className="text-sm text-foreground">
        {isAllUp
          ? "All systems normal."
          : `Some systems down: ${downServices.map((s) => s.name).join(", ")}`}
      </span>
    </Card>
  );
}

