/**
 * Marca de IQONIC WELLNESS para imágenes generadas con `next/og`
 * (apple-icon, opengraph-image). Solo estilos en línea: Satori no usa Tailwind.
 * Debe coincidir con app/icon.svg y components/ui/Logo.tsx.
 */
export const BRAND = {
  orange: "#ff8a1f",
  mid: "#e2622b",
  violet: "#9d5cff",
  ink: "#07070a",
};

export function BrandMark({ size, radius = size / 4 }: { size: number; radius?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.mid}, ${BRAND.violet})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d="M32 14v36" stroke={BRAND.ink} strokeWidth={6.5} strokeLinecap="round" />
        <path d="M16 34l16-16 16 16" stroke={BRAND.ink} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
