import { csvTemplate } from "@/lib/reseller";

export const dynamic = "force-static";

export async function GET() {
  return new Response(csvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-inventario-pitsneakers.csv"',
    },
  });
}
