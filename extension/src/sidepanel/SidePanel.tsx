import { useEffect, useState, useCallback } from "react";
import { BookOpen, RefreshCw, Loader2, ExternalLink } from "lucide-react";

const COLORS = ["amber", "rose", "sage", "sky", "violet"] as const;
type HighlightColor = typeof COLORS[number];

const HL_BG_CLASS: Record<HighlightColor, string> = {
  amber: "bg-hl-amber",
  rose: "bg-hl-rose",
  sage: "bg-hl-sage",
  sky: "bg-hl-sky",
  violet: "bg-hl-violet",
};

const HL_BORDER_CLASS: Record<HighlightColor, string> = {
  amber: "border-l-hl-amber",
  rose: "border-l-hl-rose",
  sage: "border-l-hl-sage",
  sky: "border-l-hl-sky",
  violet: "border-l-hl-violet",
};

const PANEL_ROOT_CLASS = "flex h-screen flex-col overflow-hidden bg-paper font-ui";
const BRAND_BADGE_CLASS = "flex size-[22px] items-center justify-center rounded-[5px] bg-ink font-display text-[13px] font-medium text-paper ring-[1.5px] ring-accent";
const HEADER_ICON_BUTTON_CLASS = "rounded p-1 text-ink-4 transition hover:bg-paper-2";
const TAB_TRIGGER_BASE_CLASS = "flex-1 border-b-2 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] transition";
const FOOTER_ACTION_CLASS = "flex h-8 w-full items-center justify-center gap-1.5 rounded-[7px] bg-ink text-xs font-medium text-paper";
const SECTION_CARD_CLASS = "rounded border border-rule bg-paper-2 p-[14px]";

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
    if (!authRes?.ok || !authRes.data?.paired) {
      setPaired(false);
      setLoading(false);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";
    setTabUrl(url);
    setTabTitle(tab?.title ?? "");

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

  const withNotes = highlights.filter((highlight) => highlight.note);
  const colorCounts = COLORS.map((color) => ({
    color,
    count: highlights.filter((highlight) => highlight.color === color).length,
  }));

  const hostname = (() => {
    try {
      return new URL(tabUrl).hostname;
    } catch {
      return tabUrl;
    }
  })();

  if (!paired) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center font-ui">
        <div className="font-display text-lg font-medium text-ink">Not connected</div>
        <p className="text-xs leading-6 text-ink-3">Open the Marginalia popup to connect your account.</p>
      </div>
    );
  }

  return (
    <div className={PANEL_ROOT_CLASS}>
      <div className="shrink-0 border-b border-rule px-4 py-[14px]">
        <div className="mb-1 flex items-center gap-2">
          <div className={BRAND_BADGE_CLASS}>
            M
          </div>
          <span className="font-display text-sm font-medium text-ink">Marginalia</span>
          <div className="flex-1" />
          <button
            onClick={() => void load()}
            title="Refresh"
            className={HEADER_ICON_BUTTON_CLASS}
          >
            <RefreshCw size={12} />
          </button>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            title="Open dashboard"
            className={`flex ${HEADER_ICON_BUTTON_CLASS}`}
          >
            <ExternalLink size={12} />
          </a>
        </div>
        <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4">{hostname}</div>
        {tabTitle && <div className="mt-0.5 truncate font-display text-[13px] text-ink-2">{tabTitle}</div>}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-ink-3">
            {highlights.length} highlight{highlights.length !== 1 ? "s" : ""}
          </span>
          {highlights.length > 0 && (
            <div className="flex h-1 w-20 gap-px overflow-hidden rounded-full">
              {highlights.map((highlight) => (
                <div
                  key={`${highlight._id}-summary`}
                  className={`flex-1 rounded-full ${HL_BG_CLASS[highlight.color]}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 border-b border-rule">
        {(["highlights", "notes", "stats"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${TAB_TRIGGER_BASE_CLASS} ${
              activeTab === tab ? "border-accent text-ink" : "border-transparent text-ink-4"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={18} className="animate-spin text-ink-4" />
          </div>
        ) : activeTab === "highlights" ? (
          <HighlightsTab highlights={highlights} />
        ) : activeTab === "notes" ? (
          <NotesTab highlights={withNotes} />
        ) : (
          <StatsTab highlights={highlights} colorCounts={colorCounts} />
        )}
      </div>

      <div className="shrink-0 border-t border-rule bg-paper-2 px-4 py-2.5">
        <button
          onClick={() => chrome.tabs.create({ url: "http://localhost:5173" })}
          className={FOOTER_ACTION_CLASS}
        >
          <BookOpen size={12} /> Open dashboard
        </button>
      </div>
    </div>
  );
}

function HighlightsTab({ highlights }: { highlights: Highlight[] }) {
  if (!highlights.length) {
    return <EmptyState text="No highlights on this page yet." sub="Select text to start highlighting." />;
  }

  return (
    <div>
      {highlights.map((highlight, index) => (
        <div
          key={highlight._id}
          className={`flex gap-2.5 px-4 py-3 ${index < highlights.length - 1 ? "border-b border-rule" : ""}`}
        >
          <div className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`} />
          <div className="min-w-0 flex-1">
            <p className={`font-display text-[13px] leading-6 text-ink ${highlight.note ? "mb-1" : "mb-0"}`}>
              {highlight.text}
            </p>
            {highlight.note && <p className="text-[11px] italic leading-[1.4] text-ink-3">"{highlight.note}"</p>}
            <div className="mt-1 font-mono text-[10px] text-ink-4">{timeAgo(highlight.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ highlights }: { highlights: Highlight[] }) {
  if (!highlights.length) {
    return <EmptyState text="No notes yet." sub="Add a note to any highlight from the edit popover." />;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {highlights.map((highlight) => (
        <div
          key={highlight._id}
          className={`rounded border border-rule border-l-2 bg-paper-2 p-3 ${HL_BORDER_CLASS[highlight.color]}`}
        >
          <p className="mb-1.5 overflow-hidden font-display text-xs italic text-ink-3 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            "{highlight.text}"
          </p>
          <div className="my-2 h-px bg-rule" />
          <p className="text-xs leading-6 text-ink-2">{highlight.note}</p>
        </div>
      ))}
    </div>
  );
}

function StatsTab({
  highlights,
  colorCounts,
}: {
  highlights: Highlight[];
  colorCounts: { color: HighlightColor; count: number }[];
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">This page</div>
        {[
          ["Highlights", highlights.length],
          ["With notes", highlights.filter((highlight) => highlight.note).length],
          ["Unique colours", colorCounts.filter((entry) => entry.count > 0).length],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between border-b border-rule py-[5px] text-[13px] last:border-b-0">
            <span className="text-ink-3">{label}</span>
            <span className="font-display font-medium text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">Colours</div>
        {colorCounts.map(({ color, count }) => (
          <div key={color} className="flex items-center gap-2 py-1">
            <div className={`size-2.5 rounded-sm ${HL_BG_CLASS[color]}`} />
            <span className="flex-1 text-xs capitalize text-ink-2">{color}</span>
            <div className="flex flex-[2] gap-px overflow-hidden rounded-full bg-rule p-px">
              {count > 0
                ? Array.from({ length: count }).map((_, index) => (
                    <div key={`${color}-${index}`} className={`h-1 flex-1 rounded-full ${HL_BG_CLASS[color]}`} />
                  ))
                : <div className="h-1 flex-1 rounded-full bg-transparent" />}
            </div>
            <span className="w-4 text-right font-mono text-[10px] text-ink-4">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="px-6 py-[60px] text-center text-xs leading-6 text-ink-4">
      <p className="mb-1">{text}</p>
      {sub && <p>{sub}</p>}
    </div>
  );
}
