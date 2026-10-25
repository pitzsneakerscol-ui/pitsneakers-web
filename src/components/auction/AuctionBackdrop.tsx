import { ICONS, LAYOUT, TILE, tileSvg } from "@/components/auction/pits-pattern";

/**
 * Fondo animado de la subasta: un papel tapiz de dibujos de línea de Pitsneakers (tenis, martillo, candado, sello…)
 * que se desliza en diagonal sin parar, y de vez en cuando algunos dibujos se iluminan de color. Detrás, una luz que respira y brasas que suben.
 * Solo CSS: sin JavaScript en el navegador.
 */
const COLS = 8;
const ROWS = 5;
// Un solo tono cálido (cobre y dorado suave): más elegante que colores neón distintos.
const GLOW = ["#e9c9a0", "#d9b58a", "#f3dcc0"];

const EMBERS = Array.from({ length: 5 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 3),
  dur: 10 + ((i * 7) % 10),
  delay: -((i * 13) % 14),
  drift: ((i * 29) % 30) - 15,
}));

const lit = LAYOUT.filter((p) => p.kind === "icon" && p.lit);
const base = `url("data:image/svg+xml,${encodeURIComponent(tileSvg())}")`;

export default function AuctionBackdrop() {
  let n = 0;
  return (
    <div className="ax-root pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0b]" aria-hidden="true">
      <div className="ax-aurora ax-a1" />
      <div className="ax-aurora ax-a2" />
      <div className="ax-aurora ax-a3" />
      <div className="ax-sheet">
        <div className="ax-doodles" style={{ backgroundImage: base, backgroundSize: `${TILE}px ${TILE}px` }} />
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) =>
            lit.map((p) => {
              const i = n++;
              return (
                <svg
                  key={`${r}-${c}-${p.x}-${p.y}`}
                  className="ax-lit"
                  viewBox="0 0 48 48"
                  width={p.size}
                  height={p.size}
                  style={{
                    left: c * TILE + p.x - p.size / 2,
                    top: r * TILE + p.y - p.size / 2,
                    transform: `rotate(${p.rot}deg)`,
                    color: GLOW[i % GLOW.length],
                    animationDuration: `${13 + (i % 5)}s`,
                    animationDelay: `${-((i * 137) % 90) / 10}s`,
                  }}
                  dangerouslySetInnerHTML={{ __html: ICONS[p.name] }}
                />
              );
            })
          )
        )}
      </div>
      {EMBERS.map((e, i) => (
        <i key={i} className="ax-ember" style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s`, ["--dx" as string]: `${e.drift}vw` }} />
      ))}
      <div className="ax-vignette" />
    </div>
  );
}
