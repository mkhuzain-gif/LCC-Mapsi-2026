"use client";

import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const btnClass = variant === "danger"
    ? "clay-btn clay-btn-danger"
    : variant === "warning"
    ? "clay-btn clay-btn-accent"
    : "clay-btn clay-btn-primary";

  return (
    <div className="clay-modal-overlay" onClick={onCancel}>
      <div
        className="clay-modal"
        style={{ maxWidth: 420, padding: "2rem" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: variant === "danger" ? "var(--color-danger-lighter)" : "var(--color-warning-lighter)",
              boxShadow: "var(--clay-shadow-sm)",
            }}
          >
            <AlertTriangle
              size={30}
              color={variant === "danger" ? "var(--color-danger)" : "var(--color-warning)"}
            />
          </div>
        </div>

        {/* Title */}
        <h3
          id="confirm-dialog-title"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.2rem",
            textAlign: "center",
            marginBottom: "0.75rem",
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            color: "var(--color-text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
            marginBottom: "1.75rem",
            fontSize: "0.925rem",
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            className="clay-btn clay-btn-ghost"
            onClick={onCancel}
            disabled={isLoading}
            id="confirm-cancel-btn"
          >
            {cancelLabel}
          </button>
          <button
            className={btnClass}
            onClick={onConfirm}
            disabled={isLoading}
            id="confirm-action-btn"
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="clay-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Memproses...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
