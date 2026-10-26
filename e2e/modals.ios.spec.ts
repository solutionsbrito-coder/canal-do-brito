import { test, expect, devices } from "@playwright/test";
import { waitForStable, waitForOpacity } from "./utils/animation-stability";

/**
 * iOS-specific spec: roda em múltiplos iPhones (SE, 13, 14 Pro Max) garantindo
 * que ContentDetailSheet e TrailerModal:
 *  - ficam acima do BottomNav (z-index)
 *  - são renderizados via portal direto no <body>
 *  - sobrevivem a prefers-reduced-motion (sem quebrar snap/animação)
 *  - sobrevivem a rotação portrait→landscape sem desmontar
 */

const HARNESS_PATH = "/e2e/modals";

const iosProfiles = [
  { name: "iPhone SE", device: devices["iPhone SE"] },
  { name: "iPhone 13", device: devices["iPhone 13"] },
  { name: "iPhone 14 Pro Max", device: devices["iPhone 14 Pro Max"] },
];

for (const { name, device } of iosProfiles) {
  test.describe(`iOS overlays — ${name}`, () => {
    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      await page.goto(HARNESS_PATH);
      await expect(page.getByRole("heading", { name: "E2E Modal Harness" })).toBeVisible();
    });

    test("Sheet fica acima do BottomNav e finaliza animação (snap pronto)", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(dialog).toBeVisible();

      // Snap pronto = bounding box estável por várias amostras consecutivas.
      const settled = await waitForStable(page, dialog, {
        samples: 5,
        thresholdPx: 0.5,
        timeoutMs: 2_500,
      });
      expect(settled.height).toBeGreaterThan(0);
      expect(settled.width).toBeGreaterThan(0);

      // Z-index acima do nav.
      const nav = page.locator("nav").first();
      const dz = Number(await dialog.evaluate((el) => getComputedStyle(el).zIndex));
      const nz = Number(await nav.evaluate((el) => getComputedStyle(el).zIndex));
      expect(dz).toBeGreaterThan(nz);

      // O sheet deve sobrepor verticalmente a faixa da BottomNav.
      const navBox = await nav.boundingBox();
      expect(navBox).toBeTruthy();
      if (navBox) {
        const overlap = Math.min(settled.y + settled.height, navBox.y + navBox.height)
          - Math.max(settled.y, navBox.y);
        expect(overlap).toBeGreaterThan(0);
      }
    });

    test("TrailerModal sobrevive a prefers-reduced-motion sem quebrar", async ({ page, context }) => {
      await context.addInitScript(() => {
        const mql = {
          matches: true,
          media: "(prefers-reduced-motion: reduce)",
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        };
        // @ts-ignore
        window.matchMedia = (q: string) =>
          q.includes("prefers-reduced-motion") ? (mql as any) : ({ ...mql, matches: false } as any);
      });
      await page.reload();
      await page.getByTestId("open-trailer").click();

      const dialog = page.getByRole("dialog", { name: /Trailer/ });
      await expect(dialog).toBeVisible();

      // Mesmo com reduced-motion: opacity converge para >= 0.99 sem sleep fixo.
      const opacity = await waitForOpacity(page, dialog, 0.99, 1_500);
      expect(opacity).toBeGreaterThanOrEqual(0.99);
      const settled = await waitForStable(page, dialog, { samples: 3, thresholdPx: 0.5, timeoutMs: 1_500 });
      expect(settled.width).toBeGreaterThan(0);
      expect(settled.height).toBeGreaterThan(0);
      // (estabilidade já validada por waitForStable acima)

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    test("Rotação portrait→landscape preserva o overlay e o stacking", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(dialog).toBeVisible();
      await waitForStable(page, dialog, { samples: 4, thresholdPx: 0.5, timeoutMs: 2_000 });

      const portrait = page.viewportSize();
      if (!portrait) test.skip();

      await page.setViewportSize({ width: portrait!.height, height: portrait!.width });
      await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));

      // Espera reflow assentar (sem sleep fixo).
      const settled = await waitForStable(page, dialog, {
        samples: 4,
        thresholdPx: 0.5,
        timeoutMs: 2_500,
      });

      await expect(dialog).toBeVisible();
      const nav = page.locator("nav").first();
      const dz = Number(await dialog.evaluate((el) => getComputedStyle(el).zIndex));
      const nz = Number(await nav.evaluate((el) => getComputedStyle(el).zIndex));
      expect(dz).toBeGreaterThan(nz);
      // Não excede a viewport (max-h em landscape)
      expect(settled.height).toBeLessThanOrEqual(portrait!.width);
    });

    test("Ambos os modais são portais filhos de <body> (não presos a stacking context)", async ({ page }) => {
      await page.getByTestId("open-sheet").click();
      const sheet = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(sheet).toBeVisible();
      expect(await sheet.evaluate((el) => el.parentElement?.tagName.toLowerCase())).toBe("body");
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();

      await page.getByTestId("open-trailer").click();
      const trailer = page.getByRole("dialog", { name: /Trailer/ });
      await expect(trailer).toBeVisible();
      expect(await trailer.evaluate((el) => el.parentElement?.tagName.toLowerCase())).toBe("body");
    });
  });
}
