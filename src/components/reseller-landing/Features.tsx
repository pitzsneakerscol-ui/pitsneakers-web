import Reveal from "@/components/Reveal";

const FEATURES = [
  {
    icon: "🧾",
    title: "Costo, talla y precio",
    text: "Registra cuánto pagaste por cada par, su talla y cuánto esperas cobrar. La utilidad y el margen se calculan solos.",
    color: "#ff5a3c",
  },
  {
    icon: "📈",
    title: "Ventas y ganancia real",
    text: "Marca un par como vendido con su precio, canal y gastos. Mira tu ganancia por mes y por par.",
    color: "#3ddc84",
  },
  {
    icon: "🔔",
    title: "Alertas de stock estancado",
    text: "Detecta los pares que llevan más de 60 días sin moverse y los que vas a vender por debajo de su costo.",
    color: "#ffd23f",
  },
  {
    icon: "🔗",
    title: "Anclado al catálogo",
    text: "Busca el par en el catálogo de Pitsneakers y trae marca, foto y precio de referencia para fijar un buen precio.",
    color: "#4cc9f0",
  },
  {
    icon: "💬",
    title: "Lista lista para WhatsApp",
    text: "Copia en un clic tu lista de pares disponibles con talla y precio para tus estados y grupos.",
    color: "#25d366",
  },
  {
    icon: "📥",
    title: "Importa y exporta",
    text: "Sube tu inventario desde Excel (CSV) y descarga un respaldo cuando quieras. Tus datos son tuyos.",
    color: "#ff6b9d",
  },
];

export default function Features() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => (
        <li key={f.title}>
          <Reveal delay={(i % 3) * 90} className="h-full">
            <div className="rl-card group relative h-full overflow-hidden rounded-xl border border-line bg-paper-raised p-6" style={{ ["--c" as string]: f.color }}>
              <span
                aria-hidden="true"
                className="rl-icon flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ background: `${f.color}26` }}
              >
                {f.icon}
              </span>
              <h3 className="mt-4 font-display text-2xl tracking-wide">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
