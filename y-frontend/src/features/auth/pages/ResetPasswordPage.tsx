import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      navigate("/login", { replace: true, state: { resetSucceeded: true } });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ?? "Reset link is invalid or expired")
          : "Unexpected error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Invalid reset link</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            The reset link is missing a token. Request a new one.
          </p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Choose a new password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Use at least 8 characters. We recommend a mix of letters, numbers, and symbols.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
            />
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner className="size-4" /> : null}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
