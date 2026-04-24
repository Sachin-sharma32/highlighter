import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Download,
  Terminal,
  Loader2,
  Link2,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { stripMarginaliaTarget, withMarginaliaTarget } from "@/lib/urls";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = (typeof COLORS)[number];

const HL_BG_CLASS: Record<HighlightColor, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
};

const PANEL_ROOT_CLASS =
  "flex h-[520px] w-[380px] flex-col overflow-hidden bg-paper font-ui";
const BRAND_BADGE_CLASS =
  "flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink font-display text-[17px] font-medium text-paper ring-[1.5px] ring-accent";
const HEADER_ICON_BUTTON_CLASS =
  "size-8 rounded p-1";
const FOOTER_ACTION_CLASS =
  "h-[34px] flex-1 text-xs";
const FOOTER_ICON_BUTTON_CLASS =
  "size-[34px]";
const CLAMPED_HIGHLIGHT_TEXT_CLASS =
  "overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

interface Highlight {
  _id: string;
  text: string;
  color: HighlightColor;
  note?: string;
  url: string;
  title: string;
  createdAt: number;
}

type Scope = "page" | "all";

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
            <Link2
              size={14}
              data-icon="inline-start"
            />
          )}
          Connect
        </Button>
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

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function MainPopup({ onUnpair }: { onUnpair: () => void }) {
  const [pageHighlights, setPageHighlights] = useState<Highlight[]>([]);
  const [allHighlights, setAllHighlights] = useState<Highlight[]>([]);
  const [tabUrl, setTabUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [tabId, setTabId] = useState<number | null>(null);
  const [windowId, setWindowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("page");
  const [footerError, setFooterError] = useState("");
  const [footerMessage, setFooterMessage] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = stripMarginaliaTarget(tab?.url ?? "");
    setTabUrl(url);
    setTabTitle(tab?.title ?? "");
    setTabId(tab?.id ?? null);
    setWindowId(tab?.windowId ?? null);

    const [pageRes, allRes] = await Promise.all([
      url
        ? chrome.runtime.sendMessage({
            type: "LIST_FOR_URL",
            payload: { url },
          })
        : Promise.resolve({ ok: true, data: [] }),
      chrome.runtime.sendMessage({ type: "LIST_ALL_HIGHLIGHTS" }),
    ]);

    if (pageRes?.ok && Array.isArray(pageRes.data)) {
      setPageHighlights(pageRes.data as Highlight[]);
    }
    if (allRes?.ok && Array.isArray(allRes.data)) {
      setAllHighlights(allRes.data as Highlight[]);
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
    const highlights = scope === "page" ? pageHighlights : allHighlights;
    if (!highlights.length) return;

    setFooterError("");
    const title = scope === "page" ? tabTitle : "Marginalia Highlights";
    const md = `# ${title || "Highlights"}\n\n${highlights.map((h) => {
      const source = scope === "all" ? `\n\nSource: ${h.title || hostnameOf(h.url)} (${h.url})` : "";
      return `> ${h.text}${h.note ? `\n\n${h.note}` : ""}${source}`;
    }).join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${(title || "marginalia-highlights").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "marginalia-highlights"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    setFooterMessage("Markdown downloaded");
  }

  async function openSidePanel() {
    if (windowId == null) return;
    setFooterError("");
    try {
      if (tabId != null) {
        await chrome.sidePanel.open({ tabId });
      } else {
        await chrome.sidePanel.open({ windowId });
      }
      window.close();
    } catch (directError) {
      try {
        const res = await chrome.runtime.sendMessage({
          type: "OPEN_SIDE_PANEL",
          payload: { tabId: tabId ?? undefined, windowId },
        });
        if (!res?.ok) {
          throw new Error(res?.error ?? "Side panel could not be opened.");
        }
        window.close();
      } catch (messageError) {
        const error = messageError instanceof Error ? messageError : directError;
        setFooterError(error instanceof Error ? error.message : "Side panel could not be opened.");
      }
    }
  }

  async function focusHighlight(h: Highlight) {
    if (stripMarginaliaTarget(h.url) === tabUrl && tabId != null) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "SCROLL_TO_HIGHLIGHT",
          payload: { id: h._id },
        });
      } catch {
        /* content script not loaded on this page — ignore */
      }
      window.close();
      return;
    }
    await chrome.tabs.create({ url: withMarginaliaTarget(h.url, h._id) });
    window.close();
  }

  const visible = scope === "page" ? pageHighlights : allHighlights;
  const hostname = hostnameOf(tabUrl);

  return (
    <div
      data-testid="popup-main"
      className={`${PANEL_ROOT_CLASS} relative`}
    >
      <div className="flex items-center gap-2.5 border-b border-rule px-4 py-[14px]">
        <div className={BRAND_BADGE_CLASS}>M</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-medium text-ink">
            Marginalia
          </div>
          <div
            data-testid="popup-on-page-label"
            className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4"
          >
            {hostname}
          </div>
        </div>
        <Button
          onClick={() => setConfirmDisconnect(true)}
          title="Disconnect"
          variant="ghost"
          size="icon"
          className={HEADER_ICON_BUTTON_CLASS}
        >
          <LogOut size={14} />
        </Button>
      </div>

      <div className="flex border-b border-rule">
        {(
          [
            { key: "page", label: "This page", count: pageHighlights.length },
            { key: "all", label: "All pages", count: allHighlights.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setScope(tab.key)}
            className={`h-9 flex-1 border-b-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] transition-colors ${
              scope === tab.key
                ? "border-accent text-ink"
                : "border-transparent text-ink-4 hover:text-ink-2"
            }`}
          >
            {tab.label}{" "}
            <span className="ml-0.5 text-ink-4">({tab.count})</span>
          </button>
        ))}
      </div>

      {scope === "page" && pageHighlights.length > 0 && (
        <>
          <div className="px-4 pt-2.5">
            <div
              className="mb-2 truncate font-display text-[13px] text-ink-2"
              data-testid="popup-tab-title"
            >
              {tabTitle}
            </div>
            <div className="flex h-1.5 gap-px overflow-hidden rounded-full">
              {pageHighlights.map((highlight) => (
                <div
                  key={`${highlight._id}-bar`}
                  className={`flex-1 rounded-full ${HL_BG_CLASS[highlight.color]}`}
                />
              ))}
            </div>
          </div>
          <Separator className="mx-4 mt-2.5" />
        </>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center pt-10">
            <Loader2
              size={18}
              className="animate-spin text-ink-4"
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="pt-10 text-center text-xs leading-6 text-ink-4">
            {scope === "page" ? (
              <>
                <p>No highlights on this page yet.</p>
                <p className="mt-1">Select text to start highlighting.</p>
              </>
            ) : (
              <>
                <p>No highlights saved yet.</p>
                <p className="mt-1">
                  Highlights you save across the web will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          visible.map((highlight, index) => (
            <button
              key={highlight._id}
              data-testid="popup-highlight-row"
              onClick={() => void focusHighlight(highlight)}
              className={`flex w-full gap-2.5 py-2 text-left hover:bg-paper-2 ${index < visible.length - 1 ? "border-b border-rule" : ""}`}
            >
              <div
                className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`}
              />
              <div className="min-w-0 flex-1">
                <p className={CLAMPED_HIGHLIGHT_TEXT_CLASS}>{highlight.text}</p>
                {highlight.note && (
                  <p className="mt-[3px] text-[11px] italic text-ink-3">
                    "{highlight.note}"
                  </p>
                )}
                {scope === "all" && (
                  <div className="mt-1 flex items-baseline gap-1.5 truncate font-mono text-[10px] text-ink-4">
                    <span className="truncate text-ink-3">
                      {highlight.title || hostnameOf(highlight.url)}
                    </span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">
                      {hostnameOf(highlight.url)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {confirmDisconnect && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/30 px-6">
          <div className="w-full rounded border border-rule bg-paper p-4 shadow-paper-3">
            <div className="font-display text-[17px] font-medium text-ink">
              Disconnect extension?
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-3">
              You can reconnect later with a new pairing code from the dashboard.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => setConfirmDisconnect(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
                onClick={() => {
                  setConfirmDisconnect(false);
                  void onUnpair();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {(footerError || footerMessage) && (
        <div className={`border-t border-rule bg-paper px-3 py-1.5 text-[11px] leading-4 ${footerError ? "text-red-600" : "text-ink-3"}`}>
          {footerError || footerMessage}
        </div>
      )}

      <div className="flex gap-1.5 border-t border-rule bg-paper-2 p-2.5">
        <Button
          onClick={openDashboard}
          className={FOOTER_ACTION_CLASS}
        >
          <BookOpen
            size={12}
            data-icon="inline-start"
          />
          Open Dashboard
        </Button>
        <Button
          onClick={() => void exportMarkdown()}
          title="Export as Markdown"
          variant="outline"
          size="icon"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <Download size={12} />
        </Button>
        <Button
          onClick={() => void openSidePanel()}
          title="Open side panel"
          variant="outline"
          size="icon"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <Terminal size={12} />
        </Button>
        <Button
          onClick={() => void load()}
          title="Refresh"
          variant="outline"
          size="icon"
          className={FOOTER_ICON_BUTTON_CLASS}
        >
          <RefreshCw size={12} />
        </Button>
      </div>
    </div>
  );
}

export default function Popup() {
  const [paired, setPaired] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: "GET_AUTH_STATUS" })
      .then((res) => {
        setPaired(res?.ok ? res.data.paired : false);
      })
      .catch(() => setPaired(false));
  }, []);

  if (paired === null) {
    return (
      <div className="flex h-[520px] w-[380px] items-center justify-center bg-paper font-ui">
        <Loader2
          size={20}
          className="animate-spin text-ink-4"
        />
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
