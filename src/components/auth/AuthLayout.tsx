import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import BrandLogo from '../ui/BrandLogo';
import DreamSpex3DGlasses from './DreamSpex3DGlasses';
import './auth.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const variant = location.pathname === '/register' ? 'register' : location.pathname === '/forgot-password' ? 'forgot' : 'login';
  return <main className={`auth-page auth-page-${variant}`}><div className="auth-noise" aria-hidden="true" /><button type="button" className="auth-theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><section className="auth-form-column"><div className="auth-form-inner"><BrandLogo />{children}<p className="auth-legal">Dream Spex Solutions Pvt Ltd <span aria-hidden="true">·</span> Secure account access</p></div></section><aside className="auth-visual-column" aria-label="Dream Spex eyewear showcase"><div className="auth-visual-copy"><span className="auth-kicker">DREAM SPEX / OPTICAL ATELIER</span><h2>See the world<br /><em>differently.</em></h2><p>Premium eyewear, personalized for you.</p></div><DreamSpex3DGlasses variant={variant} /><span className="auth-visual-index">01 <i /> 03</span></aside></main>;
}