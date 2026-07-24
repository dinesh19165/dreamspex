import { forwardRef, useState } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  children: ReactNode;
};

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', fullWidth = false, className = '', children, type = 'button', onClick, ...props }, ref) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.random();

    setRipples((prev) => [...prev, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 650);

    onClick?.(event);
  };

  const base = 'relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-3 text-sm font-semibold transition duration-200';
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110',
    secondary: 'bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20',
    ghost: 'border border-white/10 bg-white/10 text-slate-200 hover:bg-white/15',
  };

  return (
    <button ref={ref} type={type} onClick={handleClick} className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
      {children}
      {ripples.map((ripple) => (
        <span key={ripple.id} className="luxury-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
      ))}
    </button>
  );
});

export default Button;
