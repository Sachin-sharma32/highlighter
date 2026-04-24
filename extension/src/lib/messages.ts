// Message types sent between content script ↔ background ↔ popup/sidepanel

export type ExtMessage =
  | { type: "SAVE_HIGHLIGHT"; payload: SaveHighlightPayload }
  | { type: "UPDATE_HIGHLIGHT"; payload: UpdateHighlightPayload }
  | { type: "DELETE_HIGHLIGHT"; payload: { id: string } }
  | { type: "LIST_FOR_URL"; payload: { url: string } }
  | { type: "EXCHANGE_PAIRING_CODE"; payload: { code: string } }
  | { type: "GET_AUTH_STATUS" }
  | { type: "SIGN_OUT" }
  | { type: "OPEN_SIDE_PANEL" };

export interface SaveHighlightPayload {
  url: string;
  title: string;
  author?: string;
  text: string;
  textContext?: string;
  color: "amber" | "rose" | "sage" | "sky" | "violet";
}

export interface UpdateHighlightPayload {
  id: string;
  color?: "amber" | "rose" | "sage" | "sky" | "violet";
  note?: string;
}

export type ExtResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };
