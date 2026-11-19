import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { z } from 'zod';
import { uint8ArrayToBase64, detectMimeTypeFromBytes } from './binary-image-utils';
import { extractImagesFromPdfBuffer } from './pdf-extract';
import { normalizarPracaDeProduto } from '../components/planning/TerritorySelector';
import { associarImagensEEnriquecerProdutos } from './midia-kit-ai.functions';

describe('MIDIA OS — Inventário Inteligente, Mídia Kits e Planejamento', () => {

  describe('1. Detecção e extração de imagens em buffers binários', () => {
    it('deve converter uint8Array em base64 corretamente', () => {
      const sampleBytes = new Uint8Array([77, 73, 68, 73, 65, 79, 83]); // "MIDIAOS"
      const b64 = uint8ArrayToBase64(sampleBytes);
      expect(b64).toBe('TUlESUFPUw==');
    });

    it('deve identificar cabeçalho JPEG SOI', () => {
      const fakeJpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      expect(detectMimeTypeFromBytes(fakeJpegHeader)).toBe('image/jpeg');
    });

    it('deve identificar cabeçalho PNG', () => {
      const fakePngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(detectMimeTypeFromBytes(fakePngHeader)).toBe('image/png');
    });

    it('deve extrair streams JPEG nativos embutidos em arquivos PDF', async () => {
      // Cria buffer simulando stream PDF com JPEG SOI
      const header = new TextEncoder().encode("stream\n");
      const footer = new TextEncoder().encode("\nendstream");
      const fakeJpeg = new Uint8Array(4500);
      fakeJpeg[0] = 0xFF; fakeJpeg[1] = 0xD8; fakeJpeg[2] = 0xFF; fakeJpeg[3] = 0xE0;
      fakeJpeg[4498] = 0xFF; fakeJpeg[4499] = 0xD9;

      const fullPdf = new Uint8Array(header.length + fakeJpeg.length + footer.length);
      fullPdf.set(header, 0);
      fullPdf.set(fakeJpeg, header.length);
      fullPdf.set(footer, header.length + fakeJpeg.length);

      const extracted = await extractImagesFromPdfBuffer(fullPdf, "apresentacao.pdf");
      expect(extracted.length).toBe(1);
      expect(extracted[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(extracted[0].tipoMime).toBe('image/jpeg');
    });
  });

  describe('2. Leitura estruturada de PPTX e associação de fotos por slide', () => {
    it('deve extrair texto, contato, localização e fotos vinculadas ao slide correto', async () => {
      const zip = new JSZip();
      zip.file('ppt/slides/slide1.xml', `
        <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp><p:txBody><a:p><a:r><a:t>Painel Digital DF Plaza - Águas Claras</a:t></a:r></a:p></p:txBody></p:sp>
              <p:sp><p:txBody><a:p><a:r><a:t>R$ 15.000,00 mensal. Contato: comercial@nexomidia.com.br - Tel: (61) 98888-7777</a:t></a:r></a:p></p:txBody></p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>
      `);
      zip.file('ppt/slides/_rels/slide1.xml.rels', `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpg"/>
        </Relationships>
      `);
      const fakeImgBytes = new Uint8Array(4000);
      fakeImgBytes[0] = 0xFF; fakeImgBytes[1] = 0xD8; fakeImgBytes[2] = 0xFF; fakeImgBytes[3] = 0xE0;
      fakeImgBytes[3998] = 0xFF; fakeImgBytes[3999] = 0xD9;
      zip.file('ppt/media/image1.jpg', fakeImgBytes);

      const pptxBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const file = new File([pptxBuffer], 'MidiaKit_DFPlaza.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      const { processarArquivoImportacao } = await import('./documento-importer');
      const result = await processarArquivoImportacao(file);

      expect(result.tipo).toBe('pptx');
      expect(result.textoCompleto).toContain('DF Plaza');
      expect(result.parceiroDetectado?.email).toBe('comercial@nexomidia.com.br');
      expect(result.parceiroDetectado?.cidade).toBe('Águas Claras');
      expect(result.parceiroDetectado?.uf).toBe('DF');
      expect(result.imagensExtraidas.length).toBe(1);
      expect(result.imagensExtraidas[0].slideOuPagina).toBe(1);
      expect(result.imagensExtraidas[0].contextoTexto).toContain('DF Plaza');
    });
  });

  describe('3. Normalização Geográfica de Praças (Clusterização Real)', () => {
    it('deve mapear endereços de Águas Claras para o cluster "Águas Claras - DF"', () => {
      const p = { cidade: 'Águas Claras', estado: 'DF', endereco: 'Av das Araucárias' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('Águas Claras - DF');
    });

    it('deve mapear bairro Taguatinga para o cluster "Taguatinga - DF"', () => {
      const p = { cidade: 'Brasília', estado: 'DF', bairro: 'Taguatinga Sul', endereco: 'Pistão Sul' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('Taguatinga - DF');
    });

    it('deve mapear Sobradinho para o cluster "Sobradinho - DF"', () => {
      const p = { cidade: 'Brasília', estado: 'DF', endereco: 'BR-020 km 12 - Sobradinho' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('Sobradinho - DF');
    });

    it('deve mapear Gama para o cluster "Gama & Santa Maria - DF"', () => {
      const p = { cidade: 'Brasília', estado: 'DF', bairro: 'Setor Central Gama' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('Gama & Santa Maria - DF');
    });

    it('deve mapear Plano Piloto para "Plano Piloto - DF"', () => {
      const p = { cidade: 'Brasília', estado: 'DF', endereco: 'Eixo Monumental, Torre de TV' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('Plano Piloto - DF');
    });

    it('deve mapear outras capitais como "São Paulo - SP"', () => {
      const p = { cidade: 'São Paulo', estado: 'SP', bairro: 'Vila Olímpia' } as any;
      expect(normalizarPracaDeProduto(p).pracaNome).toBe('São Paulo - SP');
    });
  });

  describe('4. Filtragem dinâmica de produtos da Etapa 3 para Etapa 4', () => {
    it('deve filtrar apenas os produtos correspondentes às praças selecionadas', () => {
      const mockProdutos = [
        { id: '11111111-1111-4111-8111-111111111111', nome: 'Painel Águas Claras', cidade: 'Águas Claras', estado: 'DF' },
        { id: '22222222-2222-4222-8222-222222222222', nome: 'LED Taguatinga', cidade: 'Brasília', estado: 'DF', bairro: 'Taguatinga' },
        { id: '33333333-3333-4333-8333-333333333333', nome: 'Outdoor São Paulo', cidade: 'São Paulo', estado: 'SP' },
      ];

      const pracasSelecionadas = ['Águas Claras - DF', 'Taguatinga - DF'];
      const filtrados = mockProdutos.filter(p => pracasSelecionadas.includes(normalizarPracaDeProduto(p as any).pracaNome));

      expect(filtrados.length).toBe(2);
      expect(filtrados.map(p => p.nome)).toEqual(['Painel Águas Claras', 'LED Taguatinga']);
    });
  });

  describe('5. Enriquecimento de produtos com fotos e preservação de preços de tabela', () => {
    it('deve associar fotos por proximidade de texto e manter preço de tabela intocado', () => {
      const produtosBrutos = [
        {
          id_temp: 'temp-1',
          nome: 'Painel LED W3 Norte',
          midia: 'DOOH',
          categoria_midia: 'ooh_dooh',
          preco_tabela: 12000,
          valor_unit: 12000,
          cidade: 'Brasília',
          estado: 'DF',
        }
      ];

      const imagensDisponiveis = [
        {
          id: 'img-1',
          nomeArquivo: 'led_w3.jpg',
          dataUrl: 'data:image/jpeg;base64,12345',
          tipoMime: 'image/jpeg',
          tamanhoBytes: 5000,
          paginaOuSlide: 1,
          contextoTexto: 'Painel LED W3 Norte - Excelente visibilidade',
        }
      ];

      const { produtos, fotosPendentes } = associarImagensEEnriquecerProdutos(produtosBrutos, imagensDisponiveis);
      expect(produtos.length).toBe(1);
      expect(produtos[0].fotos?.length).toBe(1);
      expect(fotosPendentes.length).toBe(0);
      expect(produtos[0].preco_tabela).toBe(12000);
      expect(produtos[0].status_validacao).toBe('extraido');
    });
  });

  describe('6. Validação estrita de UUIDs em pontos_midia (Propostas)', () => {
    const PontoMidiaSchema = z.object({
      produto_id: z.string().uuid(),
      nome: z.string().min(1),
      valor_tabela: z.number().positive(),
      desconto_percentual: z.number().min(0).max(100).default(0),
      valor_negociado: z.number().positive(),
    });

    it('deve aceitar UUID v4 válido gerado pelo banco ou crypto', () => {
      const result = PontoMidiaSchema.safeParse({
        produto_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
        nome: 'Painel LED W3',
        valor_tabela: 12000,
        desconto_percentual: 10,
        valor_negociado: 10800,
      });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar string não-UUID (evitando erro "Invalid uuid" em runtime)', () => {
      const result = PontoMidiaSchema.safeParse({
        produto_id: 'produto-01',
        nome: 'Painel LED W3',
        valor_tabela: 12000,
        valor_negociado: 12000,
      });
      expect(result.success).toBe(false);
    });
  });

});
