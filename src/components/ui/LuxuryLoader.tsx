import { motion } from 'framer-motion';

export default function LuxuryLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#03050c]"
    >
      <div className="w-full max-w-md px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 text-xl font-semibold tracking-[0.3em] text-white"
        >
          DS
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-6 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300"
        >
          Dream Spex
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-2 text-sm text-slate-400"
        >
          Curating cinematic luxury eyewear experiences
        </motion.p>
        <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.3, ease: 'easeInOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
          />
        </div>
      </div>
    </motion.div>
  );
}
