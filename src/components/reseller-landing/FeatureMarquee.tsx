const WORDS = ["Costo", "Talla", "Precio", "Utilidad", "Alertas", "WhatsApp", "Excel", "Ventas", "Margen"];
const COLORS = ["#ff5a3c", "#ffd23f", "#3ddc84", "#4cc9f0", "#ff6b9d", "#ff8a3d"];

function Run() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {WORDS.map((w, i) => (
        <span key={w} className="flex items-center gap-6 px-4 font-display text-2xl uppercase tracking-wider text-white sm:text-4xl">
          {w}
          <span className="text-xl sm:text-3xl" style={{ color: COLORS[i % COLORS.length] }}>
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

/** Cinta ancha de palabras clave que se desplaza sola. */
export default function FeatureMarquee() {
  return (
    <div className="overflow-hidden bg-ink py-4" role="presentation">
      <div className="flex w-max animate-marquee whitespace-nowrap" style={{ animationDuration: "38s" }}>
        <Run />
        <Run />
      </div>
    </div>
  );
}
