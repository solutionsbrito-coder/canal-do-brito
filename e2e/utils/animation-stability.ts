import type { Locator, Page } from "@playwright/test";

/**
 * Helpers de estabilidade de animação para reduzir flakiness no CI.
 *
 * Em vez de checar `getComputedStyle().transform` (frágil: parsing de matrix,
 * formatos diferentes em WebKit vs Chromium, valores intermediários durante
 * spring), usamos `boundingBox()` amostrado em janelas de tempo com tolerância
 * em pixels. Isso espelha o que o usuário percebe: "parou de se mover".
 */

export interface StabilityOptions {
  /** ms entre amostras */
  intervalMs?: number;
  /** quantas amostras consecutivas precisam estar dentro do threshold */
  samples?: number;
  /** tolerância em pixels (delta entre amostras) */
  thresholdPx?: number;
  /** tempo máximo total antes de desistir */
  timeoutMs?: number;
}

const DEFAULTS: Required<StabilityOptions> = {
  intervalMs: 80,
  samples: 3,
  thresholdPx: 0.5,
  timeoutMs: 2_000,
};

/** Espera até que o boundingBox do locator não mude por N amostras consecutivas. */
export async function waitForStable(
  page: Page,
  locator: Locator,
  opts: StabilityOptions = {},
): Promise<{ x: number; y: number; width: number; height: number }> {
  const { intervalMs, samples, thresholdPx, timeoutMs } = { ...DEFAULTS, ...opts };
  const deadline = Date.now() + timeoutMs;
  let last = await locator.boundingBox();
  if (!last) throw new Error("waitForStable: locator sem boundingBox inicial");
  let stableCount = 0;

  while (Date.now() < deadline) {
    await page.waitForTimeout(intervalMs);
    const next = await locator.boundingBox();
    if (!next) {
      stableCount = 0;
      last = null as any;
      continue;
    }
    if (
      last &&
      Math.abs(next.x - last.x) <= thresholdPx &&
      Math.abs(next.y - last.y) <= thresholdPx &&
      Math.abs(next.width - last.width) <= thresholdPx &&
      Math.abs(next.height - last.height) <= thresholdPx
    ) {
      stableCount += 1;
      if (stableCount >= samples) return next;
    } else {
      stableCount = 0;
    }
    last = next;
  }
  if (!last) throw new Error("waitForStable: nunca obteve boundingBox");
  return last;
}

/** True se o `top` do elemento está em torno do esperado dentro da tolerância. */
export async function expectTopNear(
  locator: Locator,
  expectedTop: number,
  thresholdPx = 4,
): Promise<{ ok: boolean; actual: number; delta: number }> {
  const box = await locator.boundingBox();
  if (!box) return { ok: false, actual: NaN, delta: NaN };
  const delta = Math.abs(box.y - expectedTop);
  return { ok: delta <= thresholdPx, actual: box.y, delta };
}

/** Espera opacidade final (>= target) no locator, com timeout. */
export async function waitForOpacity(
  page: Page,
  locator: Locator,
  target = 0.99,
  timeoutMs = 1_500,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let last = 0;
  while (Date.now() < deadline) {
    last = await locator.evaluate((el) => Number(getComputedStyle(el as HTMLElement).opacity));
    if (last >= target) return last;
    await page.waitForTimeout(60);
  }
  return last;
}
