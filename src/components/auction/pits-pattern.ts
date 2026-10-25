// Dibujos de línea "hechos a mano" sobre el mundo de Pitsneakers (tenis, subasta, autenticidad) y su distribución en un mosaico que se repite sin cortes.
// Cada dibujo vive en una caja de 48×48; el color y el grosor los pone quien lo usa.

export const TILE = 480;

export const ICONS: Record<string, string> = {
  tenis: '<path d="M5 35V29c0-2 1-3 3-3l7-1c4-2 6-7 9-12h6c1 4 3 8 7 11 4 2 8 3 8 7v4z"/><path d="M5 38.5h40M5 35h40"/><path d="M23 17l4 2M25 21l4 2M27 25l4 1.5"/>',
  tenisAlto: '<path d="M9 40V14c0-3 2-4 4-4h9l2 12c3 3 9 5 16 7 3 1 4 3 4 6v5z"/><path d="M9 43.5h35M9 40h35M11 18h11"/><path d="M15 25h6M16 30h7"/>',
  caja: '<path d="M6 19h36v21H6zM4 14h40v5H4z"/><path d="M12 27h12M12 32h8"/><path d="M32 27l4 4-4 4"/>',
  martillo: '<g transform="rotate(-40 24 24)"><rect x="9" y="8" width="30" height="11" rx="2"/><path d="M24 19v24M20 43h8"/><path d="M15 8v11M33 8v11"/></g>',
  candado: '<rect x="11" y="22" width="26" height="19" rx="3"/><path d="M16 22v-6c0-5 3-8 8-8s8 3 8 8v6"/><circle cx="24" cy="30.5" r="2.5"/><path d="M24 33v4"/>',
  etiqueta: '<path d="M7 24L24 7h17v17L24 41z"/><circle cx="34" cy="14" r="2.5"/><path d="M19 28l7-7M18 22l8 8"/>',
  corona: '<path d="M6 36l3-22 9 10 6-14 6 14 9-10 3 22z"/><path d="M6 41h36"/><circle cx="9" cy="12" r="1.5"/><circle cx="24" cy="8" r="1.5"/><circle cx="39" cy="12" r="1.5"/>',
  destello: '<path d="M24 5c1 10 8 18 19 19-11 1-18 9-19 19-1-10-8-18-19-19 11-1 18-9 19-19z"/>',
  bandera: '<path d="M10 5v39"/><path d="M10 8h30v20H10zM20 8v20M30 8v20M10 15h30M10 22h30"/><path d="M10 8h10v7H10zM30 8h10v7H30zM20 15h10v7H20zM10 22h10v6H10zM30 22h10v6H30z" fill="currentColor"/>',
  lupa: '<circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M14 20l5 5 8-9"/>',
  escudo: '<path d="M24 5l16 6v12c0 9-7 17-16 21-9-4-16-12-16-21V11z"/><path d="M16 24l6 6 10-12"/>',
  reloj: '<circle cx="24" cy="25" r="16"/><path d="M24 14v11l7 4M19 6h10"/>',
  ojo: '<path d="M4 24c8-12 32-12 40 0-8 12-32 12-40 0z"/><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="1.5"/>',
};

export const ICON_NAMES = Object.keys(ICONS);

const FILLERS = [
  '<circle r="1.1" fill="currentColor"/>',
  '<circle r="1.1" fill="currentColor"/>',
  '<path d="M0 -3.5c.3 2.2 1.3 3.2 3.5 3.5-2.2.3-3.2 1.3-3.5 3.5-.3-2.2-1.3-3.2-3.5-3.5 2.2-.3 3.2-1.3 3.5-3.5z"/>',
];

export interface Placed {
  kind: "icon" | "filler";
  name: string;
  x: number;
  y: number;
  rot: number;
  size: number;
  /** Candidato a encenderse (brillar de color). */
  lit: boolean;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(): Placed[] {
  const rand = rng(20261025);
  const cells = 4;
  const cell = TILE / cells;
  // Orden de los dibujos: se baraja y se recorre en ciclo para que no se repitan seguidos.
  const bag = [...ICON_NAMES].sort(() => rand() - 0.5);
  const out: Placed[] = [];
  let n = 0;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const name = bag[n++ % bag.length];
      out.push({
        kind: "icon",
        name,
        x: c * cell + cell / 2 + (rand() - 0.5) * 12,
        y: r * cell + cell / 2 + (rand() - 0.5) * 12,
        rot: Math.round((rand() - 0.5) * 24),
        size: Math.round(30 + rand() * 8),
        lit: n % 5 === 2,
      });
      // marquitas en las esquinas de la celda (cruces, puntos, destellos)
      if (rand() < 0.8 && c < cells - 1 && r < cells - 1) {
        out.push({ kind: "filler", name: String(Math.floor(rand() * FILLERS.length)), x: (c + 1) * cell + (rand() - 0.5) * 14, y: (r + 1) * cell + (rand() - 0.5) * 14, rot: 0, size: 1, lit: false });
      }
    }
  }
  return out;
}

export const LAYOUT: Placed[] = build();

/** Mosaico en SVG (para usarlo como fondo que se repite). */
export function tileSvg(stroke = "#ffffff"): string {
  const parts = LAYOUT.map((p) =>
    p.kind === "icon"
      ? `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot}) scale(${(p.size / 48).toFixed(3)}) translate(-24 -24)">${ICONS[p.name]}</g>`
      : `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">${FILLERS[Number(p.name)]}</g>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" fill="none" stroke="${stroke}" color="${stroke}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><style>*{vector-effect:non-scaling-stroke}</style>${parts}</svg>`;
}
