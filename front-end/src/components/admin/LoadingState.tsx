interface LoadingStateProps {
  message?: string;
  // compact uses less vertical space for small sections.
  compact?: boolean;
}

// Shared spinner shown while admin data is being fetched.
export function LoadingState({
  message = "Loading data...",
  compact = false,
}: LoadingStateProps) {
  // role and aria-live help screen readers notice the loading status.
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 text-center ${
        compact ? "py-10" : "py-20"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800020] border-t-transparent" />
      <p className="text-sm font-semibold text-[#7A585B]">{message}</p>
    </div>
  );
}
