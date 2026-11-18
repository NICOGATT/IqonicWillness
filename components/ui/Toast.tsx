"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastTone = "success" | "error" | "info";
type ToastState = { id: number; tone: ToastTone; message: string } | null;

/** Notificación flotante simple (sin dependencias): `const { toast, show } = useToast()`. */
export function useToast(duration = 4500) {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), duration);
    return () => window.clearTimeout(timer);
  }, [toast, duration]);

  const show = useCallback((tone: ToastTone, message: string) => setToast({ id: Date.now(), tone, message }), []);
  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, dismiss };
}

const toneClasses: Record<ToastTone, string> = {
  success: "border-wa/30 text-wa",
  error: "border-red-500/40 text-red-300",
  info: "border-white/15 text-zinc-200",
};

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    // La región existe siempre para que los lectores de pantalla anuncien los cambios
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6">
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-sm animate-card-in items-start gap-3 rounded-2xl border bg-ink-800/95 px-4 py-3.5 text-sm shadow-2xl shadow-black/50 backdrop-blur ${toneClasses[toast.tone]}`}
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {toast.tone === "success" ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            ) : toast.tone === "error" ? (
              <path d="M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
            ) : (
              <path d="M12 16v-4M12 8h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z" />
            )}
          </svg>
          <p className="flex-1 font-medium leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="-m-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Cerrar aviso"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
