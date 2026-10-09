import { useLayoutEffect, useRef, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalHistory } from './navigation';

let openDialogs = 0;
let originalOverflow = '';

export default function Modal({ title, subtitle, onClose, children, footer, canClose = true }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; canClose?: boolean }) {
  useModalHistory(onClose, canClose);
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const allowedRef = useRef(canClose);
  allowedRef.current = canClose;
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (openDialogs === 0) originalOverflow = document.body.style.overflow;
    openDialogs += 1;
    document.body.style.overflow = 'hidden';
    const element = dialog.current;
    element?.focus();
    const handleKey = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role=dialog]');
      if (dialogs[dialogs.length - 1] !== element) return;
      if (event.key === 'Escape') { event.preventDefault(); if (allowedRef.current) closeRef.current(); }
      if (event.key !== 'Tab' || !element) return;
      const focusable = element.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { openDialogs -= 1; if (openDialogs === 0) document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (canClose && event.target === event.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} tabIndex={-1}>
      <div className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" disabled={!canClose} aria-label="Pencereyi kapat" onClick={onClose}><X /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}
