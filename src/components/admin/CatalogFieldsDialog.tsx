import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  missingCatalogFields,
  type CatalogFields,
} from "@/lib/catalogFields";

interface CatalogFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: CatalogFields;
  saving: boolean;
  onSave: (fields: CatalogFields) => void;
}

/**
 * Formulário de catálogo próprio (Lote 1) para UM filme/série já
 * adicionado via TMDB. O TMDB não é editado aqui — só os campos que
 * dizem como o título existe no serviço próprio:
 * disponível?, categoria, identificador/link interno, destaque e
 * data de saída. Categoria e link interno são obrigatórios quando o
 * título está disponível; sem link interno, o visitante não teria
 * para onde ir dentro do serviço próprio.
 */
export const CatalogFieldsDialog = ({
  open, onOpenChange, title, initial, saving, onSave,
}: CatalogFieldsDialogProps) => {
  const [available, setAvailable] = useState(initial.available_in_catalog);
  const [category, setCategory] = useState(initial.catalog_category ?? "");
  const [internalLink, setInternalLink] = useState(initial.internal_link ?? "");
  const [featured, setFeatured] = useState(initial.featured);
  const [leavesAt, setLeavesAt] = useState(initial.leaves_at ?? "");

  useEffect(() => {
    if (open) {
      setAvailable(initial.available_in_catalog);
      setCategory(initial.catalog_category ?? "");
      setInternalLink(initial.internal_link ?? "");
      setFeatured(initial.featured);
      setLeavesAt(initial.leaves_at ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const fields: CatalogFields = {
    available_in_catalog: available,
    catalog_category: category.trim() || null,
    internal_link: internalLink.trim() || null,
    featured,
    leaves_at: leavesAt || null,
  };
  const missing = missingCatalogFields(fields);
  const canSave = missing.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catálogo próprio — {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-2 min-h-11 rounded-lg border border-white/[0.06] px-3">
            <Label htmlFor="catalog-available" className="text-xs">Disponível no catálogo próprio</Label>
            <Switch id="catalog-available" checked={available} onCheckedChange={setAvailable} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalog-category" className="text-xs">
              Categoria {available ? "*" : "(opcional se indisponível)"}
            </Label>
            <Input
              id="catalog-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex.: Ação, Drama, Infantil"
              maxLength={120}
              className="h-11 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalog-link" className="text-xs">
              Identificador / link interno {available ? "*" : "(opcional se indisponível)"}
            </Label>
            <Input
              id="catalog-link"
              value={internalLink}
              onChange={(e) => setInternalLink(e.target.value)}
              placeholder="Ex.: id interno ou caminho dentro do app próprio"
              maxLength={300}
              className="h-11 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Nunca um link de plataforma externa — só o identificador/caminho dentro do serviço próprio.
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 min-h-11 rounded-lg border border-white/[0.06] px-3">
            <Label htmlFor="catalog-featured" className="text-xs">Destaque</Label>
            <Switch id="catalog-featured" checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalog-leaves" className="text-xs">Data de saída do catálogo (opcional)</Label>
            <Input
              id="catalog-leaves"
              type="date"
              value={leavesAt}
              onChange={(e) => setLeavesAt(e.target.value)}
              className="h-11 text-sm"
            />
          </div>
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-400" role="alert">
              Falta preencher: {missing.join(", ")}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="min-h-11 text-xs">
            Cancelar
          </Button>
          <Button
            onClick={() => onSave(fields)}
            disabled={!canSave || saving}
            className="min-h-11 text-xs bg-emerald-600 hover:bg-emerald-600/90"
          >
            {saving ? "Salvando…" : "Salvar catálogo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
