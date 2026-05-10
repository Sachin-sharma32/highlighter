import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DASHBOARD_URL } from "@/lib/dashboard";
import { friendlyErrorMessage } from "@/lib/errors";
import { stripMarginaliaTarget, withMarginaliaTarget } from "@/lib/urls";
import { getYouTubeVideoId, youtubeWatchUrl } from "@/lib/youtube";
import PairingScreen from "./components/PairingScreen";
import { PopupHeader } from "./components/PopupHeader";
import { UsageBar } from "./components/UsageBar";
import { YouTubeClipBar } from "./components/YouTubeClipBar";
import { ScopeTabs } from "./components/ScopeTabs";
import { PageHighlightsHeader } from "./components/PageHighlightsHeader";
import { HighlightList } from "./components/HighlightList";
import { DisconnectDialog } from "./components/DisconnectDialog";
import { FooterStatus } from "./components/FooterStatus";
import { PopupFooter } from "./components/PopupFooter";
import { buildMarkdown, downloadMarkdown, hostnameOf } from "./helpers";
import type { Highlight, Scope, UsageData } from "./types";

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
  const [highlightingEnabled, setHighlightingEnabled] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
    setWindowId(tab?.windowId ?? null);

    const [pageRes, allRes, settingsRes, usageRes] = await Promise.all([
      url
        ? chrome.runtime.sendMessage({
            type: "LIST_FOR_URL",
            payload: { url },
          })
        : Promise.resolve({ ok: true, data: [] }),
      chrome.runtime.sendMessage({ type: "LIST_ALL_HIGHLIGHTS" }),
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }),
      chrome.runtime.sendMessage({ type: "GET_USAGE" }),
    ]);

    if (pageRes?.ok && Array.isArray(pageRes.data)) {
      setPageHighlights(pageRes.data as Highlight[]);
    }
    if (allRes?.ok && Array.isArray(allRes.data)) {
      setAllHighlights(allRes.data as Highlight[]);
    }
    if (settingsRes?.ok) {
      setHighlightingEnabled(settingsRes.data.highlightingEnabled);
    }
    if (usageRes?.ok) {
      setUsage(usageRes.data as UsageData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleHighlighting() {
    const newState = !highlightingEnabled;
    setHighlightingEnabled(newState);
    await chrome.runtime.sendMessage({
      type: "SET_HIGHLIGHTING_ENABLED",
      payload: { enabled: newState },
    });
  }

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
        /* content script not loaded */
      }
    }
    setPageHighlights((prev) => prev.filter((x) => x._id !== h._id));
    setAllHighlights((prev) => prev.filter((x) => x._id !== h._id));
  }

  async function copyHighlightText(text: string) {
    setFooterError("");
    try {
      await navigator.clipboard.writeText(text);
      setFooterMessage("Highlight copied");
    } catch {
      setFooterError("Could not copy highlight text.");
    }
  }

  async function openClipTrimmer() {
    if (!tabId) return;
    setFooterError("");
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_YOUTUBE_CLIP_TRIMMER",
      });
      if (!response?.ok)
        throw new Error(response?.error ?? "Could not open clip trimmer.");
      setFooterMessage("Clip trimmer opened on YouTube");
      window.close();
    } catch (error) {
      setFooterError(
        friendlyErrorMessage(
          error,
          "We couldn’t open the clip trimmer on this page. Try refreshing YouTube and again.",
        ),
      );
    }
  }

  function exportMarkdown() {
    const highlights = scope === "page" ? pageHighlights : allHighlights;
    if (!highlights.length) return;
    setFooterError("");
    const { title, content } = buildMarkdown(highlights, scope, tabTitle);
    downloadMarkdown(title, content);
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
          throw new Error(res?.error ?? "Side panel could not be opened.", {
            cause: directError,
          });
        }
        window.close();
      } catch (messageError) {
        setFooterError(
          friendlyErrorMessage(
            messageError ?? directError,
            "We couldn’t open the side panel from here. Try opening it from the toolbar menu.",
          ),
        );
      }
    }
  }

  async function focusHighlight(h: Highlight) {
    if (h.sourceType === "youtube" && h.youtubeVideoId) {
      await chrome.tabs.create({
        url: youtubeWatchUrl(h.youtubeVideoId, h.clipStart),
      });
      window.close();
      return;
    }

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

  return (
    <div
      data-testid="popup-main"
      className="relative flex h-full w-full flex-col overflow-hidden border border-rule bg-paper font-ui shadow-paper-2"
    >
      <PopupHeader
        hostname={hostnameOf(tabUrl)}
        highlightingEnabled={highlightingEnabled}
        onToggleHighlighting={() => void toggleHighlighting()}
        onDisconnect={() => setConfirmDisconnect(true)}
      />

      {usage && usage.plan === "free" && <UsageBar usage={usage} />}

      {Boolean(getYouTubeVideoId(tabUrl)) && (
        <YouTubeClipBar onOpenTrimmer={() => void openClipTrimmer()} />
      )}

      <ScopeTabs
        scope={scope}
        pageCount={pageHighlights.length}
        allCount={allHighlights.length}
        onChange={setScope}
      />

      {scope === "page" && pageHighlights.length > 0 && (
        <PageHighlightsHeader title={tabTitle} highlights={pageHighlights} />
      )}

      <HighlightList
        highlights={visible}
        scope={scope}
        loading={loading}
        onOpen={(h) => void focusHighlight(h)}
        onCopy={(text) => void copyHighlightText(text)}
        onDelete={(h) => void deleteHighlight(h)}
      />

      {confirmDisconnect && (
        <DisconnectDialog
          onCancel={() => setConfirmDisconnect(false)}
          onConfirm={() => {
            setConfirmDisconnect(false);
            void onUnpair();
          }}
        />
      )}

      <FooterStatus error={footerError} message={footerMessage} />

      <PopupFooter
        onOpenDashboard={() => chrome.tabs.create({ url: DASHBOARD_URL })}
        onExport={exportMarkdown}
        onOpenSidePanel={() => void openSidePanel()}
        onRefresh={() => void load()}
      />
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
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[16px] border border-rule bg-paper font-ui shadow-paper-2">
        <Loader2 size={20} className="animate-spin text-ink-4" />
      </div>
    );
  }

  if (!paired) {
    return <PairingScreen onPaired={() => setPaired(true)} />;
  }

  async function unPair() {
    await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    setPaired(false);
  }

  return <MainPopup onUnpair={() => unPair()} />;
}
