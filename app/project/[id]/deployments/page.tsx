"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/components/project/project-context";
import { DeploymentRow } from "@/components/project/deployment-row";
import { NewDeploymentButton } from "@/components/project/new-deployment";
import { btn, isInProgress, PageHeader, Panel, Segmented } from "@/components/project/ui";

type Filter = "ALL" | "PRODUCTION" | "STAGING";

export default function DeploymentsPage() {
  const { deployments, sorted, refresh } = useProject();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const list = filter === "ALL" ? sorted : sorted.filter((d) => d.environment === filter);
  const building = sorted.some((d) => isInProgress(d.status));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle={building ? "A build is in progress — this list updates on its own." : "Every build of this project, newest first."}
        actions={
          <>
            <button type="button" className={btn.icon} onClick={onRefresh} aria-label="Refresh deployments">
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </button>
            <NewDeploymentButton />
          </>
        }
      />

      <div className="mb-4">
        <Segmented<Filter>
          label="Filter by environment"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All" },
            { value: "PRODUCTION", label: "Production" },
            { value: "STAGING", label: "Staging" },
          ]}
        />
      </div>

      <Panel bodyClassName="p-0 md:p-0">
        {!deployments ? (
          <ul className="divide-y divide-black/[0.06]" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 px-6 py-5">
                <div className="h-4 w-20 rounded bg-fill-2 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-fill-2 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-fill animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[17px] font-semibold tracking-[-0.022em]">
              {filter === "ALL" ? "No deployments yet." : `No ${filter === "PRODUCTION" ? "Production" : "Staging"} deployments.`}
            </p>
            <p className="mt-1 text-[15px] text-label-2">Start one from a branch to see it here.</p>
            <div className="mt-5 flex justify-center">
              <NewDeploymentButton />
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            <AnimatePresence initial={false}>
              {list.map((d) => (
                <DeploymentRow key={d.id} d={d} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </div>
  );
}
