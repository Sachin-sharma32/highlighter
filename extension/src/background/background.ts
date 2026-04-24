import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { ExtMessage, ExtResponse } from "../lib/messages";
import { getToken, setToken, setUserId, clearToken, isPaired } from "../lib/storage";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

let client: ConvexClient | null = null;

async function getClient(): Promise<ConvexClient> {
  if (!client) {
    client = new ConvexClient(CONVEX_URL);
    const token = await getToken();
    if (token) {
      client.setAuth(async () => token);
    }
  }
  return client;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

// Message handler from content script / popup / side panel
chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse: (r: ExtResponse) => void) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err: unknown) =>
        sendResponse({ ok: false, error: (err as Error).message ?? "Unknown error" })
      );
    return true; // keep channel open for async
  }
);

async function handleMessage(msg: ExtMessage): Promise<ExtResponse> {
  const c = await getClient();

  switch (msg.type) {
    case "GET_AUTH_STATUS": {
      const paired = await isPaired();
      return { ok: true, data: { paired } };
    }

    case "EXCHANGE_PAIRING_CODE": {
      const result = await c.mutation(api.extensionAuth.exchangePairingCode, {
        code: msg.payload.code,
      });
      await setToken(result.token);
      await setUserId(result.userId);
      // Re-init client with the new token
      client = null;
      await getClient();
      return { ok: true, data: result };
    }

    case "SIGN_OUT": {
      await clearToken();
      client = null;
      return { ok: true, data: null };
    }

    case "SAVE_HIGHLIGHT": {
      const id = await c.mutation(api.highlights.create, {
        ...msg.payload,
        tags: [],
      });
      return { ok: true, data: { id } };
    }

    case "UPDATE_HIGHLIGHT": {
      await c.mutation(api.highlights.update, {
        id: msg.payload.id as Parameters<typeof api.highlights.update>[1]["id"],
        color: msg.payload.color,
        note: msg.payload.note,
      });
      return { ok: true, data: null };
    }

    case "DELETE_HIGHLIGHT": {
      await c.mutation(api.highlights.remove, {
        id: msg.payload.id as Parameters<typeof api.highlights.remove>[1]["id"],
      });
      return { ok: true, data: null };
    }

    case "LIST_FOR_URL": {
      const highlights = await c.query(api.highlights.byUrl, { url: msg.payload.url });
      return { ok: true, data: highlights };
    }

    case "OPEN_SIDE_PANEL": {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
      return { ok: true, data: null };
    }

    default:
      return { ok: false, error: "Unknown message type" };
  }
}
