import { Navigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../hooks/useAuth";

export function HomeRedirect() {
  const { status } = useAuth();

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <Navigate to="/yk/dashboard" replace />;
}
