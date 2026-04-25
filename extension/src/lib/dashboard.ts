const DEFAULT_DASHBOARD_URL = "http://localhost:5173";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const DASHBOARD_URL = trimTrailingSlash(
  (import.meta.env.VITE_DASHBOARD_URL as string | undefined) || DEFAULT_DASHBOARD_URL
);

export const CONNECT_EXTENSION_URL = `${DASHBOARD_URL}/connect-extension`;