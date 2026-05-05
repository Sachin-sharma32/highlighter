import type {
  SaveHighlightPayload,
  UpdateHighlightPayload,
} from "../lib/messages";

export async function saveHighlightMessage(
  payload: SaveHighlightPayload,
): Promise<string | null> {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_HIGHLIGHT",
    payload,
  });
  if (response?.ok && response.data?.id) return response.data.id as string;
  return null;
}

export function updateHighlightMessage(payload: UpdateHighlightPayload) {
  void chrome.runtime.sendMessage({
    type: "UPDATE_HIGHLIGHT",
    payload,
  });
}

export function deleteHighlightMessage(id: string) {
  void chrome.runtime.sendMessage({
    type: "DELETE_HIGHLIGHT",
    payload: { id },
  });
}

export async function listHighlightsForUrl(url: string) {
  const response = await chrome.runtime.sendMessage({
    type: "LIST_FOR_URL",
    payload: { url },
  });
  if (response?.ok && Array.isArray(response.data)) return response.data;
  return null;
}

export function notifyYouTubeClipSaved() {
  void chrome.runtime
    .sendMessage({ type: "YOUTUBE_CLIP_SAVED" })
    .catch(() => {});
}
