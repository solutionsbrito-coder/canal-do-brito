import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Clock, GripVertical, Pencil, Check, X, Copy, CalendarX } from "lucide-react";
import { formatCountdown } from "@/lib/dateUtils";
import { toast } from "sonner";
import { CATEGORY_LABELS, type Banner } from "@/hooks/useBanners";

interface Props {
  banner: Banner;
  selected: boolean;
  onSelect: (id: string, next: boolean) => void;
  onToggleActive: (banner: Banner, next: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => Promise<void>;
  onUpdateExpiresAt: (id: string, value: string | null) => Promise<void>;
}

const isExpired = (b: Banner) => !!b.expires_at && new Date(b.expires_at) < new Date();
const isScheduled = (b: Banner) => !!b.publish_at && !b.active;

const statusBorder = (b: Banner) => {
  if (isExpired(b) && b.active) return "border-l-4 border-l-red-500";
  if (isScheduled(b)) return "border-l-4 border-l-amber-500";
  if (b.active) return "border-l-4 border-l-emerald-500";
  return "border-l-4 border-l-muted-foreground/30";
};

export const BannerCard = ({
  banner, selected, onSelect, onToggleActive, onDelete, onUpdateTitle, onUpdateExpiresAt,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : "auto" as const,
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(banner.title || "");
  const [editingExpires, setEditingExpires] = useState(false);
  const [expiresDraft, setExpiresDraft] = useState(
    banner.expires_at ? new Date(banner.expires_at).toISOString().slice(0, 16) : "",
  );

  const altText = banner.title?.trim() || `Banner ${CATEGORY_LABELS[banner.category]}`;

  const saveTitle = async () => {
    const v = titleDraft.trim();
    try {
      await onUpdateTitle(banner.id, v);
      setEditingTitle(false);
    } catch {/* toast handled upstream */}
  };

  const saveExpires = async () => {
    try {
      await onUpdateExpiresAt(banner.id, expiresDraft ? new Date(expiresDraft).toISOString() : null);
      setEditingExpires(false);
    } catch {/* */}
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(banner.image_url);
      toast.success("URL copiada");
    } catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl glass-panel overflow-hidden ${statusBorder(banner)} ${selected ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="relative aspect-[16/9]">
        <img
          src={banner.image_url}
          alt={altText}
          className={`w-full h-full object-cover ${!banner.active ? "opacity-30 grayscale" : ""}`}
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            className="h-8 w-8 grid place-items-center rounded-md bg-black/40 backdrop-blur text-white/80 cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="bg-black/40 backdrop-blur rounded-md px-2 h-8 grid place-items-center">
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelect(banner.id, !!v)}
              aria-label="Selecionar banner"
            />
          </div>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {isScheduled(banner) && (
            <Badge className="bg-amber-500/90 text-white border-0 text-[9px] px-1.5 py-0.5">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              Agendado
            </Badge>
          )}
          {isExpired(banner) && banner.active && (
            <Badge className="bg-red-500/90 text-white border-0 text-[9px] px-1.5 py-0.5">
              <CalendarX className="h-2.5 w-2.5 mr-0.5" />
              Expirado
            </Badge>
          )}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${banner.active ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}>
            {banner.active ? "✓ ATIVO" : "⏸ OFF"}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-center gap-2 min-h-[28px]">
          {editingTitle ? (
            <>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Título do banner (opcional)"
                className="h-8 text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveTitle} aria-label="Salvar título">
                <Check className="h-4 w-4 text-emerald-400" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTitleDraft(banner.title || ""); setEditingTitle(false); }} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className={`text-xs flex-1 truncate ${banner.title ? "text-foreground font-medium" : "text-muted-foreground/50 italic"}`}>
                {banner.title || "Sem título"}
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTitle(true)} aria-label="Editar título">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Schedule info */}
        {isScheduled(banner) && banner.publish_at && (
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="text-amber-400/80">⏰ Publica: {new Date(banner.publish_at).toLocaleString("pt-BR")}</span>
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0">
              {formatCountdown(banner.publish_at)}
            </Badge>
          </div>
        )}

        {/* Expires row */}
        <div className="flex items-center gap-2 text-[10px] min-h-[28px]">
          <CalendarX className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          {editingExpires ? (
            <>
              <Input
                type="datetime-local"
                value={expiresDraft}
                onChange={(e) => setExpiresDraft(e.target.value)}
                className="h-7 text-[10px] flex-1 min-w-0"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveExpires} aria-label="Salvar expiração">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setExpiresDraft(""); saveExpires(); }} aria-label="Remover expiração">
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className={`flex-1 truncate ${isExpired(banner) ? "text-red-400" : "text-muted-foreground"}`}>
                {banner.expires_at
                  ? `Expira ${new Date(banner.expires_at).toLocaleString("pt-BR")}`
                  : "Sem expiração"}
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingExpires(true)} aria-label="Definir expiração">
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Switch
              checked={banner.active}
              onCheckedChange={(v) => onToggleActive(banner, v)}
              aria-label={`${banner.active ? "Desativar" : "Ativar"} banner`}
            />
            <span className={`text-[10px] font-medium ${banner.active ? "text-emerald-400" : "text-muted-foreground/60"}`}>
              {banner.active ? "Ativo" : "Off"}
            </span>
          </div>
          <div role="toolbar" aria-label="Ações do banner" className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg" onClick={copyUrl} aria-label="Copiar URL pública">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remover banner"
              className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(banner.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
