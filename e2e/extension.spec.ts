import { expect, test, chromium, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { getExtensionDistPath, resetDb } from "./helpers";

const TEST_EMAIL = "extension-e2e@marginalia.dev";
const DASHBOARD_URL = "http://localhost:5173";

async function signInThroughDashboard(page: Page, email: string) {
  await page.goto(`${DASHBOARD_URL}/test-signin?email=${encodeURIComponent(email)}`);
  await page.waitForURL(`${DASHBOARD_URL}/`);
}

async function launchExtensionContext() {
  execSync("npm run build -w extension", { cwd: path.resolve(__dirname, ".."), stdio: "pipe" });

  const extensionPath = getExtensionDistPath();
  const userDataDir = mkdtempSync(path.join(tmpdir(), "marginalia-extension-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const extensionId = new URL(serviceWorker.url()).host;

  return {
    context,
    extensionId,
    userDataDir,
    async cleanup() {
      await context.close();
      rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

async function startArticleServer() {
  const html = readFileSync(path.resolve(__dirname, "./fixtures/article.html"), "utf8");

  const server = await new Promise<Server>((resolve) => {
    const instance = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
    });
    instance.listen(0, "127.0.0.1", () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind article server");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

test("pairs the extension, saves a highlight, and syncs it back to the dashboard", async () => {
  await resetDb(TEST_EMAIL);

  const { context, extensionId, cleanup } = await launchExtensionContext();
  const articleServer = await startArticleServer();

  try {
    const dashboardPage = await context.newPage();
    await signInThroughDashboard(dashboardPage, TEST_EMAIL);

    await dashboardPage.goto(`${DASHBOARD_URL}/connect-extension`);
    await dashboardPage.getByTestId("generate-pairing-code-button").click();
    const code = await dashboardPage.getByTestId("pairing-code-value").textContent();
    if (!code) throw new Error("Failed to extract pairing code");

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await popupPage.getByTestId("popup-pairing-input").fill(code);
    await popupPage.getByTestId("popup-connect-button").click();
    await expect(popupPage.getByTestId("popup-on-page-label")).toBeVisible();

    const articlePage = await context.newPage();
    await articlePage.goto(articleServer.url);

    await articlePage.evaluate(() => {
      const paragraph = document.getElementById("p2");
      if (!paragraph) {
        throw new Error("Missing paragraph");
      }

      const range = document.createRange();
      range.setStart(paragraph.firstChild!, 0);
      range.setEnd(paragraph.firstChild!, 68);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });

    await articlePage.waitForFunction(
      () => !!document.querySelector("#marginalia-host")?.shadowRoot?.querySelector(".swatch")
    );
    await articlePage.evaluate(() => {
      const button = document.querySelector("#marginalia-host")?.shadowRoot?.querySelector(".swatch") as HTMLButtonElement | null;
      button?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    await expect(articlePage.locator("mark.marg-h.marg-amber")).toHaveCount(1);

    await articlePage.reload();
    await expect(articlePage.locator("mark.marg-h.marg-amber")).toHaveCount(1);

    await dashboardPage.goto(DASHBOARD_URL);
    await expect(dashboardPage.getByTestId("highlight-row").first()).toBeVisible();
  } finally {
    await articleServer.close();
    await cleanup();
  }
});