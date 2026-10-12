import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPropostaPublicaOnline } from "@/lib/propostas-online.functions";
import { PortalPropostaOnlineView } from "@/components/proposta/PortalPropostaOnlineView";

export const Route = createFileRoute("/proposta-online/$token")({
  loader: async ({ params }) => {
    const proposta = await getPropostaPublicaOnline({ data: { token: params.token } });
    if (!proposta) throw notFound();
    return { proposta };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Proposta Não Encontrada — Mídia.OS" }] };
    }
    const p = loaderData.proposta;
    const title = `Proposta Comercial — ${p.campanha} | ${p.organizacao?.nome || "Mídia.OS"}`;
    const desc = `Confira a proposta interativa de mídia para ${p.cliente?.nome_fantasia || p.cliente?.razao_social || "sua empresa"}. Detalhes dos pontos, fotos e aprovação digital.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        ...(p.organizacao?.logo_url ? [{ property: "og:image", content: p.organizacao.logo_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md space-y-3">
        <h2 className="text-xl font-bold text-white">Proposta Não Encontrada</h2>
        <p className="text-xs text-slate-400">
          O link acessado é inválido ou a proposta foi arquivada. Por favor, solicite um novo link ao representante comercial.
        </p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md space-y-3">
        <h2 className="text-xl font-bold text-white">Instabilidade Temporária</h2>
        <p className="text-xs text-slate-400">
          Não foi possível carregar os detalhes desta proposta no momento. Por favor, tente novamente em instantes.
        </p>
      </div>
    </div>
  ),
  component: PropostaOnlinePage,
});

function PropostaOnlinePage() {
  const { proposta } = Route.useLoaderData();
  return <PortalPropostaOnlineView proposta={proposta} />;
}
