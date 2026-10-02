import { EntityFormDialog, type EntityFormData } from "@/components/EntityFormDialog";
import { upsertCliente } from "@/lib/clientes.functions";

export function ClienteFormDialog({
  open,
  onOpenChange,
  initial,
  agencias,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<EntityFormData> | null;
  agencias: { id: string; nome: string }[];
  onSuccess?: (saved: any) => void;
}) {
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial?.id ? "Editar Cliente" : "Novo Cliente"}
      initial={initial}
      agencias={agencias}
      showLogo
      queryKey="clientes"
      tipo="cliente"
      onSuccess={onSuccess}
      onSubmit={(d) =>
        upsertCliente({
          data: {
            id: d.id,
            razao_social: d.razao_social,
            nome_fantasia: d.nome_fantasia || null,
            apelido: d.apelido || null,
            cnpj: d.cnpj || null,
            endereco: d.endereco || null,
            cidade: d.cidade || null,
            uf: d.uf || null,
            cep: d.cep || null,
            agencia_id: d.agencia_id || null,
            observacao: d.observacao || null,
            logo_url: d.logo_url || null,
            executivo_id: d.executivo_id || null,
            segmento: d.segmento || null,
            inscricao_estadual: d.inscricao_estadual || null,
            inscricao_municipal: d.inscricao_municipal || null,
            cnae: d.cnae || null,
            situacao_cadastral: d.situacao_cadastral || null,
            website: d.website || null,
            instagram: d.instagram || null,
            linkedin: d.linkedin || null,
            facebook: d.facebook || null,
            data_aniversario: d.data_aniversario || null,
            status: d.status,
            indicador_id: d.indicador_id || null,
            comissao_indicacao_pct: d.comissao_indicacao_pct ?? null,
            contatos: d.contatos,
          },
        })
      }
    />
  );
}
