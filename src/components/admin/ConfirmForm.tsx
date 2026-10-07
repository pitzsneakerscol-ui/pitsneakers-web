"use client";

/** Formulario de un solo botón que pide confirmación antes de ejecutar una acción del servidor. */
export default function ConfirmForm({
  action,
  fields,
  label,
  confirm,
  className = "",
}: {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label: string;
  confirm?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
