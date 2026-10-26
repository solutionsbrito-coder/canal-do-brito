import { test, expect } from "../playwright-fixture";

const HARNESS_PATH = "/e2e/modals";

const VIEWPORTS = [
  { name: "iPhone SE portrait", width: 375, height: 667 },
  { name: "iPhone 13 portrait", width: 390, height: 844 },
  { name: "iPhone 14 Pro Max portrait", width: 430, height: 932 },
  { name: "iPhone 13 landscape", width: 844, height: 390 },
];

test.describe("Modais — rotação e safe-areas iOS", () => {
  for (const vp of VIEWPORTS) {
    test(`ContentDetailSheet permanece visível e sobre a BottomNav em ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(HARNESS_PATH);
      await page.getByTestId("open-sheet").click();

      const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
      await expect(dialog).toBeVisible();

      const dBox = await dialog.boundingBox();
      const nav = page.locator("nav").first();
      const nBox = await nav.boundingBox();
      expect(dBox && nBox).toBeTruthy();
      if (!dBox || !nBox) return;

      // O sheet deve sobrepor a área da nav (z-index maior, portado para body).
      expect(dBox.y + dBox.height).toBeGreaterThanOrEqual(nBox.y);
      // Conteúdo do sheet visível (botão fechar acessível).
      await expect(page.getByRole("button", { name: "Fechar" })).toBeVisible();
    });

    test(`TrailerModal centraliza e fecha por ESC em ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(HARNESS_PATH);
      await page.getByTestId("open-trailer").click();

      const dialog = page.getByRole("dialog", { name: /Trailer/ });
      await expect(dialog).toBeVisible();

      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      if (!box) return;
      // Cobre 100% do viewport (inset-0).
      expect(Math.round(box.width)).toBe(vp.width);
      expect(Math.round(box.height)).toBe(vp.height);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  }

  test("ContentDetailSheet sobrevive à rotação portrait → landscape sem fechar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HARNESS_PATH);
    await page.getByTestId("open-sheet").click();

    const dialog = page.getByRole("dialog", { name: "E2E Sample Title" });
    await expect(dialog).toBeVisible();

    // Rotaciona para landscape — o sheet deve continuar visível.
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(dialog).toBeVisible();

    // body-scroll lock continua ativo.
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Após fechar, scroll do body é restaurado.
    const overflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(overflowAfter).not.toBe("hidden");
  });

  test("TrailerModal sobrevive à rotação landscape → portrait sem fechar", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(HARNESS_PATH);
    await page.getByTestId("open-trailer").click();

    const dialog = page.getByRole("dialog", { name: /Trailer/ });
    await expect(dialog).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box && Math.round(box.width)).toBe(390);
    expect(box && Math.round(box.height)).toBe(844);
  });
});
