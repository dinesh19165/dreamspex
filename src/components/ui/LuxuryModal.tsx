import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type LuxuryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  image?: string;
};

export default function LuxuryModal({ isOpen, onClose, title, children, image }: LuxuryModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center bg-[#03050c]/85 px-4 py-8 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-[#060b17] shadow-[0_30px_120px_-25px_rgba(0,212,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            {image ? <img src={image} alt={title} loading="lazy" className="h-56 w-full object-cover" /> : null}
            <button className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 p-2 text-slate-100" onClick={onClose} aria-label="Close preview">
              <X className="h-4 w-4" />
            </button>
            <div className="p-6 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Quick view</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
              <div className="mt-5">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
