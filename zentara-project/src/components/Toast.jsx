import { useToast } from '../context/ToastContext';
import './Toast.css';

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
