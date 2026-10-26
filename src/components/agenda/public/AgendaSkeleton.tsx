export const AgendaSkeleton = () => (
  <div className="space-y-4" aria-busy="true">
    <div
      className="h-[140px] rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]"
      style={{ animation: "shimmer 1.5s infinite linear" }}
    />
    <div className="flex gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-9 w-20 rounded-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]"
          style={{ animation: "shimmer 1.5s infinite linear" }}
        />
      ))}
    </div>
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-[88px] rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]"
        style={{ animation: "shimmer 1.5s infinite linear" }}
      />
    ))}
  </div>
);
