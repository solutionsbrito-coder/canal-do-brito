import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeLogoFile } from "@/lib/normalizeLogo";

const MAX_BYTES = 400 * 1024;
const ACCEPTED = ["image/png", "image/svg+xml", "image/webp"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "canal";

interface Props {
  channelName: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onCleared?: () => void;
}

export function ChannelLogoUpload({ channelName, currentUrl, onUploaded, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Use PNG, SVG ou WEBP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Logo até ${Math.round(MAX_BYTES / 1024)} KB`);
      return;
    }
    setBusy(true);
    try {
      // Auto-trim + center + reescala para 256x256 PNG transparente.
      // SVG passa direto (vetorial, já normalizado pelo viewBox).
      const normalized = await normalizeLogoFile(file, { size: 256, padding: 0.08 });
      const ext = normalized.type === "image/svg+xml" ? "svg" : "png";
      const path = `${slugify(channelName || "canal")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("channel-logos")
        .upload(path, normalized, {
          contentType: normalized.type,
          cacheControl: "60",
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("channel-logos").getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success("Logo enviada e normalizada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro no upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors",
          drag ? "border-primary bg-primary/10" : "border-border/50 bg-card/40 hover:bg-card/60",
          busy && "pointer-events-none opacity-60"
        )}
        aria-label="Enviar logo do canal"
      >
        {currentUrl ? (
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-md bg-white/95 p-1 ring-1 ring-white/10">
              <img src={currentUrl} alt="Logo atual" className="h-full w-full object-contain" />
            </div>
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Logo atual</div>
              <div>Clique ou arraste para substituir</div>
            </div>
          </div>
        ) : (
          <>
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="text-center text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {busy ? "Enviando…" : "Arraste um arquivo ou clique"}
              </div>
              <div>PNG · SVG · WEBP · até 400 KB · auto-recorte e centralização</div>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {currentUrl && onCleared && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={onCleared}
        >
          <X className="h-3 w-3" /> Remover logo personalizada
        </Button>
      )}
    </div>
  );
}
