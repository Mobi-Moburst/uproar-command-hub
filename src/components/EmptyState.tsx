interface EmptyStateProps {
  message: string;
  columns?: number;
}

export function EmptyState({ message, columns = 1 }: EmptyStateProps) {
  return (
    <div className="glass">
      {columns > 1 && (
        <div className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.04)] px-6 py-3">
          <div className="h-4 w-32 rounded bg-border" />
        </div>
      )}
      <div className="px-6 py-12">
        <p className="text-sm font-mono text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
