import { EntityFormDialog, type EntityFormData } from "@/components/EntityFormDialog";
import { upsertAgencia } from "@/lib/agencias.functions";

export function AgenciaFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<EntityFormData> | null;
}) {
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial?.id ? "Editar Agência" : "Nova Agência"}
      initial={initial}
      queryKey="agencias"
      tipo="agencia"
      showLogo={true}
      onSubmit={(d) =>
        upsertAgencia({
          data: {
            id: d.id,
            logo_url: d.logo_url || null,
            razao_social: d.razao_social,
            nome_fantasia: d.nome_fantasia || null,
            apelido: d.apelido || null,
            cnpj: d.cnpj || null,
            endereco: d.endereco || null,
            cidade: d.cidade || null,
            uf: d.uf || null,
            cep: d.cep || null,
            observacao: d.observacao || null,
            executivo_id: d.executivo_id || null,
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
            contatos: d.contatos,
          },
        })
      }
    />
  );
}
