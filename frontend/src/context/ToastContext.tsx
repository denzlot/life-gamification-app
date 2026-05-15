import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastTone = "info" | "success" | "danger" | "achievement";

interface Toast {
  id: number;
  title: string;
  text?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }].slice(-5));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone}`} key={toast.id}>
            {toast.tone === "achievement" ? (
              <div className="toast-sparks" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            <div className="toast-title">{toast.title}</div>
            {toast.text ? <div className="toast-text">{toast.text}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast должен использоваться внутри ToastProvider");
  return context;
}
