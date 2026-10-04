// Teste automatizado de parsing inteligente de coordenadas e geolocalização OOH/DOOH
import assert from "node:assert";

function extrairCoordenadasDeTextoOuUrl(texto) {
  if (!texto || typeof texto !== "string") return null;

  // 1. URLs do Google Maps com query param q=lat,lng ou ll=lat,lng
  const queryMatch = texto.match(/[?&](?:q|ll)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 2. URLs do Google Maps com path @lat,lng,zoom
  const atMatch = texto.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 3. Formato decimal direto: -15.8341, -48.0567 ou Lat: -15.8341 Lng: -48.0567
  const decimalMatch = texto.match(/(-?\d{1,2}\.\d{3,8})[\s,;|/]+(-?\d{1,3}\.\d{3,8})/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

function extrairRotaEReferencia(texto) {
  if (!texto || typeof texto !== "string") return { sentido_via: null, ponto_referencia: null };

  let sentido_via = null;
  let ponto_referencia = null;

  // Regex para Sentido da Via
  const sentidoMatch = texto.match(/(?:sentido|fluxo\s+(?:para|a|ao|sentido)|rumo\s+a)\s+([^,.;\n]+)/i);
  if (sentidoMatch && sentidoMatch[1]) {
    sentido_via = `Sentido ${sentidoMatch[1].trim()}`;
  }

  // Regex para Ponto de Referência
  const refMatch = texto.match(/(?:em\s+frente\s+(?:a|à|ao)?|próximo\s+(?:a|ao|da)?|ao\s+lado\s+(?:de|do|da)?|ref[:.]?|referência[:.]?)\s+([^,.;\n]+)/i);
  if (refMatch && refMatch[1]) {
    ponto_referencia = refMatch[0].trim();
  }

  return { sentido_via, ponto_referencia };
}

console.log("================================================================================");
console.log("📍 TESTE AUTOMATIZADO: PARSER DE GEOLOCALIZAÇÃO OOH/DOOH");
console.log("================================================================================");

// Caso 1: Coordenadas decimais diretas
const caso1 = "-15.8341, -48.0567";
const r1 = extrairCoordenadasDeTextoOuUrl(caso1);
assert(r1 && r1.latitude === -15.8341 && r1.longitude === -48.0567, "Caso 1 falhou");
console.log("✅ [1/5] Decimais diretos extraídos com sucesso (-15.8341, -48.0567)");

// Caso 2: Google Maps URL com q=
const caso2 = "https://maps.google.com/?q=-15.834123,-48.056789";
const r2 = extrairCoordenadasDeTextoOuUrl(caso2);
assert(r2 && Math.abs(r2.latitude - -15.834123) < 0.0001, "Caso 2 falhou");
console.log("✅ [2/5] URL maps.google.com/?q=... convertida com precisão");

// Caso 3: Google Maps URL com @lat,lng
const caso3 = "https://www.google.com/maps/@-15.7942, -47.8821,17z";
const r3 = extrairCoordenadasDeTextoOuUrl(caso3);
assert(r3 && r3.latitude === -15.7942, "Caso 3 falhou");
console.log("✅ [3/5] URL do Google Maps com @lat,lng identificada");

// Caso 4: Endereço textual com Ponto de Referência e Sentido da via
const textoEnd = "EPTG km 4 em frente à Só Reparos sentido Plano Piloto";
const r4 = extrairRotaEReferencia(textoEnd);
assert(r4.sentido_via?.includes("Plano Piloto"), "Sentido da via não capturado");
assert(r4.ponto_referencia?.includes("Só Reparos"), "Ponto de referência não capturado");
console.log("✅ [4/5] Rota e ponto de referência extraídos:", r4);

// Caso 5: Link gerado para Street View / Maps
const linkMaps = r1 ? `https://www.google.com/maps?q=${r1.latitude},${r1.longitude}` : null;
assert(linkMaps === "https://www.google.com/maps?q=-15.8341,-48.0567", "Link maps incorreto");
console.log("✅ [5/5] Link de visualização e Street View gerado:", linkMaps);

console.log("\n================================================================================");
console.log("🎉 RESULTADO: TODOS OS 5 TESTES DE GEOLOCALIZAÇÃO PASSARAM COM SUCESSO!");
console.log("================================================================================\n");
