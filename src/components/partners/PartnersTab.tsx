import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Building2,
  Plus,
  Search,
  Percent,
  QrCode,
  DollarSign,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Copy,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  Power,
  ExternalLink,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Partner,
  PersonType,
  PartnerStatus,
  formatCPF,
  formatCNPJ,
  formatPhone,
  PARTNER_STATUS_CONFIG,
} from "@/types/partners.types";
import {
  listPartners,
  deletePartner,
  togglePartnerStatus,
} from "@/lib/partners.functions";
import { PartnerFormDialog } from "./PartnerFormDialog";
import { PartnerDetailsDrawer } from "./PartnerDetailsDrawer";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function PartnersTab() {
  const qc = useQueryClient();
  const listPartnersFn = useServerFn(listPartners);
  const deletePartnerFn = useServerFn(deletePartner);
  const toggleStatusFn = useServerFn(togglePartnerStatus);

  // States
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<PersonType | "all">("all");
  const [filtroStatus, setFiltroStatus] = useState<PartnerStatus | "all">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Queries
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", filtroTipo, filtroStatus],
    queryFn: () =>
      listPartnersFn({
        data: {
          person_type: filtroTipo,
          status: filtroStatus,
        },
      }),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnerFn({ data: { id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      if (res.inactivated) {
        toast.info("Parceiro inativado", { description: res.message });
      } else {
        toast.success("Parceiro removido com sucesso!");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover indicador");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PartnerStatus }) =>
      toggleStatusFn({ data: { id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar status");
    },
  });

  // Filtragem local instantânea
  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return partners.filter((p) => {
      const nome = (p.full_name || p.corporate_name || "").toLowerCase();
      const fantasia = (p.trade_name || "").toLowerCase();
      const doc = (p.cpf || p.cnpj || "").replace(/\D/g, "");
      const email = (p.email || "").toLowerCase();
      const tel = (p.phone || "").replace(/\D/g, "");
      const pix = (p.pix_key || "").toLowerCase();

      const matchSearch =
        q === "" ||
        nome.includes(q) ||
        fantasia.includes(q) ||
        doc.includes(q) ||
        email.includes(q) ||
        tel.includes(q) ||
        pix.includes(q);

      const matchTipo = filtroTipo === "all" || p.person_type === filtroTipo;
      const matchStatus = filtroStatus === "all" || p.status === filtroStatus;

      return matchSearch && matchTipo && matchStatus;
    });
  }, [partners, search, filtroTipo, filtroStatus]);

  // Métricas agregadas
  const metricas = useMemo(() => {
    let pfCount = 0;
    let pjCount = 0;
    let totalClientes = 0;
    let totalComissoesPendentes = 0;
    let totalComissoesPagas = 0;

    partners.forEach((p) => {
      if (p.person_type === "PF") pfCount++;
      if (p.person_type === "PJ") pjCount++;
      totalClientes += p.clientes_count || 0;
      totalComissoesPendentes += p.total_comissao_pendente || 0;
      totalComissoesPagas += p.total_comissao_paga || 0;
    });

    return {
      total: partners.length,
      pfCount,
      pjCount,
      totalClientes,
      totalComissoesPendentes,
      totalComissoesPagas,
    };
  }, [partners]);

  const copiarPix = (pix: string, id: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedId(id);
    toast.success("Chave PIX copiada para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Indicadores */}
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Indicadores & Vendedores</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{metricas.total}</h3>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <span className="text-blue-600 font-medium">{metricas.pfCount} PF</span>
                <span>•</span>
                <span className="text-purple-600 font-medium">{metricas.pjCount} PJ</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Clientes Indicados */}
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Clientes Vinculados</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{metricas.totalClientes}</h3>
              <span className="text-[11px] text-muted-foreground">Em carteira comercial</span>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Comissões Pendentes */}
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Comissões a Repassar (PIX)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">
                {fmtBRL(metricas.totalComissoesPendentes)}
              </h3>
              <span className="text-[11px] text-muted-foreground">Pós-recebimento do anunciante</span>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Comissões Pagas */}
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Comissões Liquidadas</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {fmtBRL(metricas.totalComissoesPagas)}
              </h3>
              <span className="text-[11px] text-muted-foreground">Repasses concluídos</span>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, razão social, CPF, CNPJ, e-mail ou PIX..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filtro Tipo PF/PJ */}
          <Select
            value={filtroTipo}
            onValueChange={(v: any) => setFiltroTipo(v)}
          >
            <SelectTrigger className="w-full sm:w-36 text-xs h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Status */}
          <Select
            value={filtroStatus}
            onValueChange={(v: any) => setFiltroStatus(v)}
          >
            <SelectTrigger className="w-full sm:w-44 text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            setSelectedPartner(null);
            setFormOpen(true);
          }}
          className="gap-1.5 text-xs h-9 shrink-0"
        >
          <Plus className="size-3.5" />
          Novo Indicador / Vendedor
        </Button>
      </div>

      {/* Tabela de Indicadores */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs">
              <TableHead>Nome / Razão Social</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento (CPF/CNPJ)</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-center">Comissão %</TableHead>
              <TableHead>Chave PIX Repasse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                  Carregando lista de parceiros e indicadores...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <UserCheck className="size-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Nenhum parceiro encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {search ? "Ajuste os filtros de busca para encontrar registros." : "Cadastre o primeiro indicador de clientes ou vendedor externo."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((partner) => {
                const isPF = partner.person_type === "PF";
                const nomePrincipal = isPF
                  ? partner.full_name || "Pessoa Física"
                  : partner.corporate_name || "Pessoa Jurídica";

                const doc = isPF ? formatCPF(partner.cpf) : formatCNPJ(partner.cnpj);
                const statusCfg = PARTNER_STATUS_CONFIG[partner.status] || PARTNER_STATUS_CONFIG.active;
                const whatsappLink = partner.phone
                  ? `https://wa.me/55${partner.phone.replace(/\D/g, "")}`
                  : null;

                return (
                  <TableRow key={partner.id} className="text-xs hover:bg-muted/30 transition">
                    {/* Nome & Razão Social */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isPF ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                          }`}
                        >
                          {isPF ? <User className="size-3.5" /> : <Building2 className="size-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{nomePrincipal}</div>
                          {!isPF && partner.trade_name && (
                            <div className="text-[10px] text-muted-foreground">
                              Fantasia: {partner.trade_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Tipo PF / PJ */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          isPF
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                        }`}
                      >
                        {isPF ? "PF" : "PJ"}
                      </Badge>
                    </TableCell>

                    {/* Documento Formatado */}
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {doc || "—"}
                    </TableCell>

                    {/* Contato (WhatsApp & Email) */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span>{formatPhone(partner.phone)}</span>
                          {whatsappLink && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5"
                              title="Chamar no WhatsApp"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {partner.email}
                        </div>
                      </div>
                    </TableCell>

                    {/* Comissão % */}
                    <TableCell className="text-center font-mono font-semibold text-foreground">
                      <div className="inline-flex items-center gap-0.5">
                        {partner.default_commission_rate}%
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {partner.requires_invoice ? "NFS-e" : "Recibo"}
                      </div>
                    </TableCell>

                    {/* Chave PIX com Cópia Rápida */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] truncate max-w-[130px] select-all">
                          {partner.pix_key || "—"}
                        </span>
                        {partner.pix_key && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => copiarPix(partner.pix_key, partner.id)}
                            title="Copiar Chave PIX"
                          >
                            {copiedId === partner.id ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Status com Dropdown Rápido */}
                    <TableCell>
                      <Select
                        value={partner.status}
                        onValueChange={(newStatus: PartnerStatus) =>
                          toggleStatusMutation.mutate({ id: partner.id, status: newStatus })
                        }
                      >
                        <SelectTrigger className="h-6 text-[10px] w-28 px-2 border-0 bg-transparent hover:bg-muted/40">
                          <Badge variant="outline" className={`text-[10px] ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">Ativo</SelectItem>
                          <SelectItem value="inactive" className="text-xs">Inativo</SelectItem>
                          <SelectItem value="pending_approval" className="text-xs">Aguardando Aprovação</SelectItem>
                          <SelectItem value="blocked" className="text-xs">Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setDetailsOpen(true);
                          }}
                          title="Visualizar Ficha Cadastral"
                        >
                          <Eye className="size-3.5 text-primary" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setFormOpen(true);
                          }}
                          title="Editar Cadastro"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Deseja remover ou inativar o parceiro "${nomePrincipal}"?`)) {
                              deleteMutation.mutate(partner.id);
                            }
                          }}
                          title="Excluir ou Inativar"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Formulário de Cadastro / Edição */}
      <PartnerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        partner={selectedPartner}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["partners"] });
          qc.invalidateQueries({ queryKey: ["indicadores"] });
        }}
      />

      {/* Drawer / Modal de Detalhes da Ficha Cadastral */}
      <PartnerDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        partner={selectedPartner}
        onEdit={(p) => {
          setSelectedPartner(p);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
