import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ExtMessage, ExtResponse } from "../lib/messages";
import { getToken, setToken, setUserId, clearToken, isPaired } from "../lib/storage";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

let client: ConvexClient | null = null;

function getClient(): ConvexClient {
  if (!client) client = new ConvexClient(CONVEX_URL);
  return client;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

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
  if (tab?.id != null) {
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }

  if (tab?.windowId != null) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
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

    case "EXCHANGE_PAIRING_CODE": {
      const c = getClient();
      const result = await c.mutation(api.extensionAuth.exchangePairingCode, {
        code: msg.payload.code,
      });
      await setToken(result.token);
      await setUserId(result.userId);
      return { ok: true, data: result };
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
      const id = await c.mutation(api.ext.create, { token, ...msg.payload });
      return { ok: true, data: { id } };
    }

    case "UPDATE_HIGHLIGHT": {
      const token = await requireToken();
      const c = getClient();
      await c.mutation(api.ext.update, {
        token,
        id: msg.payload.id as Id<"highlights">,
        color: msg.payload.color,
        note: msg.payload.note,
        tags: msg.payload.tags,
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
