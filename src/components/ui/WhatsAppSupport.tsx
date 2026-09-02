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
    <a href={href} target="_blank" rel="noreferrer noopener" className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 ${className}`}>
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}