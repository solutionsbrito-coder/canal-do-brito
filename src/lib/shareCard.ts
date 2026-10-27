/**
 * Compartilhar como imagem (Lote 2, redesenho profissional no Lote 2.5)
 * — card gerado NO CLIENTE, via <canvas>, sem nenhuma dependência
 * nova e sem enviar nada a servidor algum. Por isso o card é
 * tipográfico (fundo, texto e CTA): desenhar a capa do TMDB no
 * canvas exigiria baixar a imagem e a tornaria "tainted" (CORS),
 * o que impediria exportar o PNG. Nada de link externo aqui: o
 * CTA é sempre "Assistir na Brito Solutions".
 *
 * Formato 1080×1350 (retrato, bom para WhatsApp e Instagram).
 * Horários sempre em Brasília, como o resto do app.
 *
 * Desenho (Lote 2.5): o 2.4 empilhava texto solto no fundo preto
 * (mesmo corrigida a sobreposição, continuava com cara de
 * rascunho: sem estrutura, sem hierarquia, sem âncora visual).
 * O novo tem estrutura de pôster esportivo de verdade:
 * - um painel ("scoreboard") com borda e fundo próprio, que dá
 *   contorno a todo o conteúdo em vez de texto flutuando no preto;
 * - cada time numa linha com distintivo de iniciais (círculo
 *   verde), como um escudo simplificado — a âncora visual que
 *   faltava;
 * - hierarquia clara: competição como kicker, confronto em
 *   Bebas grande, horário em destaque verde, canais em chips;
 * - fontes da marca carregadas explicitamente antes de desenhar
 *   (sem isso, o canvas cai para Arial e o card inteiro perde
 *   a identidade);
 * - layout medido antes de pintar: a fonte dos times encolhe
 *   até o painel caber, então nome longo nunca invade o rodapé.
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
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.70)";
const FAINT = "rgba(255,255,255,0.45)";
const PANEL_FILL = "rgba(255,255,255,0.045)";
const PANEL_LINE = "rgba(255,255,255,0.16)";
const CHIP_FILL = "rgba(0,255,135,0.10)";
const CHIP_LINE = "rgba(0,255,135,0.40)";

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
  // Baseline "top": todo y deste arquivo é o TOPO do texto, não a
  // linha-base. Sem isso, o texto sobe ~1 fonte acima do y dado e
  // invade o elemento anterior (foi a sobreposição do card 2.4).
  ctx.textBaseline = "top";
  return [c, ctx];
}

/** Garante as fontes da marca antes de desenhar (com timeout). */
async function ensureFonts(): Promise<void> {
  try {
    const fonts = (document as Document & {
      fonts?: { load: (font: string) => Promise<unknown>; ready?: Promise<unknown> };
    }).fonts;
    if (!fonts) return;
    await Promise.race([
      Promise.all([
        fonts.load('400 100px "Bebas Neue"'),
        fonts.load('700 32px "Syne"'),
      ]),
      new Promise((r) => setTimeout(r, 800)),
    ]);
  } catch {
    // Cai para as fontes de fallback do stack; o desenho continua.
  }
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

/** Iniciais do distintivo: até 3 letras, uma por palavra. Exportado p/ teste. */
export function initialsForTeam(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
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

/** Mede o texto e encolhe até caber em maxLines. */
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

function formatDatePtBr(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  if (!y || !m || !d || m < 1 || m > 12) return date;
  return `${d} de ${months[m - 1]} de ${y}`;
}

function paintBase(ctx: CanvasRenderingContext2D, eyebrow: string) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(0.55, BG_BOTTOM);
  bg.addColorStop(1, "#040505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Brilho verde no topo + listras diagonais sutis ao fundo.
  const glow = ctx.createRadialGradient(540, 120, 40, 540, 120, 700);
  glow.addColorStop(0, "rgba(0,255,135,0.20)");
  glow.addColorStop(1, "rgba(0,255,135,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 760);
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 26;
  ctx.beginPath();
  for (let x = -H; x < W + H; x += 96) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
  }
  ctx.stroke();
  // Moldura verde fina em cima e embaixo.
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);
  // Marca no topo, com traços laterais.
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN;
  ctx.font = `700 36px ${BODY}`;
  ctx.fillText("CANAL DO BRITO", 540, 54);
  ctx.fillStyle = PANEL_LINE;
  ctx.fillRect(120, 112, 260, 2);
  ctx.fillRect(700, 112, 260, 2);
  ctx.fillStyle = FAINT;
  ctx.font = `700 26px ${BODY}`;
  ctx.fillText(eyebrow.toUpperCase(), 540, 124);
}

/** Selo de data centralizado; retorna a altura ocupada (56). */
function paintDateBadge(ctx: CanvasRenderingContext2D, date: string, y: number): number {
  const weekday = weekdayPtBr(date);
  const label = weekday
    ? `${weekday.toUpperCase()} · ${formatDatePtBr(date).toUpperCase()}`
    : formatDatePtBr(date).toUpperCase();
  ctx.font = `700 28px ${BODY}`;
  ctx.textAlign = "center";
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
  ctx.fillText(label, 540, y + 14);
  return 56;
}

/** Empacota os chips em linhas de no máximo 880 px. */
function channelRows(ctx: CanvasRenderingContext2D, channelsText: string, maxWidth: number): string[][] {
  const items = splitChannels(channelsText);
  if (items.length === 0) return [];
  ctx.font = `700 26px ${BODY}`;
  const rows: string[][] = [];
  let row: string[] = [];
  let rowW = 0;
  for (const item of items) {
    const w = ctx.measureText(item).width + 48;
    if (row.length > 0 && rowW + 16 + w > maxWidth) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push(item);
    rowW += (row.length > 1 ? 16 : 0) + w;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

/** Chips de canais em linhas centralizadas; retorna a altura. */
function paintChannelChips(ctx: CanvasRenderingContext2D, channelsText: string, y: number, cx: number, maxWidth: number): number {
  const rows = channelRows(ctx, channelsText, maxWidth);
  if (rows.length === 0) return 0;
  ctx.font = `700 26px ${BODY}`;
  let cursor = y;
  for (const r of rows) {
    const widths = r.map((item) => ctx.measureText(item).width + 48);
    const total = widths.reduce((a, b) => a + b, 0) + 16 * (r.length - 1);
    let x = cx - total / 2;
    r.forEach((item, i) => {
      ctx.fillStyle = CHIP_FILL;
      roundRect(ctx, x, cursor, widths[i], 52, 26);
      ctx.fill();
      ctx.strokeStyle = CHIP_LINE;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, cursor, widths[i], 52, 26);
      ctx.stroke();
      ctx.fillStyle = WHITE;
      ctx.textAlign = "center";
      ctx.fillText(item, x + widths[i] / 2, cursor + 13);
      x += widths[i] + 16;
    });
    cursor += 68;
  }
  return cursor - y;
}

/** Linhas de texto centralizadas (no máximo maxLines); retorna a altura. */
function paintCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
  lineHeight: number,
  maxWidth = 880,
  maxLines = 99,
): number {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, i) => ctx.fillText(line, 540, y + i * lineHeight));
  return lines.length * lineHeight;
}

const PANEL_X = 64;
const PANEL_W = 952;
const PANEL_PAD = 48;
const FOOTER_TOP = 1140;

/** Uma linha de time: distintivo de iniciais + nome. Retorna a altura. */
function paintTeamRow(
  ctx: CanvasRenderingContext2D,
  name: string,
  y: number,
  size: number,
): number {
  const nameX = PANEL_X + PANEL_PAD + 88 + 24;
  const nameW = PANEL_X + PANEL_W - PANEL_PAD - nameX;
  const { lines, size: used } = fitLines(ctx, name.toUpperCase(), nameW, 2, size, 60, "400");
  const rowH = Math.max(88, lines.length * (used + 10));
  // Distintivo: círculo com as iniciais, centralizado na linha.
  const cy = y + rowH / 2;
  ctx.beginPath();
  ctx.arc(PANEL_X + PANEL_PAD + 44, cy, 44, 0, Math.PI * 2);
  ctx.fillStyle = "#0d1f16";
  ctx.fill();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.font = `400 ${initialsForTeam(name).length > 2 ? 30 : 36}px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText(initialsForTeam(name), PANEL_X + PANEL_PAD + 44, cy - (initialsForTeam(name).length > 2 ? 15 : 18));
  // Nome, alinhado à esquerda, centralizado verticalmente na linha.
  ctx.fillStyle = WHITE;
  ctx.font = `400 ${used}px ${DISPLAY}`;
  ctx.textAlign = "left";
  const textH = lines.length * (used + 10) - 10;
  let ty = y + (rowH - textH) / 2;
  lines.forEach((line) => {
    ctx.fillText(line, nameX, ty);
    ty += used + 10;
  });
  return rowH;
}

function measureTeamRow(ctx: CanvasRenderingContext2D, name: string, size: number): number {
  const nameW = PANEL_X + PANEL_W - PANEL_PAD - (PANEL_X + PANEL_PAD + 88 + 24);
  const { lines, size: used } = fitLines(ctx, name.toUpperCase(), nameW, 2, size, 60, "400");
  return Math.max(88, lines.length * (used + 10));
}

/** Divisor com "VS" no meio. Retorna a altura (56). */
function paintVsRow(ctx: CanvasRenderingContext2D, y: number): number {
  const cy = y + 28;
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_PAD, cy);
  ctx.lineTo(540 - 64, cy);
  ctx.moveTo(540 + 64, cy);
  ctx.lineTo(PANEL_X + PANEL_W - PANEL_PAD, cy);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.font = `400 44px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText("VS", 540, cy - 22);
  return 56;
}

/** Rodapé ancorado: CTA em largura total + site. */
function paintFooter(ctx: CanvasRenderingContext2D) {
  const label = "▶  Assistir na Brito Solutions";
  ctx.font = `700 36px ${BODY}`;
  ctx.textAlign = "center";
  const y = FOOTER_TOP;
  ctx.fillStyle = GREEN;
  roundRect(ctx, PANEL_X, y, PANEL_W, 92, 46);
  ctx.fill();
  ctx.fillStyle = "#07080a";
  ctx.fillText(label, 540, y + 28);
  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${BODY}`;
  ctx.fillText("canaldobrito.site", 540, y + 112);
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
  await ensureFonts();
  const [c, ctx] = canvas();
  paintBase(ctx, "Agenda esportiva");
  // Mede antes de pintar: a fonte dos times encolhe até o painel
  // caber entre y=190 e o rodapé (y=1140).
  const innerW = PANEL_W - PANEL_PAD * 2;
  ctx.font = `700 30px ${BODY}`;
  const compLines = Math.min(2, wrapText(ctx, game.competition.toUpperCase(), innerW).length);
  const chipRows = game.channelsText.trim()
    ? channelRows(ctx, game.channelsText, innerW).length
    : 0;
  let teamSize = 104;
  let panelH = 0;
  for (const s of [104, 96, 88, 80, 72, 64, 60]) {
    teamSize = s;
    const teamsH = game.away_team
      ? measureTeamRow(ctx, game.home_team, s) + measureTeamRow(ctx, game.away_team, s)
      : measureTeamRow(ctx, game.home_team, s);
    panelH = PANEL_PAD * 2 + 56 + 32 + compLines * 40 + 28 + teamsH
      + (game.away_team ? 16 + 56 + 16 : 0)
      + 32 + 112 + 8 + 30 + 24 + (chipRows > 0 ? chipRows * 68 : 0);
    if (190 + panelH <= FOOTER_TOP) break;
  }
  const panelY = 190;
  ctx.fillStyle = PANEL_FILL;
  roundRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 32);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 32);
  ctx.stroke();
  let y = panelY + PANEL_PAD;
  y += paintDateBadge(ctx, game.date, y) + 32;
  y += paintCentered(ctx, game.competition.toUpperCase(), y, `700 30px ${BODY}`, GREEN, 40, innerW, 2) + 28;
  y += paintTeamRow(ctx, game.home_team, y, teamSize);
  if (game.away_team) {
    y += 16;
    y += paintVsRow(ctx, y);
    y += 16;
    y += paintTeamRow(ctx, game.away_team, y, teamSize);
  }
  y += 32;
  ctx.fillStyle = GREEN;
  ctx.font = `400 112px ${DISPLAY}`;
  ctx.textAlign = "center";
  ctx.fillText(game.game_time.slice(0, 5), 540, y);
  y += 112 + 8;
  y += paintCentered(ctx, "HORÁRIO DE BRASÍLIA", y, `700 24px ${BODY}`, FAINT, 30) + 24;
  if (chipRows > 0) {
    y += paintChannelChips(ctx, game.channelsText, y, 540, innerW);
  }
  paintFooter(ctx);
  return toBlob(c);
}

/** Card de UM filme/série do catálogo próprio, com o mesmo padrão. */
export async function renderTitleSharePng(title: ShareTitleInput): Promise<Blob> {
  await ensureFonts();
  const [c, ctx] = canvas();
  paintBase(ctx, title.kind === "series" ? "Série" : "Filme");
  const meta = [
    title.year ? String(title.year) : null,
    title.genre?.split(",")[0]?.trim() || null,
    title.category || null,
  ]
    .filter(Boolean)
    .join(" · ");
  const innerW = PANEL_W - PANEL_PAD * 2;
  ctx.font = `700 32px ${BODY}`;
  const metaLines = meta ? wrapText(ctx, meta.toUpperCase(), innerW).length : 0;
  let titleSize = 128;
  let panelH = 0;
  for (const s of [128, 112, 96, 84, 72]) {
    titleSize = s;
    const { lines, size: used } = fitLines(ctx, title.title.toUpperCase(), innerW, 3, s, 64, "400");
    panelH = PANEL_PAD * 2 + 56 + 32 + lines.length * (used + 12) + 28 + (meta ? metaLines * 44 : 0);
    if (190 + panelH <= FOOTER_TOP) break;
  }
  // Painel centralizado verticalmente entre o cabeçalho e o rodapé.
  const panelY = 190 + Math.max(0, (FOOTER_TOP - 190 - panelH) / 2);
  ctx.fillStyle = PANEL_FILL;
  roundRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 32);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, PANEL_X, panelY, PANEL_W, panelH, 32);
  ctx.stroke();
  let y = panelY + PANEL_PAD;
  ctx.fillStyle = GREEN;
  ctx.font = `700 28px ${BODY}`;
  ctx.textAlign = "center";
  const kindLabel = title.kind === "series" ? "SÉRIE" : "FILME";
  const kw = ctx.measureText(kindLabel).width + 64;
  roundRect(ctx, 540 - kw / 2, y, kw, 52, 26);
  ctx.fillStyle = "rgba(0,255,135,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,255,135,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, 540 - kw / 2, y, kw, 52, 26);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.fillText(kindLabel, 540, y + 13);
  y += 52 + 32;
  const { lines, size: used } = fitLines(ctx, title.title.toUpperCase(), innerW, 3, titleSize, 64, "400");
  ctx.fillStyle = WHITE;
  ctx.font = `400 ${used}px ${DISPLAY}`;
  ctx.textAlign = "center";
  lines.forEach((line) => {
    ctx.fillText(line, 540, y);
    y += used + 12;
  });
  y += 28;
  if (meta) {
    y += paintCentered(ctx, meta.toUpperCase(), y, `700 32px ${BODY}`, MUTED, 44, innerW);
  }
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
