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
    <div
      className="flex items-center justify-center min-h-screen bg-paper-2"
      data-testid="connect-extension-page"
    >
      <div className="flex flex-col gap-8 p-12 rounded-xl bg-paper border border-rule shadow-[var(--shadow-2)] w-[480px]">
        <div className="flex items-center gap-3">
          <div className="rounded-lg flex items-center justify-center w-9 h-9 bg-paper-2 border border-rule">
            <Link2 size={16} className="text-ink-2" />
          </div>
          <div>
            <h1 className="font-display text-[20px] font-medium tracking-tight text-ink m-0">
              Connect the extension
            </h1>
            <p className="text-xs text-ink-4 m-0">
              Pair Marginalia with your Chrome extension
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-4 list-none p-0 m-0">
          {[
            "Install the Marginalia extension from Chrome Web Store (or load unpacked from extension/dist)",
            "Click the Marginalia icon in your Chrome toolbar",
            'In the popup, paste the pairing code below and click "Connect"',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 flex items-center justify-center rounded-full text-[10px] font-medium w-5 h-5 bg-paper-2 border border-rule text-ink-3 font-mono mt-0.5">
                {i + 1}
              </span>
              <p className="text-[13px] text-ink-2 leading-relaxed m-0">
                {step}
              </p>
            </li>
          ))}
        </ol>

        {!code ? (
          <Button
            onClick={() => void generate()}
            disabled={loading}
            data-testid="generate-pairing-code-button"
            className="gap-2 self-start h-[38px] bg-ink text-paper rounded-lg text-[13px]"
          >
            {loading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Link2 size={13} />
            )}
            Generate pairing code
          </Button>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-mono text-[10px] text-ink-4 uppercase tracking-[0.08em] mb-2">
                Your pairing code{" "}
                <span className="text-hl-sage-ink">(valid 10 min)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-paper-2 border border-rule">
                <span
                  data-testid="pairing-code-value"
                  className="font-mono text-[22px] tracking-[0.08em] text-ink font-medium"
                >
                  {code}
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(code);
                    toast.success("Copied!");
                  }}
                  className="text-[11px] text-accent font-mono"
                >
                  copy
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle size={13} className="text-[oklch(70%_0.14_145)]" />
              <span className="text-xs text-ink-3">
                Paste this code in the extension popup and click Connect
              </span>
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
