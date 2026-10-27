/**
 * Compartilhar como imagem (Lote 2, redesenhado no Lote 2.4) — card
 * gerado NO CLIENTE, via <canvas>, sem nenhuma dependência nova e
 * sem enviar nada a servidor algum. Por isso o card é tipográfico
 * (fundo, texto e CTA): desenhar a capa do TMDB no canvas exigiria
 * baixar a imagem e a tornaria "tainted" (CORS), o que impediria
 * exportar o PNG. Nada de link externo aqui: o CTA é sempre
 * "Assistir no Canal do Brito".
 *
 * Formato 1080×1350 (retrato, bom para WhatsApp e Instagram).
 * Horários sempre em Brasília, como o resto do app.
 *
 * Desenho (Lote 2.4): o card antigo empilhava tudo no terço
 * superior e deixava ~600 px de preto vazio embaixo, em Arial
 * genérica — cara de rascunho. O novo usa as fontes da marca
 * (Bebas Neue nos títulos, Syne nos textos, as mesmas carregadas
 * pela página), confronto em dois blocos com selo "VS" no meio,
 * selo de data, horário em destaque, canais em chips e rodapé
 * ancorado embaixo, ocupando a altura inteira sem vazio.
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
const BG_TOP = "#0b1510";
const BG_BOTTOM = "#07080a";
const GREEN = "#00ff87";
const GREEN_DARK = "#00c96a";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.70)";
const FAINT = "rgba(255,255,255,0.40)";
const CARD = "rgba(255,255,255,0.05)";
const CARD_LINE = "rgba(255,255,255,0.14)";

// Bebas Neue (títulos) e Syne (textos) são as fontes da marca,
// carregadas pela página; o canvas usa a fonte já carregada e cai
// para Arial/sans-serif se ela ainda não estiver disponível.
const DISPLAY = "'Bebas Neue', 'Arial Narrow', Arial, sans-serif";
const BODY = "'Syne', Arial, sans-serif";

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

/** Dia da semana em pt-BR para uma data "YYYY-MM-DD". Exportado p/ teste. */
export function weekdayPtBr(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const days = [
    "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
  ];
  return days[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "";
}

/** Separa "A • B • C" em itens de chip. Exportado p/ teste. */
export function splitChannels(channelsText: string): string[] {
  return channelsText
    .split(/[•|]/)
    .map((s) => s.trim())
    .filter(Boolean);
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

/** Mede o texto com a fonte atual e encolhe até caber em maxLines. */
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
  minSize: number,
  font: string,
): { lines: string[]; size: number } {
  let size = startSize;
  let lines: string[] = [];
  do {
    ctx.font = `${font} ${size}px ${DISPLAY}`;
    lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
    size -= 6;
  } while (lines.join(" ").length < text.length && size > minSize);
  ctx.font = `${font} ${size + 6}px ${DISPLAY}`;
  lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  return { lines, size: size + 6 };
}

function paintBase(ctx: CanvasRenderingContext2D, eyebrow: string) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(0.55, BG_BOTTOM);
  bg.addColorStop(1, "#040505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Brilho verde no topo + moldura verde fina em cima e embaixo.
  const glow = ctx.createRadialGradient(540, 120, 40, 540, 120, 700);
  glow.addColorStop(0, "rgba(0,255,135,0.20)");
  glow.addColorStop(1, "rgba(0,255,135,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 760);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);
  // Marca no topo, com traços laterais.
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = `700 36px ${BODY}`;
  ctx.fillText("CANAL DO BRITO", 540, 92);
  ctx.fillStyle = CARD_LINE;
  ctx.fillRect(120, 122, 260, 2);
  ctx.fillRect(700, 122, 260, 2);
  ctx.fillStyle = FAINT;
  ctx.font = `700 26px ${BODY}`;
  ctx.fillText(eyebrow.toUpperCase(), 540, 132);
}

/** Selo de data centralizado; retorna a altura ocupada. */
function paintDateBadge(ctx: CanvasRenderingContext2D, date: string, y: number): number {
  const weekday = weekdayPtBr(date);
  const label = weekday
    ? `${weekday.toUpperCase()} · ${formatDatePtBr(date).toUpperCase()}`
    : formatDatePtBr(date).toUpperCase();
  ctx.font = `700 28px ${BODY}`;
  const tw = ctx.measureText(label).width + 72;
  const x = (W - tw) / 2;
  ctx.fillStyle = "rgba(0,255,135,0.12)";
  roundRect(ctx, x, y, tw, 56, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,255,135,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, tw, 56, 28);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.fillText(label, 540, y + 37);
  return 56;
}

/** Um bloco de time (até 2 linhas, Bebas grande). Retorna a altura. */
function paintTeam(ctx: CanvasRenderingContext2D, name: string, y: number): number {
  const { lines, size } = fitLines(ctx, name.toUpperCase(), 880, 2, 128, 72, "400");
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  let cursor = y;
  lines.forEach((line) => {
    ctx.fillText(line, 540, cursor);
    cursor += size + 14;
  });
  return cursor - y;
}

/** Selo "VS" circular entre os dois times. */
function paintVs(ctx: CanvasRenderingContext2D, cy: number) {
  ctx.beginPath();
  ctx.arc(540, cy, 46, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.fillStyle = "#07080a";
  ctx.font = `400 44px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText("VS", 540, cy + 16);
}

/** Linhas de texto centralizadas; retorna a altura ocupada. */
function paintCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
  lineHeight: number,
  maxWidth = 880,
): number {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, 540, y + i * lineHeight));
  return lines.length * lineHeight;
}

/** Chips de canais em linhas centralizadas; retorna a altura. */
function paintChannelChips(ctx: CanvasRenderingContext2D, channelsText: string, y: number): number {
  const items = splitChannels(channelsText);
  if (items.length === 0) return 0;
  ctx.font = `700 26px ${BODY}`;
  // Empacota os chips em linhas de no máximo 880 px.
  const rows: string[][] = [];
  let row: string[] = [];
  let rowW = 0;
  for (const item of items) {
    const w = ctx.measureText(item).width + 48;
    if (row.length > 0 && rowW + 16 + w > 880) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push(item);
    rowW += (row.length > 1 ? 16 : 0) + w;
  }
  if (row.length > 0) rows.push(row);
  let cursor = y;
  for (const r of rows) {
    const widths = r.map((item) => ctx.measureText(item).width + 48);
    const total = widths.reduce((a, b) => a + b, 0) + 16 * (r.length - 1);
    let x = (W - total) / 2;
    r.forEach((item, i) => {
      ctx.fillStyle = CARD;
      roundRect(ctx, x, cursor, widths[i], 52, 26);
      ctx.fill();
      ctx.strokeStyle = CARD_LINE;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, cursor, widths[i], 52, 26);
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.fillText(item, x + widths[i] / 2, cursor + 35);
      x += widths[i] + 16;
    });
    cursor += 68;
  }
  return cursor - y;
}

/** Rodapé ancorado: CTA + site, sempre na mesma posição. */
function paintFooter(ctx: CanvasRenderingContext2D) {
  const label = "▶  Assistir no Canal do Brito";
  ctx.font = `700 36px ${BODY}`;
  const tw = Math.min(880, ctx.measureText(label).width + 96);
  const x = (W - tw) / 2;
  const y = 1140;
  ctx.fillStyle = GREEN;
  roundRect(ctx, x, y, tw, 92, 46);
  ctx.fill();
  ctx.fillStyle = "#07080a";
  ctx.textAlign = "center";
  ctx.fillText(label, 540, y + 58);
  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${BODY}`;
  ctx.fillText("canaldobrito.site", 540, y + 158);
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
  let y = 190;
  y += paintDateBadge(ctx, game.date, y) + 44;
  // Confronto em dois blocos com selo VS — o formato de pôster
  // esportivo, em vez de uma linha única "A × B".
  if (game.away_team) {
    y += paintTeam(ctx, game.home_team, y);
    const vsY = y + 52;
    paintVs(ctx, vsY);
    y = vsY + 52;
    y += paintTeam(ctx, game.away_team, y);
  } else {
    y += paintTeam(ctx, game.home_team, y);
  }
  y += 36;
  // Horário em destaque, verde, Bebas grande.
  ctx.fillStyle = GREEN;
  ctx.font = `400 104px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText(game.game_time.slice(0, 5), 540, y + 88);
  y += 88 + 12;
  y += paintCentered(ctx, "HORÁRIO DE BRASÍLIA", y, `700 24px ${BODY}`, FAINT, 32) + 20;
  y += paintCentered(ctx, game.competition.toUpperCase(), y, `700 34px ${BODY}`, WHITE, 46) + 20;
  if (game.channelsText.trim()) {
    y += paintCentered(ctx, "ONDE ASSISTIR", y, `700 24px ${BODY}`, FAINT, 32) + 14;
    y += paintChannelChips(ctx, game.channelsText, y);
  }
  void y; // o rodapé é ancorado, não segue o fluxo
  paintFooter(ctx);
  return toBlob(c);
}

/** Card de UM filme/série do catálogo próprio, com o mesmo padrão. */
export async function renderTitleSharePng(title: ShareTitleInput): Promise<Blob> {
  const [c, ctx] = canvas();
  paintBase(ctx, title.kind === "series" ? "Série" : "Filme");
  const meta = [
    title.year ? String(title.year) : null,
    title.genre?.split(",")[0]?.trim() || null,
    title.category || null,
  ]
    .filter(Boolean)
    .join(" · ");
  // Centraliza o bloco título+meta entre o cabeçalho e o rodapé,
  // para o card de título não ficar com o miolo vazio como o antigo.
  const team = fitLines(ctx, title.title.toUpperCase(), 880, 2, 128, 72, "400");
  const teamH = team.lines.length * (team.size + 14);
  ctx.font = `700 32px ${BODY}`;
  const metaLines = meta ? wrapText(ctx, meta.toUpperCase(), 880).length : 0;
  const blockH = teamH + 44 + (meta ? metaLines * 44 + 20 : 0);
  let y = 190 + Math.max(0, (1140 - 190 - blockH) / 2);
  y += paintTeam(ctx, title.title, y) + 44;
  if (meta) {
    y += paintCentered(ctx, meta.toUpperCase(), y, `700 32px ${BODY}`, MUTED, 44) + 20;
  }
  void y;
  paintFooter(ctx);
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
