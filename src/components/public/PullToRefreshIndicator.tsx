import { RefreshCw } from "lucide-react";

interface Props {
  pullDistance: number;
  isRefreshing: boolean;
}

const THRESHOLD = 80;

export const PullToRefreshIndicator = ({ pullDistance, isRefreshing }: Props) => {
  const visible = pullDistance > 10 || isRefreshing;
  if (!visible) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = isRefreshing ? undefined : pullDistance * 2;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: isRefreshing ? 48 : pullDistance > 10 ? pullDistance * 0.6 : 0 }}
    >
      <RefreshCw
        className={`h-5 w-5 text-primary transition-opacity ${isRefreshing ? "animate-spin" : ""}`}
        style={{
          opacity: isRefreshing ? 1 : progress,
          transform: rotation !== undefined ? `rotate(${rotation}deg)` : undefined,
        }}
      />
    </div>
  );
};
