import { test, expect, devices } from "@playwright/test";

/**
 * Performance budget gate — garante que a abertura do sheet e do trailer
 * permanece sob limites razoáveis em mobile (Pixel 5).
 *
 * Métricas medidas:
 *  - Tempo de abertura percebido (click → dialog visível)
 *  - Long tasks (>50ms) durante a interação
 *  - Layout shifts cumulativos durante a interação
 *  - DOM nodes adicionados pelo modal (overhead)
 */

const HARNESS_PATH = "/e2e/modals";

// Budgets (ajustáveis quando a baseline mudar de propósito)
const BUDGETS = {
  openMs: 600,           // click → visível
  longTasksMs: 250,      // soma de long tasks durante a interação
  cls: 0.1,              // layout shift cumulativo
  domNodesDelta: 600,    // nodes a mais que o modal adiciona
};

test.use({ ...devices["Pixel 5"] });

test.describe("Performance — sheet & trailer (Pixel 5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await expect(page.getByRole("heading", { name: "E2E Modal Harness" })).toBeVisible();

    // Instrumentação: PerformanceObserver para long tasks + layout-shift
    await page.evaluate(() => {
      (window as any).__perf = { longTasks: [], cls: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) (window as any).__perf.longTasks.push(e.duration);
        }).observe({ type: "longtask", buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as any[]) {
            if (!e.hadRecentInput) (window as any).__perf.cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });
  });

  const measureOpen = async (
    page: import("@playwright/test").Page,
    triggerTestId: string,
    dialogName: RegExp | string,
  ) => {
    const baselineNodes = await page.evaluate(() => document.getElementsByTagName("*").length);
    const t0 = await page.evaluate(() => performance.now());

    await page.getByTestId(triggerTestId).click();
    await expect(page.getByRole("dialog", { name: dialogName })).toBeVisible();

    const t1 = await page.evaluate(() => performance.now());
    // Deixa interações assentarem (animação + paint)
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      const p = (window as any).__perf;
      return {
        longTasksTotal: p.longTasks.reduce((a: number, b: number) => a + b, 0),
        longTasksMax: p.longTasks.reduce((a: number, b: number) => Math.max(a, b), 0),
        cls: p.cls,
        nodes: document.getElementsByTagName("*").length,
      };
    });

    return {
      openMs: t1 - t0,
      longTasksTotal: metrics.longTasksTotal,
      longTasksMax: metrics.longTasksMax,
      cls: metrics.cls,
      domNodesDelta: metrics.nodes - baselineNodes,
    };
  };

  test("ContentDetailSheet abre dentro do budget", async ({ page }) => {
    const m = await measureOpen(page, "open-sheet", "E2E Sample Title");
    // eslint-disable-next-line no-console
    console.log("[perf:sheet]", m);
    expect(m.openMs, "open time").toBeLessThan(BUDGETS.openMs);
    expect(m.longTasksTotal, "soma long tasks").toBeLessThan(BUDGETS.longTasksMs);
    expect(m.cls, "CLS").toBeLessThan(BUDGETS.cls);
    expect(m.domNodesDelta, "DOM nodes adicionados").toBeLessThan(BUDGETS.domNodesDelta);
  });

  test("TrailerModal abre dentro do budget", async ({ page }) => {
    const m = await measureOpen(page, "open-trailer", /Trailer/);
    // eslint-disable-next-line no-console
    console.log("[perf:trailer]", m);
    expect(m.openMs, "open time").toBeLessThan(BUDGETS.openMs);
    expect(m.longTasksTotal, "soma long tasks").toBeLessThan(BUDGETS.longTasksMs);
    expect(m.cls, "CLS").toBeLessThan(BUDGETS.cls);
    expect(m.domNodesDelta, "DOM nodes adicionados").toBeLessThan(BUDGETS.domNodesDelta);
  });

  test("Abrir e fechar 5x não vaza nodes (memória/cleanup)", async ({ page }) => {
    const start = await page.evaluate(() => document.getElementsByTagName("*").length);
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("open-sheet").click();
      await expect(page.getByRole("dialog", { name: "E2E Sample Title" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "E2E Sample Title" })).toBeHidden();
    }
    await page.waitForTimeout(300);
    const end = await page.evaluate(() => document.getElementsByTagName("*").length);
    // tolerância pequena para nodes residuais de portal/animação
    expect(end - start).toBeLessThan(50);
  });
});
