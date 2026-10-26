import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageOff, Smartphone, Monitor } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type Banner, type BannerCategory } from "@/hooks/useBanners";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BannerCategory;
  banners: Banner[] | undefined;
}

export const BannerPreviewModal = ({ open, onOpenChange, category, banners }: Props) => {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const visible = (banners || []).filter((b) => b.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pré-visualização — {CATEGORY_LABELS[category]}</DialogTitle>
          <DialogDescription>
            Mostra exatamente o que o público vê agora ({visible.length} banner{visible.length !== 1 ? "s" : ""} ativo{visible.length !== 1 ? "s" : ""}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          <Button size="sm" variant={device === "mobile" ? "default" : "ghost"} className="h-8 gap-1.5"
            onClick={() => setDevice("mobile")}>
            <Smartphone className="h-3.5 w-3.5" />Mobile
          </Button>
          <Button size="sm" variant={device === "desktop" ? "default" : "ghost"} className="h-8 gap-1.5"
            onClick={() => setDevice("desktop")}>
            <Monitor className="h-3.5 w-3.5" />Desktop
          </Button>
        </div>

        <div className="bg-[#07080a] rounded-xl p-4 max-h-[60vh] overflow-auto">
          {visible.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum banner ativo — o público não verá nada nesta categoria.
            </div>
          ) : (
            <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
              {visible.map((banner) => (
                <PreviewCard key={banner.id} banner={banner} device={device} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PreviewCard = ({ banner, device }: { banner: Banner; device: "mobile" | "desktop" }) => {
  const [err, setErr] = useState(false);
  const w = device === "mobile" ? "w-[260px]" : "w-[360px]";
  return (
    <div className={`snap-start shrink-0 ${w}`}>
      <div className="relative overflow-hidden rounded-xl border border-border/10 bg-black/50">
        {!err ? (
          <img src={banner.image_url} alt={banner.title || "Banner"}
            className="w-full max-h-[300px] object-contain"
            onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-[180px] flex items-center justify-center bg-card">
            <ImageOff className="h-8 w-8 text-muted-foreground/15" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        {banner.title && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[12px] sm:text-sm font-bold text-foreground leading-tight line-clamp-2 drop-shadow-lg">
              {banner.title}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
