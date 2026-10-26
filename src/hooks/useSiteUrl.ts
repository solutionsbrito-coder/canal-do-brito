import { useSettings } from "@/hooks/useSettings";

export const useSiteUrl = () => {
  const { data: settings } = useSettings();
  return settings?.site_url || window.location.origin;
};
