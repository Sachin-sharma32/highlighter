import { expect, test } from "@playwright/test";
import { resetDb, seedHighlight, signInAs } from "./helpers";

const TEST_EMAIL = "dashboard-e2e@marginalia.dev";

test.beforeEach(async ({ page }) => {
  await resetDb(TEST_EMAIL);
  await signInAs(page, TEST_EMAIL);
});

test("renders the authenticated dashboard and creates a collection", async ({ page }) => {
  await expect(page.getByText("Marginalia").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "New collection" })).toBeVisible();
  await expect(page.getByText("All highlights")).toBeVisible();

  await page.getByRole("button", { name: "New collection" }).click();
  await page.getByPlaceholder("e.g. Attention economy").fill("Field Notes");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Collection created")).toBeVisible();
  await expect(page.getByText("Field Notes")).toBeVisible();
});

test("loads a seeded highlight and persists note edits", async ({ page }) => {
  await seedHighlight({
    email: TEST_EMAIL,
    url: "https://example.com/article",
    title: "Seeded Article",
    text: "The margins are where the argument happens.",
  });

  await page.reload();
  await page.getByText("The margins are where the argument happens.").click();

  const noteField = page.getByPlaceholder("Add a note…");
  await noteField.fill("A saved test note.");
  await noteField.press("Tab");

  await expect(page.getByText("Note saved")).toBeVisible();

  await page.reload();
  await page.getByText("The margins are where the argument happens.").click();
  await expect(noteField).toHaveValue("A saved test note.");
});

test("opens the command palette and selects a highlight result", async ({ page }) => {
  await seedHighlight({
    email: TEST_EMAIL,
    url: "https://example.com/article",
    title: "Notes on Reading",
    text: "Every annotation is an act of faith.",
  });

  await page.reload();
  await page.keyboard.press("Control+K");

  const searchInput = page.getByPlaceholder("Search highlights, notes, sources…");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("annotation");

  await page.getByText("Every annotation is an act of faith.").click();
  await expect(page.locator("blockquote")).toContainText("Every annotation is an act of faith.");
});