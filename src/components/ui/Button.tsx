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
    primary: 'bg-[var(--brand-green)] text-[#172015] shadow-lg shadow-black/20 hover:bg-[var(--brand-green-light)]',
    secondary: 'border border-[var(--brand-green)]/60 bg-[var(--control-surface)] text-[var(--text-primary)] hover:bg-[var(--control-surface-hover)]',
    ghost: 'border border-[var(--border-subtle)] bg-[var(--control-surface)] text-[var(--text-primary)] hover:border-[var(--brand-green)]/60 hover:bg-[var(--control-surface-hover)]',
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
