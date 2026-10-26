/**
 * Normaliza uma logo de canal para caber consistentemente no ChannelBadge:
 * - Recorta bordas totalmente transparentes (trim por alpha).
 * - Centraliza em canvas quadrado com padding.
 * - Reescala para tamanho fixo (default 256x256), preservando proporção.
 * - Devolve PNG transparente.
 *
 * SVGs são retornados intactos (já vetoriais e centralizados pelo viewBox).
 */
export interface NormalizeLogoOptions {
  size?: number;       // canvas final em px (quadrado)
  padding?: number;    // padding (0-1) relativo ao canvas
  alphaThreshold?: number; // 0-255: pixels com alpha menor são considerados vazios
}

export async function normalizeLogoFile(
  file: File,
  opts: NormalizeLogoOptions = {}
): Promise<File> {
  if (file.type === "image/svg+xml") return file;

  const size = opts.size ?? 256;
  const padding = opts.padding ?? 0.08;
  const alphaThreshold = opts.alphaThreshold ?? 8;

  const bitmap = await loadBitmap(file);
  try {
    const { sx, sy, sw, sh } = trimBounds(bitmap, alphaThreshold);

    // Caso a imagem seja sólida sem alpha (JPEG-like rasterizado para PNG),
    // sw/sh podem cobrir tudo — ainda assim re-encaixamos no canvas.
    const innerSize = Math.round(size * (1 - padding * 2));
    const scale = Math.min(innerSize / sw, innerSize / sh);
    const drawW = Math.max(1, Math.round(sw * scale));
    const drawH = Math.max(1, Math.round(sh * scale));
    const dx = Math.round((size - drawW) / 2);
    const dy = Math.round((size - drawH) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, drawW, drawH);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG"))),
        "image/png"
      )
    );
    const baseName = file.name.replace(/\.[^.]+$/, "") || "logo";
    return new File([blob], `${baseName}.png`, { type: "image/png" });
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback abaixo */
    }
  }
  // Fallback via <img>
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Falha ao decodificar imagem"));
      el.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function trimBounds(bitmap: ImageBitmap, alphaThreshold: number) {
  const w = bitmap.width;
  const h = bitmap.height;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  if (!tctx) return { sx: 0, sy: 0, sw: w, sh: h };
  tctx.drawImage(bitmap, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = tctx.getImageData(0, 0, w, h).data;
  } catch {
    // Tainted (raríssimo aqui, mas seguro)
    return { sx: 0, sy: 0, sw: w, sh: h };
  }

  let top = h, bottom = -1, left = w, right = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  if (bottom < 0 || right < 0) {
    // Imagem totalmente transparente — devolve original
    return { sx: 0, sy: 0, sw: w, sh: h };
  }
  return {
    sx: left,
    sy: top,
    sw: Math.max(1, right - left + 1),
    sh: Math.max(1, bottom - top + 1),
  };
}
