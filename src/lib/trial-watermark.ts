import type jsPDF from "jspdf";

// Estado global em memória — definido pelo hook useTenantBranding quando o
// tenant logado está em "trial". PDFs gerados nesse estado recebem uma tarja
// diagonal "DOCUMENTO PARA TESTE — SEM VALOR" em todas as páginas.
let __trialMode = false;
let __systemName = "MidiaOS";

export function setTrialMode(active: boolean, systemName?: string) {
  __trialMode = !!active;
  if (systemName) __systemName = systemName;
}

export function isTrialMode() {
  return __trialMode;
}

/**
 * Aplica tarja diagonal em todas as páginas do documento, indicando que é
 * um documento de teste sem valor fiscal/comercial. Chamar ao final da
 * geração, antes do save/output.
 */
export function applyTrialWatermark(doc: jsPDF) {
  if (!__trialMode) return;

  const pages = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const texto = `${__systemName.toUpperCase()} — DOCUMENTO PARA TESTE • SEM VALOR`;

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const anyDoc = doc as unknown as {
      GState?: new (o: { opacity: number }) => unknown;
      setGState?: (g: unknown) => void;
    };
    const gState = anyDoc.GState ? new anyDoc.GState({ opacity: 0.18 }) : null;
    if (gState && anyDoc.setGState) anyDoc.setGState(gState);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.min(W, H) * 0.09);
    doc.setTextColor(200, 0, 0);
    doc.text(texto, W / 2, H / 2, { align: "center", angle: 30 });

    // Faixa de topo
    doc.setFontSize(9);
    doc.setTextColor(180, 0, 0);
    doc.text(texto, W / 2, 6, { align: "center" });
    doc.text(texto, W / 2, H - 2, { align: "center" });

    if (gState && anyDoc.setGState) anyDoc.setGState(new anyDoc.GState!({ opacity: 1 }));
    doc.setTextColor(0);
  }
}
