import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          403
        </p>
        <h1 className="mb-2 text-2xl font-semibold">You don't have access</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Your account doesn't have permission to view this page. Ask an administrator to grant
          you access if you think this is a mistake.
        </p>
        <Button asChild>
          <Link to="/yk/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
