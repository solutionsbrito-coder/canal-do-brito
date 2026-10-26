import type { PublicTab } from "@/lib/utils";

export type Variant = "A" | "B";

export interface TemplateVariant {
  text: string;
}

export interface ABTemplate {
  id: string;
  label: string;
  tab?: PublicTab;
  variants: Record<Variant, TemplateVariant>;
}

const STORAGE_KEY = "admin:wppABTemplates:v1";

/** Default templates seeded for the A/B tester. Use {LINK} where the link goes. */
export const DEFAULT_AB_TEMPLATES: ABTemplate[] = [
  {
    id: "geral",
    label: "📺 Geral do Dia",
    variants: {
      A: { text: "📺 *Programação do Dia*\n\nConfira os jogos, novidades e indicações de hoje.\n\n👉 {LINK}" },
      B: { text: "🔥 Olha o que tem hoje no portal:\n• Jogos ao vivo\n• Filmes e séries novas\n\nAcesse 👉 {LINK}" },
    },
  },
  {
    id: "jogos",
    label: "⚽ Jogos",
    tab: "schedule",
    variants: {
      A: { text: "⚽ *Jogos de Hoje Atualizados*\n\nHorários, canais e destaques.\n\n👉 {LINK}" },
      B: { text: "📅 Programação esportiva de hoje já no ar! Veja todos os jogos e onde assistir 👇\n\n{LINK}" },
    },
  },
  {
    id: "entretenimento",
    label: "🍿 Entretenimento",
    tab: "novidades",
    variants: {
      A: { text: "🍿 *Assista Hoje*\n\nFilmes, séries e lançamentos do dia em um só lugar.\n\n👉 {LINK}" },
      B: { text: "🎬 Sem ideia do que assistir? Olha as novidades dessa semana 👇\n\n{LINK}" },
    },
  },
  {
    id: "aovivo",
    label: "🔴 Ao Vivo",
    tab: "schedule",
    variants: {
      A: { text: "🔴 *Ao Vivo Agora*\n\nVeja os jogos que estão rolando neste momento.\n\n👉 {LINK}" },
      B: { text: "🚨 Tá rolando AGORA! Entra antes que acabe 👇\n\n{LINK}" },
    },
  },
];

export function loadABTemplates(): ABTemplate[] {
  if (typeof window === "undefined") return DEFAULT_AB_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AB_TEMPLATES;
    const parsed = JSON.parse(raw) as ABTemplate[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_AB_TEMPLATES;
    // shallow validate
    return parsed.filter((t) => t?.id && t?.variants?.A?.text != null && t?.variants?.B?.text != null);
  } catch {
    return DEFAULT_AB_TEMPLATES;
  }
}

export function saveABTemplates(templates: ABTemplate[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch { /* noop */ }
}

export function resetABTemplates(): ABTemplate[] {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  return DEFAULT_AB_TEMPLATES;
}

/** utm_content tag for an A/B variant — used to attribute landings/clicks. */
export function abUtmContent(templateId: string, variant: Variant): string {
  return `ab-${templateId}-${variant.toLowerCase()}`;
}

/** Render the final WhatsApp text by injecting/appending the link. */
export function renderTemplate(text: string, link: string): string {
  if (!text.trim()) return "";
  return text.includes("{LINK}")
    ? text.replace(/\{LINK\}/g, link).trim()
    : `${text.trim()}\n\n👉 ${link}`;
}
