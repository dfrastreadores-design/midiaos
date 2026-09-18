import * as XLSX from "xlsx";

const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

type Item = {
  tipo: string;
  programa?: string | null;
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
type Entidade = { razao_social?: string | null; nome_fantasia?: string | null; cnpj?: string | null } | null;
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
  cliente?: Entidade;
  agencia?: Entidade;
  itens?: Item[];
};

export function exportarPiExcel(pi: Pi) {
  const wb = XLSX.utils.book_new();

  // Aba 1 — Resumo
  const cli = pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—";
  const ag = pi.agencia?.nome_fantasia || pi.agencia?.razao_social || "Negociação direta";
  const resumo = [
    ["PI", pi.numero],
    ["Campanha", pi.campanha],
    ["Status", pi.status],
    ["Cliente", cli],
    ["CNPJ Cliente", pi.cliente?.cnpj || ""],
    ["Agência", ag],
    ["CNPJ Agência", pi.agencia?.cnpj || ""],
    ["Veiculação", `${MESES[pi.mes_veiculacao - 1]}/${pi.ano_veiculacao}`],
    ["Período", pi.periodo_inicio && pi.periodo_fim ? `${pi.periodo_inicio} a ${pi.periodo_fim}` : ""],
    ["Faturamento", `${pi.faturamento_tipo ?? "bruto"} contra ${pi.faturamento_contra ?? "cliente"}`],
    ["Total inserções", pi.total_insercoes],
    ["Valor tabela", pi.valor_tabela],
    ["Valor desconto", pi.valor_desconto],
    ["Valor negociado", pi.valor_negociado],
    ["Observação", pi.observacao || ""],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumo);
  ws1["!cols"] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  // Aba 2 — Itens
  const header = [
    "Tipo", "Programa", "Formato", "Mês/Ano", "Inserções/dia",
    "Dias da semana", "Dias do mês", "Total inserções",
    "Valor unit.", "Desconto %", "Valor tabela", "Valor negociado",
  ];
  const rows = (pi.itens ?? []).map((it) => [
    it.tipo,
    it.programa || "",
    it.formato || "",
    `${it.mes || pi.mes_veiculacao}/${it.ano || pi.ano_veiculacao}`,
    it.insercoes_dia,
    (it.dias_semana || []).join(", "),
    (it.dias_mes || []).join(", "),
    it.total_insercoes,
    it.valor_unit,
    it.desconto,
    it.valor_tabela,
    it.valor_negociado,
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws2["!cols"] = [
    { wch: 8 }, { wch: 24 }, { wch: 14 }, { wch: 10 },
    { wch: 24 }, { wch: 30 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Itens");

  // Aba 3 — Mapa diário separado por mês (conforme itens do PI)
  const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const itens = pi.itens ?? [];

  const grupos = new Map<string, { ano: number; mes: number; itens: Item[] }>();
  for (const it of itens) {
    const ano = it.ano || pi.ano_veiculacao;
    const mes = it.mes || pi.mes_veiculacao;
    const key = `${ano}-${mes}`;
    if (!grupos.has(key)) grupos.set(key, { ano, mes, itens: [] });
    grupos.get(key)!.itens.push(it);
  }
  if (grupos.size === 0) {
    grupos.set(`${pi.ano_veiculacao}-${pi.mes_veiculacao}`, {
      ano: pi.ano_veiculacao, mes: pi.mes_veiculacao, itens: [],
    });
  }

  const chaves = Array.from(grupos.keys()).sort((a, b) => {
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return ay !== by ? ay - by : am - bm;
  });

  const mapaAoa: (string | number)[][] = [];
  let maxDias = 0;

  for (const key of chaves) {
    const { ano, mes, itens: itensMes } = grupos.get(key)!;
    const diasNoMes = new Date(ano, mes, 0).getDate();
    if (diasNoMes > maxDias) maxDias = diasNoMes;

    mapaAoa.push([`${MESES[mes - 1]}/${ano}`]);
    const head: (string | number)[] = ["Item"];
    for (let d = 1; d <= diasNoMes; d++) head.push(d);
    head.push("Total");
    mapaAoa.push(head);

    for (const it of itensMes) {
      const label = `${it.programa || it.tipo}${it.formato ? ` (${it.formato})` : ""}`;
      const linha: (string | number)[] = [label];
      let totalLinha = 0;
      const diasMesArr = (it.dias_mes ?? []).map(Number);
      const diasSem = new Set((it.dias_semana ?? []).map((s) => s.toLowerCase().slice(0, 3)));
      for (let d = 1; d <= diasNoMes; d++) {
        const dow = DOW[new Date(ano, mes - 1, d).getDay()];
        const occur = diasMesArr.filter((x) => x === d).length;
        const base = it.insercoes_dia || 1;
        let q = 0;
        if (occur > 0) q = occur * base;
        else if (diasMesArr.length === 0 && (diasSem.has(dow) || diasSem.size === 0)) q = base;
        totalLinha += q;
        linha.push(q || "");
      }
      linha.push(totalLinha);
      mapaAoa.push(linha);
    }

    mapaAoa.push([]);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(mapaAoa);
  ws3["!cols"] = [{ wch: 28 }, ...Array(maxDias).fill({ wch: 4 }), { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Mapa diário");

  const cliNome = (pi.cliente?.razao_social || pi.cliente?.nome_fantasia || "Cliente")
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim();
  XLSX.writeFile(wb, `${cliNome} - ${pi.numero}.xlsx`);
}
