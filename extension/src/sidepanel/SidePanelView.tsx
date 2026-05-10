import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  RefreshCw,
  Loader2,
  ExternalLink,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_URL } from "@/lib/dashboard";
import { friendlyErrorMessage } from "@/lib/errors";
import { stripMarginaliaTarget } from "@/lib/urls";
import { getYouTubeVideoId, youtubeWatchUrl } from "@/lib/youtube";
import { hostnameOf, navigateToHighlight } from "./helpers";
import {
  COLORS,
  HL_BG_CLASS,
  type Collection,
  type Highlight,
  type Tab,
} from "./types";
import { HighlightsTab } from "./components/HighlightsTab";
import { CollectionsTab } from "./components/CollectionsTab";
import { AllPagesTab } from "./components/AllPagesTab";
import { StatsTab } from "./components/StatsTab";

const PANEL_ROOT_CLASS =
  "flex h-screen flex-col overflow-hidden bg-paper font-ui";
const BRAND_BADGE_CLASS =
  "flex size-[22px] items-center justify-center rounded-[5px] bg-ink font-display text-[13px] font-medium text-paper ring-[1.5px] ring-accent";
const HEADER_ICON_BUTTON_CLASS = "size-8 rounded p-1";
const TAB_TRIGGER_BASE_CLASS =
  "h-9 flex-1 rounded-none border-b-2 px-0 font-mono text-[10px] font-medium uppercase tracking-[0.06em]";
const FOOTER_ACTION_CLASS = "h-8 w-full rounded-[7px] text-xs";

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
  const [clipError, setClipError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setClipError("");
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
    const rawUrl = stripMarginaliaTarget(tab?.url ?? "");
    const videoId = getYouTubeVideoId(rawUrl);
    const url = videoId ? youtubeWatchUrl(videoId) : rawUrl;
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
    const handleSaved = (message: { type?: string }) => {
      if (message?.type === "YOUTUBE_CLIP_SAVED") {
        void load();
      }
    };
    chrome.runtime.onMessage.addListener(handleSaved);
    return () => chrome.runtime.onMessage.removeListener(handleSaved);
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

  const filteredHighlights = useMemo(() => {
    if (domainFilter === "__all__") return allHighlights;
    const domain =
      domainFilter === "__current__" ? currentHostname : domainFilter;
    return allHighlights.filter((h) => hostnameOf(h.url) === domain);
  }, [domainFilter, currentHostname, allHighlights]);

  const statsHighlights = useMemo(() => {
    if (!statsDomain) return allHighlights;
    return allHighlights.filter((h) => hostnameOf(h.url) === statsDomain);
  }, [statsDomain, allHighlights]);

  const colorCounts = COLORS.map((color) => ({
    color,
    count: statsHighlights.filter((h) => h.color === color).length,
  }));

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

  async function openClipTrimmer() {
    if (!tabId) return;
    setClipError("");
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_YOUTUBE_CLIP_TRIMMER",
      });
      if (!response?.ok)
        throw new Error(response?.error ?? "Could not open clip trimmer.");
    } catch (error) {
      setClipError(
        friendlyErrorMessage(
          error,
          "We couldn’t open the clip trimmer on this page. Try refreshing YouTube and again.",
        ),
      );
    }
  }

  const onRowClick = (h: Highlight) =>
    void navigateToHighlight(h, tabUrl, tabId);
  const isYouTubeVideo = Boolean(getYouTubeVideoId(tabUrl));

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
          {currentHostname}
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

      {isYouTubeVideo && (
        <div className="border-b border-rule bg-paper-2 px-4 py-2">
          <Button
            onClick={() => void openClipTrimmer()}
            className="h-8 w-full text-xs"
          >
            <Scissors size={12} data-icon="inline-start" />
            Clip current moment
          </Button>
          {clipError && (
            <div className="mt-1 text-[11px] text-red-600">{clipError}</div>
          )}
        </div>
      )}

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
            <Loader2 size={18} className="animate-spin text-ink-4" />
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
          <BookOpen size={12} data-icon="inline-start" />
          Open dashboard
        </Button>
      </div>
    </div>
  );
}
