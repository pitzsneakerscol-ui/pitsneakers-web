const ITEMS = [
  "COMUNIDAD MÁS GRANDE DE LATINOAMÉRICA",
  "VERIFICADORES CERTIFICADOS",
  "CULTURA",
  "MÁS DE 1.000 PUBLICACIONES SEMANALES",
];

function TickerContent() {
  return (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item, i) => (
        <span key={i} className="flex items-center gap-3 px-4">
          {item}
          <span aria-hidden="true">✦</span>
        </span>
      ))}
    </div>
  );
}

export default function TopTicker() {
  return (
    <div className="overflow-hidden bg-accent text-white">
      <div className="flex w-max animate-marquee whitespace-nowrap py-2 text-xs font-semibold uppercase tracking-widest">
        <TickerContent />
        <TickerContent />
      </div>
    </div>
  );
}
