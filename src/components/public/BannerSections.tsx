import { useActiveBanners, CATEGORY_LABELS, CATEGORY_LIST, type BannerCategory } from "@/hooks/useBanners";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";

/** All categories except the cover row, rendered in CATEGORY_LIST order */
const SPORTS_CATEGORIES: { key: BannerCategory; emoji: string; label: string }[] = CATEGORY_LIST
  .filter((k) => k !== "cover")
  .map((key) => {
    const raw = CATEGORY_LABELS[key];
    const [emoji, ...rest] = raw.split(" ");
    return { key, emoji, label: rest.join(" ") };
  });


const BannerCard = ({ banner, index }: { banner: { id: string; image_url: string; title: string | null }; index: number }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      className="snap-start shrink-0 w-[300px] sm:w-[360px]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
    >
      <div className="group relative overflow-hidden rounded-xl border border-border/10 bg-black/50 transition-all duration-250 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer">
        {!imgErr ? (
          <img
            src={banner.image_url}
            alt={banner.title || "Banner"}
            className="w-full max-h-[300px] sm:max-h-[400px] object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-[200px] flex flex-col items-center justify-center bg-card gap-1.5">
            <ImageOff className="h-8 w-8 text-muted-foreground/15" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {banner.title && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[12px] sm:text-sm font-bold text-foreground leading-tight line-clamp-2 drop-shadow-lg font-body">
              {banner.title}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CategoryRow = ({ banners, emoji, label }: { banners: { id: string; image_url: string; title: string | null }[]; emoji: string; label: string }) => {
  if (!banners.length) return null;

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2.5 px-4 sm:px-6">
        <span className="text-lg">{emoji}</span>
        <h2 className="font-display text-base sm:text-lg font-extrabold text-foreground tracking-tight">{label}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-border/20 to-transparent" />
      </div>

      <div data-horizontal-scroll className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-2">
        {banners.map((banner, idx) => (
          <BannerCard key={banner.id} banner={banner} index={idx} />
        ))}
      </div>
    </motion.section>
  );
};

export const BannerSections = forwardRef<HTMLDivElement>((_props, ref) => {
  const { data: grouped, isLoading } = useActiveBanners();

  if (isLoading) {
    return (
      <div ref={ref} className="space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-4 sm:px-6">
            <span className="text-lg">📺</span>
            <h2 className="font-display text-base sm:text-lg font-extrabold text-foreground tracking-tight">Destaques</h2>
          </div>
          <div className="flex gap-3.5 overflow-hidden px-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-xl w-[300px] sm:w-[360px] shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!grouped) return null;

  return (
    <div ref={ref} className="space-y-10">
      <CategoryRow banners={grouped.cover} emoji="📺" label="Destaques" />
      {SPORTS_CATEGORIES.map((sport) => (
        <CategoryRow key={sport.key} banners={grouped[sport.key]} emoji={sport.emoji} label={sport.label} />
      ))}
    </div>
  );
});
BannerSections.displayName = "BannerSections";
