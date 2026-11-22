import { X } from "lucide-react";

interface FeedbackBannerProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

// Shows success or error feedback after an admin action.
export function FeedbackBanner({ message, type, onClose }: FeedbackBannerProps) {
  // The color changes with the type, but the message is shown the same way.
  return (
    <div
      role="status"
      className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-[#800020]/25 bg-[#FFF0F2] text-[#58111A]"
          : "border-[#F2DCDA] bg-[#FFF0F2] text-[#800020]"
      }`}
    >
      <span className="whitespace-pre-wrap break-words">{message}</span>
      {/* The X asks the parent to hide this banner. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="shrink-0 leading-none text-[#7A585B] hover:text-[#58111A]"
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
