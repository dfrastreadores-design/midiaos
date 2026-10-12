import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPropostaPublicaOnline } from "@/lib/propostas-online.functions";
import { PortalPropostaOnlineView } from "@/components/proposta/PortalPropostaOnlineView";

export const Route = createFileRoute("/p/$token")({
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
    return {
      meta: [
        { title },
        { name: "description", content: `Planejamento de mídia para ${p.campanha}.` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md space-y-3">
        <h2 className="text-xl font-bold text-white">Proposta Não Encontrada</h2>
        <p className="text-xs text-slate-400">
          O link de apresentação é inválido ou expirou.
        </p>
      </div>
    </div>
  ),
  component: CurtinhoPropostaPage,
});

function CurtinhoPropostaPage() {
  const { proposta } = Route.useLoaderData();
  return <PortalPropostaOnlineView proposta={proposta} />;
}
