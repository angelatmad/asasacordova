import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

// Maps the size prop to width limits, so callers use names instead of class strings.
const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

// Reusable dialog with header, body, optional footer, and close behavior.
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  // Escape closes the dialog, just like most desktop dialogs.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    // Remove the listener so an old dialog cannot close a newer one.
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Clicking the dark area outside the box also closes the dialog.
  // role and aria-modal tell assistive technology that this is a modal dialog.
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-[#292929]/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full ${sizeClasses[size]} overflow-hidden rounded-3xl border border-[#EBD5D3] bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#EBD5D3] px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#58111A]">{title}</h2>
            {description && (
              <p className="mt-1 text-xs text-[#7A585B]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF6F5] text-[#7A585B] transition hover:bg-[#F2DCDA] hover:text-[#58111A]"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* The body scrolls separately so long forms do not overflow the screen. */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer is optional; ConfirmDialog uses it for action buttons. */}
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBD5D3] bg-[#FAF6F5] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
