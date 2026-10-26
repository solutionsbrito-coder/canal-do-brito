import { motion } from "framer-motion";

const shimmerClass = "skeleton-shimmer rounded-xl";

/** Poster card skeleton for movies/series horizontal scroll */
export const PosterCardSkeleton = ({ index }: { index: number }) => (
  <motion.div
    className="snap-start shrink-0 w-[170px] sm:w-[180px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.08, duration: 0.4 }}
  >
    <div className="relative overflow-hidden rounded-xl border border-border/10 bg-card aspect-[2/3]">
      <div className={`absolute inset-0 ${shimmerClass}`} />
      {/* Badge placeholder */}
      <div className="absolute top-2.5 left-2.5 w-16 h-5 rounded-lg skeleton-shimmer" />
      {/* Bottom text placeholders */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-3 w-10 rounded skeleton-shimmer" />
          <div className="h-3 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  </motion.div>
);

/** Featured news banner skeleton */
export const NewsBannerSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className="relative h-[360px] sm:h-[420px] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/10 bg-card">
      <div className={`absolute inset-0 ${shimmerClass}`} />
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
        <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        <div className="h-6 w-3/4 rounded skeleton-shimmer" />
        <div className="h-4 w-full rounded skeleton-shimmer" />
        <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        <div className="flex gap-3 pt-1">
          <div className="h-5 w-12 rounded skeleton-shimmer" />
          <div className="h-5 w-16 rounded skeleton-shimmer" />
          <div className="h-5 w-14 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  </motion.div>
);

/** Section header skeleton */
export const SectionHeaderSkeleton = () => (
  <div className="flex items-center gap-2.5">
    <div className="p-2 rounded-xl skeleton-shimmer w-9 h-9" />
    <div className="space-y-1.5">
      <div className="h-4 w-28 rounded skeleton-shimmer" />
      <div className="h-3 w-40 rounded skeleton-shimmer" />
    </div>
  </div>
);

/** Horizontal poster row loading (movies or series) */
export const PosterRowSkeleton = () => (
  <div className="flex gap-3.5 overflow-hidden px-4 pb-2">
    {[0, 1, 2, 3].map((i) => (
      <PosterCardSkeleton key={i} index={i} />
    ))}
  </div>
);

/** Game card skeleton for schedule section */
export const GameCardSkeleton = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.35 }}
    className="rounded-xl border border-border/10 bg-card p-4 space-y-3"
  >
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 rounded skeleton-shimmer" />
      <div className="h-4 w-14 rounded skeleton-shimmer" />
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full skeleton-shimmer" />
        <div className="h-4 w-20 rounded skeleton-shimmer" />
      </div>
      <div className="h-5 w-8 rounded skeleton-shimmer" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 rounded skeleton-shimmer" />
        <div className="w-7 h-7 rounded-full skeleton-shimmer" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-5 w-16 rounded-full skeleton-shimmer" />
      <div className="h-5 w-16 rounded-full skeleton-shimmer" />
    </div>
  </motion.div>
);
