import { describe, it, expect } from "vitest";
import {
  detectNotificationContext,
  orderedNotificationHelpSections,
  NOTIFICATION_HELP_SECTIONS,
} from "../notificationHelp";

describe("notificationHelp — detecção de contexto", () => {
  it("PWA no Android: ícone do app, não cadeado", () => {
    expect(
      detectNotificationContext({
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile",
        standalone: false,
        displayModeStandalone: true,
      })
    ).toBe("pwa-android");
  });

  it("Chrome no Android sem PWA: cadeado", () => {
    expect(
      detectNotificationContext({
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile",
        standalone: false,
        displayModeStandalone: false,
      })
    ).toBe("chrome-android");
  });

  it("iPhone: Ajustes", () => {
    expect(
      detectNotificationContext({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        standalone: true,
        displayModeStandalone: true,
      })
    ).toBe("ios");
  });

  it("outro ambiente: caminho genérico do cadeado", () => {
    expect(
      detectNotificationContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130",
        standalone: false,
        displayModeStandalone: false,
      })
    ).toBe("other");
  });

  it("PWA Android: app-info sozinho não basta; caminho principal é o Chrome", () => {
    const pwa = NOTIFICATION_HELP_SECTIONS.find((s) => s.context === "pwa-android")!;
    const text = pwa.steps.join(" ");
    expect(text).toContain("sozinho NÃO destrava o sino");
    expect(text).toContain("Configurações do site");
    expect(text).toContain("Bloqueados");
    expect(text).toContain("Permitir");
    // Fechar o PWA por completo antes de tentar de novo.
    expect(text).toMatch(/por completo/);
    // Reinstalar o PWA não é apresentado como reset da permissão do site.
    expect(text.toLowerCase()).not.toContain("reinstal");
  });

  it("todas as seções existem e a detectada vem primeiro", () => {
    expect(NOTIFICATION_HELP_SECTIONS.map((s) => s.context)).toEqual([
      "pwa-android",
      "chrome-android",
      "ios",
      "other",
    ]);
    const ordered = orderedNotificationHelpSections("ios");
    expect(ordered[0].context).toBe("ios");
    expect(ordered).toHaveLength(4);
    for (const section of ordered) {
      expect(section.steps.length).toBeGreaterThan(0);
    }
  });
});
