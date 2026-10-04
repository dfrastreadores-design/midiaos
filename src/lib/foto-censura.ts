/**
 * Utilitários para ocultar/censurar logotipos de terceiros e telefones em fotos de produtos/parceiros,
 * e sobrepor a identidade visual da Nexo.
 */

export type CensuraTipo = "blur" | "pixel" | "tarja" | "logo_nexo";

export type LogoEstilo = "selo_escuro" | "selo_claro" | "tarja_rodape" | "limpo";

export type CensuraRegiao = {
  id: string;
  tipo: CensuraTipo;
  // Coordenadas relativas (0 a 1) para manter fidelidade em qualquer resolução
  x: number;
  y: number;
  width: number;
  height: number;
  intensidade?: number; // 5 a 40 para blur/pixel
  corTarja?: string; // ex: "#0f172a"
  logoEstilo?: LogoEstilo;
  textoPersonalizado?: string;
};

/**
 * Carrega uma imagem de forma segura evitando problemas de CORS quando possível.
 */
export function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback sem crossOrigin para data URLs ou URLs locais
      const imgFallback = new Image();
      imgFallback.onload = () => resolve(imgFallback);
      imgFallback.onerror = (err) => reject(new Error("Não foi possível carregar a imagem. " + err));
      imgFallback.src = src;
    };
    img.src = src;
  });
}

/**
 * Desenha o selo / marca da Nexo no canvas em uma posição específica.
 */
export function desenharSeloNexo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  estilo: LogoEstilo = "selo_escuro",
  logoImg?: HTMLImageElement | null,
  texto?: string,
) {
  ctx.save();

  const isRodape = estilo === "tarja_rodape";
  const radius = isRodape ? 0 : Math.min(12, Math.min(w, h) * 0.15);

  // 1. Fundo do Selo
  if (estilo === "selo_escuro" || isRodape) {
    // Fundo escuro premium
    ctx.fillStyle = isRodape ? "rgba(10, 15, 29, 0.95)" : "rgba(15, 23, 42, 0.96)";
    if (radius > 0) {
      roundRect(ctx, x, y, w, h, radius);
      ctx.fill();
      // Borda sutil ciano/azul
      ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.02);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, w, h);
      // Linha superior destacada
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(x, y, w, Math.max(2, h * 0.04));
    }
  } else if (estilo === "selo_claro") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.02);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
    ctx.stroke();
  }

  // 2. Se houver logo image (tenant ou nexo svg)
  const padding = Math.min(w, h) * 0.12;
  const availW = w - padding * 2;
  const availH = h - padding * 2;

  if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
    ctx.save();
    if (radius > 0) {
      roundRect(ctx, x, y, w, h, radius);
      ctx.clip();
    }

    // Fundo escuro idêntico ao fundo da marca Nexo (#222222) para cobrir 100% o que estiver por baixo
    ctx.fillStyle = estilo === "selo_claro" ? "#ffffff" : "#222222";
    ctx.fillRect(x, y, w, h);

    const imgRatio = logoImg.width / logoImg.height;
    const boxRatio = w / h;
    let targetW = w;
    let targetH = h;
    let targetX = x;
    let targetY = y;

    if (boxRatio > imgRatio) {
      // Caixa mais larga que a logo: centraliza horizontalmente
      targetW = h * imgRatio;
      targetX = x + (w - targetW) / 2;
    } else {
      // Caixa mais alta que a logo: centraliza verticalmente
      targetH = w / imgRatio;
      targetY = y + (h - targetH) / 2;
    }

    ctx.drawImage(logoImg, targetX, targetY, targetW, targetH);
    ctx.restore();

    // Borda elegante no selo
    if (radius > 0) {
      ctx.save();
      roundRect(ctx, x, y, w, h, radius);
      ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.02);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.75)";
      ctx.stroke();
      ctx.restore();
    } else if (isRodape) {
      // Linha de acabamento superior no rodapé
      ctx.save();
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(x, y, w, Math.max(2.5, h * 0.035));
      ctx.restore();
    }
  } else {
    // 3. Fallback: Desenho vetorial direto de alta fidelidade "NEXO MÍDIA"
    const isDark = estilo === "selo_escuro" || isRodape;
    const iconSize = Math.min(availH * 0.75, availW * 0.28);
    const startX = x + padding;
    const centerY = y + h / 2;

    // Símbolo N gradiente estilizado
    const iconX = startX;
    const iconY = centerY - iconSize / 2;

    // Caixa do ícone
    const grad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
    grad.addColorStop(0, "#06b6d4");
    grad.addColorStop(0.5, "#3b82f6");
    grad.addColorStop(1, "#1d4ed8");

    ctx.fillStyle = grad;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, Math.max(3, iconSize * 0.24));
    ctx.fill();

    // Linhas internas do ícone "N"
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, iconSize * 0.12);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(iconX + iconSize * 0.3, iconY + iconSize * 0.72);
    ctx.lineTo(iconX + iconSize * 0.3, iconY + iconSize * 0.28);
    ctx.lineTo(iconX + iconSize * 0.5, iconY + iconSize * 0.5);
    ctx.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.28);
    ctx.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.72);
    ctx.stroke();

    // Tipografia NEXO
    const textStartX = iconX + iconSize + Math.max(8, padding * 0.6);
    const fontSize = Math.max(11, Math.min(h * 0.36, 32));

    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXO", textStartX, centerY - fontSize * 0.25);

    // Subtítulo
    const subFontSize = Math.max(7, fontSize * 0.38);
    ctx.font = `700 ${subFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
    ctx.fillText(texto || "MÍDIA INTELIGENTE", textStartX, centerY + fontSize * 0.45);
  }

  ctx.restore();
}

/**
 * Aplica um efeito de mosaico/pixelado em uma região do canvas.
 */
function aplicarPixelado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tamanhoBloco = 12) {
  if (w <= 0 || h <= 0) return;
  const offCanvas = document.createElement("canvas");
  const numX = Math.max(1, Math.floor(w / tamanhoBloco));
  const numY = Math.max(1, Math.floor(h / tamanhoBloco));
  offCanvas.width = numX;
  offCanvas.height = numY;

  const offCtx = offCanvas.getContext("2d");
  if (!offCtx) return;

  offCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, numX, numY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, 0, 0, numX, numY, x, y, w, h);
  ctx.restore();
}

/**
 * Aplica desfoque (blur) gaussiano/médio na região especificada.
 */
function aplicarBlur(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, intensidade = 16) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Usa filter blur nativo do canvas suportado em navegadores modernos
  ctx.filter = `blur(${intensidade}px)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
}

/**
 * Helper para desenhar retângulos arredondados.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renderiza a imagem e todas as regiões de censura / logos no canvas de saída.
 */
export function renderizarCensurasNoCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  regioes: CensuraRegiao[],
  logoNexoImg?: HTMLImageElement | null,
) {
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  // 1. Desenha a foto original limpa
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;

  // 2. Aplica cada região em ordem
  for (const reg of regioes) {
    const rx = Math.round(reg.x * W);
    const ry = Math.round(reg.y * H);
    const rw = Math.round(reg.width * W);
    const rh = Math.round(reg.height * H);

    if (rw <= 0 || rh <= 0) continue;

    switch (reg.tipo) {
      case "blur": {
        const intensidade = Math.round((reg.intensidade || 16) * (Math.max(W, H) / 1000));
        aplicarBlur(ctx, rx, ry, rw, rh, Math.max(8, intensidade));
        break;
      }
      case "pixel": {
        const tamanhoBloco = Math.max(6, Math.round((reg.intensidade || 14) * (Math.max(W, H) / 1000)));
        aplicarPixelado(ctx, rx, ry, rw, rh, tamanhoBloco);
        break;
      }
      case "tarja": {
        ctx.save();
        ctx.fillStyle = reg.corTarja || "#0f172a";
        roundRect(ctx, rx, ry, rw, rh, Math.min(8, Math.min(rw, rh) * 0.1));
        ctx.fill();
        ctx.restore();
        break;
      }
      case "logo_nexo": {
        desenharSeloNexo(ctx, rx, ry, rw, rh, reg.logoEstilo || "selo_escuro", logoNexoImg, reg.textoPersonalizado);
        break;
      }
    }
  }
}
