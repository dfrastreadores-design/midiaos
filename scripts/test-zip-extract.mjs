import JSZip from "jszip";
import assert from "node:assert";

async function testPptxAndDocx() {
  console.log("Testando extração com JSZip...");

  // 1. Criar um PPTX mock em memória
  const pptxZip = new JSZip();
  pptxZip.file("ppt/slides/slide1.xml", `<p:sld><a:p><a:r><a:t>Outdoor Rodoviário BR-020 KM 10</a:t></a:r></a:p><a:p><a:r><a:t>Preço: R$ 8.500,00 por mês</a:t></a:r></a:p></p:sld>`);
  pptxZip.file("ppt/slides/slide2.xml", `<p:sld><a:p><a:r><a:t>Painel LED Monumental W3 Sul</a:t></a:r></a:p><a:p><a:r><a:t>Preço: R$ 18.000,00 mensal</a:t></a:r></a:p></p:sld>`);
  pptxZip.file("ppt/media/image1.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  const pptxBuf = await pptxZip.generateAsync({ type: "nodebuffer" });

  // 2. Extrair do PPTX
  const unzipped = await JSZip.loadAsync(pptxBuf);
  const slideFiles = Object.keys(unzipped.files).filter((k) => k.startsWith("ppt/slides/slide") && k.endsWith(".xml"));
  const mediaFiles = Object.keys(unzipped.files).filter((k) => k.startsWith("ppt/media/"));

  assert.strictEqual(slideFiles.length, 2);
  assert.strictEqual(mediaFiles.length, 1);

  let fullText = "";
  for (const s of slideFiles) {
    const xml = await unzipped.files[s].async("text");
    const cleanText = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    fullText += `\n[Slide: ${s}]\n${cleanText}\n`;
  }

  assert(fullText.includes("Outdoor Rodoviário BR-020"));
  assert(fullText.includes("Painel LED Monumental"));
  console.log("Texto extraído com sucesso do PPTX:", fullText.trim());

  const imgBuf = await unzipped.files[mediaFiles[0]].async("nodebuffer");
  const base64 = imgBuf.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;
  assert(dataUrl.startsWith("data:image/png;base64,"));
  console.log("Imagem extraída com sucesso:", mediaFiles[0], "Tamanho:", imgBuf.length, "bytes");

  console.log(">>> TESTE PPTX/DOCX APROVADO! <<<");
}

testPptxAndDocx();
