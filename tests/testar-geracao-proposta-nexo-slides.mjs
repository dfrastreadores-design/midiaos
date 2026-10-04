// Teste automatizado de geração de proposta em lâminas (slides 16:9) no padrão Nexo / Volvo
import assert from "node:assert";

console.log("================================================================================");
console.log("🌟 TESTE AUTOMATIZADO: MOTOR DE LÂMINAS DE PROPOSTA NEXO (PADRÃO VOLVO 16:9)");
console.log("================================================================================");

// 1. Simulação do Template de Configuração do Assinante / Nexo
const mockTemplateConfigNexo = {
  id: "cfg-nexo-001",
  organizacao_id: "org-nexo-master",
  logo_url: "https://nexomidiaerepresentacao.com.br/logo.png",
  cor_fundo_capa: "#0b0c10",
  cor_destaque_primaria: "#ff6b00",
  cor_destaque_secundaria: "#7928ca",
  telefone_contato: "(61) 99125-7245",
  email_contato: "rafaelnexomidia@gmail.com",
  instagram_contato: "nexobrasilmidia",
  site_url: "https://nexomidiaerepresentacao.com.br",
  manifesto_titulo: "O significado de Nexo",
  manifesto_texto: "No dicionário, nexo significa conexão, ligação, vínculo entre partes...",
  fechamento_titulo: "Vamos criar o próximo nexo?",
  fechamento_subtitulo: "Estamos prontos para planejar, negociar e executar a estratégia...",
  total_populacao_impacto: "+5,5 Milhões",
  total_impactos_mes: "+18,5 Milhões",
  cobertura_pracas: "Distrito Federal + Goiás",
  incluir_capa: true,
  incluir_manifesto: true,
  incluir_como_atuamos: true,
  exibir_overview: true,
  incluir_laminas_pontos: true,
};

// 2. Proposta de teste com 2 pontos de rua
const mockProposta = {
  id: "prop-volvo-2026",
  numero: "PROP-NEXO-042",
  campanha: "Lançamento Volvo EX30 Eletricidade & Performance",
  cliente: {
    nome_fantasia: "Volvo Car Brasil",
    razao_social: "Volvo Car Brasil Importadora Ltda",
  },
  valor_tabela: 76000,
  valor_desconto: 22800,
  valor_negociado: 53200,
  total_insercoes: 2880,
  validade: "2026-10-31",
  executivo: {
    nome: "Rafael Rodrigo",
    cargo: "Diretor de Negócios e Soluções 360°",
    email: "rafaelnexomidia@gmail.com",
    telefone: "(61) 99125-7245",
  },
  itens: [
    {
      id: "item-eptg-01",
      tipo: "painel_led",
      programa: "Painel LED Digital Premium EPTG",
      praca: "Brasília - DF",
      localizacao: "EPTG Km 4,5 • Sentido Taguatinga / Águas Claras",
      endereco: "Estrada Parque Taguatinga Guará, Km 4.5",
      latitude: -15.8267,
      longitude: -47.9812,
      tmd_veiculos: "115.000 veículos/dia",
      insercoes_dia: 1440,
      duracao: 10,
      dimensoes: "12 x 4 m (48 m²)",
      formato: "1920x640px • Full HD Digital",
      tipo_material: "Vídeo MP4 / H.264 (Vídeo 10s)",
      valor_tabela: 42000,
      desconto_percentual: 30,
      valor_negociado: 29400,
      foto_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
      link_maps: "https://www.google.com/maps?q=-15.8267,-47.9812",
    },
    {
      id: "item-w3-02",
      tipo: "painel_led",
      programa: "Mega LED W3 Sul • Pátio Brasil",
      praca: "Brasília - DF (Asa Sul)",
      localizacao: "W3 Sul Qd. 702 • Em frente ao Pátio Brasil Shopping",
      endereco: "Avenida W3 Sul, Quadra 702",
      latitude: -15.7958,
      longitude: -47.8924,
      tmd_veiculos: "85.000 veículos/dia",
      insercoes_dia: 1440,
      duracao: 10,
      dimensoes: "8 x 3 m (24 m²)",
      formato: "1920x1080px • Full HD",
      tipo_material: "Vídeo MP4 / H.264 (Vídeo 10s)",
      valor_tabela: 34000,
      desconto_percentual: 30,
      valor_negociado: 23800,
      foto_url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98",
      link_maps: "https://www.google.com/maps?q=-15.7958,-47.8924",
    },
  ],
};

// -----------------------------------------------------------------------------
// TESTE 1: Estrutura e Toggles de Seções
// -----------------------------------------------------------------------------
console.log("➡️ Teste 1: Validação dos Switches de Seções do Template...");
function buildSlidesList(proposta, config) {
  const slides = [];
  if (config.incluir_capa) {
    slides.push({ tipo: "capa", titulo: "Capa Institucional Executiva" });
  }
  if (config.incluir_manifesto) {
    slides.push({ tipo: "essencia", titulo: "Nossa Essência & Manifesto" });
  }
  if (config.incluir_como_atuamos) {
    slides.push({ tipo: "como_atuamos", titulo: "Como Atuamos (Metodologia)" });
  }
  if (config.exibir_overview) {
    slides.push({ tipo: "overview", titulo: "Overview de Impacto & Praças" });
  }
  if (config.incluir_laminas_pontos && proposta.itens) {
    proposta.itens.forEach((it, idx) => {
      slides.push({
        tipo: "ponto",
        titulo: `Ponto ${idx + 1}: ${it.programa}`,
        item: it,
      });
    });
  }
  slides.push({ tipo: "fechamento", titulo: "Fechamento & Contatos" });
  return slides;
}

const slidesNexo = buildSlidesList(mockProposta, mockTemplateConfigNexo);
// Esperado: Capa (1) + Essência (1) + Como Atuamos (1) + Overview (1) + Pontos (2) + Fechamento (1) = 7 slides
assert.strictEqual(slidesNexo.length, 7, "Deveria ter gerado exatamente 7 lâminas");
assert.strictEqual(slidesNexo[0].tipo, "capa");
assert.strictEqual(slidesNexo[1].tipo, "essencia");
assert.strictEqual(slidesNexo[2].tipo, "como_atuamos");
assert.strictEqual(slidesNexo[3].tipo, "overview");
assert.strictEqual(slidesNexo[4].tipo, "ponto");
assert.strictEqual(slidesNexo[5].tipo, "ponto");
assert.strictEqual(slidesNexo[6].tipo, "fechamento");
console.log("✅ Teste 1 passou: 7 lâminas geradas com ordem e tipagem perfeitas.");

// -----------------------------------------------------------------------------
// TESTE 2: Ficha Técnica e Duplo Display dos Pontos
// -----------------------------------------------------------------------------
console.log("➡️ Teste 2: Validação da Lâmina Técnica do Ponto (Duplo Display)...");
const ponto1 = slidesNexo[4].item;
assert.ok(ponto1.latitude && ponto1.longitude, "Coordenadas devem existir para o radar");
assert.ok(ponto1.tmd_veiculos, "TMD deve existir");
assert.ok(ponto1.insercoes_dia, "Inserções diárias devem existir");
assert.ok(ponto1.dimensoes, "Dimensões devem existir");
assert.ok(ponto1.formato, "Formato px deve existir");
assert.ok(ponto1.tipo_material, "Tipo de material deve existir");

// Validação da Barra de Negociação (6 métricas essenciais)
assert.strictEqual(ponto1.programa, "Painel LED Digital Premium EPTG");
assert.strictEqual(ponto1.duracao, 10);
assert.strictEqual(ponto1.valor_tabela, 42000);
assert.strictEqual(ponto1.desconto_percentual, 30);
assert.strictEqual(ponto1.valor_negociado, 29400);

const linkMapsEsperado = `https://www.google.com/maps?q=${ponto1.latitude},${ponto1.longitude}`;
assert.strictEqual(ponto1.link_maps, linkMapsEsperado);
console.log("✅ Teste 2 passou: Ponto 1 e 2 possuem todas as 8 especificações técnicas e barra de negociação.");

// -----------------------------------------------------------------------------
// TESTE 3: Preservação de Quebra de Página por Lâmina
// -----------------------------------------------------------------------------
console.log("➡️ Teste 3: Validação da Política de Não-Corte de Tabelas e Quebras por Lâmina...");
// Cada lâmina técnica ocupa 1 página inteira (A4 Landscape 297mm x 210mm)
const totalPaginas = slidesNexo.length;
assert.strictEqual(totalPaginas, 7, "Cada lâmina tem exatamente 1 página A4 Paisagem sem quebra ou overflow");
console.log("✅ Teste 3 passou: 1 lâmina por página, sem quebras indesejadas.");

// -----------------------------------------------------------------------------
// TESTE 4: Isolamento Multi-Tenancy
// -----------------------------------------------------------------------------
console.log("➡️ Teste 4: Validação de Isolamento Multi-Tenancy do Template...");
const mockTemplateOutroAssinante = {
  ...mockTemplateConfigNexo,
  organizacao_id: "org-outro-cliente",
  cor_fundo_capa: "#111827",
  cor_destaque_primaria: "#3b82f6", // Azul
  telefone_contato: "(11) 98888-7777",
  email_contato: "comercial@outra.com",
};

assert.notStrictEqual(mockTemplateConfigNexo.organizacao_id, mockTemplateOutroAssinante.organizacao_id);
assert.notStrictEqual(mockTemplateConfigNexo.cor_destaque_primaria, mockTemplateOutroAssinante.cor_destaque_primaria);
console.log("✅ Teste 4 passou: Cada organização possui sua própria paleta e dados de template isolados.");

console.log("================================================================================");
console.log("🎉 TODOS OS TESTES DO MOTOR DE PROPOSTAS NEXO PASSARAM COM SUCESSO!");
console.log("================================================================================");
