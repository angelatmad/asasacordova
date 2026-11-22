import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  // value can be text or JSX, so pages may add their own suffix or styling.
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}

// Small dashboard card that highlights one number or summary value.
export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-[#EBD5D3] bg-white p-5 shadow-sm transition hover:border-[#800020]/40 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A585B]">
            {label}
          </p>
          <p className="mt-3 font-display text-3xl font-bold text-[#58111A]">{value}</p>
        </div>
        {/* Optional icon keeps the card useful for different statistics. */}
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F2] text-lg text-[#800020]">
            {icon}
          </span>
        )}
      </div>
      {/* Optional extra detail explains the number when needed. */}
      {hint && <p className="mt-3 text-xs text-[#7A585B]">{hint}</p>}
    </div>
  );
}
