import { useEffect, useState, useCallback } from "react";
import { BookOpen, RefreshCw, Loader2, StickyNote, BarChart2, ExternalLink } from "lucide-react";

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

type Tab = "highlights" | "notes" | "stats";

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export default function SidePanel() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tabUrl, setTabUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [paired, setPaired] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("highlights");

  const load = useCallback(async () => {
    setLoading(true);
    const authRes = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
    if (!authRes?.ok || !authRes.data?.paired) { setPaired(false); setLoading(false); return; }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";
    setTabUrl(url);
    setTabTitle(tab?.title ?? "");

    if (url) {
      const res = await chrome.runtime.sendMessage({ type: "LIST_FOR_URL", payload: { url } });
      if (res?.ok && Array.isArray(res.data)) setHighlights(res.data as Highlight[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const withNotes = highlights.filter((h) => h.note);
  const colorCounts = COLORS.map((c) => ({ color: c, count: highlights.filter((h) => h.color === c).length }));

  const hostname = (() => { try { return new URL(tabUrl).hostname; } catch { return tabUrl; } })();

  if (!paired) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 12, background: "var(--paper)", textAlign: "center" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500 }}>Not connected</div>
        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>Open the Marginalia popup to connect your account.</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--paper)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--ink)", color: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 500, boxShadow: "0 0 0 1.5px var(--accent)" }}>M</div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500 }}>Marginalia</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => void load()} title="Refresh" style={{ padding: 4, color: "var(--ink-4)", borderRadius: 4 }}>
            <RefreshCw size={12} />
          </button>
          <a href="http://localhost:5173" target="_blank" rel="noreferrer" title="Open dashboard" style={{ padding: 4, color: "var(--ink-4)", display: "flex" }}>
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hostname}
        </div>
        {tabTitle && (
          <div className="serif" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tabTitle}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{highlights.length} highlight{highlights.length !== 1 ? "s" : ""}</span>
          {highlights.length > 0 && (
            <div style={{ display: "flex", gap: 2, height: 4, width: 80, borderRadius: 2, overflow: "hidden" }}>
              {colorCounts.filter((c) => c.count > 0).map(({ color, count }) => (
                <div key={color} style={{ flex: count, background: HL_BG[color as HighlightColor] }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {(["highlights", "notes", "stats"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="mono"
            style={{
              flex: 1, height: 36, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
              color: activeTab === t ? "var(--ink)" : "var(--ink-4)",
              borderBottom: activeTab === t ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: activeTab === t ? 500 : 400,
              transition: "all 0.1s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="noscroll" style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Loader2 size={18} style={{ color: "var(--ink-4)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : activeTab === "highlights" ? (
          <HighlightsTab highlights={highlights} />
        ) : activeTab === "notes" ? (
          <NotesTab highlights={withNotes} />
        ) : (
          <StatsTab highlights={highlights} colorCounts={colorCounts} />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--rule)", background: "var(--paper-2)", flexShrink: 0 }}>
        <button
          onClick={() => chrome.tabs.create({ url: "http://localhost:5173" })}
          style={{ width: "100%", height: 32, borderRadius: 7, background: "var(--ink)", color: "var(--paper)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <BookOpen size={12} /> Open dashboard
        </button>
      </div>
    </div>
  );
}

function HighlightsTab({ highlights }: { highlights: Highlight[] }) {
  if (!highlights.length) return <EmptyState text="No highlights on this page yet." sub="Select text to start highlighting." />;
  return (
    <div>
      {highlights.map((h, i) => (
        <div key={h._id} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: i < highlights.length - 1 ? "1px solid var(--rule)" : "none" }}>
          <div style={{ width: 3, borderRadius: 2, background: HL_BG[h.color], flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="serif" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)", marginBottom: h.note ? 4 : 0 }}>{h.text}</p>
            {h.note && <p style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.4 }}>"{h.note}"</p>}
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4 }}>{timeAgo(h.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ highlights }: { highlights: Highlight[] }) {
  if (!highlights.length) return <EmptyState text="No notes yet." sub="Add a note to any highlight from the edit popover." />;
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {highlights.map((h) => (
        <div key={h._id} style={{ padding: 12, borderRadius: 8, background: "var(--paper-2)", border: "1px solid var(--rule)", borderLeft: `2px solid ${HL_BG[h.color]}` }}>
          <p className="serif" style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
            "{h.text}"
          </p>
          <div style={{ height: 1, background: "var(--rule)", margin: "8px 0" }} />
          <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{h.note}</p>
        </div>
      ))}
    </div>
  );
}

function StatsTab({ highlights, colorCounts }: { highlights: Highlight[]; colorCounts: { color: string; count: number }[] }) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: 14, borderRadius: 8, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>This page</div>
        {[
          ["Highlights", highlights.length],
          ["With notes", highlights.filter((h) => h.note).length],
          ["Unique colours", colorCounts.filter((c) => c.count > 0).length],
        ].map(([label, val]) => (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--rule)" }}>
            <span style={{ color: "var(--ink-3)" }}>{label}</span>
            <span className="serif" style={{ fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderRadius: 8, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Colours</div>
        {colorCounts.map(({ color, count }) => (
          <div key={color} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: HL_BG[color as HighlightColor] }} />
            <span style={{ fontSize: 12, color: "var(--ink-2)", flex: 1, textTransform: "capitalize" }}>{color}</span>
            <div style={{ flex: 2, height: 4, borderRadius: 2, background: "var(--rule)", overflow: "hidden" }}>
              <div style={{ width: `${highlights.length ? (count / highlights.length) * 100 : 0}%`, height: "100%", background: HL_BG[color as HighlightColor] }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", width: 16, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--ink-4)", fontSize: 12, lineHeight: 1.6 }}>
      <p style={{ marginBottom: 4 }}>{text}</p>
      {sub && <p>{sub}</p>}
    </div>
  );
}
