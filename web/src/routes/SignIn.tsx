import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

const DEV_SIGN_IN_EMAIL = "local@marginalia.dev";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInLocal, setIsSigningInLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn("google");
    } catch {
      setError("Google sign-in failed locally. Use local dev sign-in below or configure Google env vars.");
      setIsSigningIn(false);
    }
  }

  async function handleLocalSignIn() {
    setError(null);
    setIsSigningInLocal(true);
    try {
      await signIn("playwright", { email: DEV_SIGN_IN_EMAIL });
      navigate("/", { replace: true });
    } catch {
      setError("Local dev sign-in failed. Ensure `convex dev` is running and `VITE_CONVEX_URL` is set.");
    } finally {
      setIsSigningInLocal(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--paper-2)" }}>
      <div
        className="flex flex-col items-center gap-8 p-12 rounded-xl"
        style={{ background: "var(--paper)", border: "1px solid var(--rule)", boxShadow: "var(--shadow-2)", width: 400 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg text-white text-xl font-medium"
            style={{ width: 36, height: 36, background: "var(--ink)", fontFamily: "var(--font-display)", boxShadow: "0 0 0 2px var(--accent-color)" }}
          >
            M
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Marginalia
          </span>
        </div>

        <div className="text-center">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 8 }}>
            Welcome back
          </p>
          <p style={{ fontSize: 14, color: "var(--ink-3)" }}>
            Sign in to access your highlights
          </p>
        </div>

        <Button
          className="w-full gap-2"
          style={{ height: 40, background: "var(--ink)", color: "var(--paper)", borderRadius: 8 }}
          disabled={isSigningIn || isSigningInLocal}
          onClick={() => void handleGoogleSignIn()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isSigningIn ? "Redirecting..." : "Continue with Google"}
        </Button>

        {import.meta.env.DEV && (
          <Button
            variant="outline"
            className="w-full"
            disabled={isSigningIn || isSigningInLocal}
            onClick={() => void handleLocalSignIn()}
          >
            {isSigningInLocal ? "Signing in..." : "Continue in Local Dev"}
          </Button>
        )}

        {error && (
          <p style={{ fontSize: 12, color: "#dc2626", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}

        <p style={{ fontSize: 12, color: "var(--ink-4)", textAlign: "center" }}>
          Your highlights stay private and sync across all your devices.
        </p>
      </div>
    </div>
  );
}
