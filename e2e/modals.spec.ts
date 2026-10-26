import { test, expect } from "../playwright-fixture";

const HARNESS_PATH = "/e2e/modals";

const zIndexOf = async (locator: ReturnType<typeof test.expect> extends never ? never : any) => {
  return Number(await locator.evaluate((el: HTMLElement) => getComputedStyle(el).zIndex));
};

test.describe("Public modals — open/close & stacking over BottomNav", () => {
  test.beforeEach(async ({ page }) => {
    // Mobile-first viewport (matches project's 390x844 standard).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HARNESS_PATH);
    await expect(page.getByRole("heading", { name: "E2E Modal Harness" })).toBeVisible();
  });

  test("ContentDetailSheet opens, sits above BottomNav, and closes via X", async ({ page }) => {
    await page.getByTestId("open-sheet").click();

    const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
    await expect(dialog).toBeVisible();

    // Stacking validation: dialog z-index must exceed BottomNav (z-50).
    const nav = page.locator("nav").first();
    const dialogZ = Number(await dialog.evaluate((el) => getComputedStyle(el).zIndex));
    const navZ = Number(await nav.evaluate((el) => getComputedStyle(el).zIndex));
    expect(dialogZ).toBeGreaterThan(navZ);

    // Rendered via portal directly under <body>.
    const parentTag = await dialog.evaluate((el) => el.parentElement?.tagName.toLowerCase());
    expect(parentTag).toBe("body");

    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).toBeHidden();
  });

  test("ContentDetailSheet closes via ESC", async ({ page }) => {
    await page.getByTestId("open-sheet").click();
    const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("ContentDetailSheet closes via swipe-down on the drag handle", async ({ page }) => {
    await page.getByTestId("open-sheet").click();
    const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
    await expect(dialog).toBeVisible();

    // The drag handle is the small bar at the top of the sheet.
    const handle = dialog.locator("div").filter({ has: page.locator("div.w-10.h-1") }).first();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Simulate a fast downward swipe (>120px past the dismiss threshold).
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX, startY + i * 30, { steps: 2 });
    }
    await page.mouse.up();

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("ContentDetailSheet closes when clicking the backdrop", async ({ page }) => {
    await page.getByTestId("open-sheet").click();
    const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
    await expect(dialog).toBeVisible();

    // Click near the very top of the viewport, well above the sheet itself.
    await page.mouse.click(20, 20);
    await expect(dialog).toBeHidden();
  });

  test("TrailerModal opens above BottomNav and closes via X / ESC / backdrop", async ({ page }) => {
    await page.getByTestId("open-trailer").click();
    const dialog = page.getByRole("dialog", { name: /Trailer/ });
    await expect(dialog).toBeVisible();

    const nav = page.locator("nav").first();
    const dialogZ = Number(await dialog.evaluate((el) => getComputedStyle(el).zIndex));
    const navZ = Number(await nav.evaluate((el) => getComputedStyle(el).zIndex));
    expect(dialogZ).toBeGreaterThanOrEqual(navZ);

    const parentTag = await dialog.evaluate((el) => el.parentElement?.tagName.toLowerCase());
    expect(parentTag).toBe("body");

    // ESC closes
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Re-open and close via the explicit close button
    await page.getByTestId("open-trailer").click();
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Fechar trailer" }).click();
    await expect(dialog).toBeHidden();

    // Re-open and close via backdrop click (top-left, away from the iframe).
    await page.getByTestId("open-trailer").click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test("BottomNav remains in the DOM while a modal is open", async ({ page }) => {
    await page.getByTestId("open-sheet").click();
    await expect(page.locator("nav").first()).toBeAttached();
    await page.keyboard.press("Escape");

    await page.getByTestId("open-trailer").click();
    await expect(page.locator("nav").first()).toBeAttached();
  });
});
