const TOKEN_KEY = "marginalia_token";
const USER_ID_KEY = "marginalia_user_id";
const HIGHLIGHTING_ENABLED_KEY = "marginalia_highlighting_enabled";
const LAST_COLLECTION_KEY = "marginalia_last_collection_id";

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return (result[TOKEN_KEY] as string) ?? null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_ID_KEY]);
}

export async function getUserId(): Promise<string | null> {
  const result = await chrome.storage.local.get(USER_ID_KEY);
  return (result[USER_ID_KEY] as string) ?? null;
}

export async function setUserId(id: string): Promise<void> {
  await chrome.storage.local.set({ [USER_ID_KEY]: id });
}

export async function isPaired(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

export async function isHighlightingEnabled(): Promise<boolean> {
  const result = await chrome.storage.sync.get(HIGHLIGHTING_ENABLED_KEY);
  const value = result[HIGHLIGHTING_ENABLED_KEY];
  return value === undefined ? true : Boolean(value);
}

export async function setHighlightingEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ [HIGHLIGHTING_ENABLED_KEY]: enabled });
}

export async function getLastCollectionId(): Promise<string | null> {
  const result = await chrome.storage.sync.get(LAST_COLLECTION_KEY);
  const value = result[LAST_COLLECTION_KEY];
  return typeof value === "string" ? value : null;
}

export async function setLastCollectionId(id: string | null): Promise<void> {
  if (id === null) {
    await chrome.storage.sync.remove(LAST_COLLECTION_KEY);
  } else {
    await chrome.storage.sync.set({ [LAST_COLLECTION_KEY]: id });
  }
}
