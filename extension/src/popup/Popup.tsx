import { useEffect, useState, useCallback } from "react";
import { Settings, BookOpen, Download, Terminal, Loader2, Link2, RefreshCw } from "lucide-react";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

const HL_BG_CLASS: Record<HighlightColor, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
};

const PANEL_ROOT_CLASS = "flex h-[520px] w-[380px] flex-col overflow-hidden bg-paper font-ui";
const BRAND_BADGE_CLASS = "flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink font-display text-[17px] font-medium text-paper ring-[1.5px] ring-accent";
const HEADER_ICON_BUTTON_CLASS = "rounded p-1 text-ink-4 transition hover:bg-paper-2";
const FOOTER_ACTION_CLASS = "flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded bg-ink text-xs font-medium text-paper";
const FOOTER_ICON_BUTTON_CLASS = "flex size-[34px] items-center justify-center rounded border border-rule text-ink-2 transition hover:bg-paper";
const CLAMPED_HIGHLIGHT_TEXT_CLASS = "overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

interface Highlight {
  _id: string;
  text: string;
  color: HighlightColor;
  note?: string;
  url: string;
  title: string;
  createdAt: number;
}

function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await chrome.runtime.sendMessage({
        type: "EXCHANGE_PAIRING_CODE",
        payload: { code: code.trim() },
      });
      if (res?.ok) {
        onPaired();
      } else {
        setError(res?.error ?? "Invalid code. Please try again.");
      }
    } catch {
      setError("Connection failed. Make sure the dashboard is open.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="popup-pairing-screen"
      className="flex h-[520px] w-[380px] flex-col items-center justify-center gap-6 bg-paper p-8 font-ui"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-[34px] items-center justify-center rounded-lg bg-ink font-display text-xl font-medium text-paper ring-2 ring-accent">
          M
        </div>
        <span className="font-display text-[18px] font-medium tracking-[-0.02em] text-ink">Marginalia</span>
      </div>

      <div className="text-center">
        <p className="mb-1.5 font-display text-[20px] font-medium tracking-[-0.02em] text-ink">Connect your account</p>
        <p className="text-xs leading-6 text-ink-3">
          Open the Marginalia dashboard and go to<br />
          <strong className="text-ink-2">Avatar → Connect extension</strong> to get a code.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <input
          data-testid="popup-pairing-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
          placeholder="MARG-XXXX-XXXX"
          className="h-11 w-full rounded border border-rule-2 bg-paper-2 px-3.5 font-mono text-base tracking-[0.06em] text-ink outline-none placeholder:text-ink-4"
        />
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <button
          onClick={() => void handleConnect()}
          data-testid="popup-connect-button"
          disabled={loading || !code.trim()}
          className="flex h-10 items-center justify-center gap-1.5 rounded bg-ink text-[13px] font-medium text-paper transition disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-4"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Connect
        </button>
      </div>

      <a
        href="http://localhost:5173/connect-extension"
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-accent no-underline"
      >
        Open dashboard to generate a code →
      </a>
    </div>
  );
}

function MainPopup({ onUnpair }: { onUnpair: () => void }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tabUrl, setTabUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";
    const title = tab?.title ?? "";
    setTabUrl(url);
    setTabTitle(title);

    if (url) {
      const res = await chrome.runtime.sendMessage({ type: "LIST_FOR_URL", payload: { url } });
      if (res?.ok && Array.isArray(res.data)) {
        setHighlights(res.data as Highlight[]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openDashboard() {
    chrome.tabs.create({ url: "http://localhost:5173" });
  }

  async function exportMarkdown() {
    if (!highlights.length) return;
    const md = `# ${tabTitle}\n\n${highlights.map((h) => `> ${h.text}${h.note ? `\n\n${h.note}` : ""}`).join("\n\n---\n\n")}`;
    await navigator.clipboard.writeText(md);
  }

  async function openSidePanel() {
    await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    window.close();
  }

  const hostname = (() => {
    try {
      return new URL(tabUrl).hostname;
    } catch {
      return tabUrl;
    }
  })();

  return (
    <div data-testid="popup-main" className={PANEL_ROOT_CLASS}>
      <div className="flex items-center gap-2.5 border-b border-rule px-4 py-[14px]">
        <div className={BRAND_BADGE_CLASS}>
          M
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-medium text-ink">Marginalia</div>
          <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4">{hostname}</div>
        </div>
        <button
          onClick={() => void onUnpair()}
          title="Disconnect"
          className={HEADER_ICON_BUTTON_CLASS}
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="px-4 pb-2.5 pt-[14px]">
        <div className="mb-2 flex items-baseline justify-between">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-4"
            data-testid="popup-on-page-label"
          >
            On this page
          </span>
          <span className="text-[11px] text-ink-3">
            {highlights.length} highlight{highlights.length !== 1 ? "s" : ""}
          </span>
        </div>
        {highlights.length > 0 && (
          <>
            <div className="mb-2 truncate font-display text-[13px] text-ink-2" data-testid="popup-tab-title">
              {tabTitle}
            </div>
            <div className="flex h-1.5 gap-px overflow-hidden rounded-full">
              {highlights.map((highlight) => (
                <div key={`${highlight._id}-bar`} className={`flex-1 rounded-full ${HL_BG_CLASS[highlight.color]}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mx-4 h-px bg-rule" />

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center pt-10">
            <Loader2 size={18} className="animate-spin text-ink-4" />
          </div>
        ) : highlights.length === 0 ? (
          <div className="pt-10 text-center text-xs leading-6 text-ink-4">
            <p>No highlights on this page yet.</p>
            <p className="mt-1">Select text to start highlighting.</p>
          </div>
        ) : (
          highlights.map((highlight, index) => (
            <div
              key={highlight._id}
              data-testid="popup-highlight-row"
              className={`flex gap-2.5 py-2 ${index < highlights.length - 1 ? "border-b border-rule" : ""}`}
            >
              <div className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`} />
              <div className="min-w-0 flex-1">
                <p className={CLAMPED_HIGHLIGHT_TEXT_CLASS}>
                  {highlight.text}
                </p>
                {highlight.note && <p className="mt-[3px] text-[11px] italic text-ink-3">"{highlight.note}"</p>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-1.5 border-t border-rule bg-paper-2 p-2.5">
        <button
          onClick={openDashboard}
          className={FOOTER_ACTION_CLASS}
        >
          <BookOpen size={12} /> Open Dashboard
        </button>
        <button
          onClick={() => void exportMarkdown()}
          title="Export as Markdown"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <Download size={12} />
        </button>
        <button
          onClick={() => void openSidePanel()}
          title="Open side panel"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <Terminal size={12} />
        </button>
        <button
          onClick={() => void load()}
          title="Refresh"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}

export default function Popup() {
  const [paired, setPaired] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }).then((res) => {
      setPaired(res?.ok ? res.data.paired : false);
    }).catch(() => setPaired(false));
  }, []);

  if (paired === null) {
    return (
      <div className="flex h-[520px] w-[380px] items-center justify-center bg-paper font-ui">
        <Loader2 size={20} className="animate-spin text-ink-4" />
      </div>
    );
  }

  if (!paired) {
    return <PairingScreen onPaired={() => setPaired(true)} />;
  }

  return (
    <MainPopup
      onUnpair={async () => {
        await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
        setPaired(false);
      }}
    />
  );
}
