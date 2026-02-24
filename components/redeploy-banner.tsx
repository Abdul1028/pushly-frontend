"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, X, Rocket } from "lucide-react";

interface RedeployBannerProps {
    projectId: string | number;
    gitBranch: string;
    token: string | null;
    onDismiss: () => void;
    onDeployed: () => void;
}

export function RedeployBanner({
    projectId,
    gitBranch,
    token,
    onDismiss,
    onDeployed,
}: RedeployBannerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<"staging" | "production" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const triggerRedeploy = async (environment: "STAGING" | "PRODUCTION") => {
        if (!token) return;
        setLoading(environment === "STAGING" ? "staging" : "production");
        setError(null);

        try {
            // Step 1: create a new deployment record
            const deployment = await apiFetchAuth<{ id: string }>(
                `/api/projects/${projectId}/deployments`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({
                        gitBranch: gitBranch || "main",
                        gitCommitHash: "REDEPLOYED",
                        environment,
                    }),
                }
            );

            // Step 2: trigger the actual build
            await apiFetchAuth(
                `/api/projects/${projectId}/deployments/${deployment.id}/deploy?environment=${environment}`,
                token,
                { method: "POST" }
            );

            onDeployed();
            router.push(
                `/logs?projectId=${projectId}&deploymentId=${deployment.id}`
            );
        } catch (err: any) {
            setError(err?.message || "Failed to trigger redeploy");
            setLoading(null);
        }
    };

    return (
        <div className="relative rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Icon + text */}
                <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 p-1.5 rounded-md bg-amber-500/20 shrink-0">
                        <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Environment variables updated
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                            Redeploy your project to apply the new values to your build.
                        </p>
                        {error && (
                            <p className="text-xs text-destructive mt-1">{error}</p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 pl-9 sm:pl-0">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-amber-500/40 hover:bg-amber-500/10"
                        disabled={!!loading}
                        onClick={() => triggerRedeploy("STAGING")}
                    >
                        {loading === "staging" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                            <Rocket className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Staging
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                        disabled={!!loading}
                        onClick={() => triggerRedeploy("PRODUCTION")}
                    >
                        {loading === "production" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                            <Rocket className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Production
                    </Button>
                </div>
            </div>

            {/* Dismiss */}
            <button
                type="button"
                onClick={onDismiss}
                className="absolute top-2.5 right-2.5 text-amber-700/60 hover:text-amber-800 dark:text-amber-400/60 dark:hover:text-amber-300 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
