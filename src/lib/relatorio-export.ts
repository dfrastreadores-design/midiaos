import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Relatorio } from "@/lib/relatorios.functions";
import { applyTrialWatermark } from "@/lib/trial-watermark";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
};

function formatCell(value: any, type?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "currency") return fmtBRL(Number(value));
  if (type === "number") return fmtNum(Number(value));
  if (type === "date") return fmtDate(String(value));
  return String(value);
}

export function exportRelatorioCsv(rel: Relatorio) {
  const header = rel.columns.map((c) => `"${c.label}"`).join(";");
  const lines = rel.rows.map((r) =>
    rel.columns.map((c) => `"${formatCell(r[c.key], c.type).replace(/"/g, '""')}"`).join(";"),
  );
  const csv = "\uFEFF" + [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${slug(rel.titulo)}.csv`);
}

export function exportRelatorioXlsx(rel: Relatorio) {
  const header = rel.columns.map((c) => c.label);
  const body = rel.rows.map((r) =>
    rel.columns.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined || v === "") return "";
      if (c.type === "currency" || c.type === "number") return Number(v);
      if (c.type === "date") {
        const d = new Date(String(v));
        return Number.isNaN(d.getTime()) ? String(v) : d;
      }
      return String(v);
    }),
  );

  const aoa: any[][] = [
    [rel.titulo],
    [`Gerado em ${new Date(rel.geradoEm).toLocaleString("pt-BR")}`],
    [
      Object.entries(rel.filtros)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join("  |  "),
    ],
    [],
    header,
    ...body,
  ];

  if (rel.totais) {
    aoa.push([]);
    const totRow: any[] = rel.columns.map((c) =>
      rel.totais![c.key] !== undefined ? Number(rel.totais![c.key]) : "",
    );
    totRow[0] = "TOTAIS";
    aoa.push(totRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // formatos por coluna
  const headerRowIdx = 5; // 1-based
  rel.columns.forEach((c, colIdx) => {
    const fmt =
      c.type === "currency"
        ? '"R$" #,##0.00;[Red]-"R$" #,##0.00'
        : c.type === "number"
        ? "#,##0"
        : c.type === "date"
        ? "dd/mm/yyyy"
        : "";
    if (!fmt) return;
    for (let r = headerRowIdx; r < headerRowIdx + body.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: colIdx });
      if (ws[ref]) ws[ref].z = fmt;
    }
  });
  // largura colunas
  ws["!cols"] = rel.columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  // merge título
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(rel.columns.length - 1, 0) } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${slug(rel.titulo)}.xlsx`);
}

export function exportRelatorioPdf(rel: Relatorio) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(rel.titulo, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date(rel.geradoEm).toLocaleString("pt-BR")}`, 40, 56);
  const filtroStr = Object.entries(rel.filtros)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${v}`).join("  •  ");
  if (filtroStr) doc.text(filtroStr, 40, 70);

  autoTable(doc, {
    startY: 84,
    head: [rel.columns.map((c) => c.label)],
    body: rel.rows.map((r) => rel.columns.map((c) => formatCell(r[c.key], c.type))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [38, 70, 60], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 240] },
  });

  if (rel.totais) {
    const endY = (doc as any).lastAutoTable.finalY + 16;
    doc.setFontSize(10);
    doc.setTextColor(0);
    const parts = Object.entries(rel.totais).map(([k, v]) => {
      const col = rel.columns.find((c) => c.key === k);
      return `${col?.label ?? k}: ${formatCell(v, col?.type ?? "currency")}`;
    });
    doc.text(`Totais — ${parts.join("   |   ")}`, 40, endY);
  }

  applyTrialWatermark(doc);
  doc.save(`${slug(rel.titulo)}.pdf`);
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
