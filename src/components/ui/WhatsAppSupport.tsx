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
      <svg
        viewBox="0 0 32 32"
        className="h-[22px] w-[22px] fill-current text-white transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      >
        <path d="M16.04 3C8.87 3 3.05 8.75 3.05 15.84c0 2.26.61 4.47 1.77 6.41L3 29l6.93-1.78a13.1 13.1 0 0 0 6.11 1.52h.01c7.17 0 13-5.76 13-12.84C29.05 8.75 23.21 3 16.04 3Zm0 23.59h-.01a10.9 10.9 0 0 1-5.55-1.52l-.4-.24-4.12 1.06 1.1-3.96-.26-.41a10.67 10.67 0 0 1-1.68-5.68c0-5.91 4.88-10.72 10.92-10.72 2.92 0 5.66 1.12 7.72 3.16a10.52 10.52 0 0 1 3.22 7.56c0 5.91-4.88 10.75-10.94 10.75Zm6-8.05c-.33-.16-1.95-.95-2.25-1.06-.3-.11-.52-.16-.74.16-.22.33-.85 1.06-1.04 1.28-.19.22-.38.25-.71.08-.33-.16-1.38-.5-2.62-1.59-.97-.85-1.62-1.91-1.81-2.23-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.76-1.02-2.41-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.45 5.57 4.84 2.1.89 2.93.97 3.98.82.64-.09 1.95-.79 2.22-1.55.27-.76.27-1.42.19-1.56-.08-.14-.3-.22-.63-.38Z" />
      </svg>
    </a>
  );
}