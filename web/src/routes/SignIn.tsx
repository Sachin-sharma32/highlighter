import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";

const DEV_SIGN_IN_EMAIL = "local@marginalia.dev";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInLocal, setIsSigningInLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // signIn() resolves before the Convex socket finishes authenticating, so
  // navigating immediately would bounce back here. Navigate once auth lands.
  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn("google");
    } catch {
      setError(
        "Google sign-in failed locally. Use local dev sign-in below or configure Google env vars.",
      );
      setIsSigningIn(false);
    }
  }

  async function handleLocalSignIn() {
    setError(null);
    setIsSigningInLocal(true);
    try {
      await signIn("playwright", { email: DEV_SIGN_IN_EMAIL });
      // Navigation happens in the isAuthenticated effect above.
    } catch {
      setError(
        "Local dev sign-in failed. Ensure `convex dev` is running and `VITE_CONVEX_URL` is set.",
      );
    } finally {
      setIsSigningInLocal(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper-2">
      {/* Oversized editorial quotation mark, set into the paper */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-[480px] select-none font-display text-[480px] leading-none text-paper-3"
      >
        &ldquo;
      </span>
      {/* Faint margin rule down the page, like a notebook */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-[300px] bg-rule md:block"
      />

      <div className="relative flex w-[420px] animate-fade-up flex-col items-center gap-8 rounded-2xl border border-rule bg-paper p-12 shadow-paper-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-display text-xl font-medium text-white shadow-[0_0_0_2px_var(--accent-color)]">
            M
          </div>
          <span className="font-display text-[20px] font-medium tracking-tight text-ink">
            Marginalia
          </span>
        </div>

        <div className="text-center">
          <p className="mb-2.5 font-display text-[28px] font-medium tracking-tight text-ink">
            Welcome back
          </p>
          <p className="text-sm leading-relaxed text-ink-3">
            The web is your book.{" "}
            <span className="h whitespace-nowrap">Write in the margins.</span>
          </p>
        </div>

        <Button
          className="h-10 w-full gap-2 rounded-lg bg-ink text-paper shadow-paper-1 transition-all duration-150 ease-out hover:bg-ink-2 hover:shadow-paper-2 active:scale-[0.99]"
          disabled={isSigningIn || isSigningInLocal}
          onClick={() => void handleGoogleSignIn()}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
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
          <p className="text-xs text-red-600 text-center m-0">{error}</p>
        )}

        <p className="text-xs text-ink-4 text-center">
          Your highlights stay private and sync across all your devices.
        </p>
      </div>
    </div>
  );
}
