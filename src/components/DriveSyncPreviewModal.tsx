import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderSync,
  Building2,
  Package,
  Layers,
  MapPin,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Info,
  DollarSign,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
  Radio,
  Tv,
} from "lucide-react";
import type {
  DrivePreviewReport,
  DrivePreviewItem,
  DriveParceiroAgrupado,
} from "@/types/drive-sync.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DrivePreviewReport | null;
}

export function DriveSyncPreviewModal({ open, onOpenChange, report }: Props) {
  const [activeTab, setActiveTab] = useState<string>("resumo");

  if (!report) return null;

  const { resumo, config, parceiros, itens, pendencias_gerais } = report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
                <FolderSync className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Prévia de Integração Google Drive
                  <Badge
                    variant="outline"
                    className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300"
                  >
                    <ShieldCheck className="size-3 mr-1" />
                    Modo Prévia (Dry-Run)
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                  >
                    Zero Gravações no Banco
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Tenant: <span className="font-semibold text-foreground">{report.tenant_nome}</span> • CNPJ: {report.tenant_cnpj} • Pasta ID: {config.root_folder_id}
                </DialogDescription>
              </div>
            </div>

            {/* Status da Conexão */}
            <div className="flex items-center gap-2 shrink-0">
              {config.modo_conexao === "api_oficial" ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                  <ShieldCheck className="size-3 mr-1" />
                  API Oficial v3 ({config.tipo_autenticacao})
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 text-xs">
                  <Info className="size-3 mr-1" />
                  Descoberta Pública / Fallback
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 6 Cards de Indicadores de Governança */}
        <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Card className="border-border/60 shadow-2xs bg-purple-50/40 dark:bg-purple-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Building2 className="size-3 text-purple-600" /> Parceiros
              </span>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                {resumo.total_parceiros_identificados}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-blue-50/40 dark:bg-blue-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Package className="size-3 text-blue-600" /> Mídia Convencional
              </span>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                {resumo.total_produtos_convencionais}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-cyan-50/40 dark:bg-cyan-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <MapPin className="size-3 text-cyan-600" /> Pontos Físicos / Geo
              </span>
              <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">
                {resumo.total_pontos_geolocalizados}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-indigo-50/40 dark:bg-indigo-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Layers className="size-3 text-indigo-600" /> Projetos / Pacotes
              </span>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                {resumo.total_projetos_especiais}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-600" /> Autorizados
              </span>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {resumo.total_autorizados_venda}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-amber-50/40 dark:bg-amber-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <AlertTriangle className="size-3 text-amber-600" /> Pendentes / Revisão
              </span>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                {resumo.total_pendentes_revisao}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de Governança sobre Autorização Comercial */}
        <div className="px-6 py-2">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Regra de Blindagem Comercial:</span> A presença de um arquivo ou produto na pasta do Google Drive <strong>NÃO</strong> constitui autorização legal para comercialização. Apenas parceiros com contrato de representação formal ativo em <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">contratos_representacao</code> são liberados para propostas comerciais.
            </div>
          </div>
        </div>

        {/* Abas com as 7 Categorias Obrigatórias */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-6">
          <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-muted/40">
            <TabsTrigger value="resumo" className="text-xs py-1.5">
              Resumo & Governança
            </TabsTrigger>
            <TabsTrigger value="parceiros" className="text-xs py-1.5">
              Parceiros ({parceiros.length})
            </TabsTrigger>
            <TabsTrigger value="produtos" className="text-xs py-1.5">
              Mídia ({resumo.total_produtos_convencionais})
            </TabsTrigger>
            <TabsTrigger value="pontos" className="text-xs py-1.5">
              Pontos Físicos ({resumo.total_pontos_geolocalizados})
            </TabsTrigger>
            <TabsTrigger value="projetos" className="text-xs py-1.5">
              Projetos ({resumo.total_projetos_especiais})
            </TabsTrigger>
            <TabsTrigger value="tabelas" className="text-xs py-1.5">
              Tabelas ({resumo.total_tabelas_precos})
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="text-xs py-1.5 text-amber-700 dark:text-amber-400">
              Pendências ({resumo.total_pendentes_revisao + resumo.total_nao_classificados})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: RESUMO & GOVERNANÇA */}
          <TabsContent value="resumo" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-4">
                {/* Status da Configuração de Autenticação */}
                <div className="p-3.5 rounded-lg border bg-muted/10 space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <Info className="size-4 text-purple-600" />
                    Parâmetros de Acesso ao Google Drive
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Modo de Conexão:</span>{" "}
                      <span className="font-medium">{config.modo_conexao}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Autenticação:</span>{" "}
                      <span className="font-medium">{config.tipo_autenticacao}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pasta Raiz:</span>{" "}
                      <span className="font-mono text-[11px]">{config.root_folder_id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verificação em:</span>{" "}
                      <span className="font-mono text-[11px]">{new Date(report.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  {config.instrucoes_autenticacao && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900/40 mt-1">
                      {config.instrucoes_autenticacao}
                    </p>
                  )}
                </div>

                {/* Pendências Gerais Encontradas */}
                {pendencias_gerais.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="size-4" />
                      Alertas de Governança e Pré-requisitos
                    </h4>
                    <div className="space-y-1">
                      {pendencias_gerais.map((p, idx) => (
                        <div key={idx} className="text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300 p-2 rounded flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabela Resumo dos Parceiros */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold">Parceiros Descobertos e Status de Representação</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-xs">Empresa Parceira</TableHead>
                          <TableHead className="text-xs">CNPJ</TableHead>
                          <TableHead className="text-xs text-center">Produtos / Pontos</TableHead>
                          <TableHead className="text-xs text-center">Projetos</TableHead>
                          <TableHead className="text-xs">Autorização Comercial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parceiros.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-xs">
                              {p.nome}
                              {p.existe_no_banco && (
                                <Badge variant="outline" className="ml-1.5 text-[10px] py-0">
                                  Cadastrado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {p.cnpj || "Não detectado"}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {p.total_produtos + p.total_pontos_fisicos}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {p.total_projetos}
                            </TableCell>
                            <TableCell className="text-xs">
                              {p.contrato_vigente ? (
                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                  <ShieldCheck className="size-3 mr-1" /> Autorizado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 text-[10px]">
                                  <AlertTriangle className="size-3 mr-1" /> Requer Homologação
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 2: PARCEIROS */}
          <TabsContent value="parceiros" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parceiros.map((p, idx) => (
                  <Card key={idx} className="border-border/60">
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm flex items-center gap-1.5">
                            <Building2 className="size-4 text-purple-600" />
                            {p.nome}
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            CNPJ: {p.cnpj || "Pendente de confirmação"}
                          </p>
                        </div>
                        {p.contrato_vigente ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Autorizado</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                            Sem Contrato Ativo
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs py-1.5 bg-muted/20 rounded">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Mídias</span>
                          <span className="font-bold">{p.total_produtos}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Pontos Geo</span>
                          <span className="font-bold">{p.total_pontos_fisicos}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Projetos</span>
                          <span className="font-bold">{p.total_projetos}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground text-[11px]">
                          {p.itens.length} arquivo(s) mapeado(s)
                        </span>
                        <a
                          href={p.pasta_drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-[11px] font-medium"
                        >
                          Abrir no Drive <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 3: PRODUTOS CONVENCIONAIS */}
          <TabsContent value="produtos" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {itens
                  .filter((it) => it.tipo === "produto_convencional")
                  .map((it) => (
                    <ItemPreviewRow key={it.id} item={it} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 4: PONTOS FÍSICOS E GEOLOCALIZADOS */}
          <TabsContent value="pontos" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {itens
                  .filter((it) => it.tipo === "ponto_geolocalizado")
                  .map((it) => (
                    <ItemPreviewRow key={it.id} item={it} showGeo />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 5: PROJETOS ESPECIAIS & PACOTES */}
          <TabsContent value="projetos" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-3">
                {itens
                  .filter((it) => it.tipo === "projeto_especial")
                  .map((it) => (
                    <Card key={it.id} className="border-border/60">
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm flex items-center gap-1.5">
                              <Sparkles className="size-4 text-indigo-600" />
                              {it.titulo}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {it.parceiro_nome} • Origem: {it.documento_origem.nome_arquivo}
                            </p>
                          </div>
                          {it.dados_extraidos.valor_tabela && (
                            <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-300">
                              R$ {it.dados_extraidos.valor_tabela.toLocaleString("pt-BR")}
                            </Badge>
                          )}
                        </div>

                        {/* Entregáveis do Projeto Especial */}
                        {it.dados_extraidos.entregaveis && it.dados_extraidos.entregaveis.length > 0 && (
                          <div className="bg-muted/20 p-2.5 rounded text-xs space-y-1">
                            <span className="font-semibold text-muted-foreground text-[11px] block">
                              Entregáveis e Formatos Multi-Canal do Pacote:
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-foreground/80 text-[11px]">
                              {it.dados_extraidos.entregaveis.map((e, idx) => (
                                <li key={idx}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t">
                          <span className="text-[11px] text-muted-foreground">
                            Rastreabilidade: {it.rastreabilidade.drive_file_id}
                          </span>
                          <a
                            href={it.documento_origem.view_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-[11px] font-medium"
                          >
                            Ver Mídia Kit <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 6: TABELAS DE PREÇO */}
          <TabsContent value="tabelas" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {itens
                  .filter((it) => it.tipo === "tabela_comercial")
                  .map((it) => (
                    <Card key={it.id} className="border-border/60">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
                            <div>
                              <h5 className="font-medium text-xs">{it.titulo}</h5>
                              <p className="text-[11px] text-muted-foreground">
                                {it.parceiro_nome} • {it.documento_origem.pasta_nome}
                              </p>
                            </div>
                          </div>
                          <a
                            href={it.documento_origem.view_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-600 hover:text-purple-700 text-xs flex items-center gap-1 font-medium"
                          >
                            Abrir Planilha <ExternalLink className="size-3" />
                          </a>
                        </div>
                        {it.dados_extraidos.condicoes_comerciais && (
                          <p className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded">
                            {it.dados_extraidos.condicoes_comerciais}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 7: PENDÊNCIAS & NÃO CLASSIFICADOS */}
          <TabsContent value="pendencias" className="flex-1 min-h-0 mt-3 pb-4">
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2.5">
                {itens
                  .filter((it) => it.tipo === "nao_classificado" || it.pendencias.length > 0)
                  .map((it) => (
                    <Card key={it.id} className="border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="size-3.5 text-amber-600" />
                              <h5 className="font-medium text-xs">{it.titulo}</h5>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {it.parceiro_nome} • {it.documento_origem.caminho_completo}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                            Requer Revisão
                          </Badge>
                        </div>

                        {it.pendencias.length > 0 && (
                          <div className="space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                            {it.pendencias.map((pen, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1.5">
                                <span className="size-1 rounded-full bg-amber-600 shrink-0" />
                                <span>{pen}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Rodapé Seguro */}
        <DialogFooter className="p-4 px-6 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>
              Prévia validada de forma segura. Nenhuma alteração foi persistida no Supabase de produção.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar Prévia
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemPreviewRow({ item, showGeo = false }: { item: DrivePreviewItem; showGeo?: boolean }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-xs">{item.titulo}</h5>
            {item.dados_extraidos.midia && (
              <Badge variant="secondary" className="text-[10px] py-0">
                {item.dados_extraidos.midia}
              </Badge>
            )}
            {item.autorizacao.autorizado_para_venda ? (
              <Badge className="bg-emerald-600 text-white text-[10px] py-0">
                Autorizado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] py-0">
                Requer Contrato
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {item.parceiro_nome} • {item.dados_extraidos.formato || item.documento_origem.nome_arquivo}
          </p>

          {showGeo && item.dados_extraidos.endereco && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
              <MapPin className="size-3 text-cyan-600 shrink-0" />
              <span>
                {item.dados_extraidos.endereco}
                {item.dados_extraidos.sentido_via ? ` (${item.dados_extraidos.sentido_via})` : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {item.dados_extraidos.valor_tabela ? (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Tabela</span>
              <span className="font-mono text-xs font-bold text-foreground">
                R$ {item.dados_extraidos.valor_tabela.toLocaleString("pt-BR")}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">Preço sob consulta</span>
          )}

          <a
            href={item.documento_origem.view_url}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
            title="Abrir arquivo de origem no Drive"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
