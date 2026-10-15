import Link from "next/link";
import { ArrowLeft, Clock, Diamond, ShieldCheck } from "lucide-react";
import AdminPageHeader from "./AdminPageHeader";

interface AdminPlaceholderPageProps {
  title: string;
  description: string;
  routePath: string;
}

export default function AdminPlaceholderPage({
  title,
  description,
  routePath,
}: AdminPlaceholderPageProps) {
  return (
    <div className="w-full">
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: title }]}
      />

      <div className="w-full bg-white rounded-2xl border border-[#EBE2D8] p-8 sm:p-12 shadow-[0_10px_35px_-4px_rgba(79,0,18,0.04)] text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-xl bg-[#FCF2EB] border border-[#EAE1DB] flex items-center justify-center mx-auto mb-4 text-[#6D1826]">
          <Diamond className="w-6 h-6 fill-current" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6F2] border border-[#E6DDD3] mb-4">
          <Clock className="w-3.5 h-3.5 text-[#6D1826]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6D1826]">
            Module Scheduled
          </span>
        </div>

        <h2 className="text-xl font-serif font-semibold text-[#1F1B17] mb-2">
          {title} Management Console
        </h2>

        <p className="text-xs text-[#554243] leading-relaxed max-w-md mx-auto mb-6">
          The <strong className="text-[#1F1B17] font-medium">{title}</strong> module is scheduled
          for implementation in an upcoming sprint. Route registration, administrative permissions,
          and shell navigation are fully active.
        </p>

        <div className="bg-[#FAF6F2] rounded-xl border border-[#E6DDD3] p-4 text-left max-w-md mx-auto mb-6 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[#8C7A78]">Registered Route:</span>
            <code className="text-[#1F1B17] font-mono font-medium">{routePath}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8C7A78]">Access Control:</span>
            <span className="text-[#059669] inline-flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Admin Only
            </span>
          </div>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAF6F2] hover:bg-[#EBE2D8] text-[#1F1B17] text-xs font-medium transition-colors border border-[#E6DDD3]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Admin Overview</span>
        </Link>
      </div>
    </div>
  );
}
