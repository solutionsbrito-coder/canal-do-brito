import { describe, it, expect } from "vitest";
import {
  isScheduled, isExpired, isVisibleToPublic, validateSchedule, toDatetimeLocal, fromDatetimeLocal,
} from "../newsScheduling";

const NOW = new Date("2026-10-29T15:00:00.000Z").getTime();
const base = { active: true, publish_at: null, expires_at: null };

describe("newsScheduling", () => {
  it("agendada: publish_at futuro + inativa", () => {
    expect(isScheduled({ ...base, active: false, publish_at: "2026-10-29T16:00:00.000Z" }, NOW)).toBe(true);
    expect(isScheduled({ ...base, publish_at: "2026-10-29T16:00:00.000Z" }, NOW)).toBe(false);
    expect(isScheduled({ ...base, active: false, publish_at: "2026-10-29T14:00:00.000Z" }, NOW)).toBe(false);
  });

  it("expirada: expires_at no passado", () => {
    expect(isExpired({ ...base, expires_at: "2026-10-29T14:00:00.000Z" }, NOW)).toBe(true);
    expect(isExpired({ ...base, expires_at: "2026-10-29T16:00:00.000Z" }, NOW)).toBe(false);
    expect(isExpired(base, NOW)).toBe(false);
  });

  it("visível ao público só quando ativa, não expirada e publicação chegada", () => {
    expect(isVisibleToPublic(base, NOW)).toBe(true);
    expect(isVisibleToPublic({ ...base, active: false }, NOW)).toBe(false);
    expect(isVisibleToPublic({ ...base, expires_at: "2026-10-29T14:00:00.000Z" }, NOW)).toBe(false);
    expect(isVisibleToPublic({ ...base, publish_at: "2026-10-29T16:00:00.000Z" }, NOW)).toBe(false);
  });

  it("validação: expiração precisa ser depois da publicação", () => {
    expect(validateSchedule("2026-10-29T16:00:00.000Z", "2026-10-29T15:00:00.000Z")).toMatch(/depois da publicação/);
    expect(validateSchedule("2026-10-29T16:00:00.000Z", "2026-10-29T16:00:00.000Z")).not.toBeNull();
    expect(validateSchedule("2026-10-29T16:00:00.000Z", "2026-10-30T16:00:00.000Z")).toBeNull();
    expect(validateSchedule(null, "2026-10-30T16:00:00.000Z")).toBeNull();
    expect(validateSchedule(null, null)).toBeNull();
  });

  it("datetime-local faz round-trip em precisão de minuto", () => {
    const iso = "2026-10-29T16:00:00.000Z";
    expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso);
    expect(toDatetimeLocal(null)).toBe("");
    expect(fromDatetimeLocal("")).toBeNull();
  });
});
