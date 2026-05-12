import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Link2, RefreshCw, CheckCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { friendlyErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

export function ConnectExtensionDialog() {
  const { connectExtensionModalOpen, setConnectExtensionModalOpen } =
    useAppStore();
  const createCode = useMutation(api.extensionAuth.createPairingCode);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "1") {
      setConnectExtensionModalOpen(true);
      params.delete("connect");
      const next =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : "") +
        window.location.hash;
      window.history.replaceState(null, "", next);
    }
  }, [setConnectExtensionModalOpen]);

  async function generate() {
    setLoading(true);
    try {
      const c = await createCode();
      setCode(c);
    } catch (err) {
      toast.error(
        friendlyErrorMessage(
          err,
          "We couldn’t generate a pairing code. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(open: boolean) {
    setConnectExtensionModalOpen(open);
    if (!open) {
      setCode(null);
    }
  }

  return (
    <Dialog open={connectExtensionModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="connect-extension-dialog"
        className="max-w-[520px] gap-6 bg-paper p-8"
      >
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper-2">
            <Link2 size={16} className="text-ink-2" />
          </div>
          <div className="text-left">
            <DialogTitle className="m-0 font-display text-[20px] font-medium tracking-tight text-ink">
              Connect the extension
            </DialogTitle>
            <p className="m-0 text-xs text-ink-4">
              Pair Marginalia with your Chrome extension
            </p>
          </div>
        </DialogHeader>

        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {[
            "Install the Marginalia extension from Chrome Web Store (or load unpacked from extension/dist)",
            "Click the Marginalia icon in your Chrome toolbar",
            'In the popup, paste the pairing code below and click "Connect"',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-2 font-mono text-[10px] font-medium text-ink-3">
                {i + 1}
              </span>
              <p className="m-0 text-[13px] leading-relaxed text-ink-2">
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
            className="h-[38px] gap-2 self-start rounded-lg bg-ink text-[13px] text-paper hover:bg-ink-2"
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
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
                Your pairing code{" "}
                <span className="text-hl-sage-ink">(valid 10 min)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-rule bg-paper-2 px-4 py-3">
                <span
                  data-testid="pairing-code-value"
                  className="font-mono text-[22px] font-medium tracking-[0.08em] text-ink"
                >
                  {code}
                </span>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(code);
                    toast.success("Copied!");
                  }}
                  className="font-mono text-[11px] text-accent"
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
              disabled={loading}
              className="h-9 gap-2 self-start rounded-lg border border-rule bg-paper-2 text-xs text-ink hover:bg-paper-3"
            >
              <RefreshCw size={12} /> Generate new code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
