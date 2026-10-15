import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export default function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="w-full pb-6 mb-6 border-b border-[#EBE2D8] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-[#8C7A78]">
            <Link href="/admin" className="hover:text-[#4F0012] transition-colors">
              Admin
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-[#A89895]" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#4F0012] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#1F1B17]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className="text-2xl font-serif font-semibold text-[#1F1B17] tracking-tight">{title}</h1>

        {description && <p className="text-xs text-[#554243] leading-relaxed">{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
