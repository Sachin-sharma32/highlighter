import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

export default function TestSignIn() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      navigate("/signin", { replace: true });
      return;
    }

    const email = searchParams.get("email")?.trim() || "test@marginalia.dev";
    let cancelled = false;

    void signIn("playwright", { email })
      .then(() => {
        if (!cancelled) {
          navigate("/", { replace: true });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to sign in");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, signIn]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--paper-2)" }}>
      <div
        className="flex flex-col items-center gap-3 rounded-xl px-8 py-10 text-center"
        style={{ background: "var(--paper)", border: "1px solid var(--rule)", boxShadow: "var(--shadow-2)" }}
      >
        <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink)", margin: 0 }}>
          Signing in test user…
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
          This route is available in development only.
        </p>
        {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}