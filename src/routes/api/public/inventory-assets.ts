import { createFileRoute } from "@tanstack/react-router";
import { listPublicInventoryAssets } from "@/lib/public-inventory.functions";

export const Route = createFileRoute("/api/public/inventory-assets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const busca = url.searchParams.get("busca") || undefined;
          const cidade = url.searchParams.get("cidade") || undefined;
          const tipo_midia = url.searchParams.get("tipo_midia") || undefined;
          const status = url.searchParams.get("status") || undefined;

          const assets = await listPublicInventoryAssets({
            data: { busca, cidade, tipo_midia, status },
          });

          return new Response(
            JSON.stringify({
              success: true,
              total: assets.length,
              data: assets,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err?.message || "Erro ao consultar inventário público.",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
