/**
 * Utilitários para conversão e manipulação resiliente de imagens binárias
 * Funciona perfeitamente tanto no navegador quanto em runtime Node.js/Vite SSR.
 */

export function uint8ArrayToBase64(u8: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(u8).toString("base64");
  }
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, Math.min(i + chunkSize, u8.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function getMimeTypeFromExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, "");
  switch (e) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    default:
      return "image/jpeg";
  }
}

export function detectMimeTypeFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "image/webp";
  }
  return "image/jpeg";
}
