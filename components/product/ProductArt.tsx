import Image from "next/image";

import type { Product } from "@/types/product";

interface ProductArtProps {
  product: Product;
  /** Sufijo único para los IDs de degradados (el mismo producto puede aparecer 2 veces). */
  uid: string;
  priority?: boolean;
}

/** Ajusta el tamaño de fuente según la longitud del texto. */
const fitSize = (text: string, width: number, max: number) => Math.min(max, width / (text.length * 0.7));

/**
 * Imagen del producto: usa la foto real si existe (`product.image`);
 * si no, dibuja el envase (frasco o bolsa) en SVG con los colores del producto.
 */
export function ProductArt({ product, uid, priority = false }: ProductArtProps) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={`${product.name} sabor ${product.flavor}`}
        fill
        sizes="(min-width: 1024px) 260px, 220px"
        className="object-contain"
        priority={priority}
        // Las URLs las escribe el admin y pueden venir de cualquier dominio:
        // se muestran tal cual para no tener que listar cada host en next.config.ts.
        unoptimized={/^https?:\/\//.test(product.image)}
      />
    );
  }
  return product.packaging.shape === "jar" ? (
    <JarArt product={product} uid={uid} />
  ) : (
    <PouchArt product={product} uid={uid} />
  );
}

function JarArt({ product, uid }: ProductArtProps) {
  const { title, subtitle, tag } = product.packaging;
  const { from, to } = product.accent;
  const fs = fitSize(title, 98, 22);

  return (
    <svg viewBox="0 0 200 240" className="h-full w-full font-display" role="img" aria-label={`Envase de ${product.name}`}>
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#262630" />
          <stop offset=".5" stopColor="#121218" />
          <stop offset="1" stopColor="#08080b" />
        </linearGradient>
        <linearGradient id={`lid-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#30303a" />
          <stop offset=".5" stopColor="#17171d" />
          <stop offset="1" stopColor="#0b0b0f" />
        </linearGradient>
        <linearGradient id={`label-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="224" rx="64" ry="8" fill={from} opacity=".22" />
      {/* Tapa */}
      <rect x="56" y="22" width="88" height="36" rx="8" fill={`url(#lid-${uid})`} stroke="#fff" strokeOpacity=".08" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={64 + i * 8} y1="27" x2={64 + i * 8} y2="53" stroke="#fff" strokeOpacity=".06" />
      ))}
      {/* Cuerpo y etiqueta */}
      <rect x="44" y="54" width="112" height="166" rx="24" fill={`url(#body-${uid})`} />
      <rect x="44" y="92" width="112" height="94" fill={`url(#label-${uid})`} />
      <g textAnchor="middle" fontWeight="700" fill="#0a0a0c">
        <text x="100" y="108" fontSize="6.5" letterSpacing="2.4" fillOpacity=".7">IQONIC THRIVE</text>
        <text x="100" y={136 + (22 - fs) / 3} fontSize={fs} fontWeight="800">{title}</text>
        <text x="100" y="152" fontSize="7.5" letterSpacing="1.6" fillOpacity=".75">{subtitle}</text>
      </g>
      <rect x="66" y="162" width="68" height="14" rx="7" fill="#0a0a0c" fillOpacity=".88" />
      <text x="100" y="171.6" textAnchor="middle" fontSize="6.5" fontWeight="700" letterSpacing="1.2" fill={from}>{tag}</text>
      {/* Brillo */}
      <rect x="53" y="62" width="9" height="150" rx="4.5" fill="#fff" fillOpacity=".07" />
      <rect x="44.5" y="54.5" width="111" height="165" rx="23.5" fill="none" stroke={from} strokeOpacity=".28" />
    </svg>
  );
}

function PouchArt({ product, uid }: ProductArtProps) {
  const { title, subtitle, tag } = product.packaging;
  const { from } = product.accent;
  const fsTitle = fitSize(title, 104, 28);
  const subIsBig = subtitle.length <= 8;
  const fsSub = subIsBig ? fitSize(subtitle, 104, 28) : 6.8;
  const titleY = 84 + fsTitle * 0.35;
  const subY = subIsBig ? titleY + 8 + fsSub * 0.85 : 112;
  const pouchPath = "M46 40 H154 L160 198 Q160 216 142 216 H58 Q40 216 40 198 Z";

  return (
    <svg viewBox="0 0 200 240" className="h-full w-full font-display" role="img" aria-label={`Envase de ${product.name}`}>
      <defs>
        <linearGradient id={`pbody-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#25252f" />
          <stop offset=".5" stopColor="#121218" />
          <stop offset="1" stopColor="#08080b" />
        </linearGradient>
        <linearGradient id={`pacc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={product.accent.from} />
          <stop offset="1" stopColor={product.accent.to} />
        </linearGradient>
        <clipPath id={`pclip-${uid}`}>
          <path d={pouchPath} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="224" rx="66" ry="8" fill={from} opacity=".22" />
      {/* Sello superior */}
      <rect x="46" y="24" width="108" height="18" rx="3" fill="#1b1b23" stroke="#fff" strokeOpacity=".07" />
      <path d="M52 30h96M52 35h96" stroke="#fff" strokeOpacity=".06" />
      <circle cx="100" cy="32" r="3" fill="#07070a" />
      {/* Bolsa */}
      <path d={pouchPath} fill={`url(#pbody-${uid})`} />
      <g clipPath={`url(#pclip-${uid})`}>
        <path d="M30 162 L170 120 L170 230 L30 230 Z" fill={`url(#pacc-${uid})`} />
        <path d="M30 154 L170 112" stroke={from} strokeWidth="1.5" strokeOpacity=".7" />
        <rect x="49" y="46" width="8" height="160" rx="4" fill="#fff" fillOpacity=".06" />
      </g>
      <g textAnchor="middle" fontWeight="800">
        <text x="100" y="66" fontSize="6.5" fontWeight="700" letterSpacing="2.4" fill="#fff" fillOpacity=".55">IQONIC THRIVE</text>
        <text x="100" y={titleY} fontSize={fsTitle} fill="#fff">{title}</text>
        <text x="100" y={subY} fontSize={fsSub} letterSpacing={subIsBig ? 0 : 1.4} fill={from}>{subtitle}</text>
      </g>
      <rect x="58" y="180" width="84" height="15" rx="7.5" fill="#0a0a0c" fillOpacity=".85" />
      <text x="100" y="190.2" textAnchor="middle" fontSize="6.5" fontWeight="700" letterSpacing="1.2" fill={from}>{tag}</text>
      <path d={pouchPath} fill="none" stroke={from} strokeOpacity=".28" />
      {/* Stick pack individual */}
      <g transform="rotate(14 160 170)">
        <rect x="148" y="118" width="26" height="100" rx="4" fill={`url(#pacc-${uid})`} stroke="#0a0a0c" strokeOpacity=".35" />
        <rect x="148" y="118" width="26" height="9" rx="3" fill="#0a0a0c" fillOpacity=".25" />
        <rect x="148" y="209" width="26" height="9" rx="3" fill="#0a0a0c" fillOpacity=".25" />
        <rect x="155" y="138" width="12" height="56" rx="6" fill="#0a0a0c" fillOpacity=".8" />
        <rect x="151" y="130" width="3" height="76" rx="1.5" fill="#fff" fillOpacity=".25" />
      </g>
    </svg>
  );
}
