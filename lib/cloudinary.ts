import "server-only";

import { createHash } from "node:crypto";

/**
 * Subida firmada a Cloudinary.
 * El navegador sube el archivo directo a Cloudinary (no pasa por nuestro
 * servidor), pero solo con una firma que generamos aquí con el API secret.
 * Así el secret nunca llega al cliente y nadie sin sesión de admin puede subir.
 */

/** Carpeta de Cloudinary donde quedan las fotos de productos. */
export const CLOUDINARY_PRODUCTS_FOLDER = "iqonic/products";

export type CloudinaryUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return getCloudinaryEnv() !== null;
}

/**
 * Firma según https://cloudinary.com/documentation/authentication_signatures:
 * parámetros ordenados alfabéticamente, unidos con "&", + secret → SHA-1.
 */
export function createUploadSignature(): CloudinaryUploadSignature | null {
  const env = getCloudinaryEnv();
  if (!env) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = { folder: CLOUDINARY_PRODUCTS_FOLDER, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + env.apiSecret).digest("hex");

  return { cloudName: env.cloudName, apiKey: env.apiKey, timestamp, folder: CLOUDINARY_PRODUCTS_FOLDER, signature };
}
