// Gera APRESENTAÇÃO (PPTX + PDF) de uma proposta comercial
// Usa o template oficial da TV Brasília (6 slides) como background.
// O slide 5 é populado com os itens/valores; se não couber, slides
// adicionais são criados com o mesmo layout do slide 5.
import PptxGenJS from "pptxgenjs";
import { applyTrialWatermark } from "@/lib/trial-watermark";
import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

import tplSlide1 from "@/assets/proposta-template/hslide-1.jpg";
import tplSlide2 from "@/assets/proposta-template/hslide-2.jpg";
import tplSlide3 from "@/assets/proposta-template/hslide-3.jpg";
import tplSlide4 from "@/assets/proposta-template/hslide-4.jpg";
import tplSlide5 from "@/assets/proposta-template/hslide-5.jpg";
import tplSlide6 from "@/assets/proposta-template/hslide-6.jpg";
import logoMidiaOS from "@/assets/logo-midiaos.png";

// Em modo demo, força a logo mídia.OS no lugar da logo do cliente/agência.
const isDemoMode = () => {
  try { return typeof window !== "undefined" && localStorage.getItem("midiaos:is_demo") === "1"; }
  catch { return false; }
};
const pickLogoUrl = (clienteLogo?: string | null, agenciaLogo?: string | null) =>
  isDemoMode() ? logoMidiaOS : (clienteLogo || agenciaLogo || null);

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type Item = {
  tipo: string;
  programa?: string | null;
  horario?: string | null;
  formato?: string | null;
  insercoes_dia: number;
  total_insercoes: number;
  valor_unit: number;
  valor_tabela: number;
  desconto: number;
  valor_negociado: number;
  link_modelo?: string | null;
  mes?: number | null;
  ano?: number | null;
  dias_semana?: string[] | null;
  dias_mes?: number[] | null;
};

const MESES_BR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const DIA_SEMANA_ABBR: Record<string, string> = {
  dom: "Dom", domingo: "Dom",
  seg: "Seg", segunda: "Seg", "segunda-feira": "Seg",
  ter: "Ter", terca: "Ter", "terça": "Ter", "terca-feira": "Ter", "terça-feira": "Ter",
  qua: "Qua", quarta: "Qua", "quarta-feira": "Qua",
  qui: "Qui", quinta: "Qui", "quinta-feira": "Qui",
  sex: "Sex", sexta: "Sex", "sexta-feira": "Sex",
  sab: "Sáb", "sáb": "Sáb", sabado: "Sáb", "sábado": "Sáb",
};

function formatPeriodo(it: Item): string {
  if (it.mes && it.ano) return `${MESES_BR[(it.mes - 1) % 12]}/${it.ano}`;
  if (it.ano) return String(it.ano);
  return "";
}
function formatDias(it: Item): string {
  const ds = (it.dias_semana ?? []).map((d) => DIA_SEMANA_ABBR[d?.toLowerCase?.()] || d).filter(Boolean);
  if (ds.length > 0) return ds.join(", ");
  const dm = it.dias_mes ?? [];
  if (dm.length > 0) {
    const s = [...dm].sort((a, b) => a - b);
    return `Dias ${s.join(", ")}`;
  }
  return "";
}
function detalhesProduto(it: Item): string {
  const partes = [formatPeriodo(it), formatDias(it)].filter(Boolean);
  return partes.join(" · ");
}

type Entidade = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  cidade?: string | null;
  uf?: string | null;
  logo_url?: string | null;
} | null | undefined;

export type PropostaApresentacao = {
  numero: string;
  campanha: string;
  validade?: string | null;
  created_at?: string | null;
  observacao?: string | null;
  cliente_avulso?: string | null;
  valor_tabela: number;
  valor_desconto: number;
  valor_negociado: number;
  total_insercoes: number;
  cliente?: Entidade;
  agencia?: Entidade;
  executivo?: {
    nome: string;
    email?: string | null;
    telefone?: string | null;
    cargo?: string | null;
  };
  itens?: Item[];
};

const fmtDataBR = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

// Soma N dias úteis (segunda a sexta) a uma data
function addBusinessDays(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

const OBSERVACAO_PADRAO =
  "A negociação aplicada nesta proposta comercial (desconto e bonificações) está vinculada ao volume de mídia contratada e volume de investimento no período mencionado.";

// Aplica padrões: validade = 10 dias úteis a partir da data da proposta,
// e acrescenta a observação padrão sobre vínculo de volume.
function aplicarPadroes(p: PropostaApresentacao): { p: PropostaApresentacao; dataStr: string } {
  const dataBase = p.created_at ? new Date(p.created_at) : new Date();
  const validadeCalc = addBusinessDays(dataBase, 10);
  const obsAtual = (p.observacao || "").trim();
  const observacao = obsAtual.includes(OBSERVACAO_PADRAO)
    ? obsAtual
    : [obsAtual, OBSERVACAO_PADRAO].filter(Boolean).join("\n\n");
  return {
    p: { ...p, validade: validadeCalc.toISOString(), observacao },
    dataStr: fmtDataBR(dataBase.toISOString()),
  };
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "cliente";

// Dispara o download de um Blob de forma robusta — funciona em iframes
// sandbox (preview do Lovable) abrindo nova aba como fallback quando o
// clique programático em <a download> é bloqueado.
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Carrega imagem importada como dataURL (necessário p/ pptxgenjs e jsPDF)
async function assetToDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  const blob = await r.blob();
  return await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("fail load asset"));
    reader.readAsDataURL(blob);
  });
}

async function logoToDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  // Se já for data:URL, retorna direto
  if (url.startsWith("data:")) return url;
  try { return await assetToDataUrl(url); } catch { return null; }
}


// Quantos itens cabem por slide de proposta (área disponível após o cabeçalho)
const ITENS_POR_SLIDE = 12;

// Cores do template
const COR_HEADER = "0F5C7C"; // azul header
const COR_AMARELO = "F7B500";
const COR_TEXT_DARK = "1F2937";

// ====== PPTX ======
export async function gerarPptxProposta(p: PropostaApresentacao, _resumoIA: string, layoutConfig?: any) {
  const { p: pAdj, dataStr } = aplicarPadroes(p);
  p = pAdj;
  const pptx = new PptxGenJS();
  
  // Cores customizadas do layout
  const primaryColor = (layoutConfig?.colors?.primary || COR_HEADER).replace("#", "");
  const secondaryColor = (layoutConfig?.colors?.secondary || COR_AMARELO).replace("#", "");
  const baseFontSize = layoutConfig?.font?.baseSize || 10;
  
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.title = `Proposta ${p.numero}`;
  const W = 13.33;
  const H = 7.5;

  const clienteNome = p.cliente?.nome_fantasia || p.cliente?.razao_social || p.cliente_avulso || "Cliente";
  const agenciaNome = p.agencia?.nome_fantasia || p.agencia?.razao_social || null;

  const logoUrl = pickLogoUrl(p.cliente?.logo_url, p.agencia?.logo_url);

  // Pré-carrega imagens do template
  const [bg1, bg2, bg3, bg4, bg5, bg6, logoData] = await Promise.all([
    assetToDataUrl(tplSlide1),
    assetToDataUrl(tplSlide2),
    assetToDataUrl(tplSlide3),
    assetToDataUrl(tplSlide4),
    assetToDataUrl(tplSlide5),
    assetToDataUrl(tplSlide6),
    logoToDataUrl(logoUrl),
  ]);

  const addBackground = (slide: PptxGenJS.Slide, data: string) => {
    slide.addImage({ data, x: 0, y: 0, w: W, h: H });
  };

  const addClienteBadge = (slide: PptxGenJS.Slide, isFirst: boolean) => {
    if (!isFirst) return;
    if (logoData) {
      // Posição: 4cm (1.575 polegadas) acima do rodapé (fundo)
      // Logo com altura 2.604. Bottom em H - 1.575 -> y = H - 1.575 - 2.604 = H - 4.179
      slide.addImage({ 
        data: logoData, 
        x: 0.4, 
        y: H - 3.0, 
        w: 3.125, 
        h: 2.604, 
        sizing: { type: "contain", w: 3.125, h: 2.604 } 
      });
    } else {
      slide.addText(clienteNome, {
        x: 0.4, y: H - 3.0, w: 9.0, h: 2.604,
        fontSize: 22, bold: true, color: "FFFFFF", align: "left", valign: "middle",
      });

    }
  };


  // Slides 1-4 do template como background (sem overlay)
  for (let i = 0; i < 4; i++) {
    const s = pptx.addSlide();
    const bg = [bg1, bg2, bg3, bg4][i];
    addBackground(s, bg);
    addClienteBadge(s, i === 0);
  }

  // Slide da Proposta (Resumo IA)

  // Slide 5 (e adicionais conforme overflow): proposta com valores
  const itens = [...(p.itens ?? [])].sort((a, b) =>
    (a.tipo || "").localeCompare(b.tipo || "", "pt-BR") ||
    (a.programa || "").localeCompare(b.programa || "", "pt-BR"),
  );
  const totalPaginas = Math.max(1, Math.ceil(itens.length / ITENS_POR_SLIDE));

  for (let pagina = 0; pagina < totalPaginas; pagina++) {
    const s = pptx.addSlide();
    addBackground(s, bg5);
    addClienteBadge(s, false);

    const inicio = pagina * ITENS_POR_SLIDE;
    const fim = Math.min(inicio + ITENS_POR_SLIDE, itens.length);
    const slice = itens.slice(inicio, fim);
    const isUltima = pagina === totalPaginas - 1;

    // Bloco superior (logo abaixo do header amarelo "PROPOSTA COMERCIAL")
    const headerTexts: any[] = [
      { text: "Cliente: ", options: { bold: true, color: COR_HEADER, fontSize: 11 } },
      { text: clienteNome, options: { color: COR_TEXT_DARK, fontSize: 11 } },
    ];

    if (agenciaNome) {
      headerTexts.push({ text: "    Agência: ", options: { bold: true, color: COR_HEADER, fontSize: 11 } });
      headerTexts.push({ text: agenciaNome, options: { color: COR_TEXT_DARK, fontSize: 11 } });
    }

    headerTexts.push({ text: "    Campanha: ", options: { bold: true, color: COR_HEADER, fontSize: 11 } });
    headerTexts.push({ text: p.campanha, options: { color: COR_TEXT_DARK, fontSize: 11 } });
    

    headerTexts.push({ text: `    Nº ${p.numero}`, options: { color: COR_TEXT_DARK, fontSize: 10, italic: true } });

    s.addText(headerTexts, { x: 0.4, y: 1.5, w: W - 0.8, h: 0.35, valign: "middle" });

    // Rodapé com Data e Validade da proposta
    const footerTexts: any[] = [
      { text: "Data: ", options: { bold: true, color: COR_HEADER, fontSize: 9 } },
      { text: dataStr, options: { color: COR_TEXT_DARK, fontSize: 9 } },
    ];
    if (p.validade) {
      footerTexts.push({ text: "    Validade: ", options: { bold: true, color: COR_HEADER, fontSize: 9 } });
      footerTexts.push({ text: `${fmtDataBR(p.validade)} (10 dias úteis)`, options: { color: COR_TEXT_DARK, fontSize: 9 } });
    }
    s.addText(footerTexts, { x: 0.4, y: H - 0.32, w: W - 0.8, h: 0.25, valign: "middle", align: "center" });

    // Linha do executivo responsável
    if (p.executivo?.nome) {
      const execTexts: any[] = [
        { text: "Executivo: ", options: { bold: true, color: "FFFFFF", fontSize: 10 } },
        { text: p.executivo.nome, options: { color: "FFFFFF", fontSize: 10 } },
      ];
      if (p.executivo.cargo) {
        execTexts.push({ text: ` (${p.executivo.cargo})`, options: { color: "FFFFFF", fontSize: 9, italic: true } });
      }
      if (p.executivo.email) {
        execTexts.push({ text: "    ✉ ", options: { color: "FFFFFF", fontSize: 10 } });
        execTexts.push({ text: p.executivo.email, options: { color: "FFFFFF", fontSize: 10 } });
      }
      if (p.executivo.telefone) {
        execTexts.push({ text: "    ☎ ", options: { color: "FFFFFF", fontSize: 10 } });
        execTexts.push({ text: p.executivo.telefone, options: { color: "FFFFFF", fontSize: 10 } });
      }
      s.addText(execTexts, { x: 0.4, y: 1.78, w: W - 0.8, h: 0.3, valign: "middle" });
    }

    // Tabela de itens
    const headerRow: PptxGenJS.TableRow = [
      { text: "Tipo", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10 } },
      { text: "Programa", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10 } },
      { text: "Horário", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10 } },
      { text: "Form.", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "center" } },
      { text: "Modelo", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "center" } },
      { text: "Ins/dia", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
      { text: "Total Ins.", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
      { text: "Vlr Unit.", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
      { text: "Total Tabela", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
      { text: "Desc.", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
      { text: "Vlr Negociado", options: { bold: true, color: "FFFFFF", fill: { color: COR_HEADER }, fontSize: 10, align: "right" } },
    ];

    const bodyRows: PptxGenJS.TableRow[] = slice.map((it) => {
      const det = detalhesProduto(it);
      const programaCell: PptxGenJS.TableCell = det
        ? {
            text: [
              { text: it.programa || "—", options: { fontSize: 9, color: COR_TEXT_DARK } },
              { text: `\n${det}`, options: { fontSize: 7, italic: true, color: "6B7280" } },
            ],
            options: { fontSize: 9, color: COR_TEXT_DARK },
          }
        : { text: it.programa || "—", options: { fontSize: 9, color: COR_TEXT_DARK } };
      return [
        { text: it.tipo, options: { fontSize: 9, color: COR_TEXT_DARK } },
        programaCell,
        { text: it.horario || "—", options: { fontSize: 9, color: COR_TEXT_DARK } },
        { text: it.formato || "—", options: { fontSize: 9, align: "center", color: COR_TEXT_DARK } },
        it.link_modelo
          ? { text: "modelo", options: { fontSize: 9, align: "center", color: "0F5C7C", underline: { style: "sng" }, hyperlink: { url: it.link_modelo } } }
          : { text: "—", options: { fontSize: 9, align: "center", color: COR_TEXT_DARK } },
        { text: String(it.insercoes_dia), options: { fontSize: 9, align: "right", color: COR_TEXT_DARK } },
        { text: String(it.total_insercoes), options: { fontSize: 9, align: "right", color: COR_TEXT_DARK } },
        { text: fmtBRL(it.valor_unit), options: { fontSize: 9, align: "right", color: COR_TEXT_DARK } },
        { text: fmtBRL(it.valor_tabela), options: { fontSize: 9, align: "right", color: COR_TEXT_DARK } },
        { text: `${(it.desconto || 0).toFixed(0)}%`, options: { fontSize: 9, align: "right", color: COR_TEXT_DARK } },
        it.valor_negociado > 0
          ? { text: fmtBRL(it.valor_negociado), options: { fontSize: 9, align: "right", bold: true, color: COR_HEADER } }
          : { text: "Bonificação", options: { fontSize: 9, align: "right", bold: true, color: "F7B500", fill: { color: "FFF7E0" } } },
      ];
    });

    s.addTable([headerRow, ...bodyRows], {
      x: 0.4, y: 2.15, w: W - 0.8,
      colW: [1.0, 2.1, 1.0, 0.6, 0.7, 0.6, 0.75, 1.1, 1.3, 0.65, 1.94],
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      rowH: 0.34,
    });

    // (Rodapé removido)


    // Totais somente na última página
    if (isUltima) {
      const cardY = H - 1.6;
      const cards = [
        { titulo: "Total de inserções", valor: String(p.total_insercoes) },
        { titulo: "Valor de tabela", valor: fmtBRL(p.valor_tabela) },
        { 
          titulo: "Desconto", 
          valor: p.valor_tabela > 0 
            ? `${fmtBRL(p.valor_desconto)} (${((p.valor_desconto / p.valor_tabela) * 100).toFixed(0)}%)` 
            : fmtBRL(p.valor_desconto) 
        },
        { titulo: "Valor Bruto negociado", valor: p.valor_negociado > 0 ? fmtBRL(p.valor_negociado) : "Bonificação", destaque: true },
      ];
      cards.forEach((c, i) => {
        const cw = (W - 0.8) / cards.length;
        const x = 0.4 + i * cw + 0.08;
        const w = cw - 0.16;
        s.addShape("roundRect", {
          x, y: cardY, w, h: 1.1,
          fill: { color: c.destaque ? COR_AMARELO : COR_HEADER },
          line: { color: c.destaque ? COR_AMARELO : COR_HEADER },
          rectRadius: 0.08,
        });
        s.addText(c.titulo, {
          x, y: cardY + 0.08, w, h: 0.32,
          fontSize: 11, color: c.destaque ? COR_HEADER : "FFFFFF", align: "center", bold: true,
        });
        s.addText(c.valor, {
          x, y: cardY + 0.40, w, h: 0.65,
          fontSize: 22, bold: true,
          color: c.destaque ? COR_HEADER : "FFFFFF",
          align: "center", valign: "middle",
        });
      });
    }

    // Links de modelos (calculado antes para reutilizar em slides duplicados)
    const modelos = slice
      .filter((it) => it.link_modelo)
      .map((it) => ({ label: it.programa || it.tipo, url: it.link_modelo as string }));

    // Observações da proposta organizadas
    if (p.observacao) {
      // Calcula altura necessária baseada no texto (≈90 chars por linha a 12pt)
      const obsLines = Math.max(
        1,
        (p.observacao || "").split(/\r?\n/).reduce((acc, l) => acc + Math.max(1, Math.ceil(l.length / 90)), 0),
      );
      const requiredH = 0.7 + obsLines * 0.22;

      // Espaço disponível: na última página fica ACIMA dos cards de totais
      // (cards começam em H - 1.6); nas demais, abaixo da tabela.
      const minY = 2.2; // logo abaixo do header
      const maxBottom = isUltima ? H - 1.7 : H - 0.4;
      const availableH = maxBottom - minY;

      const renderObs = (slide: PptxGenJS.Slide, y: number, h: number) => {
        slide.addShape("rect", {
          x: 0.4, y, w: W - 0.8, h,
          fill: { color: "FFF7ED" },
          line: { color: COR_HEADER, width: 1.2 }
        });
        slide.addShape("rect", {
          x: 0.4, y, w: 0.12, h,
          fill: { color: COR_HEADER },
          line: { color: COR_HEADER, width: 0 }
        });
        slide.addText("OBSERVAÇÕES", {
          x: 0.65, y: y + 0.08, w: 3, h: 0.3,
          fontSize: 12, bold: true, color: COR_HEADER,
        });
        const segs: any[] = [];
        (p.observacao || "").split(/([A-Za-z]\))/g).forEach((part) => {
          if (!part) return;
          const isPrefix = /^[A-Za-z]\)$/.test(part);
          segs.push({ text: part, options: { bold: isPrefix, color: isPrefix ? COR_HEADER : "111827" } });
        });
        slide.addText(segs.length ? segs : (p.observacao || ""), {
          x: 0.65, y: y + 0.42, w: W - 1.2, h: h - 0.5,
          fontSize: 12, bold: false, color: "111827",
          align: "left", valign: "top",
          lineSpacingMultiple: 1,
          paraSpaceBefore: 0, paraSpaceAfter: 0,
        });
      };

      if (requiredH <= availableH) {
        // Cabe na mesma página — posiciona acima dos cards (última) ou logo abaixo da tabela
        const obsY = isUltima ? maxBottom - requiredH : Math.min(H - 0.4 - requiredH, H - 1.8);
        renderObs(s, obsY, requiredH);
      } else if (isUltima) {
        // Renderiza o que cabe na página atual (acima dos cards)
        renderObs(s, minY, availableH);

        // Duplica o slide 5: slide(s) adicional(is) para o restante das observações
        // Estima quantas linhas couberam e parte do texto restante
        const linhasCabem = Math.max(1, Math.floor((availableH - 0.5) / 0.22));
        const todasLinhas: string[] = [];
        (p.observacao || "").split(/\r?\n/).forEach((l) => {
          const chunks = Math.max(1, Math.ceil(l.length / 90));
          for (let i = 0; i < chunks; i++) {
            todasLinhas.push(l.slice(i * 90, (i + 1) * 90));
          }
        });
        const restante = todasLinhas.slice(linhasCabem).join("\n");

        if (restante.trim()) {
          const sObs = pptx.addSlide();
          addBackground(sObs, bg5);
          addClienteBadge(sObs, false);
          sObs.addText(headerTexts, { x: 0.4, y: 1.5, w: W - 0.8, h: 0.35, valign: "middle" });

          const obsBackup = p.observacao;
          (p as any).observacao = restante;
          const extraH = Math.min(H - 2.6, 0.7 + (todasLinhas.length - linhasCabem) * 0.22);
          renderObs(sObs, 2.2, extraH);
          (p as any).observacao = obsBackup;

          // Mantém os links de modelos no slide duplicado
          if (modelos.length > 0) {
            const linksY = H - 0.7;
            sObs.addText("Modelos/Referências:", {
              x: 0.5, y: linksY, w: 2, h: 0.2,
              fontSize: 8, bold: true, color: COR_HEADER,
            });
            let xCursor = 0.5;
            modelos.forEach((m, idx) => {
              sObs.addText(m.label, {
                x: xCursor + 1.2, y: linksY, w: 2, h: 0.2,
                fontSize: 8, color: COR_HEADER, underline: { style: "sng" },
                hyperlink: { url: m.url },
              });
              if (idx < modelos.length - 1) {
                sObs.addText("  ·  ", {
                  x: xCursor + 1.2 + (m.label.length * 0.07), y: linksY, w: 0.2, h: 0.2,
                  fontSize: 8, color: "6B7280",
                });
              }
              xCursor += (m.label.length * 0.08) + 0.2;
            });
          }
        }
      } else {
        renderObs(s, minY, Math.min(availableH, requiredH));
      }
    }

    // (modelos já calculado acima)

    if (modelos.length > 0) {
      const linksY = isUltima ? H - 4.6 : H - 1.8; // Acima das observações se houver espaço
      let xCursor = 0.5;
      
      s.addText("Modelos/Referências:", {
        x: 0.5, y: linksY, w: 2, h: 0.2,
        fontSize: 8, bold: true, color: COR_HEADER,
      });

      modelos.forEach((m, idx) => {
        const text = `${m.label}${idx < modelos.length - 1 ? "  ·  " : ""}`;
        const w = (text.length * 0.08); // Estimativa simples de largura
        if (xCursor + w > W - 1) { xCursor = 0.5; } // wrap simples não suportado nativamente assim, mas ajuda
        
        s.addText(m.label, {
          x: xCursor + 1.2, y: linksY, w: 2, h: 0.2,
          fontSize: 8, color: COR_HEADER, underline: { style: "sng" },
          hyperlink: { url: m.url }
        });
        
        if (idx < modelos.length - 1) {
          s.addText("  ·  ", {
            x: xCursor + 1.2 + (m.label.length * 0.07), y: linksY, w: 0.2, h: 0.2,
            fontSize: 8, color: "6B7280"
          });
        }
        xCursor += (m.label.length * 0.08) + 0.2;
      });
    }

    if (!isUltima) {

      // Indicador de continuação
      s.addText("continua →", {
        x: W - 2.0, y: H - 0.5, w: 1.7, h: 0.3,
        fontSize: 11, italic: true, color: COR_HEADER, align: "right",
      });
    }
  }

  // Slide final do template (A TV QUE É DAQUI)
  const sFim = pptx.addSlide();
  addBackground(sFim, bg6);

  // Hyperlinks sobre os ícones de redes sociais (canto superior direito)
  const socials = [
    { url: "https://www.instagram.com/tvbrasilia/", y: 1.15 },
    { url: "https://www.facebook.com/tvbrasiliaoficial", y: 2.35 },
    { url: "https://www.youtube.com/TVBrasiliaOficial", y: 3.45 },
  ];
  socials.forEach(({ url, y }) => {
    sFim.addText(" ", {
      x: 10.0, y, w: 3.1, h: 0.95,
      fontSize: 1, color: "FFFFFF",
      hyperlink: { url },
    });
  });

  if (p.executivo?.nome) {
    const perfilLines = [
      p.executivo.nome,
      p.executivo.cargo,
      p.executivo.email,
      p.executivo.telefone,
    ].filter((line): line is string => Boolean(line));
    perfilLines.forEach((line, i) => {
      sFim.addText(line, {
        x: 0.4,
        y: H - 2.0 + i * 0.48,
        w: 4.2,
        h: 0.48,
        fontSize: 18,
        color: "FFFFFF",
        align: "left",
        valign: "middle",
      });
    });
  }


  const pptxBlob = (await pptx.write({ outputType: "blob" })) as Blob;
  saveBlob(pptxBlob, `${slugify(clienteNome)}-Proposta-${p.numero}.pptx`);
}

// ====== PDF (mesma estrutura visual) ======
export async function gerarPdfProposta(p: PropostaApresentacao, _resumoIA: string, layoutConfig?: any, options?: { returnBlob?: boolean }): Promise<Blob | void> {
  const { p: pAdj, dataStr } = aplicarPadroes(p);
  p = pAdj;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();   // 297
  const H = doc.internal.pageSize.getHeight();  // 210

  const clienteNome = p.cliente?.nome_fantasia || p.cliente?.razao_social || p.cliente_avulso || "Cliente";
  const agenciaNome = p.agencia?.nome_fantasia || p.agencia?.razao_social || null;

  const logoUrl = pickLogoUrl(p.cliente?.logo_url, p.agencia?.logo_url);

  const [bg1, bg2, bg3, bg4, bg5, bg6, logoData] = await Promise.all([
    assetToDataUrl(tplSlide1),
    assetToDataUrl(tplSlide2),
    assetToDataUrl(tplSlide3),
    assetToDataUrl(tplSlide4),
    assetToDataUrl(tplSlide5),
    assetToDataUrl(tplSlide6),
    logoToDataUrl(logoUrl),
  ]);

  const setBackground = (data: string) => {
    try { doc.addImage(data, "JPEG", 0, 0, W, H, undefined, "FAST"); } catch { /* ignore */ }
  };

  const addClienteBadge = (isFirst: boolean) => {
    if (!isFirst) return;
    if (logoData) {
      try {
        const fmt = logoData.startsWith("data:image/png") ? "PNG" : "JPEG";
        // Posição: 4cm (40mm) acima do rodapé. Logo altura 66mm.
        // Bottom em H - 40 -> y = H - 40 - 66 = H - 106
        doc.addImage(logoData, fmt, 10, H - 76, 79, 66, undefined, "FAST");
      } catch { /* ignore */ }
    } else {
      doc.setFont("helvetica", "bold"); doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(clienteNome, 10, H - 43, { align: "left" });

    }
  };


  // Páginas 1-4: template como background
  setBackground(bg1);
  addClienteBadge(true); // Apenas na primeira página
  
  for (const bg of [bg2, bg3, bg4]) {
    doc.addPage();
    setBackground(bg);
    // addClienteBadge(false); // Não adiciona nas outras
  }


  // Página 5..N: proposta
  const itens = [...(p.itens ?? [])].sort((a, b) =>
    (a.tipo || "").localeCompare(b.tipo || "", "pt-BR") ||
    (a.programa || "").localeCompare(b.programa || "", "pt-BR"),
  );
  const PDF_ITENS_POR_PAGINA = 13;
  const totalPaginas = Math.max(1, Math.ceil(itens.length / PDF_ITENS_POR_PAGINA));


  for (let pagina = 0; pagina < totalPaginas; pagina++) {
    doc.addPage();
    setBackground(bg5);
    addClienteBadge(false);


    const inicio = pagina * PDF_ITENS_POR_PAGINA;
    const fim = Math.min(inicio + PDF_ITENS_POR_PAGINA, itens.length);
    const slice = itens.slice(inicio, fim);
    const isUltima = pagina === totalPaginas - 1;

    // Cabeçalho cliente / campanha / agência / validade
    doc.setTextColor(15, 92, 124);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Cliente:", 10, 40);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.text(clienteNome, 22, 40);

    let xCursor = 22 + doc.getTextWidth(clienteNome) + 10;
    
    if (agenciaNome) {
      doc.setTextColor(15, 92, 124);
      doc.setFont("helvetica", "bold");
      doc.text("Agência:", xCursor, 40);
      xCursor += 14;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.text(agenciaNome, xCursor, 40);
      xCursor += doc.getTextWidth(agenciaNome) + 10;
    }

    doc.setTextColor(15, 92, 124);
    doc.setFont("helvetica", "bold");
    doc.text("Campanha:", xCursor, 40);
    xCursor += 18;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.text(p.campanha, xCursor, 40);
    xCursor += doc.getTextWidth(p.campanha) + 10;

    doc.setTextColor(15, 92, 124);
    doc.setFont("helvetica", "bold");
    doc.text(`Nº ${p.numero}${totalPaginas > 1 ? ` (${pagina + 1}/${totalPaginas})` : ""}`, W - 10, 40, { align: "right" });

    // Rodapé com Data e Validade (texto branco)
    {
      const yFooter = H - 5;
      let xf = 10;
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Data:", xf, yFooter);
      xf += 9;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.text(dataStr, xf, yFooter);
      xf += doc.getTextWidth(dataStr) + 6;
      if (p.validade) {
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Validade:", xf, yFooter);
        xf += 14;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(255, 255, 255);
        doc.text(`${fmtDataBR(p.validade)} (10 dias úteis)`, xf, yFooter);
      }
    }

    // Linha do executivo responsável (texto branco)
    if (p.executivo?.nome) {
      let ex = 10;
      const yEx = 46;
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Executivo:", ex, yEx);
      ex += 18;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.text(p.executivo.nome, ex, yEx);
      ex += doc.getTextWidth(p.executivo.nome) + 3;
      if (p.executivo.cargo) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(255, 255, 255);
        const cg = `(${p.executivo.cargo})`;
        doc.text(cg, ex, yEx);
        ex += doc.getTextWidth(cg) + 6;
      }
      if (p.executivo.email) {
        doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("Email:", ex, yEx); ex += 11;
        doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255);
        doc.text(p.executivo.email, ex, yEx);
        ex += doc.getTextWidth(p.executivo.email) + 6;
      }
      if (p.executivo.telefone) {
        doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("Tel:", ex, yEx); ex += 8;
        doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255);
        doc.text(p.executivo.telefone, ex, yEx);
      }
    }


    autoTable(doc, {
      startY: 50,
      head: [["Tipo", "Programa", "Horário", "Form.", "Modelo", "Ins/dia", "Total Ins.", "Vlr Unit.", "Total Tabela", "Desc.", "Vlr Negociado"]],
      body: slice.map((it) => {
        const det = detalhesProduto(it);
        const programa = det ? `${it.programa || "—"}\n${det}` : (it.programa || "—");
        return [
          it.tipo,
          { content: programa, styles: { fontSize: 9 } },
          it.horario || "—", it.formato || "—",
          it.link_modelo ? { content: "modelo", styles: { textColor: [15, 92, 124] as any } } : "—",
          String(it.insercoes_dia), String(it.total_insercoes),
          fmtBRL(it.valor_unit), fmtBRL(it.valor_tabela), `${(it.desconto || 0).toFixed(0)}%`,
          it.valor_negociado > 0 ? fmtBRL(it.valor_negociado) : "Bonificação",
        ];
      }),
      margin: { left: 10, right: 10 },
      styles: { fontSize: 9, cellPadding: 1.8 },
      headStyles: { fillColor: [15, 92, 124], textColor: 255 },
      columnStyles: {
        4: { halign: "center" },
        5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "right" }, 8: { halign: "right" },
        9: { halign: "right" }, 10: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && typeof data.cell.raw === "string" && data.cell.raw === "Bonificação") {
          data.cell.styles.textColor = [247, 181, 0];
          data.cell.styles.fillColor = [255, 247, 224];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const it = slice[data.row.index];
          if (it?.link_modelo) {
            (doc as any).link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: it.link_modelo });
          }
        }
      },
    });

    // (Rodapé removido)

    // Observações organizadas no PDF — letra+parêntese em negrito
    if (p.observacao) {
      const margin = 10;
      const width = W - 20;
      doc.setFontSize(10);
      const splitObs: string[] = doc.splitTextToSize(p.observacao, width - 6);
      const lineH = 3.6;
      const requiredH = 14 + splitObs.length * lineH;

      // Acima dos cards de totais quando última (cards começam em H - 32);
      // demais páginas usam espaço livre abaixo da tabela.
      const minY = 50;
      const maxBottom = isUltima ? H - 34 : H - 8;
      const availableH = maxBottom - minY;

      const renderObs = (yTop: number, h: number, lines: string[]) => {
        doc.setFillColor(255, 247, 237);
        doc.setDrawColor(15, 92, 124);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yTop, width, h, 1.5, 1.5, "FD");
        doc.setFillColor(15, 92, 124);
        doc.rect(margin, yTop, 1.5, h, "F");
        doc.setTextColor(15, 92, 124);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("OBSERVAÇÕES", margin + 4, yTop + 6);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        lines.forEach((line, idx) => {
          let x = margin + 4;
          const y = yTop + 11 + idx * lineH;
          const segs = line.split(/([A-Za-z]\))/g).filter(Boolean);
          segs.forEach((seg) => {
            const isPrefix = /^[A-Za-z]\)$/.test(seg);
            doc.setFont("helvetica", isPrefix ? "bold" : "normal");
            if (isPrefix) doc.setTextColor(15, 92, 124); else doc.setTextColor(17, 24, 39);
            doc.text(seg, x, y);
            x += doc.getTextWidth(seg);
          });
        });
        doc.setFont("helvetica", "normal");
      };

      if (requiredH <= availableH) {
        const yTop = isUltima ? maxBottom - requiredH : minY;
        renderObs(yTop, requiredH, splitObs);
      } else if (isUltima) {
        // Duplica a página 5: cria página adicional só para observações
        const linesPerPage = Math.max(1, Math.floor((H - 30 - 14) / lineH));
        for (let i = 0; i < splitObs.length; i += linesPerPage) {
          doc.addPage();
          setBackground(bg5);
          const chunk = splitObs.slice(i, i + linesPerPage);
          renderObs(15, 14 + chunk.length * lineH, chunk);
        }
      } else {
        renderObs(minY, availableH, splitObs.slice(0, Math.floor((availableH - 14) / lineH)));
      }
    }


    if (isUltima) {

      const cards = [
        { t: "Total de inserções", v: String(p.total_insercoes), accent: false },
        { t: "Valor de tabela", v: fmtBRL(p.valor_tabela), accent: false },
        { 
          t: "Desconto", 
          v: p.valor_tabela > 0 
            ? `${fmtBRL(p.valor_desconto)} (${((p.valor_desconto / p.valor_tabela) * 100).toFixed(0)}%)` 
            : fmtBRL(p.valor_desconto), 
          accent: false 
        },
        { t: "Valor Bruto negociado", v: p.valor_negociado > 0 ? fmtBRL(p.valor_negociado) : "Bonificação", accent: true },
      ];
      const cardY = H - 32;
      const cardH = 24;
      const cardW = (W - 20) / cards.length - 2;
      cards.forEach((c, i) => {
        const x = 10 + i * (cardW + 2);
        if (c.accent) doc.setFillColor(247, 181, 0); else doc.setFillColor(15, 92, 124);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "F");
        doc.setTextColor(c.accent ? 15 : 255, c.accent ? 92 : 255, c.accent ? 124 : 255);
        doc.setFontSize(8); doc.setFont("helvetica", "bold");
        doc.text(c.t, x + cardW / 2, cardY + 7, { align: "center" });
        doc.setFontSize(p.valor_negociado > 0 ? 14 : 11); doc.setFont("helvetica", "bold");
        doc.text(c.v, x + cardW / 2, cardY + 18, { align: "center" });
      });
    } else {
      doc.setTextColor(15, 92, 124); doc.setFontSize(9); doc.setFont("helvetica", "italic");
      doc.text("continua →", W - 10, H - 8, { align: "right" });
    }
  }

  // Página final: A TV QUE É DAQUI
  doc.addPage();
  setBackground(bg6);

  // Hyperlinks sobre os ícones de redes sociais (canto superior direito)
  // PDF A4 landscape: 297 x 210 mm
  const socialsPdf = [
    { url: "https://www.instagram.com/tvbrasilia/", y: 32 },
    { url: "https://www.facebook.com/tvbrasiliaoficial", y: 65 },
    { url: "https://www.youtube.com/TVBrasiliaOficial", y: 96 },
  ];
  socialsPdf.forEach(({ url, y }) => {
    doc.link(223, y, 70, 26, { url });
  });


  if (p.executivo?.nome) {
    const perfilLines = [
      p.executivo.nome,
      p.executivo.cargo,
      p.executivo.email,
      p.executivo.telefone,
    ].filter((line): line is string => Boolean(line));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    perfilLines.forEach((line, i) => {
      doc.text(line, 10, H - 50 + i * 9, { align: "left" });
    });
  }


  const rodapeY = H - 14;
  if (p.validade || p.created_at) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(0); // Preto
    const partes: string[] = [];
    if (p.created_at) partes.push(`Gerada em ${fmtDataBR(p.created_at)}`);
    if (p.validade) partes.push(`Validade: ${fmtDataBR(p.validade)}`);
    doc.text(partes.join("  ·  "), W - 10, rodapeY, { align: "right" });
  }

  applyTrialWatermark(doc);
  const blob = doc.output("blob") as Blob;
  if (options?.returnBlob) return blob;
  saveBlob(blob, `${slugify(clienteNome)}-Proposta-${p.numero}.pdf`);
}

/**
 * Modelo Simplificado Estratégico para DOOH/OOH
 * Baseado na imagem de referência NEXO
 */
export async function gerarPdfPropostaSimplificada(p: PropostaApresentacao, _resumoIA: string, layoutConfig?: any): Promise<void> {
  const { p: pAdj, dataStr } = aplicarPadroes(p);
  p = pAdj;
  
  // PDF em A4 Retrato para este modelo (conforme imagem)
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const clienteNome = p.cliente?.nome_fantasia || p.cliente?.razao_social || p.cliente_avulso || "Cliente";
  const logoUrl = pickLogoUrl(p.cliente?.logo_url, p.agencia?.logo_url);
  const logoData = await logoToDataUrl(logoUrl);

  // Cores
  const COR_NAVY = [15, 23, 42]; // Azul escuro
  const COR_PRIMARY = [59, 130, 246]; // Azul MidiaOS
  const COR_BG_LIGHT = [248, 250, 252];
  
  // 1. Header (Logo + Título)
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 15, 15, 40, 25, undefined, "FAST");
    } catch { 
      doc.setFontSize(22); doc.setFont("helvetica", "bold");
      doc.text(clienteNome.slice(0, 15), 15, 25);
    }
  } else {
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("MÍDIA.OS", 15, 25);
  }

  doc.setFillColor(COR_NAVY[0], COR_NAVY[1], COR_NAVY[2]);
  doc.roundedRect(W - 85, 15, 70, 8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text("PLANO ESTRATÉGICO & COMERCIAL", W - 50, 20.5, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text("PROPOSTA DE MÍDIA OOH & DOOH", W - 15, 30, { align: "right" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(150);
  doc.text("Geolocalização, Atração de Fluxo e Blindagem de Marca", W - 15, 36, { align: "right" });

  doc.setDrawColor(230);
  doc.line(15, 42, W - 15, 42);

  // 2. Info Bar
  const infoY = 50;
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text("CLIENTE / SOLICITANTE:", 15, infoY);
  doc.text("PRAÇA DE ATUAÇÃO:", 80, infoY);
  doc.text("PERÍODO PADRÃO:", 135, infoY);
  doc.text("DATA DE EMISSÃO:", 175, infoY);

  doc.setFont("helvetica", "bold"); doc.setTextColor(0);
  doc.text(clienteNome, 15, infoY + 5, { maxWidth: 60 });
  doc.text(p.cliente?.cidade || "Área de Atendimento", 80, infoY + 5);
  doc.text("30 Dias (Mensal)", 135, infoY + 5);
  doc.text(dataStr, 175, infoY + 5);

  // 3. Seções Institucionais
  let y = 70;
  
  // Sobre a Empresa
  doc.setFillColor(COR_PRIMARY[0], COR_PRIMARY[1], COR_PRIMARY[2]);
  doc.rect(15, y, 2, 6, "F");
  doc.setFontSize(12); doc.text("1. SOBRE A ESTRATÉGIA", 20, y + 5);
  y += 10;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  const sobreTxt = "Nossa estratégia é especializada em conectar marcas e negócios locais ao seu público de interesse no exato instante de maior predisposição ao consumo. Unimos inteligência geográfica e pontos de alto impacto.";
  doc.text(doc.splitTextToSize(sobreTxt, W - 30), 15, y);
  y += 15;

  // Defesa Técnica
  doc.setFillColor(COR_PRIMARY[0], COR_PRIMARY[1], COR_PRIMARY[2]);
  doc.rect(15, y, 2, 6, "F");
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("2. DEFESA TÉCNICA E ESTRATÉGICA (RACIONAL DE MÍDIA)", 20, y + 5);
  y += 10;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Plano concebido sob a estratégia de Atração de Fluxo e Cerco Geográfico para interceptar o morador em seu deslocamento.", 15, y, { maxWidth: W - 30 });
  y += 15;

  // Cards de Racional
  const cardW = (W - 40) / 3;
  const cards = [
    { t: "Hiperproximidade", d: "Comunicação focada no consumidor que mora e trabalha na área." },
    { t: "Sinergia", d: "Presença em telas que criam lembrança diária e confiança." },
    { t: "Impacto 100%", d: "Sem custos com cliques desperdiçados. Verba investida na praça." }
  ];
  
  cards.forEach((c, i) => {
    const cx = 15 + i * (cardW + 5);
    doc.setDrawColor(220, 220, 220); doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, y, cardW, 25, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(c.t, cx + 5, y + 7);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(c.d, cardW - 10), cx + 5, y + 13);
  });
  y += 35;

  // Métrica Contadores
  const metricW = (W - 45) / 5;
  const metrics = [
    { v: p.total_insercoes > 100 ? "64" : "12", l: "TELAS" },
    { v: "22", l: "CONDOMÍNIOS" },
    { v: "+" + p.total_insercoes.toLocaleString(), l: "INSERÇÕES" },
    { v: "+21.500", l: "IMPACTOS" },
    { v: String(p.itens?.length || 0), l: "PONTOS" }
  ];

  metrics.forEach((m, i) => {
    const mx = 15 + i * (metricW + 5);
    doc.setFillColor(COR_BG_LIGHT[0], COR_BG_LIGHT[1], COR_BG_LIGHT[2]);
    doc.roundedRect(mx, y, metricW, 20, 2, 2, "F");
    doc.setTextColor(COR_PRIMARY[0], COR_PRIMARY[1], COR_PRIMARY[2]);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(m.v, mx + metricW / 2, y + 10, { align: "center" });
    doc.setTextColor(100); doc.setFontSize(7);
    doc.text(m.l, mx + metricW / 2, y + 16, { align: "center" });
  });
  y += 30;

  // 4. Tabela de Detalhamento
  doc.setTextColor(0);
  doc.setFillColor(COR_PRIMARY[0], COR_PRIMARY[1], COR_PRIMARY[2]);
  doc.rect(15, y, 2, 6, "F");
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("3. DETALHAMENTO DOS PONTOS", 20, y + 5);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["CÓD.", "FORMATO", "REGIÃO", "LOCALIZAÇÃO & REFERÊNCIA", "VALOR MENSAL"]],
    body: (p.itens || []).map((it, i) => [
      `Item ${i + 1}`,
      it.formato || "DOOH",
      p.cliente?.cidade || "Centro",
      it.programa || "Ponto Estratégico",
      fmtBRL(it.valor_negociado)
    ]),
    headStyles: { fillColor: COR_NAVY as any, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      4: { halign: "right", fontStyle: "bold" }
    },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Total Investimento
  doc.setFillColor(240, 240, 240);
  doc.rect(15, finalY, W - 30, 8, "F");
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`TOTAL INVESTIMENTO MENSAL: ${fmtBRL(p.valor_negociado)}`, W - 20, finalY + 5.5, { align: "right" });

  // Footer
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(150);
  doc.text(`${p.executivo?.nome || "Mídia.OS"} | (61) 9 8474-6857 | rafaelnexomidia@gmail.com`, W / 2, H - 10, { align: "center" });

  applyTrialWatermark(doc);
  saveBlob(doc.output("blob"), `${slugify(clienteNome)}-Proposta-Simplificada-${p.numero}.pdf`);
}

async function renderMetricCard(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  // Card background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };
  const rgb = hexToRgb(color);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  // Label
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(label.toUpperCase(), x + w / 2, y + 6, { align: "center" });

  // Value
  doc.setFontSize(18);
  doc.text(value, x + w / 2, y + 16, { align: "center" });
}


