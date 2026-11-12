"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  size?: "sm" | "lg";
  children: ReactNode;
}

/**
 * Modal basado en <dialog> nativo: atrapa el foco, cierra con Esc
 * y bloquea el fondo sin librerías externas.
 */
export function Modal({ title, description, onClose, size = "lg", children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Clic en el fondo oscuro = cerrar
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={`m-auto max-h-[92vh] w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-ink-900 p-0 text-zinc-300 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm ${
        size === "lg" ? "max-w-5xl" : "max-w-md"
      }`}
    >
      <div className="flex max-h-[92vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-white/[.07] px-6 py-5">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
