import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoMidiaOS from "@/assets/logo-midiaos.png";
import { applyTrialWatermark } from "@/lib/trial-watermark";
import { DEFAULT_PI_LAYOUT, type PiLayoutConfig } from "@/lib/pi-layout.functions";

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];
const DOW_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type Item = {
  tipo: string;
  programa?: string | null;
  horario?: string | null;
  formato?: string | null;
  insercoes_dia: number;
  dias_semana?: string[] | null;
  dias_mes?: number[] | null;
  mes?: number;
  ano?: number;
  total_insercoes: number;
  valor_unit: number;
  desconto: number;
  valor_tabela: number;
  valor_negociado: number;
};

type Entidade =
  | {
      razao_social?: string | null;
      nome_fantasia?: string | null;
      cnpj?: string | null;
      endereco?: string | null;
      cidade?: string | null;
      uf?: string | null;
      cep?: string | null;
      telefone?: string | null;
      email?: string | null;
      ie?: string | null;
      im?: string | null;
      responsavel?: string | null;
    }
  | null
  | undefined;

type Pi = {
  numero: string;
  campanha: string;
  status: string;
  mes_veiculacao: number;
  ano_veiculacao: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  observacao?: string | null;
  valor_tabela: number;
  valor_desconto: number;
  valor_negociado: number;
  total_insercoes: number;
  faturamento_tipo?: "bruto" | "liquido" | null;
  faturamento_contra?: "cliente" | "agencia" | null;
  data_faturamento?: string | null;
  data_envio_nota?: string | null;
  data_vencimento_nota?: string | null;
  permuta?: boolean | null;
  permuta_valor_faturado?: number | null;
  permuta_detalhes?: string | null;
  permuta_uso?: "empresa" | "comercial" | string | null;
  email_faturamento?: string | null;
  investimentos_mensais?: Record<string, number> | null;

  cliente?: Entidade;
  agencia?: Entidade;
  emissora?: {
    nome?: string | null;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    inscricao_estadual?: string | null;
    inscricao_municipal?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
    telefone?: string | null;
    email?: string | null;
    observacoes?: string | null;
    entrega_material?: string | null;
  } | null;
  itens?: Item[];
  atendimento?: { nome: string; email: string } | null;
};

/** Quantidade de inserções de um item em determinado dia do mês.
 *  Suporta variação por dia codificada como repetição em `dias_mes`
 *  (ex.: dia 5 com 3 inserções → [5,5,5]). Multiplicador final = ocorrências × insercoes_dia. */
function insercoesNoDia(it: Item, ano: number, mes: number, dia: number): number {
  // Se o item tiver mês/ano definido, deve bater com o que está sendo renderizado agora
  if (it.mes && it.mes !== mes) return 0;
  if (it.ano && it.ano !== ano) return 0;

  const d = new Date(ano, mes - 1, dia);
  if (d.getMonth() !== mes - 1) return 0;
  const dow = DOW_ABBR[d.getDay()].toLowerCase();
  const diasMesArr = (it.dias_mes ?? []).map(Number);
  const diasSem = new Set((it.dias_semana ?? []).map((s) => s.toLowerCase().slice(0, 3)));
  const occur = diasMesArr.filter((x) => x === dia).length;
  const base = it.insercoes_dia || 1;
  if (occur > 0) return occur * base;
  if (diasMesArr.length === 0 && diasSem.has(dow)) return base;
  if (diasMesArr.length === 0 && diasSem.size === 0) return base;
  return 0;
}

export type AssinaturaCliente = {
  nome_assinante?: string | null;
  cpf?: string | null;
  assinado_em?: string | null;
  ip?: string | null;
} | null;

export function gerarPdfPi(
  pi: Pi,
  mode: "download" | "preview" | "blob" = "download",
  previewWin?: Window | null,
  opts?: {
    assinaturaExecutivoDataUrl?: string | null;
    nomeExecutivo?: string | null;
    assinaturaCliente?: AssinaturaCliente;
    assinaturaDiretoriaDataUrl?: string | null;
    nomeDiretoria?: string | null;
    tenantLogoDataUrl?: string | null;
    tenantInfo?: {
      nome?: string;
      razao_social?: string;
      cnpj?: string;
      endereco?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      telefone?: string;
    } | null;
    layout?: Partial<PiLayoutConfig> | null;
  },
): string | void {
  // A janela deve ser aberta no clique (síncrono); aqui usamos a referência recebida.
  const win = mode === "preview" ? (previewWin ?? null) : null;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const layout: PiLayoutConfig = { ...DEFAULT_PI_LAYOUT, ...(opts?.layout ?? {}) };
  const M = Math.max(4, Math.min(20, layout.margemMm));

  // ── Cabeçalho ──
  // Áreas reservadas (evita sobreposição):
  //   esquerda  : 0   .. 95mm  (logo + dados emissora)
  //   centro    : 95  .. W-95  (título + PI nº + status)
  //   direita   : W-95 .. W    (emissão + executivo)
  const LEFT_END = M + 92;
  const RIGHT_START = W - M - 92;

  // Logo obrigatória: emissora (CNPJ emissor do PI) — cadastrada em Configurações → Emissoras.
  // Fallback para logo do tenant e, por fim, marca do sistema.
  try {
    const emissoraOrTenantLogo = opts?.tenantLogoDataUrl;
    if (emissoraOrTenantLogo) {
      const fmt = emissoraOrTenantLogo.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(emissoraOrTenantLogo, fmt, M, 6, 26, 13);
    } else {
      doc.addImage(logoMidiaOS, "PNG", M, 6, 26, 13);
    }
  } catch {
    /* opcional */
  }

  const em = pi.emissora;
  const tenant = opts?.tenantInfo;

  const emNome = (
    em?.nome_fantasia ||
    em?.nome ||
    em?.razao_social ||
    tenant?.nome ||
    "INQUILINO"
  ).toUpperCase();
  const emRazao = em?.razao_social || tenant?.razao_social || "";
  const emEnd = em
    ? [em.endereco, em.cep && `CEP: ${em.cep}`, [em.cidade, em.uf].filter(Boolean).join("/")]
        .filter(Boolean)
        .join(" — ")
    : tenant
      ? [
          tenant.endereco,
          tenant.cep && `CEP: ${tenant.cep}`,
          [tenant.cidade, tenant.uf].filter(Boolean).join("/"),
        ]
          .filter(Boolean)
          .join(" — ")
      : "";
  const emCnpjTel = em
    ? [em.cnpj && `CNPJ: ${em.cnpj}`, em.telefone && `FONE: ${em.telefone}`]
        .filter(Boolean)
        .join("  ·  ")
    : tenant
      ? [tenant.cnpj && `CNPJ: ${tenant.cnpj}`, tenant.telefone && `FONE: ${tenant.telefone}`]
          .filter(Boolean)
          .join("  ·  ")
      : "";

  const headerMaxW = LEFT_END - (M + 28);
  const truncate = (s: string, max: number) => {
    const lines = doc.splitTextToSize(s, max) as string[];
    return lines[0] + (lines.length > 1 ? "…" : "");
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(truncate(emNome, headerMaxW), M + 28, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(60);
  let hy = 12;
  if (emRazao) {
    doc.text(truncate(emRazao, headerMaxW), M + 28, hy);
    hy += 3;
  }
  if (emEnd) {
    doc.text(truncate(emEnd, headerMaxW), M + 28, hy);
    hy += 3;
  }
  if (emCnpjTel) {
    doc.text(truncate(emCnpjTel, headerMaxW), M + 28, hy);
    hy += 3;
  }
  doc.setTextColor(0);

  // Centro — título e PI
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("AUTORIZAÇÃO DE VEICULAÇÃO", W / 2, 11, {
    align: "center",
    maxWidth: RIGHT_START - LEFT_END,
  });
  doc.setFontSize(10);
  doc.text(`PI ${pi.numero}`, W / 2, 16, { align: "center", maxWidth: RIGHT_START - LEFT_END });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Status: ${pi.status.toUpperCase()}`, W / 2, 20, { align: "center" });

  // Direita — emissão / executivo (cada linha com maxWidth para não invadir o centro)
  const rightColW = W - M - RIGHT_START;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, W - M, 9, {
    align: "right",
    maxWidth: rightColW,
  });
  if (pi.atendimento) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("EXECUTIVO RESPONSÁVEL", W - M, 13, { align: "right", maxWidth: rightColW });
    doc.setFont("helvetica", "normal");
    doc.text(pi.atendimento.nome, W - M, 16, { align: "right", maxWidth: rightColW });
    doc.setTextColor(80);
    doc.text(pi.atendimento.email, W - M, 19, { align: "right", maxWidth: rightColW });
    doc.setTextColor(0);
  }

  // ── Cliente / Agência (duas colunas em mini-tabelas) ──
  const cli = pi.cliente ?? {};
  const ag = pi.agencia ?? null;
  const blocoCli: [string, string][] = [
    ["Cliente:", cli?.nome_fantasia || cli?.razao_social || "—"],
    ["Razão social:", cli?.razao_social || "—"],
    ["Endereço:", [cli?.endereco, cli?.cidade, cli?.uf].filter(Boolean).join(" — ") || "—"],
    ["CEP:", cli?.cep || "—"],
    ["Tel:", cli?.telefone || "—"],
    ["CNPJ:", cli?.cnpj || "—"],
    ["I.E:", cli?.ie || "ISENTA"],
    ["I.M:", cli?.im || "ISENTA"],
    ["Responsável:", cli?.responsavel || "—"],
    [
      "E-mail:",
      (pi.faturamento_contra === "cliente" ? pi.email_faturamento : null) || cli?.email || "—",
    ],
  ];
  const blocoAg: [string, string][] = ag
    ? [
        ["Agência:", ag.nome_fantasia || ag.razao_social || "—"],
        ["Razão social:", ag.razao_social || "—"],
        ["Endereço:", [ag.endereco, ag.cidade, ag.uf].filter(Boolean).join(" — ") || "—"],
        ["CEP:", ag.cep || "—"],
        ["Tel:", ag.telefone || "—"],
        ["CNPJ:", ag.cnpj || "—"],
        ["I.E:", ag.ie || "ISENTA"],
        ["I.M:", ag.im || "ISENTA"],
        ["Responsável:", ag.responsavel || "—"],
        [
          "E-mail:",
          (pi.faturamento_contra === "agencia" ? pi.email_faturamento : null) || ag.email || "—",
        ],
      ]
    : [["Agência:", "Negociação direta"]];

  const colW = (W - M * 2 - 4) / 2;
  const blocosStartY = 25;

  autoTable(doc, {
    startY: blocosStartY,
    margin: { left: M },
    tableWidth: colW,
    body: blocoCli,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.2,
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 22, fillColor: [240, 240, 245] },
      1: { cellWidth: colW - 22 },
    },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable injetado
  const finalCli = doc.lastAutoTable?.finalY ?? blocosStartY;

  autoTable(doc, {
    startY: blocosStartY,
    margin: { left: M + colW + 4 },
    tableWidth: colW,
    body: blocoAg,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.2,
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 22, fillColor: [240, 240, 245] },
      1: { cellWidth: colW - 22 },
    },
    theme: "grid",
  });
  // @ts-expect-error
  const finalAg = doc.lastAutoTable?.finalY ?? blocosStartY;

  let y = Math.max(finalCli, finalAg) + 3;

  // ── Linha "INÍCIO/FIM · PRODUTO · Formato · PERÍODO" ──
  const formatos =
    Array.from(new Set((pi.itens ?? []).map((i) => i.formato).filter(Boolean))).join(" / ") || "—";

  // Calcula início/fim a partir do mapa (dias_mes/dias_semana) ou usa os campos do PI.
  const fmtDateIso = (iso: string | null | undefined) => {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return null;
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  };
  let inicioStr: string | null = fmtDateIso(pi.periodo_inicio);
  let fimStr: string | null = fmtDateIso(pi.periodo_fim);
  if (!inicioStr || !fimStr) {
    const diasUlt = new Date(pi.ano_veiculacao, pi.mes_veiculacao, 0).getDate();
    const ativos: number[] = [];
    for (const it of pi.itens ?? []) {
      for (let d = 1; d <= diasUlt; d++) {
        if (insercoesNoDia(it, pi.ano_veiculacao, pi.mes_veiculacao, d) > 0) ativos.push(d);
      }
    }
    if (ativos.length > 0) {
      const minD = Math.min(...ativos);
      const maxD = Math.max(...ativos);
      const mm = String(pi.mes_veiculacao).padStart(2, "0");
      inicioStr = inicioStr ?? `${String(minD).padStart(2, "0")}/${mm}/${pi.ano_veiculacao}`;
      fimStr = fimStr ?? `${String(maxD).padStart(2, "0")}/${mm}/${pi.ano_veiculacao}`;
    }
  }
  const periodoLeft =
    inicioStr && fimStr ? `INÍCIO: ${inicioStr}   ·   FIM: ${fimStr}` : `INÍCIO/FIM: —`;

  // Período (texto à direita): se itens cobrem múltiplos meses, mostra range
  const mesesItens = Array.from(
    new Set(
      (pi.itens ?? []).map(
        (it) =>
          `${it.ano || pi.ano_veiculacao}-${String(it.mes || pi.mes_veiculacao).padStart(2, "0")}`,
      ),
    ),
  ).sort();
  let periodoRight: string;
  if (mesesItens.length > 1) {
    const [a1, m1] = mesesItens[0].split("-").map(Number);
    const [a2, m2] = mesesItens[mesesItens.length - 1].split("-").map(Number);
    periodoRight = `PERÍODO: ${MESES[m1 - 1]}/${a1} a ${MESES[m2 - 1]}/${a2}`;
  } else {
    periodoRight = `PERÍODO: ${MESES[pi.mes_veiculacao - 1]} ${pi.ano_veiculacao}`;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: [
      [
        { content: periodoLeft, styles: { fontStyle: "bold" } },
        { content: `PRODUTO: MÍDIA TV  ·  Formato: ${formatos}`, styles: { halign: "center" } },
        { content: periodoRight, styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.5, fillColor: [11, 27, 43], textColor: 255 },
    theme: "grid",
  });
  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY ?? y) + 1.5;

  // ── MAPA / MATRIZ DE VEICULAÇÃO ──
  const usableW = W - M * 2;

  const uniqueMonths = new Set<string>();
  (pi.itens ?? []).forEach((it) => {
    const m = it.mes || pi.mes_veiculacao;
    const a = it.ano || pi.ano_veiculacao;
    uniqueMonths.add(`${a}-${String(m).padStart(2, "0")}`);
  });
  const sortedMonths = Array.from(uniqueMonths).sort((a, b) => a.localeCompare(b));

  for (const monthKey of sortedMonths) {
    const [ano, mes] = monthKey.split("-").map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();

    // Filtra apenas itens que pertencem a este mês
    const itensDoMes = (pi.itens ?? [])
      .filter((it) => {
        const itM = it.mes || pi.mes_veiculacao;
        const itA = it.ano || pi.ano_veiculacao;
        return itM === mes && itA === ano;
      })
      .sort((a, b) => {
        const firstDay = (x: Item) => {
          for (let d = 1; d <= diasNoMes; d++) if (insercoesNoDia(x, ano, mes, d) > 0) return d;
          return 999;
        };
        const da = firstDay(a),
          db = firstDay(b);
        if (da !== db) return da - db;
        const k = (x: Item) =>
          `${(x.horario || "").toLowerCase()}|${(x.programa || "").toLowerCase()}|${(x.formato || "").toLowerCase()}`;
        return k(a).localeCompare(k(b), "pt-BR");
      });

    if (itensDoMes.length === 0) continue;

    // Mapas de meses consecutivos ficam no mesmo arquivo (jsPDF gera um único
    // PDF). Só quebramos página quando o próximo mapa não couber inteiro na
    // página atual, evitando cortar o mapa ao meio e mantendo o documento
    // limpo para o cliente assinar.
    const alturaEstimada = 10 /* título + cabeçalho */ + itensDoMes.length * 4 + 6;
    if (monthKey !== sortedMonths[0]) {
      // @ts-expect-error jsPDF lastAutoTable
      y = (doc.lastAutoTable?.finalY ?? y) + 5;
      if (y + alturaEstimada > H - 45) {
        doc.addPage();
        y = 14;
      }
    } else {
      y += 1;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(11, 27, 43);
    doc.text(`MAPA DE INSERÇÕES — ${MESES[mes - 1].toUpperCase()} / ${ano}`, M, y);
    doc.setTextColor(0, 0, 0);
    y += 3;

    const headDays1 = Array.from({ length: diasNoMes }, (_, i) => String(i + 1));
    const DOW_3 = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const headDays2 = Array.from(
      { length: diasNoMes },
      (_, i) => DOW_3[new Date(ano, mes - 1, i + 1).getDay()],
    );

    const head = [
      [
        { content: "Programação", rowSpan: 2 },
        { content: "Horário", rowSpan: 2 },
        { content: "Mídia", rowSpan: 2 },
        { content: "Exibição", rowSpan: 2 },
        { content: "Dur", rowSpan: 2 },
        ...headDays1.map((d) => ({ content: d })),
        { content: "Nº", rowSpan: 2 },
        { content: "Valor Unit. Tabela", rowSpan: 2 },
        { content: "Valor Total Tabela", rowSpan: 2 },
        { content: "Desc", rowSpan: 2 },
        { content: "Valor Total c/Desc.", rowSpan: 2 },
      ],
      headDays2.map((d) => ({
        content: d,
        styles: { fontSize: 4.2, cellPadding: 0.3, overflow: "visible" as const },
      })),
    ];

    const body = itensDoMes.map((it) => {
      // Deriva os dias da semana efetivos a partir dos dias marcados no mapa.
      // Ex.: dias_mes = [1,8,15,22,29] em um mês onde caem todas em quarta → "Qua".
      const dowSet = new Set<number>();
      (it.dias_mes ?? []).forEach((d) => {
        const dt = new Date(ano, mes - 1, d);
        if (dt.getMonth() === mes - 1) dowSet.add(dt.getDay());
      });
      (it.dias_semana ?? []).forEach((s) => {
        const idx = DOW_ABBR.findIndex(
          (x) => x.toLowerCase() === (s || "").toLowerCase().slice(0, 3),
        );
        if (idx >= 0) dowSet.add(idx);
      });
      const exibicao =
        dowSet.size > 0
          ? Array.from(dowSet)
              .sort((a, b) => a - b)
              .map((d) => DOW_ABBR[d])
              .join("/")
          : it.dias_mes && it.dias_mes.length
            ? "Dias fixos"
            : "Todos";
      const cells: (string | number)[] = [
        it.programa || it.tipo,
        it.horario || "—",
        it.tipo,
        exibicao,
        it.formato || "—",
      ];
      let totalDoItem = 0;
      for (let d = 1; d <= diasNoMes; d++) {
        const q = insercoesNoDia(it, ano, mes, d);
        totalDoItem += q;
        cells.push(q > 0 ? q : "");
      }
      cells.push(
        totalDoItem || it.total_insercoes || 0,
        fmtBRL(it.valor_unit),
        fmtBRL(it.valor_tabela),
        `${(it.desconto || 0).toFixed(2)}%`,
        fmtBRL(it.valor_negociado),
      );
      return cells;
    });

    const fixedLeft = 5;
    const fixedRight = 5;
    const leftW = [26, 14, 14, 16, 8];
    const rightW = [8, 18, 20, 10, 22];
    const dayW = Math.max(3.2, (usableW - 78 - 78) / diasNoMes);

    const columnStyles: Record<
      number,
      { cellWidth: number; halign?: "left" | "center" | "right"; fontStyle?: "bold" | "normal" }
    > = {};
    leftW.forEach(
      (w, i) => (columnStyles[i] = { cellWidth: w, halign: i === 0 ? "left" : "center" }),
    );
    for (let i = 0; i < diasNoMes; i++)
      columnStyles[fixedLeft + i] = { cellWidth: dayW, halign: "center" };
    rightW.forEach((w, i) => {
      const idx = fixedLeft + diasNoMes + i;
      columnStyles[idx] = {
        cellWidth: w,
        halign: i === 0 ? "center" : "right",
        fontStyle: i === 4 ? "bold" : "normal",
      };
    });

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: 40 },
      head,
      body,
      styles: {
        fontSize: 6.2,
        cellPadding: 0.8,
        lineColor: [160, 160, 160],
        lineWidth: 0.1,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [11, 27, 43],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 6.2,
      },
      columnStyles,
      theme: "grid",
      didParseCell: (data) => {
        const isDayCol =
          data.column.index >= fixedLeft && data.column.index < fixedLeft + diasNoMes;
        if (isDayCol && data.section === "body" && data.cell.raw && data.cell.raw !== "") {
          data.cell.styles.fillColor = [255, 247, 200];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    // @ts-expect-error
    y = doc.lastAutoTable?.finalY ?? y;

    // Rodapé do mapa: investimento mensal do cliente (só quando o contrato cobre >1 mês).
    if (sortedMonths.length > 1) {
      const autoMes = itensDoMes.reduce((s, it) => s + Number(it.valor_negociado || 0), 0);
      const override = pi.investimentos_mensais?.[monthKey];
      const isManual = override != null && Number.isFinite(Number(override));
      const valorMes = isManual ? Number(override) : autoMes;
      autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        body: [
          [
            {
              content: `Investimento do cliente em ${MESES[mes - 1]}/${ano}${isManual ? " (valor definido manualmente)" : " (soma automática da entrega do mês)"}`,
              styles: { fontStyle: "bold", halign: "right" },
            },
            { content: fmtBRL(valorMes), styles: { fontStyle: "bold", halign: "right" } },
          ],
        ],
        styles: {
          fontSize: 7.5,
          cellPadding: 1,
          fillColor: [245, 247, 250],
          lineColor: [160, 160, 160],
          lineWidth: 0.1,
        },
        columnStyles: { 0: { cellWidth: usableW - 50 }, 1: { cellWidth: 50 } },
        theme: "grid",
      });
      // @ts-expect-error
      y = doc.lastAutoTable?.finalY ?? y;
    }
  }

  // ── Bonificação / desconto destacado ──
  if (pi.valor_desconto > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      body: [
        [
          { content: "VALOR NEGOCIADO BRUTO", styles: { fontStyle: "bold", halign: "right" } },
          {
            content: `- ${fmtBRL(pi.valor_desconto)} -`,
            styles: { fontStyle: "bold", halign: "right", textColor: [200, 0, 0] },
          },
        ],
      ],
      styles: { fontSize: 8, cellPadding: 1.2 },
      columnStyles: { 0: { cellWidth: usableW - 50 }, 1: { cellWidth: 50 } },
      theme: "grid",
    });
    // @ts-expect-error
    y = (doc.lastAutoTable?.finalY ?? y) + 1;
  }

  // ── Rodapé: faturamento + assinaturas + totais ──
  // Mantém TODO o bloco final (faturamento, desconto, datas, observação,
  // entrega de material e assinaturas) na mesma página. Se não couber,
  // joga tudo para a próxima.
  const RESERVA_RODAPE = 40; // assinaturas + rodapé
  const alturaFatLinha = 10;
  const alturaDescMedia = 8;
  const alturaDatas = pi.data_faturamento || pi.data_envio_nota || pi.data_vencimento_nota ? 10 : 0;
  const obsTexto = [pi.observacao, pi.emissora?.observacoes, layout.observacaoPadrao]
    .filter((s) => !!s && String(s).trim())
    .join("\n\n");
  const alturaObs = obsTexto ? 4 + doc.splitTextToSize(obsTexto, W - M * 2).length * 4 + 3 : 0;
  const entregaTxt = (pi.emissora?.entrega_material ?? "").trim();
  const alturaEntrega = entregaTxt
    ? 4 + doc.splitTextToSize(entregaTxt, W - M * 2).length * 4 + 3
    : 0;
  const blocoFinalH =
    alturaFatLinha + alturaDescMedia + alturaDatas + alturaObs + alturaEntrega + RESERVA_RODAPE;
  if (y + blocoFinalH > H - RESERVA_RODAPE) {
    // Avisa na primeira página que os detalhes da negociação seguem na próxima
    const aviso = "→ Detalhes da negociação continuam na página 2";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(11, 27, 43);
    doc.text(aviso, W - M, Math.min(y + 4, H - RESERVA_RODAPE - 2), { align: "right" });
    doc.setTextColor(0);
    doc.addPage();
    y = 14;
  }

  const tipo = pi.faturamento_tipo ?? "bruto";
  const contra = pi.faturamento_contra ?? "cliente";
  const fmtDate = (s?: string | null) =>
    s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "—";
  const partes = [
    `Faturar: ${tipo === "liquido" ? "Líquido" : "Bruto"}`,
    `Contra: ${contra === "agencia" ? "Agência" : "Cliente"}`,
  ];
  // Nº de meses de veiculação (a partir dos itens; fallback para o mês do cabeçalho)
  const mesesVeiculacao = (() => {
    const set = new Set<string>();
    (pi.itens ?? []).forEach((it) => {
      const m = it.mes || pi.mes_veiculacao;
      const a = it.ano || pi.ano_veiculacao;
      if (m && a) set.add(`${a}-${m}`);
    });
    return Math.max(1, set.size);
  })();

  if (pi.permuta) {
    const faturado = Number(pi.permuta_valor_faturado ?? 0);
    const valorPermuta = Number(pi.valor_negociado ?? 0);
    const restante = Math.max(valorPermuta - faturado, 0);
    partes.push("Permuta: Sim");
    if (pi.permuta_uso)
      partes.push(`Uso: ${pi.permuta_uso === "comercial" ? "Comercial" : "Empresa"}`);
    partes.push(`Valor Permuta: ${fmtBRL(valorPermuta)}`);
    partes.push(`Valor Faturado: ${fmtBRL(faturado)}`);
    partes.push(`Saldo Permuta: ${fmtBRL(restante)}`);
    if (mesesVeiculacao > 1) {
      partes.push(
        `Investimento mensal do cliente: ${fmtBRL(valorPermuta / mesesVeiculacao)} (${mesesVeiculacao} meses)`,
      );
    }
    if (pi.permuta_detalhes) partes.push(`Detalhes: ${pi.permuta_detalhes}`);
  } else if (mesesVeiculacao > 1) {
    partes.push(
      `Investimento mensal do cliente: ${fmtBRL(Number(pi.valor_negociado ?? 0) / mesesVeiculacao)} (${mesesVeiculacao} meses)`,
    );
  }

  const fatLinha = partes.join("     ·     ");
  const temAgencia = !!pi.agencia;
  // Quando for permuta: valor faturado vai para o campo Valor Líquido; o saldo em permuta fica nas observações (fatLinha)
  const baseValor = pi.permuta ? Number(pi.permuta_valor_faturado ?? 0) : pi.valor_negociado;
  const valorLiquido = pi.permuta
    ? baseValor
    : temAgencia
      ? tipo === "liquido"
        ? baseValor
        : baseValor * 0.8
      : baseValor;
  const valorBruto = pi.permuta
    ? temAgencia
      ? baseValor / 0.8
      : baseValor
    : tipo === "liquido" && temAgencia
      ? baseValor / 0.8
      : baseValor;
  const destaqueBruto = tipo !== "liquido";

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: RESERVA_RODAPE },
    body: [
      [
        { content: fatLinha, styles: { fontStyle: "bold", halign: "left" } },
        { content: "TOTAL DE INSERÇÕES", styles: { fontStyle: "bold", halign: "center" } },
        { content: String(pi.total_insercoes), styles: { halign: "center", fontStyle: "bold" } },
        {
          content: "VALOR BRUTO",
          styles: {
            fontStyle: "bold",
            halign: "center",
            fillColor: destaqueBruto ? [11, 27, 43] : [240, 240, 245],
            textColor: destaqueBruto ? 255 : 20,
          },
        },
        {
          content: fmtBRL(valorBruto),
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: destaqueBruto ? [11, 27, 43] : [240, 240, 245],
            textColor: destaqueBruto ? 255 : 20,
          },
        },
        {
          content: "VALOR LÍQUIDO",
          styles: {
            fontStyle: "bold",
            halign: "center",
            fillColor: !destaqueBruto ? [11, 27, 43] : [240, 240, 245],
            textColor: !destaqueBruto ? 255 : 20,
          },
        },
        {
          content: fmtBRL(valorLiquido),
          styles: {
            halign: "right",
            fontStyle: "bold",
            fillColor: !destaqueBruto ? [11, 27, 43] : [240, 240, 245],
            textColor: !destaqueBruto ? 255 : 20,
          },
        },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: usableW - 40 - 18 - 36 - 32 - 36 - 32 },
      1: { cellWidth: 40 },
      2: { cellWidth: 18 },
      3: { cellWidth: 36 },
      4: { cellWidth: 32 },
      5: { cellWidth: 36 },
      6: { cellWidth: 32 },
    },
    theme: "grid",
  });

  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY ?? y) + 1;

  // Média de desconto aplicada
  const mediaDesc =
    pi.valor_tabela > 0 ? ((pi.valor_desconto / pi.valor_tabela) * 100).toFixed(2) + "%" : "0%";
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: RESERVA_RODAPE },
    body: [
      [
        {
          content: `Desconto médio aplicado: ${mediaDesc}`,
          styles: { fontStyle: "bold", halign: "right" },
        },
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: usableW } },
    theme: "grid",
  });

  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY ?? y) + 2;

  // Linha de datas de faturamento
  if (pi.data_faturamento || pi.data_envio_nota || pi.data_vencimento_nota) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, bottom: RESERVA_RODAPE },
      body: [
        [
          { content: `Data de faturamento: ${fmtDate(pi.data_faturamento)}` },
          { content: `Envio da nota: ${fmtDate(pi.data_envio_nota)}` },
          { content: `Vencimento: ${fmtDate(pi.data_vencimento_nota)}` },
        ],
      ],
      styles: { fontSize: 8, cellPadding: 1.5 },
      theme: "grid",
    });
    // @ts-expect-error
    y = (doc.lastAutoTable?.finalY ?? y) + 3;
  }

  // Observação (PI + emissora)
  if (obsTexto) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(obsTexto, W - M * 2);
    const blocoH = 4 + lines.length * 4 + 3;
    if (y + blocoH + RESERVA_RODAPE > H) {
      doc.addPage();
      y = 14;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(11, 27, 43);
    doc.text("OBSERVAÇÕES", M, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40);
    doc.text(lines, M, y, { align: "left" });
    y += lines.length * 4 + 3;
    doc.setTextColor(0);
  }

  // Bloco: ENTREGA DE MATERIAL — usa o texto cadastrado na emissora; se vazio, omite
  {
    const txt = (pi.emissora?.entrega_material ?? "").trim();
    if (txt) {
      const entregaLinhas = doc.splitTextToSize(txt, W - M * 2) as string[];
      const blocoH = 4 + entregaLinhas.length * 4 + 3;
      if (y + blocoH + RESERVA_RODAPE > H) {
        doc.addPage();
        y = 14;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(11, 27, 43);
      doc.text("ENTREGA DE MATERIAL", M, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40);
      doc.text(entregaLinhas, M, y);
      y += entregaLinhas.length * 4 + 3;
      doc.setTextColor(0);
    }
  }

  // Assinaturas em TODAS as páginas (executivo + diretoria + cliente/agência) + rodapé.
  const totalPages = doc.getNumberOfPages();
  for (let pIdx = 1; pIdx <= totalPages; pIdx++) {
    doc.setPage(pIdx);
    const sigY = H - 24; // Subiu um pouco para caber 3 assinaturas se necessário
    doc.setDrawColor(120);

    // Layout com 3 colunas para assinaturas
    const colWidth = (W - M * 2) / 3;

    // Linhas horizontais
    doc.line(M + 5, sigY, M + colWidth - 5, sigY); // Executivo
    doc.line(M + colWidth + 5, sigY, M + colWidth * 2 - 5, sigY); // Diretoria
    doc.line(M + colWidth * 2 + 5, sigY, W - M - 5, sigY); // Cliente

    // 1. Assinatura do executivo
    if (opts?.assinaturaExecutivoDataUrl) {
      try {
        const fmt = opts.assinaturaExecutivoDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
        doc.addImage(opts.assinaturaExecutivoDataUrl, fmt, M + 10, sigY - 14, colWidth - 20, 13);
      } catch {
        /* ignore */
      }
    }
    if (opts?.nomeExecutivo) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(11, 27, 43);
      doc.text(opts.nomeExecutivo, M + colWidth / 2, sigY - 2, {
        align: "center",
        maxWidth: colWidth - 10,
      });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text("Assinatura do Executivo", M + colWidth / 2, sigY + 4, { align: "center" });

    // 2. Assinatura da Diretoria
    if (opts?.assinaturaDiretoriaDataUrl) {
      try {
        const fmt = opts.assinaturaDiretoriaDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
        doc.addImage(
          opts.assinaturaDiretoriaDataUrl,
          fmt,
          M + colWidth + 10,
          sigY - 14,
          colWidth - 20,
          13,
        );
      } catch {
        /* ignore */
      }
    }
    if (opts?.nomeDiretoria) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(11, 27, 43);
      doc.text(opts.nomeDiretoria, M + colWidth * 1.5, sigY - 2, {
        align: "center",
        maxWidth: colWidth - 10,
      });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text("Assinatura da Diretoria", M + colWidth * 1.5, sigY + 4, { align: "center" });

    // 3. Assinatura digital do cliente
    const ac = opts?.assinaturaCliente;
    if (ac?.assinado_em) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(11, 27, 43);
      doc.text(ac.nome_assinante || "—", M + colWidth * 2.5, sigY - 4, {
        align: "center",
        maxWidth: colWidth - 10,
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100);
      const carimbo = `CPF ${ac.cpf || "—"} · ${new Date(ac.assinado_em).toLocaleString("pt-BR")}${ac.ip ? ` · IP ${ac.ip}` : ""}`;
      doc.text(carimbo, M + colWidth * 2.5, sigY + 8, { align: "center", maxWidth: colWidth - 5 });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text("Assinatura do Cliente / Agência", M + colWidth * 2.5, sigY + 4, { align: "center" });

    // Rodapé de página — dados do perfil que gerou o PI
    const criador = (
      pi as unknown as {
        criador?: {
          nome?: string | null;
          email?: string | null;
          cargo?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
        } | null;
      }
    ).criador;
    doc.setFontSize(7);
    doc.setTextColor(90);
    if (criador && (criador.nome || criador.email)) {
      const partes = [
        criador.nome ? `Gerado por: ${criador.nome}` : null,
        criador.cargo || null,
        criador.email || null,
        criador.telefone ? `Tel: ${criador.telefone}` : null,
        criador.whatsapp ? `WhatsApp: ${criador.whatsapp}` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.text(partes, W / 2, H - 9, { align: "center", maxWidth: W - M * 2 });
    }
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(
      `Página ${pIdx}/${totalPages} · Documento gerado em ${new Date().toLocaleString("pt-BR")} · Mídia.OS — TV Brasília`,
      W / 2,
      H - 5,
      { align: "center" },
    );
    if (layout.rodapeTexto && layout.rodapeTexto.trim()) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(layout.rodapeTexto.trim(), W / 2, H - 13, { align: "center", maxWidth: W - M * 2 });
    }
    doc.setTextColor(0);
  }

  applyTrialWatermark(doc);

  if (mode === "blob") {
    const blob = doc.output("blob") as Blob;
    return URL.createObjectURL(blob);
  }
  if (mode === "preview") {
    const blob = doc.output("blob") as Blob;
    const url = URL.createObjectURL(blob);
    if (win && !win.closed) {
      win.location.href = url;
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } else {
    const cliNome = (pi.cliente?.razao_social || pi.cliente?.nome_fantasia || "Cliente")
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim();
    doc.save(`${cliNome} - ${pi.numero}.pdf`);
  }
}
