import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { applyTrialWatermark } from "@/lib/trial-watermark";

export function exportToXlsx(
  filename: string,
  rows: Record<string, unknown>[],
  sheetName = "Dados",
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportToPdf(filename: string, rows: Record<string, unknown>[], title?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  if (title) doc.text(title, 14, 14);
  if (rows.length) {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: title ? 20 : 14,
      head: [headers],
      body: rows.map((r) => headers.map((h) => (r[h] == null ? "" : String(r[h])))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  }
  applyTrialWatermark(doc);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
