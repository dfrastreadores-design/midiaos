// Component: EspelhoPiModal.tsx
// Visualização Profissional do Espelho de PI OOH pronto para Impressão & Exportação

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  Building,
  User,
  Calendar,
  Layers,
  Loader2,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { getEspelhoPi } from "@/lib/pi-emissao.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piId: string | null;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function EspelhoPiModal({ open, onOpenChange, piId }: Props) {
  const espelhoFn = useServerFn(getEspelhoPi);

  const { data: espelho, isLoading } = useQuery({
    queryKey: ["espelho-pi", piId],
    queryFn: () => espelhoFn({ data: { pi_id: piId! } }),
    enabled: !!piId && open,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!espelho) return;
    const msg = [
      `📄 *PEDIDO DE INSERÇÃO (PI) — ${espelho.numero_pi}*`,
      `🏢 *${espelho.titulo_documento}*`,
      `🎯 *Campanha:* ${espelho.campanha}`,
      `👤 *Destinatário:* ${espelho.destinatario.nome}`,
      `💰 *Valor Líquido:* ${fmtBRL(espelho.financeiro.valor_liquido)}`,
      `📅 *Emissão:* ${new Date(espelho.data_emissao).toLocaleDateString("pt-BR")}`,
      `\nDocumento emitido via Mídia.OS (midiaos.online)`,
    ].join("\n");
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-y-auto rounded-2xl p-0 print:p-0 print:max-w-full">
        {/* Barra superior de ações */}
        <div className="p-4 border-b bg-muted/40 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <span className="font-bold text-sm text-foreground">
              Espelho Oficial de Pedido de Inserção (PI)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={!espelho}
              className="gap-1.5 font-medium text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Share2 className="size-4" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 font-medium">
              <Printer className="size-4" /> Imprimir / Salvar PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Carregando espelho do PI…</p>
          </div>
        ) : !espelho ? (
          <div className="p-12 text-center text-muted-foreground">
            Não foi possível carregar os dados deste Pedido de Inserção.
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6 text-foreground bg-white" id="espelho-pi-printable">
            {/* CABEÇALHO DO ESPELHO */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <Badge variant="outline" className="border-slate-800 text-slate-800 font-bold mb-1">
                    {espelho.tipo_pi === "PARCEIRO" ? "PI DE PARCEIRO / VEICULAÇÃO" : "PI DE CLIENTE / FATURAMENTO"}
                  </Badge>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {espelho.titulo_documento}
                  </h1>
                  <div className="text-sm text-slate-600 mt-1">
                    Campanha: <span className="font-bold text-slate-900">{espelho.campanha}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-mono font-black text-indigo-700">{espelho.numero}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Emissão: {new Date(espelho.data_emissao).toLocaleDateString("pt-BR")}
                  </div>
                  <Badge className="bg-emerald-600 text-white font-semibold mt-1">
                    <CheckCircle2 className="size-3 mr-1" /> PI Emitido — Veiculação Autorizada
                  </Badge>
                </div>
              </div>
            </div>

            {/* PARTES: EMISSOR & DESTINATÁRIO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* EMISSOR */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-1 bg-slate-50/60">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Building className="size-3.5 text-slate-600" /> Emissor (Tenant / Empresa)
                </div>
                <div className="font-bold text-sm text-slate-900">{espelho.emissor.nome}</div>
                <div className="text-slate-600">CNPJ: <span className="font-mono">{espelho.emissor.cnpj}</span></div>
                <div className="text-slate-600">{espelho.emissor.endereco} · {espelho.emissor.cidade}/{espelho.emissor.uf}</div>
                <div className="text-slate-500">{espelho.emissor.email}</div>
              </div>

              {/* DESTINATÁRIO */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-1 bg-slate-50/60">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <User className="size-3.5 text-slate-600" /> Destinatário ({espelho.destinatario.tipo})
                </div>
                <div className="font-bold text-sm text-slate-900">{espelho.destinatario.nome}</div>
                <div className="text-slate-600">CNPJ: <span className="font-mono">{espelho.destinatario.cnpj}</span></div>
                {espelho.destinatario.endereco && (
                  <div className="text-slate-600">{espelho.destinatario.endereco}</div>
                )}
                {espelho.destinatario.chave_pix && (
                  <div className="text-emerald-700 font-semibold font-mono">Chave PIX: {espelho.destinatario.chave_pix}</div>
                )}
              </div>
            </div>

            {/* TABELA DE PONTOS / FACES OOH */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="size-3.5 text-slate-600" /> Pontos / Faces de Mídia Vinculados
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Código / Ponto</th>
                      <th className="p-2.5">Formato / Mídia</th>
                      <th className="p-2.5">Endereço / Praça</th>
                      <th className="p-2.5">Período</th>
                      <th className="p-2.5 text-right">Valor Negociado</th>
                      <th className="p-2.5 text-right">Abatimentos</th>
                      <th className="p-2.5 text-right">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {espelho.itens.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium">
                          <span className="font-mono font-bold text-indigo-700">{it.ativo_codigo}</span>
                          <div className="text-[11px] text-slate-600">{it.nome_ponto}</div>
                        </td>
                        <td className="p-2.5">
                          {it.tipo_midia}
                          <div className="text-[11px] text-slate-500">{it.formato}</div>
                        </td>
                        <td className="p-2.5 max-w-[200px] truncate" title={it.endereco}>
                          {it.endereco}
                          {it.cidade && <div className="text-[10px] text-slate-500">{it.cidade}/{it.uf}</div>}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600">{it.periodo}</td>
                        <td className="p-2.5 text-right font-medium">{fmtBRL(it.valor_unitario_negociado)}</td>
                        <td className="p-2.5 text-right text-rose-700">{it.valor_abatimentos > 0 ? `- ${fmtBRL(it.valor_abatimentos)}` : "—"}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{fmtBRL(it.valor_liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QUADRO DE FECHAMENTO FINANCEIRO */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Valor Bruto Total</span>
                <div className="text-base font-bold text-slate-900">{fmtBRL(espelho.financeiro.valor_bruto)}</div>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Comissão Agência / BV</span>
                <div className="text-sm font-semibold text-slate-700">
                  {espelho.financeiro.percentual_comissao_agencia}%
                </div>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Abatimentos / Retenções</span>
                <div className="text-sm font-semibold text-rose-700">
                  - {fmtBRL(espelho.financeiro.valor_abatimentos)}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-700 uppercase text-[10px] font-black tracking-wider">
                  {espelho.tipo_pi === "PARCEIRO" ? "Valor Líquido a Repassar" : "Valor Líquido Faturado"}
                </span>
                <div className="text-lg font-black text-emerald-700">{fmtBRL(espelho.financeiro.valor_liquido)}</div>
              </div>
            </div>

            {/* OBSERVAÇÕES & TERMOS DE AUTORIZAÇÃO */}
            {espelho.observacao && (
              <div className="text-xs text-slate-600 p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-bold text-slate-800">Observações:</span> {espelho.observacao}
              </div>
            )}

            {/* ASSINATURAS FORMALIZADAS */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-700 border-t border-slate-200">
              <div className="space-y-1">
                <div className="border-t border-slate-400 w-48 mx-auto" />
                <div className="font-bold">{espelho.emissor.nome}</div>
                <div className="text-[10px] text-slate-500">Emissor Autorizado</div>
              </div>

              <div className="space-y-1">
                <div className="border-t border-slate-400 w-48 mx-auto" />
                <div className="font-bold">{espelho.destinatario.nome}</div>
                <div className="text-[10px] text-slate-500">De Acordo / Assinatura do {espelho.destinatario.tipo}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
