"use client";

import { useState } from "react";
import { btnGhost } from "@/components/reseller/ui";

/** Muestra un enlace y lo copia con un toque. */
export default function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles: el enlace queda visible para copiarlo a mano */
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <code className="min-w-0 break-all rounded-lg border border-line bg-paper px-3 py-2 text-sm">{value}</code>
      <button type="button" onClick={copy} className={btnGhost}>
        {copied ? "Copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
