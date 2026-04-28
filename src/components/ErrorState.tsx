interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong while loading data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-[16px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.10)] backdrop-blur-xl px-6 py-12 text-center">
      <p className="text-sm font-medium text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md border border-[rgba(255,255,255,0.10)] bg-[rgba(21,23,28,0.2)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(255,255,255,0.06)]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
