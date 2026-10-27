import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { shareImage } from "@/lib/shareCard";

interface ShareCardButtonProps {
  /** Gera o PNG na hora do clique (canvas). */
  render: () => Promise<Blob>;
  filename: string;
  label?: string;
}

/**
 * Botão "Compartilhar como imagem": Web Share API quando o navegador
 * aceita arquivos, download do PNG como fallback. Sem login, sem
 * envio a servidor — a imagem é gerada no aparelho do visitante.
 */
export const ShareCardButton = ({
  render,
  filename,
  label = "Compartilhar como imagem",
}: ShareCardButtonProps) => {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await render();
      const how = await shareImage(blob, filename);
      toast.success(
        how === "shared"
          ? "Imagem pronta para compartilhar!"
          : "Imagem baixada — compartilhe no WhatsApp ou Instagram.",
      );
    } catch (err) {
      // AbortError = o visitante fechou o menu de compartilhar: silêncio.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label={label}
      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-[11px] font-bold bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Share2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {label}
    </button>
  );
};
