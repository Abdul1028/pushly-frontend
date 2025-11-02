"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { apiFetchAuth } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_DOMAIN } from "@/lib/config";

export default function NewProjectPage() {
  const { status, token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const body = { name, description, gitURL, gitBranch, subdomain };
      const res = await apiFetchAuth<{ id: number }>("/api/projects", token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.replace(`/project/${res.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">New Project</CardTitle>
          <CardDescription>
            Create a new project to start deploying
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-awesome-project"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="my-project"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {subdomain ? `${subdomain}.${PRODUCT_DOMAIN}` : "Choose a subdomain for your project"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gitURL">Git URL</Label>
              <Input
                id="gitURL"
                value={gitURL}
                onChange={(e) => setGitURL(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gitBranch">Git Branch</Label>
              <Input
                id="gitBranch"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                placeholder="main"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project"
                disabled={loading}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create Project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


