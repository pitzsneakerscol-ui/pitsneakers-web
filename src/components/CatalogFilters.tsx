"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRICE_RANGES = [
  { value: "", label: "Todos los precios" },
  { value: "0-500000", label: "Menos de $500.000" },
  { value: "500000-1000000", label: "$500.000 – $1.000.000" },
  { value: "1000000-999999999", label: "Más de $1.000.000" },
];

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-3.5 w-3.5 shrink-0 text-muted"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterField({
  label,
  value,
  onChange,
  ariaLabel,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className="w-full appearance-none bg-transparent text-sm font-medium text-ink focus:outline-none"
        >
          {children}
        </select>
        <ChevronIcon />
      </div>
    </label>
  );
}

export default function CatalogFilters({
  brands,
  sizes,
  showCondition = true,
}: {
  brands: string[];
  sizes: string[];
  showCondition?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const brand = searchParams.get("marca") ?? "";
  const size = searchParams.get("talla") ?? "";
  const price = searchParams.get("precio") ?? "";
  const condition = searchParams.get("estado") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  const hasFilters = brand || size || price || condition;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-paper-raised">
      <div
        className={`grid grid-cols-2 divide-y divide-line sm:divide-y-0 sm:divide-x ${
          showCondition ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <FilterField
          label="Marca"
          value={brand}
          onChange={(v) => updateParam("marca", v)}
          ariaLabel="Filtrar por marca"
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </FilterField>

        <FilterField
          label="Talla"
          value={size}
          onChange={(v) => updateParam("talla", v)}
          ariaLabel="Filtrar por talla"
        >
          <option value="">Todas las tallas</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              Talla {s}
            </option>
          ))}
        </FilterField>

        <FilterField
          label="Precio"
          value={price}
          onChange={(v) => updateParam("precio", v)}
          ariaLabel="Filtrar por precio"
        >
          {PRICE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </FilterField>

        {showCondition && (
          <FilterField
            label="Estado"
            value={condition}
            onChange={(v) => updateParam("estado", v)}
            ariaLabel="Filtrar por estado"
          >
            <option value="">Nuevo y usado</option>
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </FilterField>
        )}
      </div>

      {hasFilters && (
        <div className="flex justify-end border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-xs font-medium uppercase tracking-wide text-muted underline underline-offset-4 hover:text-ink"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
