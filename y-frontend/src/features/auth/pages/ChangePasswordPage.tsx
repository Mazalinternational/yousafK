import { useState } from "react";
import axios from "axios";
import { authApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ?? "Could not change password")
          : "Unexpected error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-semibold">Change password</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        After updating your password, your other browser sessions will remain valid until they
        expire. Sign out of any device you no longer trust from the user admin area.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="current">Current password</Label>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
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
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            Password updated successfully.
          </div>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner className="size-4" /> : null}
          Update password
        </Button>
      </form>
    </div>
  );
}
