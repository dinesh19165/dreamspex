export default function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 backdrop-blur-xl">
      <div className="h-56 rounded-[20px] bg-[var(--bg-secondary)]" />
      <div className="mt-4 h-4 w-24 rounded-full bg-[var(--bg-secondary)]" />
      <div className="mt-3 h-6 w-3/4 rounded-full bg-[var(--bg-secondary)]" />
      <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-secondary)]" />
      <div className="mt-2 h-4 w-2/3 rounded-full bg-[var(--bg-secondary)]" />
    </div>
  );
}
