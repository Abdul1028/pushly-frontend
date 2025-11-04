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

export function SystemStatus() {
  const [status, setStatus] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setStatus(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch status");
      console.error("Error fetching system status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    window.open(STATUS_PAGE_URL, "_blank", "noopener,noreferrer");
  };

  const isAllUp = status?.overallStatus === "UP";
  const downServices = status?.services.filter((s) => s.status !== "UP") || [];

  if (loading) {
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

