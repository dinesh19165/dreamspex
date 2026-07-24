import { useEffect, useState } from 'react';

type CountdownTimerProps = {
  targetDate: string;
};

function getTimeLeft(targetDate: string) {
  const difference = new Date(targetDate).getTime() - Date.now();
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="mt-6 flex flex-wrap gap-3 text-center text-sm text-slate-200">
      {Object.entries(timeLeft).map(([label, value]) => (
        <div key={label} className="min-w-[72px] rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
          <p className="text-xl font-semibold text-white">{String(value).padStart(2, '0')}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}
