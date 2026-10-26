import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Banner } from "@/hooks/useBanners";

interface ExpiredBannersAlertProps {
  banners: Banner[] | undefined;
  isLoading: boolean;
}

export const ExpiredBannersAlert = ({ banners, isLoading }: ExpiredBannersAlertProps) => {
  const navigate = useNavigate();

  const expiredCount = useMemo(() => {
    if (!banners) return 0;
    const now = new Date();
    return banners.filter(b => b.active && b.expires_at && new Date(b.expires_at) < now).length;
  }, [banners]);

  if (isLoading || expiredCount === 0) return null;

  return (
    <Alert className="border-red-500/30 bg-red-500/10">
      <Clock className="h-4 w-4 text-red-400" />
      <AlertDescription className="text-xs text-red-300/90">
        <span className="font-semibold">{expiredCount} banner{expiredCount !== 1 ? "s" : ""} expirado{expiredCount !== 1 ? "s" : ""}</span>
        {` ainda ativo${expiredCount !== 1 ? "s" : ""}.`}
        <button
          onClick={() => navigate("/admin/programacao?tab=categories")}
          className="ml-1.5 underline underline-offset-2 hover:text-red-200"
        >
          Revisar →
        </button>
      </AlertDescription>
    </Alert>
  );
};
