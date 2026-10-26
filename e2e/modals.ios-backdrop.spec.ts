import { test, expect, devices, type Page } from "@playwright/test";

/**
 * iOS-only — tap real (touchscreen) no backdrop fecha apenas o modal alvo.
 * Cobre ContentDetailSheet sozinho, TrailerModal sozinho e cenário empilhado.
 */

const HARNESS_PATH = "/e2e/modals";

const iosProfiles = [
  { name: "iPhone SE", device: devices["iPhone SE"] },
  { name: "iPhone 13", device: devices["iPhone 13"] },
  { name: "iPhone 14 Pro Max", device: devices["iPhone 14 Pro Max"] },
];

const TRAILER_BACKDROP = ".fixed.inset-0.bg-black\\/85";
const SHEET_BACKDROP = ".fixed.inset-0.bg-black\\/60";

// Tap em um ponto seguro do backdrop, longe do conteúdo central (pointer-events-auto).
const tapBackdropTopLeft = async (page: Page, selector: string) => {
  const backdrop = page.locator(selector).first();
  await expect(backdrop).toBeVisible();
  const box = await backdrop.boundingBox();
  if (!box) throw new Error(`backdrop ${selector} sem boundingBox`);
  // Canto superior esquerdo: garantidamente fora do dialog/iframe
  await page.touchscreen.tap(box.x + 8, box.y + 8);
};

const tapInside = async (page: Page, x: number, y: number) => {
  await page.touchscreen.tap(x, y);
};

const bodyOverflow = (page: Page) =>
  page.evaluate(() => document.body.style.overflow);

for (const { name, device } of iosProfiles) {
  test.describe(`iOS backdrop tap — ${name}`, () => {
    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      await page.goto(HARNESS_PATH);
      await expect(page.getByRole("heading", { name: "E2E Modal Harness" })).toBeVisible();
    });

    test("tap no backdrop fecha o sheet quando ele é o único aberto", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);
      expect(await bodyOverflow(page)).toBe("hidden");

      await tapBackdropTopLeft(page, SHEET_BACKDROP);
      await expect(sheet).toBeHidden();
      await expect(page.locator("nav").first()).toBeAttached();
      expect(await bodyOverflow(page)).toBe("");
    });

    test("tap no backdrop fecha o trailer quando ele é o único aberto", async ({ page }) => {
      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);
      expect(await bodyOverflow(page)).toBe("hidden");

      await tapBackdropTopLeft(page, TRAILER_BACKDROP);
      await expect(trailer).toBeHidden();
      expect(await bodyOverflow(page)).toBe("");
    });

    test("tap DENTRO do conteúdo do sheet NÃO fecha", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);

      const heading = sheet.locator("h3", { hasText: "E2E Sample Title" });
      const box = await heading.boundingBox();
      if (!box) throw new Error("heading sem boundingBox");
      await tapInside(page, box.x + box.width / 2, box.y + box.height / 2);

      await page.waitForTimeout(300);
      await expect(sheet).toBeVisible();
      expect(await bodyOverflow(page)).toBe("hidden");
    });

    test("tap DENTRO da área central do trailer NÃO fecha", async ({ page }) => {
      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);

      // O centro do trailer cai sobre o iframe (pointer-events-auto), não sobre o backdrop
      const box = await trailer.boundingBox();
      if (!box) throw new Error("trailer sem boundingBox");
      await tapInside(page, box.x + box.width / 2, box.y + box.height / 2);

      await page.waitForTimeout(300);
      await expect(trailer).toBeVisible();
      expect(await bodyOverflow(page)).toBe("hidden");
    });

    test("empilhados: tap no backdrop do trailer fecha APENAS o trailer", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);

      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);
      expect(await bodyOverflow(page)).toBe("hidden");

      await tapBackdropTopLeft(page, TRAILER_BACKDROP);
      await expect(trailer).toBeHidden();
      // Sheet permanece visível e body permanece travado
      await expect(sheet).toBeVisible();
      expect(await bodyOverflow(page)).toBe("hidden");
    });

    test("após fechar o trailer empilhado, tap no backdrop do sheet libera body scroll", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);

      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);

      await tapBackdropTopLeft(page, TRAILER_BACKDROP);
      await expect(trailer).toBeHidden();
      await expect(sheet).toBeVisible();

      await tapBackdropTopLeft(page, SHEET_BACKDROP);
      await expect(sheet).toBeHidden();
      expect(await bodyOverflow(page)).toBe("");
    });
  });
}
