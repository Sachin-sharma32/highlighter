const DEFAULT_DASHBOARD_URL = "http://localhost:5173";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const DASHBOARD_URL = trimTrailingSlash(
  (import.meta.env.VITE_DASHBOARD_URL as string | undefined) ||
    DEFAULT_DASHBOARD_URL,
);

export const CONNECT_EXTENSION_URL = `${DASHBOARD_URL}/?connect=1`;

const DASHBOARD_ORIGINS = [DEFAULT_DASHBOARD_URL, DASHBOARD_URL]
  .map((url) => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  })
  .filter((origin): origin is string => origin != null);

export function isDashboardUrl(urlString: string) {
  try {
    return DASHBOARD_ORIGINS.includes(new URL(urlString).origin);
  } catch {
    return false;
  }
}
