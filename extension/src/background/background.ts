import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ExtMessage, ExtResponse } from "../lib/messages";
import { friendlyErrorMessage, appErrorCode } from "../lib/errors";
import {
  getToken,
  setToken,
  setUserId,
  clearToken,
  isPaired,
  isHighlightingEnabled,
  setHighlightingEnabled,
} from "../lib/storage";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

let client: ConvexClient | null = null;

function getClient(): ConvexClient {
  if (!client) client = new ConvexClient(CONVEX_URL);
  return client;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => {});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "marginalia-open-side-panel",
      title: "Open Marginalia side panel",
      contexts: ["action"],
    });
    chrome.contextMenus.create({
      id: "marginalia-toggle-highlighting",
      title: "Toggle highlighting on/off",
      contexts: ["action"],
    });
    chrome.contextMenus.create({
      id: "marginalia-save-youtube-clip",
      title: "Save Marginalia clip",
      contexts: ["page", "video"],
      documentUrlPatterns: ["*://*.youtube.com/*", "*://youtu.be/*"],
    });
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-side-panel") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.windowId != null) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } else if (command === "toggle-highlighting") {
    const current = await isHighlightingEnabled();
    await setHighlightingEnabled(!current);
    await broadcastHighlightingToggle(!current);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (
    info.menuItemId === "marginalia-open-side-panel" &&
    tab?.windowId != null
  ) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (info.menuItemId === "marginalia-toggle-highlighting") {
    const current = await isHighlightingEnabled();
    await setHighlightingEnabled(!current);
    await broadcastHighlightingToggle(!current);
  } else if (
    info.menuItemId === "marginalia-save-youtube-clip" &&
    tab?.id != null
  ) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_YOUTUBE_CLIP_TRIMMER",
      });
    } catch {
      /* content script not ready on this page */
    }
  }
});

async function broadcastHighlightingToggle(enabled: boolean) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (t.id != null) {
      try {
        await chrome.tabs.sendMessage(t.id, {
          type: "HIGHLIGHTING_TOGGLED",
          payload: { enabled },
        });
      } catch {
        /* tab has no content script — ignore */
      }
    }
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, sender, sendResponse: (r: ExtResponse) => void) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err: unknown) => {
        sendResponse({
          ok: false,
          error: friendlyErrorMessage(err),
          errorCode: appErrorCode(err) ?? undefined,
        });
      });
    return true;
  },
);

async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token)
    throw new Error("Not paired. Open the extension popup to connect.");
  return token;
}

async function openSidePanel(
  payload: { tabId?: number; windowId?: number } = {},
) {
  if (!chrome.sidePanel?.open) {
    throw new Error("Side panel is not available in this browser.");
  }

  if (payload.tabId != null) {
    await chrome.sidePanel.open({ tabId: payload.tabId });
    return;
  }
  if (payload.windowId != null) {
    await chrome.sidePanel.open({ windowId: payload.windowId });
    return;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab?.windowId != null) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    return;
  }
  if (tab?.id != null) {
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }

  throw new Error("No active browser tab was found for the side panel.");
}

async function handleMessage(
  msg: ExtMessage,
  sender: chrome.runtime.MessageSender,
): Promise<ExtResponse> {
  switch (msg.type) {
    case "GET_AUTH_STATUS": {
      const paired = await isPaired();
      return { ok: true, data: { paired } };
    }

    case "GET_SETTINGS": {
      const enabled = await isHighlightingEnabled();
      return { ok: true, data: { highlightingEnabled: enabled } };
    }

    case "GET_COLORS": {
      try {
        const token = await requireToken();
        const c = getClient();
        const colors = await c.query(api.ext.getColors, { token });
        return { ok: true, data: colors };
      } catch {
        return { ok: true, data: null };
      }
    }

    case "SET_HIGHLIGHTING_ENABLED": {
      await setHighlightingEnabled(msg.payload.enabled);
      await broadcastHighlightingToggle(msg.payload.enabled);
      return { ok: true, data: { highlightingEnabled: msg.payload.enabled } };
    }

    case "EXCHANGE_PAIRING_CODE": {
      try {
        const c = getClient();
        const result = await c.mutation(api.extensionAuth.exchangePairingCode, {
          code: msg.payload.code,
        });
        await setToken(result.token);
        await setUserId(result.userId);
        return { ok: true, data: result };
      } catch (err) {
        return {
          ok: false,
          error: friendlyErrorMessage(
            err,
            "We couldn’t connect right now. Please generate a fresh code and try again.",
          ),
          errorCode: appErrorCode(err) ?? undefined,
        };
      }
    }

    case "SIGN_OUT": {
      const token = await getToken();
      if (token) {
        try {
          const c = getClient();
          await c.mutation(api.ext.signOut, { token });
        } catch {
          /* ignore — token may already be invalid */
        }
      }
      await clearToken();
      return { ok: true, data: null };
    }

    case "SAVE_HIGHLIGHT": {
      const token = await requireToken();
      const c = getClient();
      const { collectionIds, tags, ...rest } = msg.payload;
      const id = await c.mutation(api.ext.create, {
        token,
        ...rest,
        tags: tags ?? [],
        collectionIds: collectionIds
          ? (collectionIds as Id<"collections">[])
          : undefined,
      });
      return { ok: true, data: { id } };
    }

    case "UPDATE_HIGHLIGHT": {
      const token = await requireToken();
      const c = getClient();
      const { collectionIds, ...rest } = msg.payload;
      await c.mutation(api.ext.update, {
        token,
        id: rest.id as Id<"highlights">,
        color: rest.color,
        note: rest.note,
        tags: rest.tags,
        collectionIds: collectionIds
          ? (collectionIds as Id<"collections">[])
          : undefined,
      });
      return { ok: true, data: null };
    }

    case "DELETE_HIGHLIGHT": {
      const token = await requireToken();
      const c = getClient();
      await c.mutation(api.ext.remove, {
        token,
        id: msg.payload.id as Id<"highlights">,
      });
      return { ok: true, data: null };
    }

    case "LIST_FOR_URL": {
      const token = await getToken();
      if (!token) return { ok: true, data: [] };
      const c = getClient();
      const highlights = await c.query(api.ext.listByUrl, {
        token,
        url: msg.payload.url,
      });
      return { ok: true, data: highlights };
    }

    case "LIST_ALL_HIGHLIGHTS": {
      const token = await getToken();
      if (!token) return { ok: true, data: [] };
      const c = getClient();
      const highlights = await c.query(api.ext.listAll, { token });
      return { ok: true, data: highlights };
    }

    case "LIST_COLLECTIONS": {
      const token = await getToken();
      if (!token) return { ok: true, data: [] };
      const c = getClient();
      const collections = await c.query(api.ext.listCollections, { token });
      return { ok: true, data: collections };
    }

    case "CREATE_COLLECTION": {
      const token = await requireToken();
      const c = getClient();
      const id = await c.mutation(api.ext.createCollection, {
        token,
        name: msg.payload.name,
      });
      return { ok: true, data: { id } };
    }

    case "GET_USAGE": {
      const token = await getToken();
      if (!token) {
        return {
          ok: true,
          data: { plan: "free", count: 0, limit: 500 },
        };
      }
      const c = getClient();
      const usage = await c.query(api.ext.usage, { token });
      return { ok: true, data: usage };
    }

    case "OPEN_SIDE_PANEL": {
      await openSidePanel({
        tabId: msg.payload?.tabId ?? sender.tab?.id,
        windowId: msg.payload?.windowId ?? sender.tab?.windowId,
      });
      return { ok: true, data: null };
    }

    case "FETCH_LINK_META": {
      const title = await fetchLinkTitle(msg.payload.url);
      return { ok: true, data: { title } };
    }

    default:
      return { ok: false, error: "Unknown message type" };
  }
}

// --- Link title resolution -------------------------------------------------
// Runs in the service worker so it can fetch cross-origin (host_permissions:
// <all_urls>) without the CORS limits a content script would hit.

async function fetchLinkTitle(rawUrl: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // YouTube: oEmbed returns a clean video title without scraping the page.
  const host = url.hostname.replace(/^www\./, "");
  if (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host.endsWith(".youtube.com")
  ) {
    const yt = await fetchYouTubeTitle(rawUrl);
    if (yt) return yt;
  }

  try {
    const res = await fetch(rawUrl, {
      credentials: "omit",
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    const html = await readHead(res);
    return extractTitle(html);
  } catch {
    return null;
  }
}

async function fetchYouTubeTitle(rawUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    return typeof data.title === "string" ? cleanTitle(data.title) : null;
  } catch {
    return null;
  }
}

/** Reads just enough of the response to cover <head> (where titles live). */
async function readHead(res: Response, maxBytes = 200_000): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  return html;
}

function extractTitle(html: string): string | null {
  const meta =
    matchMetaContent(html, "og:title") ??
    matchMetaContent(html, "twitter:title");
  if (meta) return meta;

  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m?.[1]) {
    const t = cleanTitle(decodeEntities(m[1]));
    if (t) return t;
  }
  return null;
}

function matchMetaContent(html: string, key: string): string | null {
  const tag = html.match(
    new RegExp(`<meta[^>]*(?:property|name)=["']${key}["'][^>]*>`, "i"),
  )?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
  if (!content) return null;
  const t = cleanTitle(decodeEntities(content));
  return t || null;
}

function cleanTitle(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 300);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;|&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
}
