"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cloudinaryWithoutBackground } from "@/lib/cloudinary-url";

interface CutoutImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 4;

/**
 * Foto de producto SIN FONDO.
 * Si la imagen es de Cloudinary pide la versión recortada. La primera vez
 * Cloudinary tarda unos segundos en procesarla (responde 423): mientras tanto
 * se muestra la original y se reintenta en segundo plano hasta que esté lista.
 */
export function CutoutImage({ src, alt, sizes, priority = false, className = "" }: CutoutImageProps) {
  const cutout = cloudinaryWithoutBackground(src);
  const [failed, setFailed] = useState(false);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!failed || !cutout || retries >= MAX_RETRIES) return;
    const timer = setTimeout(() => {
      const probe = new window.Image();
      probe.onload = () => setFailed(false);
      probe.onerror = () => setRetries((n) => n + 1);
      probe.src = cutout;
    }, RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [failed, cutout, retries]);

  const showCutout = Boolean(cutout) && !failed;
  const url = showCutout && cutout ? cutout : src;

  return (
    <Image
      // La key fuerza a recrear el <img> al cambiar de versión
      key={url}
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-contain ${showCutout ? "drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]" : ""} ${className}`}
      // Las URLs las escribe el admin y pueden venir de cualquier dominio:
      // se muestran tal cual para no tener que listar cada host en next.config.ts.
      unoptimized={/^https?:\/\//.test(url)}
      onError={showCutout ? () => setFailed(true) : undefined}
    />
  );
}
