import { CircleAlert } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

// Shows a failed API/load state with an optional retry button.
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#F2DCDA] bg-[#FFF0F2] px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#800020] text-white">
        <CircleAlert size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#58111A]">
        Unable to load this section
      </h3>
      <p className="max-w-2xl whitespace-pre-wrap break-words text-sm text-[#7A585B]">
        {message}
      </p>
      {/* Only show Try again when the parent can actually retry the request. */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
