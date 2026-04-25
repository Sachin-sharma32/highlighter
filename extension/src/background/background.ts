import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ExtMessage, ExtResponse } from "../lib/messages";
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
  try {
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
  } catch {
    /* menus already exist */
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-side-panel") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
  if (info.menuItemId === "marginalia-open-side-panel" && tab?.windowId != null) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (info.menuItemId === "marginalia-toggle-highlighting") {
    const current = await isHighlightingEnabled();
    await setHighlightingEnabled(!current);
    await broadcastHighlightingToggle(!current);
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
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: (err as Error).message ?? "Unknown error" })
      );
    return true;
  }
);

async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error("Not paired. Open the extension popup to connect.");
  return token;
}

async function openSidePanel(payload: { tabId?: number; windowId?: number } = {}) {
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

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
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
  sender: chrome.runtime.MessageSender
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
        const message = err instanceof Error ? err.message : "Failed to exchange pairing code";
        console.error("[Marginalia] Pairing failed:", message);
        return { ok: false, error: message };
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
      const highlights = await c.query(api.ext.listByUrl, { token, url: msg.payload.url });
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

    default:
      return { ok: false, error: "Unknown message type" };
  }
}
