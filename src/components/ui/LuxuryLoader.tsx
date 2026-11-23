import { motion, useReducedMotion } from 'framer-motion';

type LuxuryLoaderProps = {
  tagline: string | null;
};

export default function LuxuryLoader({ tagline }: LuxuryLoaderProps) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.5, ease: 'easeInOut' }}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center overflow-hidden bg-[#030711] px-6 text-center text-white"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 38%, rgba(33, 113, 207, 0.22), transparent 42%), radial-gradient(ellipse at 14% 78%, rgba(18, 88, 135, 0.16), transparent 36%), linear-gradient(135deg, #02050b 0%, #071627 52%, #02060c 100%)',
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative w-full max-w-xl">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-fit overflow-hidden"
        >
          <img
            src="/assets/images/dream-spex-logo07.png"
            alt="Dream Spex eyewear logo"
            width={800}
            height={245}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            className="h-auto w-56 object-contain drop-shadow-[0_0_24px_rgba(56,146,255,0.34)] sm:w-64 md:w-72"
          />
          {!reduceMotion ? <motion.span
            aria-hidden="true"
            initial={{ x: '-140%' }}
            animate={{ x: '440%' }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.1 }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen"
          /> : null}
        </motion.div>
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.12 }}
          className="mt-7 font-serif text-4xl font-semibold tracking-[0.22em] text-white sm:text-5xl sm:tracking-[0.28em]"
        >
          DREAM SPEX
        </motion.h1>
        {tagline ? <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.24 }}
          className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c5d8eb] sm:text-base"
        >
          {tagline}
        </motion.p> : null}
        <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.24em] text-[#9cb4cc] sm:text-xs">
          Preparing your vision experience
        </p>
        <div
          role="progressbar"
          aria-label="Preparing Dream Spex"
          aria-valuetext="Preparing your vision experience"
          className="mx-auto mt-4 h-px w-64 overflow-hidden bg-white/15 sm:w-72"
        >
          <motion.div
            initial={reduceMotion ? false : { x: '-100%' }}
            animate={reduceMotion ? { x: 0, width: '45%' } : { x: ['-100%', '340%'] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.65, ease: 'easeInOut', repeat: Infinity }}
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
          />
        </div>
      </div>
    </motion.div>
  );
}
