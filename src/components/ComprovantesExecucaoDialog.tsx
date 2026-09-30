import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Image,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Tv,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  listComprovantes,
  salvarComprovante,
  validarComprovante,
  excluirComprovante,
  type ComprovanteExecucao,
} from "@/lib/comprovantes-execucao.functions";
import { listParceiros } from "@/lib/parceiros.functions";

interface Props {
  pi: { id: string; numero: string; campanha: string };
  onClose: () => void;
}

export function ComprovantesExecucaoDialog({ pi, onClose }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listComprovantes);
  const saveFn = useServerFn(salvarComprovante);
  const validarFn = useServerFn(validarComprovante);
  const deleteFn = useServerFn(excluirComprovante);
  const listParceirosFn = useServerFn(listParceiros);

  const [novoOpen, setNovoOpen] = useState(false);
  const [formData, setFormData] = useState<{
    tipo: ComprovanteExecucao["tipo"];
    titulo: string;
    descricao: string;
    parceiro_id: string;
    link_externo: string;
    data_veiculacao: string;
    hora_veiculacao: string;
  }>({
    tipo: "foto",
    titulo: "",
    descricao: "",
    parceiro_id: "",
    link_externo: "",
    data_veiculacao: new Date().toISOString().split("T")[0],
    hora_veiculacao: "",
  });

  const { data: comprovantes = [], isLoading } = useQuery<ComprovanteExecucao[]>({
    queryKey: ["comprovantes-execucao", pi.id],
    queryFn: () => listFn({ data: { piId: pi.id } }),
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-list"],
    queryFn: () => listParceirosFn(),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          pi_id: pi.id,
          tipo: formData.tipo,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          parceiro_id: formData.parceiro_id || null,
          link_externo: formData.link_externo || null,
          data_veiculacao: formData.data_veiculacao || null,
          hora_veiculacao: formData.hora_veiculacao || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comprovantes-execucao", pi.id] });
      toast.success("Comprovante de veiculação registrado!");
      setNovoOpen(false);
      setFormData({
        tipo: "foto",
        titulo: "",
        descricao: "",
        parceiro_id: "",
        link_externo: "",
        data_veiculacao: new Date().toISOString().split("T")[0],
        hora_veiculacao: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const validarMut = useMutation({
    mutationFn: (vars: { id: string; validado: boolean }) =>
      validarFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comprovantes-execucao", pi.id] });
      toast.success("Status de auditoria do comprovante atualizado!");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comprovantes-execucao", pi.id] });
      toast.success("Comprovante removido.");
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-primary" />
            <DialogTitle>Comprovantes de Execução & Checking de Mídia</DialogTitle>
          </div>
          <DialogDescription>
            Evidências fotográficas, gravações, relatórios e métricas de veiculação da campanha {pi.numero}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {comprovantes.length} Evidência(s) Cadastrada(s)
            </span>
            <Button size="sm" onClick={() => setNovoOpen(true)} className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              Adicionar Comprovante
            </Button>
          </div>

          {/* Form Novo Comprovante */}
          {novoOpen && (
            <div className="p-4 rounded-lg border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Novo Registro de Checking</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setNovoOpen(false)}>
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título / Identificação</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ex: Foto Painel LED Noturno / Print Story"
                    value={formData.titulo}
                    onChange={(e) => setFormData((f) => ({ ...f, titulo: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Evidência</Label>
                  <select
                    className="text-xs rounded-md border h-8 px-2 bg-background w-full"
                    value={formData.tipo}
                    onChange={(e) => setFormData((f) => ({ ...f, tipo: e.target.value as any }))}
                  >
                    <option value="foto">Foto / Checking Fotográfico</option>
                    <option value="video">Vídeo / Gravação VT</option>
                    <option value="print">Print de Tela / Web / Social</option>
                    <option value="link">Link Público de Veiculação</option>
                    <option value="relatorio">Relatório de Emissora / Analytics</option>
                    <option value="documento">Documento de Certificação</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Veículo / Parceiro</Label>
                  <select
                    className="text-xs rounded-md border h-8 px-2 bg-background w-full"
                    value={formData.parceiro_id}
                    onChange={(e) => setFormData((f) => ({ ...f, parceiro_id: e.target.value }))}
                  >
                    <option value="">Geral / Sem parceiro específico</option>
                    {parceiros.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nome_fantasia || p.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Link da Evidência / Mídia</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="https://drive.google.com/... ou link do post"
                    value={formData.link_externo}
                    onChange={(e) => setFormData((f) => ({ ...f, link_externo: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Data da Veiculação</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={formData.data_veiculacao}
                    onChange={(e) => setFormData((f) => ({ ...f, data_veiculacao: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Horário da Exibição</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Ex: 20:45"
                    value={formData.hora_veiculacao}
                    onChange={(e) => setFormData((f) => ({ ...f, hora_veiculacao: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observações / Detalhes</Label>
                <Textarea
                  rows={2}
                  className="text-xs"
                  placeholder="Observações técnicas sobre a veiculação..."
                  value={formData.descricao}
                  onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              <Button
                size="sm"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !formData.titulo}
                className="gap-1.5 text-xs"
              >
                Salvar Comprovante
              </Button>
            </div>
          )}

          {/* Lista de Comprovantes */}
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Carregando comprovantes…
            </div>
          ) : comprovantes.length === 0 ? (
            <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground text-sm">
              Nenhuma evidência ou comprovante de veiculação cadastrado para esta campanha.
            </div>
          ) : (
            <div className="space-y-2.5">
              {comprovantes.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.titulo}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.tipo}
                      </Badge>
                      {c.validado ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Auditado / Validado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Pendente de Validação
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {c.parceiro && <span>Veículo: <strong>{c.parceiro.nome_fantasia}</strong></span>}
                      {c.data_veiculacao && (
                        <span>
                          Data: {new Date(c.data_veiculacao).toLocaleDateString("pt-BR")}{" "}
                          {c.hora_veiculacao && `às ${c.hora_veiculacao}`}
                        </span>
                      )}
                      {c.descricao && <span>Obs: {c.descricao}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.link_externo && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => window.open(c.link_externo!, "_blank")}
                      >
                        <ExternalLink className="size-3.5" />
                        Abrir Mídia
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 text-xs ${c.validado ? "text-amber-600" : "text-emerald-600"}`}
                      onClick={() => validarMut.mutate({ id: c.id, validado: !c.validado })}
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      {c.validado ? "Desmarcar" : "Validar"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => {
                        if (confirm("Excluir este comprovante?")) deleteMut.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
