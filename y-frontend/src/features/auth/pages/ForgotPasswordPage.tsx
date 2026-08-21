import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Forgot your password?</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter the email associated with your account and we'll send you a reset link.
        </p>

        {done ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-md border bg-card-foreground/5 px-3 py-2 text-sm"
            >
              If an account exists for that email, a reset link has been issued. Check your
              inbox (and your spam folder).
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              Send reset link
            </Button>
            <div className="text-sm">
              <Link to="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
