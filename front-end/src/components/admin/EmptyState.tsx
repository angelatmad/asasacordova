import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  // Optional action lets a page add its own button, such as "Add New".
  action?: ReactNode;
}

// Friendly placeholder shown when a list has no records.
export function EmptyState({
  title = "Nothing here yet",
  message = "No records are available.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#EBD5D3] bg-[#FAF6F5] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2DCDA] text-[#800020]">
        <Inbox size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#58111A]">{title}</h3>
      <p className="max-w-md text-sm text-[#7A585B]">{message}</p>
      {/* Render the button only when the parent provided one. */}
      {action}
    </div>
  );
}
