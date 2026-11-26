'use client';
import { useEffect, useRef, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { useGovernance } from '@/features/governance/store';
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  drawer = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const { t } = useGovernance();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${drawer ? 'drawer' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const box = ref.current.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descId}>{description}</p>}
        </div>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={t('Close dialog', 'Fermer la boîte de dialogue')}
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </div>
      <div className="modal-body">{open ? children : null}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </dialog>
  );
}
