import { useEffect, useState, useCallback } from "react";
import { Settings, BookOpen, Download, Terminal, Loader2, Link2, RefreshCw } from "lucide-react";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

const HL_BG: Record<HighlightColor, string> = {
  amber: "var(--hl-amber)",
  rose: "var(--hl-rose)",
  sage: "var(--hl-sage)",
  sky: "var(--hl-sky)",
  violet: "var(--hl-violet)",
};

interface Highlight {
  _id: string;
  text: string;
  color: HighlightColor;
  note?: string;
  url: string;
  title: string;
  createdAt: number;
}

// ── Pairing screen ─────────────────────────────────────────────────
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
    <div data-testid="popup-pairing-screen" style={{ width: 380, height: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 24, background: "var(--paper)" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, boxShadow: "0 0 0 2px var(--accent)" }}>
          M
        </div>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em" }}>Marginalia</span>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 6 }}>Connect your account</p>
        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Open the Marginalia dashboard and go to<br />
          <strong style={{ color: "var(--ink-2)" }}>Avatar → Connect extension</strong> to get a code.
        </p>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          data-testid="popup-pairing-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
          placeholder="MARG-XXXX-XXXX"
          style={{
            width: "100%", height: 44, padding: "0 14px",
            borderRadius: 10, border: "1px solid var(--rule-2)",
            background: "var(--paper-2)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16, letterSpacing: "0.06em",
            color: "var(--ink)", outline: "none",
          }}
        />
        {error && <p style={{ fontSize: 11, color: "#dc2626" }}>{error}</p>}
        <button
          onClick={() => void handleConnect()}
          data-testid="popup-connect-button"
          disabled={loading || !code.trim()}
          style={{
            height: 40, borderRadius: 8, background: code.trim() ? "var(--ink)" : "var(--paper-3)",
            color: code.trim() ? "var(--paper)" : "var(--ink-4)",
            fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Connect
        </button>
      </div>

      <a
        href="http://localhost:5173/connect-extension"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
      >
        Open dashboard to generate a code →
      </a>
    </div>
  );
}

// ── Main popup ─────────────────────────────────────────────────────
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

  useEffect(() => { void load(); }, [load]);

  const colorCounts = COLORS.reduce<Record<string, number>>((acc, c) => {
    acc[c] = highlights.filter((h) => h.color === c).length;
    return acc;
  }, {});
  const totalWidth = highlights.length || 1;

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

  const hostname = (() => { try { return new URL(tabUrl).hostname; } catch { return tabUrl; } })();

  return (
    <div data-testid="popup-main" style={{ width: 380, height: 520, display: "flex", flexDirection: "column", background: "var(--paper)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 500, flexShrink: 0, boxShadow: "0 0 0 1.5px var(--accent)" }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 15, fontWeight: 500 }}>Marginalia</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostname}</div>
        </div>
        <button onClick={() => void onUnpair()} title="Disconnect" style={{ padding: 4, color: "var(--ink-4)", borderRadius: 4 }}>
          <Settings size={14} />
        </button>
      </div>

      {/* On this page */}
      <div style={{ padding: "14px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span className="mono" data-testid="popup-on-page-label" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>On this page</span>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{highlights.length} highlight{highlights.length !== 1 ? "s" : ""}</span>
        </div>
        {highlights.length > 0 && (
          <>
            <div className="serif" data-testid="popup-tab-title" style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tabTitle}</div>
            <div style={{ display: "flex", gap: 3, height: 6, borderRadius: 3, overflow: "hidden" }}>
              {COLORS.filter((c) => colorCounts[c] > 0).map((c) => (
                <div key={c} style={{ flex: colorCounts[c] / totalWidth, background: HL_BG[c], borderRadius: 3 }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ height: 1, background: "var(--rule)", margin: "0 16px" }} />

      {/* Highlights list */}
      <div className="noscroll" style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <Loader2 size={18} style={{ color: "var(--ink-4)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : highlights.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 40, color: "var(--ink-4)", fontSize: 12, lineHeight: 1.6 }}>
            <p>No highlights on this page yet.</p>
            <p style={{ marginTop: 4 }}>Select text to start highlighting.</p>
          </div>
        ) : (
          highlights.map((h, i) => (
            <div key={h._id} data-testid="popup-highlight-row" style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < highlights.length - 1 ? "1px solid var(--rule)" : "none" }}>
              <div style={{ width: 3, borderRadius: 2, background: HL_BG[h.color], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="serif" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                  {h.text}
                </p>
                {h.note && (
                  <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3, fontStyle: "italic" }}>"{h.note}"</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 10, display: "flex", gap: 6, borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <button
          onClick={openDashboard}
          style={{ flex: 1, height: 34, borderRadius: 8, background: "var(--ink)", color: "var(--paper)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <BookOpen size={13} /> Open Dashboard
        </button>
        <button
          onClick={() => void exportMarkdown()}
          title="Export as Markdown"
          style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--rule)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Download size={13} />
        </button>
        <button
          onClick={() => void openSidePanel()}
          title="Open side panel"
          style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--rule)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Terminal size={13} />
        </button>
        <button
          onClick={() => void load()}
          title="Refresh"
          style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--rule)", color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────
export default function Popup() {
  const [paired, setPaired] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }).then((res) => {
      setPaired(res?.ok ? res.data.paired : false);
    }).catch(() => setPaired(false));
  }, []);

  if (paired === null) {
    return (
      <div style={{ width: 380, height: 520, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <Loader2 size={20} style={{ color: "var(--ink-4)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!paired) {
    return <PairingScreen onPaired={() => setPaired(true)} />;
  }

  return <MainPopup onUnpair={async () => {
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    setPaired(false);
  }} />;
}
