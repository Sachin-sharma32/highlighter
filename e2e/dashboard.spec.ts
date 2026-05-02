import { expect, test } from "@playwright/test";
import { resetDb, seedHighlight, signInAs } from "./helpers";

const TEST_EMAIL = "dashboard-e2e@marginalia.dev";

test.beforeEach(async ({ page }) => {
  await resetDb(TEST_EMAIL);
  await signInAs(page, TEST_EMAIL);
});

test("renders the authenticated dashboard and creates a collection", async ({
  page,
}) => {
  await expect(page.getByTestId("topnav-logo")).toBeVisible();
  await expect(page.getByTestId("new-collection-button")).toBeVisible();
  await expect(page.getByTestId("library-all-highlights")).toBeVisible();

  await page.getByTestId("new-collection-button").click();
  await page.getByTestId("new-collection-input").fill("Field Notes");
  await page.getByTestId("create-collection-submit").click();

  await expect(
    page.locator("[data-testid^='collection-item-']").first(),
  ).toContainText("Field Notes");
});

test("loads a seeded highlight and persists note edits", async ({ page }) => {
  await seedHighlight({
    email: TEST_EMAIL,
    url: "https://example.com/article",
    title: "Seeded Article",
    text: "The margins are where the argument happens.",
  });

  await page.reload();
  await page.getByTestId("highlight-row").first().click();

  const noteField = page.getByTestId("highlight-note-input");
  await noteField.fill("A saved test note.");
  await noteField.press("Tab");

  await page.reload();
  await page.getByTestId("highlight-row").first().click();
  await expect(noteField).toHaveValue("A saved test note.");
});

test("opens the command palette and selects a highlight result", async ({
  page,
}) => {
  await seedHighlight({
    email: TEST_EMAIL,
    url: "https://example.com/article",
    title: "Notes on Reading",
    text: "Every annotation is an act of faith.",
  });

  await page.reload();
  await page.keyboard.press("Control+K");

  const searchInput = page.getByTestId("command-palette-input");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("annotation");

  await page.getByTestId("command-highlight-result").first().click();
  await expect(page.getByTestId("highlight-detail-quote")).toContainText(
    "Every annotation is an act of faith.",
  );
});
