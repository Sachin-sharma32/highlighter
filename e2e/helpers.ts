import { Page } from "@playwright/test";

const env = globalThis as { process?: { env?: Record<string, string | undefined> } };
const CONVEX_URL = env.process?.env?.VITE_CONVEX_URL ?? "http://localhost:3210";

/**
 * Signs in as a test user by hitting the dev-only /test-signin route.
 * Requires VITE_CONVEX_URL to be set and a running Convex dev server.
 */
export async function signInAs(page: Page, email = "test@marginalia.dev") {
  await page.goto(`/test-signin?email=${encodeURIComponent(email)}`);
  await page.waitForURL("/");
}

/**
 * Seeds a highlight directly via Convex HTTP client.
 * Only works when a Convex dev server is running locally.
 */
export async function seedHighlight(data: {
  email: string;
  url: string;
  title: string;
  text: string;
  color?: "amber" | "rose" | "sage" | "sky" | "violet";
  note?: string;
}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: "testing:seedHighlight",
      args: {
        email: data.email,
        url: data.url,
        title: data.title,
        text: data.text,
        color: data.color ?? "amber",
        note: data.note,
      },
    }),
  });
  if (!res.ok) throw new Error(`seedHighlight failed: ${res.status}`);
  return res.json();
}

export async function resetDb(email = "test@marginalia.dev") {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: "testing:resetUserData",
      args: { email },
    }),
  });
  if (!res.ok) throw new Error(`resetDb failed: ${res.status}`);
  return res.json();
}

export function getExtensionDistPath(): string {
  return new URL("../extension/dist", import.meta.url).pathname;
}
