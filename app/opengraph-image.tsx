import { ImageResponse } from "next/og";

import { BRAND, BrandMark } from "@/components/brand/BrandMark";
import { siteConfig } from "@/config/site";

// Imagen que aparece al compartir la web en WhatsApp, Facebook, X, etc.
export const alt = `${siteConfig.name} · Energía, Rendimiento y Bienestar`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          backgroundColor: BRAND.ink,
          backgroundImage: `radial-gradient(circle at 50% 35%, ${BRAND.violet}55, transparent 60%)`,
          color: "white",
        }}
      >
        <BrandMark size={160} />
        <div style={{ display: "flex", fontSize: 80, fontWeight: 800, letterSpacing: 10 }}>
          <span>IQONIC</span>
          <span style={{ color: BRAND.orange, marginLeft: 28 }}>WELLNESS</span>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#a1a1aa" }}>Energía · Rendimiento · Bienestar</div>
      </div>
    ),
    size,
  );
}
