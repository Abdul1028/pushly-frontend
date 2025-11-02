import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeploymentsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
        <p className="text-muted-foreground mt-1">View all deployments across projects</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
          <CardDescription>Coming soon: deployments table.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This feature is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}


