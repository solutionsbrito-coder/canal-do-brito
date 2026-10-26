import { type LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  hideBrand?: boolean;
}

export const SectionHeader = ({ icon: Icon, title, subtitle, badge, hideBrand }: SectionHeaderProps) => (
  <div className="flex items-center gap-2.5">
    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
      <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-primary" />
    </div>
    <div className="flex flex-col gap-0.5">
      <h2 className="font-body text-[15px] sm:text-base font-bold text-foreground leading-tight tracking-tight">
        {title}{!hideBrand && <span className="text-foreground/70"> Canal do Brito</span>}
      </h2>
      <p className="text-[10px] text-muted-foreground/60 font-body tracking-wide leading-none">
        {subtitle}
      </p>
    </div>
    {badge}
  </div>
);
