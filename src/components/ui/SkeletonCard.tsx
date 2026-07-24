export default function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="h-56 rounded-[20px] bg-slate-800/70" />
      <div className="mt-4 h-4 w-24 rounded-full bg-slate-800/70" />
      <div className="mt-3 h-6 w-3/4 rounded-full bg-slate-800/70" />
      <div className="mt-3 h-4 w-full rounded-full bg-slate-800/70" />
      <div className="mt-2 h-4 w-2/3 rounded-full bg-slate-800/70" />
    </div>
  );
}
