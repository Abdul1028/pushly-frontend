"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";
import { PRODUCT_DOMAIN } from "@/lib/config";

type Project = {
  id: number;
  name: string;
  description?: string;
  gitURL?: string;
  gitBranch?: string;
  subdomain?: string;
  createdAt?: string;
};

export default function DashboardPage() {
  const { status, token } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetchAuth<{ content: Project[] }>("/api/projects?page=0&size=20", token);
      setProjects(res.content ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && token) {
      fetchProjects();
    }
  }, [status, token, router, fetchProjects]);

  const skeletons = useMemo(() => Array(6).fill(0).map((_, i) => (
    <Card key={i}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  )), []);

  if (status !== "authenticated") {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your projects and deployments</p>
        </div>
        <Button asChild>
          <Link href="/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>
      
      {error && (
        <Card className="border-destructive mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {!projects ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skeletons}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button asChild>
                <Link href="/new">Create your first project</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/project/${p.id}`}>
              <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{p.name}</CardTitle>
                  {p.subdomain && (
                    <CardDescription className="font-mono text-xs">
                      {p.subdomain}.{PRODUCT_DOMAIN}
                    </CardDescription>
                  )}
                </CardHeader>
                {p.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


