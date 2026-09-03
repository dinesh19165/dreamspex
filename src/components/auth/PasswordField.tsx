import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export default function PasswordField({ id, label, value, onChange, error, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; autoComplete?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-field-wrap"><label htmlFor={id}>{label}</label><div className="auth-password-wrap"><LockKeyhole className="auth-password-icon" size={16} aria-hidden="true" /><input id={id} type={visible ? 'text' : 'password'} value={value} placeholder="Enter your password" onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /><button type="button" className="auth-icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error ? <span id={`${id}-error`} className="auth-error">{error}</span> : null}</div>;
}