import { MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../config/siteMedia';

type WhatsAppSupportProps = {
  message?: string;
  label?: string;
  className?: string;
};

export default function WhatsAppSupport({ message = 'Hello, I need help with my Dream Spex order.', label = 'WhatsApp support', className = '' }: WhatsAppSupportProps) {
  if (!WHATSAPP_NUMBER) return null;
  const href = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      className={`group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-[90] inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-[var(--text-primary)] shadow-[0_12px_28px_rgba(37,211,102,0.28)] ring-2 ring-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1fae5b] hover:shadow-[0_14px_30px_rgba(37,211,102,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-12 sm:w-12 ${className}`}
    >
      <span className="sr-only">{label}</span>
      <MessageCircle className="h-5 w-5 text-[var(--text-primary)] transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
    </a>
  );
}