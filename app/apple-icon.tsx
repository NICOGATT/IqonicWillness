import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand/BrandMark";

// Ícono al guardar la web en la pantalla de inicio de iPhone/iPad
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS redondea las esquinas solo: el ícono va cuadrado
  return new ImageResponse(<BrandMark size={180} radius={0} />, size);
}
