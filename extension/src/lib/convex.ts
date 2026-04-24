import { ConvexClient } from "convex/browser";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

let _client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient {
  if (!_client) {
    _client = new ConvexClient(CONVEX_URL);
  }
  return _client;
}

export async function setConvexToken(token: string | null) {
  const client = getConvexClient();
  if (token) {
    client.setAuth(async () => token);
  } else {
    client.clearAuth();
  }
}
