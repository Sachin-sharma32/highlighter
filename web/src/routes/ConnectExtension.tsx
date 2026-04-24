import { useState } from "react";
import { useMutation } from "convex/react";
import { Link2, RefreshCw, CheckCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ConnectExtension() {
  const createCode = useMutation(api.extensionAuth.createPairingCode);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const c = await createCode();
      setCode(c);
    } catch {
      toast.error("Failed to generate code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="connect-extension-page" style={{ background: "var(--paper-2)" }}>
      <div
        className="flex flex-col gap-8 p-12 rounded-xl"
        style={{ background: "var(--paper)", border: "1px solid var(--rule)", boxShadow: "var(--shadow-2)", width: 480 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <Link2 size={16} style={{ color: "var(--ink-2)" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
              Connect the extension
            </h1>
            <p style={{ fontSize: 12, color: "var(--ink-4)", margin: 0 }}>Pair Marginalia with your Chrome extension</p>
          </div>
        </div>

        <ol className="flex flex-col gap-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            "Install the Marginalia extension from Chrome Web Store (or load unpacked from extension/dist)",
            "Click the Marginalia icon in your Chrome toolbar",
            "In the popup, paste the pairing code below and click \"Connect\"",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="shrink-0 flex items-center justify-center rounded-full text-xs font-medium"
                style={{ width: 20, height: 20, background: "var(--paper-2)", border: "1px solid var(--rule)", color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}
              >
                {i + 1}
              </span>
              <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}>{step}</p>
            </li>
          ))}
        </ol>

        {!code ? (
          <Button
            onClick={() => void generate()}
            disabled={loading}
            data-testid="generate-pairing-code-button"
            className="gap-2 self-start"
            style={{ height: 38, background: "var(--ink)", color: "var(--paper)", borderRadius: 8, fontSize: 13 }}
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Link2 size={13} />}
            Generate pairing code
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Your pairing code <span style={{ color: "var(--hl-sage-ink)" }}>(valid 10 min)</span>
              </div>
              <div
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
              >
                <span data-testid="pairing-code-value" style={{ fontFamily: "var(--font-mono)", fontSize: 22, letterSpacing: "0.08em", color: "var(--ink)", fontWeight: 500 }}>
                  {code}
                </span>
                <button
                  onClick={() => { void navigator.clipboard.writeText(code); toast.success("Copied!"); }}
                  style={{ fontSize: 11, color: "var(--accent-color)", fontFamily: "var(--font-mono)" }}
                >
                  copy
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={13} style={{ color: "oklch(70% 0.14 145)" }} />
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Paste this code in the extension popup and click Connect</span>
            </div>

            <Button
              onClick={() => void generate()}
              variant="outline"
              className="gap-2 self-start text-xs"
            >
              <RefreshCw size={12} /> Generate new code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
