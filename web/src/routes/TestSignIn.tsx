import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { friendlyErrorMessage } from "@/lib/errors";

export default function TestSignIn() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // signIn() resolves before the Convex socket finishes authenticating;
  // navigating on resolve would bounce off RequireAuth back to /signin.
  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      navigate("/signin", { replace: true });
      return;
    }

    const email = searchParams.get("email")?.trim() || "test@marginalia.dev";
    let cancelled = false;

    void signIn("playwright", { email }).catch((err: unknown) => {
      if (!cancelled) {
        setError(
          friendlyErrorMessage(
            err,
            "We couldn’t sign in the test user. Make sure `convex dev` is running.",
          ),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, signIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-2">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-rule bg-paper px-8 py-10 text-center shadow-paper-2">
        <p className="m-0 font-display text-[22px] text-ink">
          Signing in test user…
        </p>
        <p className="m-0 text-[13px] text-ink-3">
          This route is available in development only.
        </p>
        {error && <p className="m-0 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
