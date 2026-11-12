"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";

import { getImageUploadSignature } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/fields";
import { cloudinaryWithoutBackground } from "@/lib/cloudinary-url";

const MAX_BYTES = 10 * 1024 * 1024; // límite del plan gratuito de Cloudinary
const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif";

interface ImageUploadProps {
  /** Se llama con la URL pública (https) que devuelve Cloudinary. */
  onUploaded: (url: string) => void;
}

/**
 * Sube una imagen desde la PC directo a Cloudinary (subida firmada) y
 * devuelve la URL https lista para guardar en `image_url`.
 */
export function ImageUpload({ onUploaded }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("El archivo tiene que ser una imagen.");
    if (file.size > MAX_BYTES) return setError("La imagen pesa más de 10 MB.");

    setUploading(true);
    try {
      const sig = await getImageUploadSignature();
      if (!sig.ok) throw new Error(sig.message);

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sig.data.apiKey);
      body.append("timestamp", String(sig.data.timestamp));
      body.append("folder", sig.data.folder);
      body.append("signature", sig.data.signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.data.cloudName}/image/upload`, { method: "POST", body });
      const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? "Cloudinary rechazó la imagen.");

      // f_auto,q_auto: Cloudinary sirve WebP/AVIF y comprime según el navegador del cliente
      const url = json.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
      // Pide ya la versión sin fondo para que Cloudinary la procese antes de que la vea un cliente
      const cutout = cloudinaryWithoutBackground(url);
      if (cutout) new window.Image().src = cutout;
      onUploaded(url);
    } catch (e) {
      console.error("[admin] subida de imagen:", e);
      if (unstable_isUnrecognizedActionError(e)) {
        // La pestaña tiene una versión anterior de la app (hubo un deploy nuevo)
        setError("Se publicó una versión nueva del panel. Recarga la página (Ctrl+Shift+R) y vuelve a intentarlo.");
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !uploading) void upload(file);
  }

  return (
    <div>
      {/* Sin name: el archivo no viaja con el formulario, solo la URL resultante */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
          dragging ? "border-brand-violet/70 bg-brand-violet/10 text-white" : "border-white/15 text-zinc-300 hover:border-white/30 hover:text-white"
        }`}
      >
        {uploading ? (
          <>
            <Spinner /> Subiendo…
          </>
        ) : (
          "Subir imagen desde la PC (o arrastrarla aquí)"
        )}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
