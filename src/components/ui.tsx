import type { ReactNode } from "react";
import "./ui.css";

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub muted">{subtitle}</p>}
      </div>
      {right && <div className="page-header-right">{right}</div>}
    </header>
  );
}

type ChipKind = "pending" | "submitted" | "paid" | "attention" | "error" | "generated";
const CHIP_LABEL: Record<ChipKind, string> = {
  pending: "Unsubmitted",
  submitted: "Submitted",
  paid: "Paid",
  attention: "Needs attention",
  error: "Error",
  generated: "Generated",
};
const CHIP_CLASS: Record<ChipKind, string> = {
  pending: "chip-unsubmitted",
  submitted: "chip-submitted",
  paid: "chip-paid",
  attention: "chip-attention",
  error: "chip-error",
  generated: "chip-submitted",
};

export function StatusChip({ kind, label }: { kind: ChipKind; label?: string }) {
  return <span className={`chip ${CHIP_CLASS[kind]}`}>{label ?? CHIP_LABEL[kind]}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state card">
      <div className="empty-illu" aria-hidden />
      <h2 className="empty-title serif">{title}</h2>
      <p className="empty-body muted">{body}</p>
      {action}
    </div>
  );
}

export function Modal({ title, eyebrow, onClose, children, footer }: { title: ReactNode; eyebrow?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="modal-title">{title}</h2>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Banner({ kind, title, body, action }: { kind: "attention" | "error"; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={`banner banner-${kind}`}>
      <span className="banner-icon">{kind === "error" ? "✕" : "!"}</span>
      <div className="banner-text">
        <strong>{title}</strong>
        {body && <p className="muted">{body}</p>}
      </div>
      {action && <div className="banner-action">{action}</div>}
    </div>
  );
}
