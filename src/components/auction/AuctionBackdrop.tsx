/** Fondo animado de la subasta: aurora que se mueve, reflectores, bandera a cuadros, letras gigantes y brasas que suben. Solo CSS (sin JavaScript). */
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 4),
  dur: 9 + ((i * 7) % 10),
  delay: -((i * 13) % 14),
  drift: ((i * 29) % 40) - 20,
}));

const WORDS = "SUBASTA EXCLUSIVA · 10 PARES · SOLO CON PASE · ";

export default function AuctionBackdrop() {
  return (
    <div className="ax-root pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080a]" aria-hidden="true">
      <div className="ax-aurora ax-a1" />
      <div className="ax-aurora ax-a2" />
      <div className="ax-aurora ax-a3" />
      <div className="ax-ray ax-r1" />
      <div className="ax-ray ax-r2" />
      <div className="ax-checker" />
      <div className="ax-word ax-w1"><span>{WORDS.repeat(6)}</span></div>
      <div className="ax-word ax-w2"><span>{WORDS.repeat(6)}</span></div>
      {EMBERS.map((e, i) => (
        <i key={i} className="ax-ember" style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s`, ["--dx" as string]: `${e.drift}vw` }} />
      ))}
      <div className="ax-vignette" />
    </div>
  );
}
