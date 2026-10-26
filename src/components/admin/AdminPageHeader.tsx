import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface AdminPageHeaderCrumb {
  label: string;
  to?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  crumbs?: AdminPageHeaderCrumb[];
  showBackOnMobile?: boolean;
}

/**
 * Shared page header for every admin route.
 * - Consistent title / subtitle / breadcrumbs
 * - Actions slot (right side, wraps on mobile)
 * - Safe-area aware on iOS via env(safe-area-inset-*)
 */
export function AdminPageHeader({
  title,
  subtitle,
  icon,
  actions,
  crumbs,
  showBackOnMobile = false,
}: AdminPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="mb-5 sm:mb-6">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb className="mb-2 hidden sm:block">
          <BreadcrumbList className="text-[11px]">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate("/admin/dashboard")}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                Admin
              </BreadcrumbLink>
            </BreadcrumbItem>
            {crumbs.map((c, i) => (
              <span key={i} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {c.to && i < crumbs.length - 1 ? (
                    <BreadcrumbLink
                      onClick={() => navigate(c.to!)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {c.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-foreground/90">{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBackOnMobile && (
            <Button
              size="icon"
              variant="ghost"
              className="min-h-11 min-w-11 sm:hidden"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {icon && (
            <div className="hidden shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 sm:flex">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{actions}</div>
        )}
      </div>
    </header>
  );
}

export default AdminPageHeader;
