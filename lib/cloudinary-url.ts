/**
 * URLs de Cloudinary con transformaciones (se usa en servidor y en cliente).
 *
 * https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v123/iqonic/products/foto.jpg
 *   → https://res.cloudinary.com/<cloud>/image/upload/e_background_removal/c_limit,w_800/f_auto,q_auto/v123/iqonic/products/foto.jpg
 *
 * e_background_removal: Cloudinary recorta el producto con IA y deja el fondo
 * transparente. Se calcula la primera vez que alguien pide la URL (tarda unos
 * segundos y mientras tanto responde 423) y luego queda en su CDN.
 */
const CLOUDINARY_UPLOAD_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*?(v\d+\/.+)$/;

/** Versión sin fondo de una imagen de Cloudinary; null si la URL no es de Cloudinary. */
export function cloudinaryWithoutBackground(url: string, maxWidth = 800): string | null {
  const match = url.match(CLOUDINARY_UPLOAD_RE);
  if (!match) return null;
  const [, base, versionAndId] = match;
  // Extensión .png: si el navegador no acepta WebP/AVIF, f_auto cae a PNG
  // (que mantiene la transparencia) en vez de al JPG original.
  const pngId = versionAndId.replace(/\.[a-z0-9]+$/i, "") + ".png";
  return `${base}e_background_removal/c_limit,w_${maxWidth}/f_auto,q_auto/${pngId}`;
}
