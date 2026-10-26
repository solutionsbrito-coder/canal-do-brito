import { test, expect, devices, type Page, type Locator } from "@playwright/test";

/**
 * iOS — abrir Trailer com Sheet já aberto:
 *  - z-index do trailer ≥ z-index do sheet
 *  - foco migra para dentro do trailer
 *  - sheet permanece montado (stacking não quebra) e atrás do trailer
 *  - body scroll lock continua ativo
 *  - ESC fecha apenas o trailer; foco volta para dentro do sheet
 */

const HARNESS_PATH = "/e2e/modals";

const iosProfiles = [
  { name: "iPhone SE", device: devices["iPhone SE"] },
  { name: "iPhone 13", device: devices["iPhone 13"] },
  { name: "iPhone 14 Pro Max", device: devices["iPhone 14 Pro Max"] },
];

const zIndex = (locator: Locator) =>
  locator.evaluate((el) => Number(getComputedStyle(el as HTMLElement).zIndex));

const bodyOverflow = (page: Page) =>
  page.evaluate(() => document.body.style.overflow);

for (const { name, device } of iosProfiles) {
  test.describe(`iOS stacking — Trailer sobre Sheet — ${name}`, () => {
    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      await page.goto(HARNESS_PATH);
      await expect(page.getByRole("heading", { name: "E2E Modal Harness" })).toBeVisible();
    });

    test("z-index, foco e stacking preservados ao empilhar trailer sobre sheet", async ({ page }) => {
      // 1) Abre o sheet e espera assentar
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);

      const sheetZ = await zIndex(sheet);
      const navZ = await zIndex(page.locator("nav").first());
      expect(sheetZ).toBeGreaterThan(navZ);

      // 2) Abre o trailer sem fechar o sheet
      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);

      // 3) Stacking: trailer ≥ sheet > nav
      const trailerZ = await zIndex(trailer);
      expect(trailerZ).toBeGreaterThanOrEqual(sheetZ);
      expect(trailerZ).toBeGreaterThan(navZ);

      // 4) Ordem no DOM: trailer aparece DEPOIS do sheet (paint order)
      const order = await page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        return dialogs.map((d) => d.getAttribute("aria-label") ?? "");
      });
      const sheetIdx = order.findIndex((l) => l === "E2E Sample Title");
      const trailerIdx = order.findIndex((l) => /Trailer/.test(l));
      expect(sheetIdx).toBeGreaterThanOrEqual(0);
      expect(trailerIdx).toBeGreaterThan(sheetIdx);

      // 5) Sheet continua montado e visível
      await expect(sheet).toBeAttached();
      await expect(sheet).toBeVisible();

      // 6) Foco está dentro do trailer
      const focusInTrailer = await trailer.evaluate((el) => el.contains(document.activeElement));
      expect(focusInTrailer).toBe(true);

      // 7) Body lock permanece ativo
      expect(await bodyOverflow(page)).toBe("hidden");

      // 8) Hit-test no centro do trailer: o elemento topo é o trailer
      const trailerBox = await trailer.boundingBox();
      if (!trailerBox) throw new Error("trailer sem boundingBox");
      const cx = trailerBox.x + trailerBox.width / 2;
      const cy = trailerBox.y + trailerBox.height / 2;
      const topOwner = await page.evaluate(
        ({ cx, cy }) => {
          const el = document.elementFromPoint(cx, cy);
          if (!el) return "";
          const dialog = (el as HTMLElement).closest('[role="dialog"]');
          return dialog?.getAttribute("aria-label") ?? "";
        },
        { cx, cy },
      );
      expect(topOwner).toMatch(/Trailer/);

      // 9) ESC fecha apenas o trailer; foco volta para dentro do sheet
      await page.keyboard.press("Escape");
      await expect(trailer).toBeHidden();
      await expect(sheet).toBeVisible();
      const focusInSheet = await sheet.evaluate((el) => el.contains(document.activeElement));
      expect(focusInSheet).toBe(true);
      expect(await bodyOverflow(page)).toBe("hidden");

      // 10) ESC novamente fecha o sheet; body destrava
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      expect(await bodyOverflow(page)).toBe("");
    });

    test("ESC com trailer empilhado fecha apenas o trailer (não o sheet)", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      await page.waitForTimeout(450);

      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      await page.waitForTimeout(300);

      await page.keyboard.press("Escape");
      await expect(trailer).toBeHidden();
      await expect(sheet).toBeVisible();
    });
  });
}
