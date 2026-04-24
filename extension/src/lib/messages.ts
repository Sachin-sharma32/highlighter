// Message types sent between content script ↔ background ↔ popup/sidepanel

export type ExtMessage =
  | { type: "SAVE_HIGHLIGHT"; payload: SaveHighlightPayload }
  | { type: "UPDATE_HIGHLIGHT"; payload: UpdateHighlightPayload }
  | { type: "DELETE_HIGHLIGHT"; payload: { id: string } }
  | { type: "LIST_FOR_URL"; payload: { url: string } }
  | { type: "LIST_ALL_HIGHLIGHTS" }
  | { type: "OPEN_SIDE_PANEL"; payload?: { tabId?: number; windowId?: number } }
  | { type: "EXCHANGE_PAIRING_CODE"; payload: { code: string } }
  | { type: "GET_AUTH_STATUS" }
  | { type: "SIGN_OUT" };

// Sent from popup/sidepanel to content script via chrome.tabs.sendMessage
export type TabMessage = { type: "SCROLL_TO_HIGHLIGHT"; payload: { id: string } };

export interface SaveHighlightPayload {
  url: string;
  title: string;
  author?: string;
  text: string;
  textContext?: string;
  anchorPrefix?: string;
  anchorSuffix?: string;
  anchorStart?: number;
  anchorEnd?: number;
  color: "amber" | "rose" | "sage" | "sky" | "violet";
}

export interface UpdateHighlightPayload {
  id: string;
  color?: "amber" | "rose" | "sage" | "sky" | "violet";
  note?: string;
  tags?: string[];
}

export type ExtResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };
