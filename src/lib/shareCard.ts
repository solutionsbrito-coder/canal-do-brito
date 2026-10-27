/**
 * Compartilhar como imagem (Lote 2) — card gerado NO CLIENTE, via
 * <canvas>, sem nenhuma dependência nova e sem enviar nada a servidor
 * algum. Por isso o card é tipográfico (fundo, texto e CTA): desenhar
 * a capa do TMDB no canvas exigiria baixar a imagem e a tornaria
 * "tainted" (CORS), o que impediria exportar o PNG. Nada de link
 * externo aqui: o CTA é sempre "Assistir no Canal do Brito".
 *
 * Formato 1080×1350 (retrato, bom para WhatsApp e Instagram).
 * Horários sempre em Brasília, como o resto do app.
 */

export interface ShareGameInput {
  home_team: string;
  away_team: string | null;
  date: string; // "2026-10-26"
  game_time: string; // "21:30"
  competition: string;
  channelsText: string; // nomes dos canais, ex.: "Premiere • SporTV"
}

export interface ShareTitleInput {
  title: string;
  kind: "movie" | "series";
  year: number | null;
  genre: string | null;
  category: string | null;
}

const W = 1080;
const H = 1350;
const BG = "#07080a";
const GREEN = "#00ff87";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.65)";
const FAINT = "rgba(255,255,255,0.35)";

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");
  return [c, ctx];
}

/** Quebra o texto em linhas que cabem em maxWidth. Exportado p/ teste. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paintBase(ctx: CanvasRenderingContext2D, eyebrow: string) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  // Faixa verde superior + brilho sutil.
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, 14);
  const glow = ctx.createRadialGradient(540, 180, 40, 540, 180, 620);
  glow.addColorStop(0, "rgba(0,255,135,0.16)");
  glow.addColorStop(1, "rgba(0,255,135,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("CANAL DO BRITO", 540, 110);
  ctx.fillStyle = FAINT;
  ctx.font = "400 26px Arial, sans-serif";
  ctx.fillText(eyebrow.toUpperCase(), 540, 160);
}

function paintCta(ctx: CanvasRenderingContext2D, y: number) {
  // Pílula do CTA (texto, não link — a imagem em si não clica).
  const label = "▶  Assistir no Canal do Brito";
  ctx.font = "700 36px Arial, sans-serif";
  const tw = ctx.measureText(label).width + 90;
  const x = (W - tw) / 2;
  ctx.fillStyle = GREEN;
  roundRect(ctx, x, y, tw, 88, 44);
  ctx.fill();
  ctx.fillStyle = "#07080a";
  ctx.fillText(label, 540, y + 56);
  ctx.fillStyle = MUTED;
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillText("canaldobrito.site", 540, y + 150);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintMetaLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  bold = false,
) {
  ctx.fillStyle = bold ? WHITE : MUTED;
  ctx.font = `${bold ? "700" : "400"} 34px Arial, sans-serif`;
  const lines = wrapText(ctx, text, 880);
  lines.forEach((line, i) => ctx.fillText(line, 540, y + i * 48));
  return y + lines.length * 48;
}

function formatDatePtBr(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  if (!y || !m || !d || m < 1 || m > 12) return date;
  return `${d} de ${months[m - 1]} de ${y}`;
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))),
      "image/png",
    ),
  );
}

/** Card de UM jogo: confronto, horário (Brasília), competição e canais. */
export async function renderGameSharePng(game: ShareGameInput): Promise<Blob> {
  const [c, ctx] = canvas();
  paintBase(ctx, "Agenda esportiva");
  const matchup = game.away_team
    ? `${game.home_team} × ${game.away_team}`
    : game.home_team;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  // Encolhe a fonte até o confronto caber em no máximo 4 linhas.
  let size = 96;
  let lines: string[] = [];
  do {
    ctx.font = `800 ${size}px Arial, sans-serif`;
    lines = wrapText(ctx, matchup, 880).slice(0, 4);
    size -= 8;
  } while (lines.join(" ").length < matchup.length && size > 56);
  ctx.font = `800 ${size + 8}px Arial, sans-serif`;
  lines = wrapText(ctx, matchup, 880).slice(0, 4);
  let y = 330;
  lines.forEach((line) => {
    ctx.fillText(line, 540, y);
    y += size + 24;
  });
  y += 40;
  y = paintMetaLine(ctx, `${formatDatePtBr(game.date)} · ${game.game_time.slice(0, 5)} · Horário de Brasília`, y, true);
  y += 24;
  y = paintMetaLine(ctx, game.competition, y);
  y += 24;
  if (game.channelsText.trim()) {
    y = paintMetaLine(ctx, `Onde assistir: ${game.channelsText}`, y);
    y += 24;
  }
  paintCta(ctx, Math.min(y + 60, 1080));
  return toBlob(c);
}

/** Card de UM filme/série do catálogo próprio, com o mesmo padrão. */
export async function renderTitleSharePng(title: ShareTitleInput): Promise<Blob> {
  const [c, ctx] = canvas();
  paintBase(ctx, title.kind === "series" ? "Série" : "Filme");
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  let size = 96;
  let lines: string[] = [];
  do {
    ctx.font = `800 ${size}px Arial, sans-serif`;
    lines = wrapText(ctx, title.title, 880).slice(0, 4);
    size -= 8;
  } while (lines.join(" ").length < title.title.length && size > 56);
  ctx.font = `800 ${size + 8}px Arial, sans-serif`;
  lines = wrapText(ctx, title.title, 880).slice(0, 4);
  let y = 330;
  lines.forEach((line) => {
    ctx.fillText(line, 540, y);
    y += size + 24;
  });
  y += 40;
  const meta = [
    title.year ? String(title.year) : null,
    title.genre?.split(",")[0]?.trim() || null,
    title.category || null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (meta) {
    y = paintMetaLine(ctx, meta, y, true);
    y += 24;
  }
  paintCta(ctx, Math.min(y + 60, 1080));
  return toBlob(c);
}

/**
 * Compartilha via Web Share API quando o navegador aceita arquivos;
 * senão, baixa o PNG. Retorna como foi entregue, para o botão avisar.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: "Canal do Brito" });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
