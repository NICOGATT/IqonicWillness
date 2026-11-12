import { cacheLife } from "next/cache";

/**
 * Año actual para el copyright.
 * Con Cache Components, `new Date()` solo puede leerse dentro de un ámbito
 * cacheado ("use cache"); se recalcula como máximo una vez al día.
 */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
