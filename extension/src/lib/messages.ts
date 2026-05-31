// Message types sent between content script ↔ background ↔ popup/sidepanel

export type ExtMessage =
  | { type: "SAVE_HIGHLIGHT"; payload: SaveHighlightPayload }
  | { type: "UPDATE_HIGHLIGHT"; payload: UpdateHighlightPayload }
  | { type: "DELETE_HIGHLIGHT"; payload: { id: string } }
  | { type: "LIST_FOR_URL"; payload: { url: string } }
  | { type: "LIST_ALL_HIGHLIGHTS" }
  | { type: "LIST_COLLECTIONS" }
  | { type: "CREATE_COLLECTION"; payload: { name: string } }
  | { type: "GET_USAGE" }
  | { type: "OPEN_SIDE_PANEL"; payload?: { tabId?: number; windowId?: number } }
  | { type: "EXCHANGE_PAIRING_CODE"; payload: { code: string } }
  | { type: "GET_AUTH_STATUS" }
  | { type: "GET_SETTINGS" }
  | { type: "GET_COLORS" }
  | { type: "SET_HIGHLIGHTING_ENABLED"; payload: { enabled: boolean } }
  | { type: "FETCH_LINK_META"; payload: { url: string } }
  | { type: "LIST_TODOS" }
  | { type: "CREATE_TODO"; payload: CreateTodoPayload }
  | { type: "UPDATE_TODO"; payload: UpdateTodoPayload }
  | { type: "DELETE_TODO"; payload: { id: string } }
  | { type: "REORDER_TODOS"; payload: { ids: string[] } }
  | { type: "SIGN_OUT" };

// Sent from popup/sidepanel to content script via chrome.tabs.sendMessage
export type TabMessage =
  | { type: "SCROLL_TO_HIGHLIGHT"; payload: { id: string } }
  | { type: "DELETE_HIGHLIGHT_MARK"; payload: { id: string } }
  | { type: "HIGHLIGHTING_TOGGLED"; payload: { enabled: boolean } }
  | { type: "GET_YOUTUBE_CLIP_CONTEXT" }
  | { type: "SHOW_YOUTUBE_CLIP_TRIMMER" };

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
  color: string;
  note?: string;
  collectionIds?: string[];
  tags?: string[];
  sourceType?: "web" | "youtube";
  youtubeVideoId?: string;
  clipStart?: number;
  clipEnd?: number;
  youtubeChannelTitle?: string;
}

export interface UpdateHighlightPayload {
  id: string;
  color?: string;
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}

export type TodoRecurrence = "daily" | "weekly" | "monthly";

export interface RemoteTodo {
  _id: string;
  text: string;
  done: boolean;
  link?: string;
  linkTitle?: string;
  dueAt?: number;
  recurrence?: TodoRecurrence;
  completedAt?: number;
  order: number;
  createdAt: number;
}

export interface CreateTodoPayload {
  text: string;
  link?: string;
  linkTitle?: string;
  dueAt?: number;
  recurrence?: TodoRecurrence;
}

export interface UpdateTodoPayload {
  id: string;
  text?: string;
  done?: boolean;
  link?: string | null;
  linkTitle?: string | null;
  dueAt?: number | null;
  recurrence?: TodoRecurrence | null;
  completedAt?: number | null;
}

import type { AppErrorCode } from "./errors";

export type ExtResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode?: AppErrorCode };
