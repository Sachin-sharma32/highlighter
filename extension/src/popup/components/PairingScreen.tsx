import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONNECT_EXTENSION_URL } from "@/lib/dashboard";
import { friendlyErrorMessage } from "@/lib/errors";
import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";

const TIMEOUT_MESSAGE =
  "We couldn’t reach Marginalia. Check your internet connection and try again.";
const PAIRING_FALLBACK =
  "We couldn’t connect right now. Make sure the dashboard is open, then try again.";

export default function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await Promise.race([
        chrome.runtime.sendMessage({
          type: "EXCHANGE_PAIRING_CODE",
          payload: { code: code.trim() },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), 8000),
        ),
      ]);
      if (res?.ok) {
        onPaired();
      } else {
        setError(friendlyErrorMessage(res?.error, PAIRING_FALLBACK));
      }
    } catch (err) {
      setError(friendlyErrorMessage(err, PAIRING_FALLBACK));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="popup-pairing-screen"
      className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[16px] border border-rule bg-paper p-8 font-ui shadow-paper-2"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-[34px] items-center justify-center rounded-lg bg-ink font-display text-xl font-medium text-paper ring-2 ring-accent">
          M
        </div>
        <span className="font-display text-[18px] font-medium tracking-[-0.02em] text-ink">
          Marginalia
        </span>
      </div>

      <div className="text-center">
        <p className="mb-1.5 font-display text-[20px] font-medium tracking-[-0.02em] text-ink">
          Connect your account
        </p>
        <p className="text-xs leading-6 text-ink-3">
          Open the Marginalia dashboard and go to
          <br />
          <strong className="text-ink-2">Avatar → Connect extension</strong> to
          get a code.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Input
          data-testid="popup-pairing-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
          placeholder="MARG-XXXX-XXXX"
          className="h-11 border-rule-2 bg-paper-2 px-3.5 font-mono text-base tracking-[0.06em]"
        />
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <Button
          onClick={() => void handleConnect()}
          data-testid="popup-connect-button"
          disabled={loading || !code.trim()}
          className="h-10 w-full text-[13px] disabled:bg-paper-3 disabled:text-ink-4 disabled:opacity-100"
        >
          {loading ? (
            <Loader2
              size={14}
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <Link2 size={14} data-icon="inline-start" />
          )}
          Connect
        </Button>
      </div>

      <a
        href={CONNECT_EXTENSION_URL}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-accent no-underline"
      >
        Open dashboard to generate a code →
      </a>
    </div>
  );
}
