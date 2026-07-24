import { AnimatePresence, motion } from 'framer-motion';

type ToastNotificationProps = {
  message: string;
  visible: boolean;
};

export default function ToastNotification({ message, visible }: ToastNotificationProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-5 left-1/2 z-[160] -translate-x-1/2 rounded-full border border-cyan-400/30 bg-slate-950/90 px-4 py-3 text-sm font-medium text-cyan-300 shadow-lg shadow-cyan-500/10"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
