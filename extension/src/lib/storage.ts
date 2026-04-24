const TOKEN_KEY = "marginalia_token";
const USER_ID_KEY = "marginalia_user_id";

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
