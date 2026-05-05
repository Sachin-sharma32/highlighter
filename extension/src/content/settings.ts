import { getLastCollectionId, setLastCollectionId } from "../lib/storage";

export interface Collection {
  _id: string;
  name: string;
}

export interface CustomColor {
  id: string;
  label: string;
  value: string;
  isDefault?: boolean;
}

let highlightingEnabled = true;
let customColors: CustomColor[] = [];
let cachedCollections: Collection[] = [];
let lastUsedCollectionId: string | null = null;

export function isHighlightingEnabled() {
  return highlightingEnabled;
}

export function setHighlightingEnabled(enabled: boolean) {
  highlightingEnabled = enabled;
}

export function getCustomColors() {
  return customColors;
}

export function getCachedCollections() {
  return cachedCollections;
}

export function getLastUsedCollectionId() {
  return lastUsedCollectionId;
}

export async function persistLastCollection(id: string | null) {
  lastUsedCollectionId = id;
  await setLastCollectionId(id);
}

export function bootstrapSettings() {
  void chrome.runtime
    .sendMessage({ type: "GET_SETTINGS" })
    .then((res) => {
      if (res?.ok) highlightingEnabled = res.data.highlightingEnabled;
    })
    .catch(() => {});

  void chrome.runtime
    .sendMessage({ type: "GET_COLORS" })
    .then((res) => {
      if (res?.ok && Array.isArray(res.data)) {
        customColors = res.data;
      }
    })
    .catch(() => {});
}

export async function refreshCollections() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "LIST_COLLECTIONS" });
    if (res?.ok && Array.isArray(res.data)) {
      cachedCollections = res.data as Collection[];
    }
    lastUsedCollectionId = await getLastCollectionId();
  } catch {
    /* ignore */
  }
}
