import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  RefreshCw,
  Loader2,
  ExternalLink,
  Trash2,
  Globe,
  ChevronDown,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DASHBOARD_URL } from "@/lib/dashboard";
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

const HL_BORDER_CLASS: Record<HighlightColor, string> = {
  amber: "border-l-hl-amber",
  rose: "border-l-hl-rose",
  sage: "border-l-hl-sage",
  sky: "border-l-hl-sky",
  violet: "border-l-hl-violet",
};

const PANEL_ROOT_CLASS =
  "flex h-screen flex-col overflow-hidden bg-paper font-ui";
const BRAND_BADGE_CLASS =
  "flex size-[22px] items-center justify-center rounded-[5px] bg-ink font-display text-[13px] font-medium text-paper ring-[1.5px] ring-accent";
const HEADER_ICON_BUTTON_CLASS = "size-8 rounded p-1";
const TAB_TRIGGER_BASE_CLASS =
  "h-9 flex-1 rounded-none border-b-2 px-0 font-mono text-[10px] font-medium uppercase tracking-[0.06em]";
const FOOTER_ACTION_CLASS = "h-8 w-full rounded-[7px] text-xs";
const SECTION_CARD_CLASS = "rounded border border-rule bg-paper-2 p-[14px]";

interface Highlight {
  _id: string;
  text: string;
  color: HighlightColor;
  note?: string;
  url: string;
  title: string;
  createdAt: number;
  collectionId?: string;
}

interface Collection {
  _id: string;
  name: string;
}

type Tab = "highlights" | "collections" | "all" | "stats";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

async function navigateToHighlight(
  highlight: Highlight,
  currentUrl: string,
  currentTabId: number | null,
) {
  if (
    stripMarginaliaTarget(highlight.url) === currentUrl &&
    currentTabId != null
  ) {
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        type: "SCROLL_TO_HIGHLIGHT",
        payload: { id: highlight._id },
      });
    } catch {
      /* content script not loaded — ignore */
    }
    return;
  }
  await chrome.tabs.create({
    url: withMarginaliaTarget(highlight.url, highlight._id),
  });
}

export default function SidePanel() {
  const [pageHighlights, setPageHighlights] = useState<Highlight[]>([]);
  const [allHighlights, setAllHighlights] = useState<Highlight[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tabUrl, setTabUrl] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [tabId, setTabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [paired, setPaired] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("highlights");
  const [domainFilter, setDomainFilter] = useState<string>("__current__");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null,
  );
  const [statsDomain, setStatsDomain] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const authRes = await chrome.runtime.sendMessage({
      type: "GET_AUTH_STATUS",
    });
    if (!authRes?.ok || !authRes.data?.paired) {
      setPaired(false);
      setLoading(false);
      return;
    }

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = stripMarginaliaTarget(tab?.url ?? "");
    setTabUrl(url);
    setTabTitle(tab?.title ?? "");
    setTabId(tab?.id ?? null);

    const [pageRes, allRes, collectionsRes] = await Promise.all([
      url
        ? chrome.runtime.sendMessage({
            type: "LIST_FOR_URL",
            payload: { url },
          })
        : Promise.resolve({ ok: true, data: [] }),
      chrome.runtime.sendMessage({ type: "LIST_ALL_HIGHLIGHTS" }),
      chrome.runtime.sendMessage({ type: "LIST_COLLECTIONS" }),
    ]);

    if (pageRes?.ok && Array.isArray(pageRes.data)) {
      setPageHighlights(pageRes.data as Highlight[]);
    }
    if (allRes?.ok && Array.isArray(allRes.data)) {
      setAllHighlights(allRes.data as Highlight[]);
    }
    if (collectionsRes?.ok && Array.isArray(collectionsRes.data)) {
      setCollections(collectionsRes.data as Collection[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleActivated = () => {
      void load();
    };
    const handleUpdated = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        void load();
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, [load, tabId]);

  // Compute all unique domains
  const allDomains = useMemo(() => {
    const domains = new Map<string, number>();
    for (const h of allHighlights) {
      const d = hostnameOf(h.url);
      domains.set(d, (domains.get(d) ?? 0) + 1);
    }
    return Array.from(domains.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count }));
  }, [allHighlights]);

  const currentHostname = hostnameOf(tabUrl);

  // Filter highlights by domain for Highlights tab
  const filteredHighlights = useMemo(() => {
    if (domainFilter === "__all__") return allHighlights;
    const domain =
      domainFilter === "__current__" ? currentHostname : domainFilter;
    return allHighlights.filter((h) => hostnameOf(h.url) === domain);
  }, [domainFilter, currentHostname, allHighlights]);

  // Stats - either overall or per-domain
  const statsHighlights = useMemo(() => {
    if (!statsDomain) return allHighlights;
    return allHighlights.filter((h) => hostnameOf(h.url) === statsDomain);
  }, [statsDomain, allHighlights]);

  const colorCounts = COLORS.map((color) => ({
    color,
    count: statsHighlights.filter((h) => h.color === color).length,
  }));

  const hostname = hostnameOf(tabUrl);

  async function deleteHighlight(h: Highlight) {
    await chrome.runtime.sendMessage({
      type: "DELETE_HIGHLIGHT",
      payload: { id: h._id },
    });
    if (tabId != null && stripMarginaliaTarget(h.url) === tabUrl) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "DELETE_HIGHLIGHT_MARK",
          payload: { id: h._id },
        });
      } catch {
        /* ignore */
      }
    }
    setPageHighlights((prev) => prev.filter((x) => x._id !== h._id));
    setAllHighlights((prev) => prev.filter((x) => x._id !== h._id));
  }

  const onRowClick = (h: Highlight) =>
    void navigateToHighlight(h, tabUrl, tabId);

  if (!paired) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center font-ui">
        <div className="font-display text-lg font-medium text-ink">
          Not connected
        </div>
        <p className="text-xs leading-6 text-ink-3">
          Open the Marginalia popup to connect your account.
        </p>
      </div>
    );
  }

  return (
    <div className={PANEL_ROOT_CLASS}>
      <div className="shrink-0 border-b border-rule px-4 py-[14px]">
        <div className="mb-1 flex items-center gap-2">
          <div className={BRAND_BADGE_CLASS}>M</div>
          <span className="font-display text-sm font-medium text-ink">
            Marginalia
          </span>
          <div className="flex-1" />
          <Button
            onClick={() => void load()}
            title="Refresh"
            variant="ghost"
            size="icon"
            className={HEADER_ICON_BUTTON_CLASS}
          >
            <RefreshCw size={12} />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={HEADER_ICON_BUTTON_CLASS}
          >
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              title="Open dashboard"
            >
              <ExternalLink size={12} />
            </a>
          </Button>
        </div>
        <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4">
          {hostname}
        </div>
        {tabTitle && (
          <div className="mt-0.5 truncate font-display text-[13px] text-ink-2">
            {tabTitle}
          </div>
        )}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-ink-3">
            {pageHighlights.length} highlight
            {pageHighlights.length !== 1 ? "s" : ""} here ·{" "}
            {allHighlights.length} total
          </span>
          {pageHighlights.length > 0 && (
            <div className="flex h-1 w-20 gap-px overflow-hidden rounded-full">
              {pageHighlights.map((highlight) => (
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
        {(["highlights", "collections", "all", "stats"] as Tab[]).map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            variant="ghost"
            size="sm"
            className={`${TAB_TRIGGER_BASE_CLASS} ${
              activeTab === tab
                ? "border-accent text-ink"
                : "border-transparent text-ink-4"
            }`}
          >
            {tab === "all" ? "All pages" : tab}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2
              size={18}
              className="animate-spin text-ink-4"
            />
          </div>
        ) : activeTab === "highlights" ? (
          <HighlightsTab
            highlights={filteredHighlights}
            onRowClick={onRowClick}
            onDelete={deleteHighlight}
            domains={allDomains}
            domainFilter={domainFilter}
            setDomainFilter={setDomainFilter}
            currentHostname={currentHostname}
          />
        ) : activeTab === "collections" ? (
          <CollectionsTab
            collections={collections}
            highlights={allHighlights}
            onRowClick={onRowClick}
            onDelete={deleteHighlight}
            selectedCollection={selectedCollection}
            setSelectedCollection={setSelectedCollection}
          />
        ) : activeTab === "all" ? (
          <AllPagesTab
            highlights={allHighlights}
            onRowClick={onRowClick}
            onDelete={deleteHighlight}
          />
        ) : (
          <StatsTab
            highlights={statsHighlights}
            allHighlights={allHighlights}
            colorCounts={colorCounts}
            domains={allDomains}
            statsDomain={statsDomain}
            setStatsDomain={setStatsDomain}
            setActiveTab={setActiveTab}
            setDomainFilter={setDomainFilter}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-rule bg-paper-2 px-4 py-2.5">
        <Button
          onClick={() => chrome.tabs.create({ url: DASHBOARD_URL })}
          className={FOOTER_ACTION_CLASS}
        >
          <BookOpen
            size={12}
            data-icon="inline-start"
          />
          Open dashboard
        </Button>
      </div>
    </div>
  );
}

interface RowProps {
  highlights: Highlight[];
  onRowClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
}

function HighlightsTab({
  highlights,
  onRowClick,
  onDelete,
  domains,
  domainFilter,
  setDomainFilter,
  currentHostname,
}: RowProps & {
  domains: { domain: string; count: number }[];
  domainFilter: string;
  setDomainFilter: (f: string) => void;
  currentHostname: string;
}) {
  return (
    <div>
      {/* Domain filter dropdown */}
      <div className="px-4 py-2.5 border-b border-rule ">
        <div className="flex items-center gap-2">
          <Globe
            size={12}
            className="text-ink-4"
          />
          <Select
            value={domainFilter}
            onValueChange={setDomainFilter}
          >
            <SelectTrigger className="flex-1 h-8 bg-transparent text-xs text-ink outline-none font-mono cursor-pointer border-none shadow-none focus:ring-0 px-0">
              <SelectValue placeholder="Current page" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="__current__">
                Current page ({currentHostname})
              </SelectItem>
              <SelectItem value="__all__">All domains</SelectItem>
              {domains.map(({ domain, count }) => (
                <SelectItem
                  key={domain}
                  value={domain}
                >
                  {domain} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {highlights.length === 0 ? (
        <EmptyState
          text="No highlights for this filter."
          sub="Try selecting a different domain."
        />
      ) : (
        highlights.map((highlight, index) => (
          <div
            key={highlight._id}
            className={`flex w-full gap-2.5 px-4 py-3 group ${index < highlights.length - 1 ? "border-b border-rule" : ""}`}
          >
            <button
              onClick={() => onRowClick(highlight)}
              className="flex gap-2.5 flex-1 text-left hover:bg-paper-2 min-w-0"
            >
              <div
                className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-display text-[13px] leading-6 text-ink ${highlight.note ? "mb-1" : "mb-0"}`}
                >
                  {highlight.text}
                </p>
                {highlight.note && (
                  <p className="text-[11px] italic leading-[1.4] text-ink-3">
                    "{highlight.note}"
                  </p>
                )}
                <div className="mt-1 font-mono text-[10px] text-ink-4">
                  {timeAgo(highlight.createdAt)}
                </div>
              </div>
            </button>
            <button
              onClick={() => void onDelete(highlight)}
              title="Delete highlight"
              className="flex items-center justify-center rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity text-ink-4 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CollectionsTab({
  collections,
  highlights,
  onRowClick,
  onDelete,
  selectedCollection,
  setSelectedCollection,
}: {
  collections: Collection[];
  highlights: Highlight[];
  onRowClick: (h: Highlight) => void;
  onDelete: (h: Highlight) => void;
  selectedCollection: string | null;
  setSelectedCollection: (c: string | null) => void;
}) {
  const filtered = selectedCollection
    ? highlights.filter((h) => h.collectionId === selectedCollection)
    : highlights;

  const uncollected = highlights.filter((h) => !h.collectionId);

  return (
    <div>
      {/* Collection filter */}
      <div className="px-4 py-2.5 border-b border-rule">
        <div className="flex items-center gap-2">
          <Folder
            size={12}
            className="text-ink-4"
          />
          <Select
            value={selectedCollection ?? "__all__"}
            onValueChange={(val) =>
              setSelectedCollection(val === "__all__" ? null : val)
            }
          >
            <SelectTrigger className="flex-1 h-8 bg-transparent text-xs text-ink outline-none font-mono cursor-pointer border-none shadow-none focus:ring-0 px-0">
              <SelectValue placeholder="All highlights" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="__all__">
                All highlights ({highlights.length})
              </SelectItem>
              <SelectItem value="__inbox__">
                Inbox ({uncollected.length})
              </SelectItem>
              {collections.map((c) => {
                const count = highlights.filter(
                  (h) => h.collectionId === c._id,
                ).length;
                return (
                  <SelectItem
                    key={c._id}
                    value={c._id}
                  >
                    {c.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(selectedCollection === "__inbox__" ? uncollected : filtered).length ===
      0 ? (
        <EmptyState
          text="No highlights in this collection."
          sub="Assign highlights to a collection from the edit panel."
        />
      ) : (
        (selectedCollection === "__inbox__" ? uncollected : filtered).map(
          (highlight) => (
            <div
              key={highlight._id}
              className="flex w-full gap-2.5 px-4 py-2 group border-b border-rule"
            >
              <button
                onClick={() => onRowClick(highlight)}
                className="flex gap-2.5 flex-1 text-left hover:bg-paper-2 min-w-0"
              >
                <div
                  className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {highlight.text}
                  </p>
                  {highlight.note && (
                    <p className="mt-[3px] text-[11px] italic text-ink-3">
                      "{highlight.note}"
                    </p>
                  )}
                </div>
              </button>
              <button
                onClick={() => void onDelete(highlight)}
                title="Delete highlight"
                className="flex items-center justify-center rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity text-ink-4 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ),
        )
      )}
    </div>
  );
}

function AllPagesTab({ highlights, onRowClick, onDelete }: RowProps) {
  if (!highlights.length) {
    return (
      <EmptyState
        text="No highlights saved yet."
        sub="Highlights you save across the web will appear here."
      />
    );
  }

  // Group by URL, preserving createdAt desc order.
  const groups: { url: string; title: string; items: Highlight[] }[] = [];
  const indexByUrl = new Map<string, number>();
  for (const h of highlights) {
    const existingIndex = indexByUrl.get(h.url);
    if (existingIndex == null) {
      indexByUrl.set(h.url, groups.length);
      groups.push({ url: h.url, title: h.title, items: [h] });
    } else {
      groups[existingIndex].items.push(h);
    }
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div
          key={group.url}
          className="border-b border-rule"
        >
          <div className="px-4 pb-1.5 pt-3">
            <div className="truncate font-display text-[12px] font-medium text-ink-2">
              {group.title || hostnameOf(group.url)}
            </div>
            <div className="truncate font-mono text-[10px] tracking-[0.04em] text-ink-4">
              {hostnameOf(group.url)} · {group.items.length} highlight
              {group.items.length !== 1 ? "s" : ""}
            </div>
          </div>
          {group.items.map((highlight) => (
            <div
              key={highlight._id}
              className="flex w-full gap-2.5 px-4 py-2 group"
            >
              <button
                onClick={() => onRowClick(highlight)}
                className="flex gap-2.5 flex-1 text-left hover:bg-paper-2 min-w-0"
              >
                <div
                  className={`w-[3px] shrink-0 rounded-sm ${HL_BG_CLASS[highlight.color]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="overflow-hidden font-display text-[12.5px] leading-[1.45] text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {highlight.text}
                  </p>
                  {highlight.note && (
                    <p className="mt-[3px] text-[11px] italic text-ink-3">
                      "{highlight.note}"
                    </p>
                  )}
                </div>
              </button>
              <button
                onClick={() => void onDelete(highlight)}
                title="Delete highlight"
                className="flex items-center justify-center rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity text-ink-4 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function StatsTab({
  highlights,
  allHighlights,
  colorCounts,
  domains,
  statsDomain,
  setStatsDomain,
  setActiveTab,
  setDomainFilter,
}: {
  highlights: Highlight[];
  allHighlights: Highlight[];
  colorCounts: { color: HighlightColor; count: number }[];
  domains: { domain: string; count: number }[];
  statsDomain: string | null;
  setStatsDomain: (d: string | null) => void;
  setActiveTab: (t: Tab) => void;
  setDomainFilter: (f: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Overall / domain-specific stats */}
      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
            {statsDomain ? statsDomain : "Overall stats"}
          </span>
          {statsDomain && (
            <button
              onClick={() => setStatsDomain(null)}
              className="text-[10px] font-mono text-accent"
            >
              Show all
            </button>
          )}
        </div>
        {[
          ["Highlights", highlights.length],
          [
            "With notes",
            highlights.filter((highlight) => highlight.note).length,
          ],
          [
            "Unique colours",
            colorCounts.filter((entry) => entry.count > 0).length,
          ],
          ...(statsDomain
            ? []
            : [["Domains", domains.length] as [string, number]]),
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="flex justify-between border-b border-rule py-[5px] text-[13px] last:border-b-0"
          >
            <span className="text-ink-3">{label}</span>
            <span className="font-display font-medium text-ink">{value}</span>
          </div>
        ))}
      </div>

      {/* Colours */}
      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          Colours
        </div>
        {colorCounts.map(({ color, count }) => (
          <div
            key={color}
            className="flex items-center gap-2 py-1"
          >
            <div className={`size-2.5 rounded-sm ${HL_BG_CLASS[color]}`} />
            <span className="flex-1 text-xs capitalize text-ink-2">
              {color}
            </span>
            <div className="flex flex-[2] gap-px overflow-hidden rounded-full bg-rule p-px">
              {count > 0 ? (
                Array.from({ length: count }).map((_, index) => (
                  <div
                    key={`${color}-${index}`}
                    className={`h-1 flex-1 rounded-full ${HL_BG_CLASS[color]}`}
                  />
                ))
              ) : (
                <div className="h-1 flex-1 rounded-full bg-transparent" />
              )}
            </div>
            <span className="w-4 text-right font-mono text-[10px] text-ink-4">
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Domains list */}
      <div className={SECTION_CARD_CLASS}>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-4">
          Domains
        </div>
        {domains.length === 0 ? (
          <p className="text-xs text-ink-4">No domains yet.</p>
        ) : (
          domains.map(({ domain, count }) => (
            <button
              key={domain}
              onClick={() => {
                setStatsDomain(domain);
                setDomainFilter(domain);
              }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                statsDomain === domain
                  ? "bg-paper text-ink"
                  : "text-ink-3 hover:bg-paper hover:text-ink-2"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Globe
                  size={11}
                  className="text-ink-4 shrink-0"
                />
                {domain}
              </span>
              <span className="font-mono text-[10px] text-ink-4">{count}</span>
            </button>
          ))
        )}
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
