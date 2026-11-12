"use client";

import { useState, useTransition } from "react";

import { deletePackage } from "@/app/admin/actions";
import { Modal } from "@/components/admin/Modal";
import { Spinner } from "@/components/ui/fields";
import type { PackageWithItemsRow } from "@/types/database";

interface DeletePackageDialogProps {
  pkg: PackageWithItemsRow;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeletePackageDialog({ pkg, onClose, onDeleted }: DeletePackageDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePackage(pkg.id);
      if (result.status === "success") onDeleted(result.message ?? "Paquete eliminado.");
      else setError(result.message ?? "No se pudo eliminar.");
    });
  }

  return (
    <Modal title="Eliminar paquete" size="sm" onClose={onClose}>
      <div className="space-y-5 p-6">
        <p className="text-sm leading-relaxed text-zinc-400">
          Vas a eliminar el paquete <strong className="text-white">{pkg.name}</strong>. Los productos que contiene no se
          borran, solo el paquete. No se puede deshacer.
          {pkg.is_active && (
            <span className="mt-2 block text-zinc-500">
              Si solo quieres ocultarlo temporalmente, edítalo y desmarca “Visible en la tienda”.
            </span>
          )}
        </p>
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {pending && <Spinner />}
            {pending ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
