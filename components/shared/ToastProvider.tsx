"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const typeClasses: Record<ToastType, string> = {
  success: "clay-toast-success",
  error: "clay-toast-error",
  warning: "clay-toast-warning",
  info: "clay-toast-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const success = useCallback((t: string, m?: string) => showToast("success", t, m), [showToast]);
  const error = useCallback((t: string, m?: string) => showToast("error", t, m), [showToast]);
  const warning = useCallback((t: string, m?: string) => showToast("warning", t, m), [showToast]);
  const info = useCallback((t: string, m?: string) => showToast("info", t, m), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="clay-toast-container" role="region" aria-label="Notifikasi">
        {toasts.map((toast) => (
          <div key={toast.id} className={`clay-toast ${typeClasses[toast.type]}`} role="alert">
            <span className="flex-shrink-0">{icons[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 700 }}>{toast.title}</div>
              {toast.message && (
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: "2px" }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0 }}
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
