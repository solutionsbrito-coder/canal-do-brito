import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garante que toda opção do menu admin aponta para uma rota declarada em App.tsx
 * e que nomes antigos (Banners, Canais/Logos) não voltam ao menu.
 */
describe("menu admin × rotas", () => {
  const appSrc = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
  const layoutSrc = readFileSync(resolve(__dirname, "../AdminLayout.tsx"), "utf8");
  const declared = new Set(
    Array.from(appSrc.matchAll(/<Route path="([a-z0-9-]+)" element=/g)).map((m) => m[1])
  );
  const menuPaths = Array.from(layoutSrc.matchAll(/path: "\/admin\/([a-z0-9-]+)"/g)).map((m) => m[1]);

  it("toda opção do menu tem rota declarada", () => {
    expect(menuPaths.length).toBeGreaterThan(5);
    for (const p of menuPaths) expect(declared.has(p), `rota /admin/${p} não declarada`).toBe(true);
  });

  it("não usa nomes antigos no menu", () => {
    const labels = Array.from(layoutSrc.matchAll(/label: "([^"]+)"/g)).map((m) => m[1]);
    expect(labels).not.toContain("Banners");
    expect(labels).not.toContain("Canais/Logos");
    expect(labels).toContain("Canais");
    expect(labels).toContain("Programação");
  });
});
