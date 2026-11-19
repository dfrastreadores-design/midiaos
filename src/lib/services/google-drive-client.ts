import crypto from "node:crypto";
import type { DriveFileInfo, DriveFolderInfo, DriveApiConfigInfo } from "../../types/drive-sync.types.ts";

export const DEFAULT_NEXO_DRIVE_FOLDER_ID = "1rXOF91CjzGnt7jltxbBE87Z6hk06tjHS";
export const DEFAULT_NEXO_FOLDER_NAME = "Mídia Kit - Parceiros";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

/**
 * Obtém as credenciais da API do Google Drive configuradas no ambiente
 */
export function getGoogleDriveCredentials(): {
  serviceAccount: ServiceAccountCredentials | null;
  apiKey: string | null;
} {
  const env = process.env;

  // 1. Tentar Service Account via variáveis diretas
  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || env.GOOGLE_CLIENT_EMAIL;
  let privateKey = env.GOOGLE_PRIVATE_KEY;

  if (privateKey) {
    // Normalizar quebras de linha em chaves PEM escapadas (\n -> real newline)
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    return {
      serviceAccount: { client_email: clientEmail, private_key: privateKey },
      apiKey: env.GOOGLE_API_KEY || null,
    };
  }

  // 2. Tentar Service Account via JSON completo
  const jsonCreds = env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (jsonCreds) {
    try {
      const parsed = JSON.parse(jsonCreds);
      if (parsed.client_email && parsed.private_key) {
        return {
          serviceAccount: {
            client_email: parsed.client_email,
            private_key: parsed.private_key.replace(/\\n/g, "\n"),
          },
          apiKey: env.GOOGLE_API_KEY || null,
        };
      }
    } catch {}
  }

  // 3. Tentar API Key
  const apiKey = env.GOOGLE_API_KEY || null;
  return { serviceAccount: null, apiKey };
}

/**
 * Gera um token de acesso OAuth2 usando JWT assinado com RSA-SHA256 (RS256)
 * Sem depender de bibliotecas externas pesadas
 */
async function getOAuth2AccessToken(serviceAccount: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  sign.end();
  const signature = sign.sign(serviceAccount.private_key, "base64url");

  const jwt = `${unsignedToken}.${signature}`;

  // Troca o JWT assinado pelo token de acesso OAuth2 no Google Identity
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na autenticação OAuth2 Google: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export interface DiscoveredDriveTree {
  config: DriveApiConfigInfo;
  rootFolderId: string;
  rootFolderName: string;
  pastas: DriveFolderInfo[];
  arquivos: DriveFileInfo[];
}

/**
 * Executa a descoberta recursiva de arquivos e subpastas na pasta do Google Drive
 */
export async function discoverDriveContentsRecursively(
  targetFolderId: string = DEFAULT_NEXO_DRIVE_FOLDER_ID,
  maxDepth: number = 4,
): Promise<DiscoveredDriveTree> {
  const credentials = getGoogleDriveCredentials();
  let accessToken: string | null = null;
  let connectionMode: "api_oficial" | "varredura_publica_fallback" = "varredura_publica_fallback";
  let authType: "service_account" | "api_key" | "nenhuma" = "nenhuma";
  let serviceAccountEmail: string | null = null;
  let authInstructions = "";

  if (credentials.serviceAccount) {
    try {
      accessToken = await getOAuth2AccessToken(credentials.serviceAccount);
      connectionMode = "api_oficial";
      authType = "service_account";
      serviceAccountEmail = credentials.serviceAccount.client_email;
    } catch (e: any) {
      console.warn("[google-drive-client] Falha ao obter OAuth token da Service Account:", e.message);
      authInstructions = `Erro na autenticação da conta de serviço (${credentials.serviceAccount.client_email}): ${e.message}. Verifique a chave privada.`;
    }
  } else if (credentials.apiKey) {
    connectionMode = "api_oficial";
    authType = "api_key";
  } else {
    authInstructions =
      "API oficial do Google Drive não configurada no .env. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY para acesso corporativo autenticado e contínuo. Ativando descoberta com tolerância a falhas para prévia.";
  }

  const config: DriveApiConfigInfo = {
    modo_conexao: connectionMode,
    autenticado: Boolean(accessToken || credentials.apiKey),
    tipo_autenticacao: authType,
    service_account_email: serviceAccountEmail,
    root_folder_id: targetFolderId,
    root_folder_name: DEFAULT_NEXO_FOLDER_NAME,
    instrucoes_autenticacao: authInstructions || undefined,
  };

  const allFiles: DriveFileInfo[] = [];
  const allFolders: DriveFolderInfo[] = [];

  // Se tivermos acesso oficial à API do Google Drive v3
  if (accessToken || credentials.apiKey) {
    try {
      await scanFolderViaDriveApi(
        targetFolderId,
        "",
        0,
        maxDepth,
        accessToken,
        credentials.apiKey,
        allFolders,
        allFiles,
      );

      return {
        config,
        rootFolderId: targetFolderId,
        rootFolderName: DEFAULT_NEXO_FOLDER_NAME,
        pastas: allFolders,
        arquivos: allFiles,
      };
    } catch (err: any) {
      console.warn("[google-drive-client] Erro na API oficial do Drive. Ativando fallback resiliente:", err.message);
      config.modo_conexao = "varredura_publica_fallback";
      config.instrucoes_autenticacao = `Aviso: API oficial retornou erro (${err.message}). Utilizando modo de descoberta resiliente. Verifique se a pasta está compartilhada com ${serviceAccountEmail || "a conta de serviço"}.`;
    }
  }

  // Fallback Resiliente de Descoberta Web / Metadados Públicos
  await scanFolderViaPublicFeed(targetFolderId, allFolders, allFiles);

  return {
    config,
    rootFolderId: targetFolderId,
    rootFolderName: DEFAULT_NEXO_FOLDER_NAME,
    pastas: allFolders,
    arquivos: allFiles,
  };
}

/**
 * Consulta a API v3 oficial do Google Drive recursivamente
 */
async function scanFolderViaDriveApi(
  folderId: string,
  parentPath: string,
  depth: number,
  maxDepth: number,
  accessToken: string | null,
  apiKey: string | null,
  foldersOut: DriveFolderInfo[],
  filesOut: DriveFileInfo[],
) {
  if (depth > maxDepth) return;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const queryParams = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink, modifiedTime, parents)",
    pageSize: "100",
  });

  if (apiKey && !accessToken) {
    queryParams.set("key", apiKey);
  }

  const url = `https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    throw new Error(`Drive API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { files: any[]; nextPageToken?: string };
  const subfolderPromises: Promise<void>[] = [];

  for (const item of data.files || []) {
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";
    const currentPath = parentPath ? `${parentPath} / ${item.name}` : item.name;

    if (isFolder) {
      const folderInfo: DriveFolderInfo = {
        name: item.name,
        folderId: item.id,
        url: `https://drive.google.com/drive/folders/${item.id}`,
        partnerNameNormalized: normalizePartnerName(item.name),
        files: [],
        parentFolderId: folderId,
      };
      foldersOut.push(folderInfo);

      // Descer recursivamente
      subfolderPromises.push(
        scanFolderViaDriveApi(
          item.id,
          currentPath,
          depth + 1,
          maxDepth,
          accessToken,
          apiKey,
          foldersOut,
          filesOut,
        ),
      );
    } else {
      const type = inferFileType(item.name, item.mimeType);
      const fileInfo: DriveFileInfo = {
        fileId: item.id,
        name: item.name,
        type,
        mimeType: item.mimeType,
        sizeText: formatBytes(item.size),
        viewUrl: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
        downloadUrl: item.webContentLink || `https://drive.google.com/uc?export=download&id=${item.id}`,
        parentFolderId: folderId,
        parentFolderName: parentPath.split("/").pop()?.trim(),
        folderPath: currentPath,
        modifiedTime: item.modifiedTime,
      };
      filesOut.push(fileInfo);
    }
  }

  await Promise.allSettled(subfolderPromises);
}

/**
 * Descoberta resiliente de pastas e arquivos via interface pública do Google Drive
 */
async function scanFolderViaPublicFeed(
  rootFolderId: string,
  foldersOut: DriveFolderInfo[],
  filesOut: DriveFileInfo[],
) {
  try {
    const rootUrl = `https://drive.google.com/drive/folders/${rootFolderId}`;
    const res = await fetch(rootUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return;

    const html = await res.text();
    const folderRegex =
      /aria-label="([^"]+?)\s+Shared folder"[^>]*?ssk='5:auSv138:([a-zA-Z0-9_-]+)-0-16'/g;
    let m;
    const discoveredFolderIds = new Map<string, string>();

    while ((m = folderRegex.exec(html)) !== null) {
      const name = m[1].trim();
      const id = m[2].trim();
      discoveredFolderIds.set(id, name);
    }

    // Se houver subpasta especial como "Midia Kit Sistema"
    for (const [id, name] of Array.from(discoveredFolderIds.entries())) {
      if (name.toLowerCase().includes("midia kit sistema") || name.toLowerCase().includes("sistema")) {
        try {
          const sRes = await fetch(`https://drive.google.com/drive/folders/${id}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(6000),
          });
          if (sRes.ok) {
            const sHtml = await sRes.text();
            let sm;
            while ((sm = folderRegex.exec(sHtml)) !== null) {
              discoveredFolderIds.set(sm[2].trim(), sm[1].trim());
            }
          }
        } catch {}
      }
    }

    // Processar cada pasta descoberta para listar arquivos
    const folderEntries = Array.from(discoveredFolderIds.entries());
    const CHUNK_SIZE = 4;

    for (let i = 0; i < folderEntries.length; i += CHUNK_SIZE) {
      const chunk = folderEntries.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async ([fId, fName]) => {
          const folderObj: DriveFolderInfo = {
            name: fName,
            folderId: fId,
            url: `https://drive.google.com/drive/folders/${fId}`,
            partnerNameNormalized: normalizePartnerName(fName),
            files: [],
          };
          foldersOut.push(folderObj);

          try {
            const fRes = await fetch(`https://drive.google.com/drive/folders/${fId}`, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(6000),
            });
            if (!fRes.ok) return;

            const fHtml = await fRes.text();
            const fileRegex = /aria-label="([^"]+?)"[^>]*?ssk='[^']*?:([a-zA-Z0-9_-]{20,45})-[^']*?'/g;
            let fm;
            const seenFileIds = new Set<string>();

            while ((fm = fileRegex.exec(fHtml)) !== null) {
              const rawLabel = fm[1].trim();
              const fileId = fm[2].trim();
              if (seenFileIds.has(fileId)) continue;
              if (
                rawLabel.includes("Storage used") ||
                rawLabel.includes("More actions") ||
                rawLabel.includes("Modified") ||
                rawLabel.includes("Shared folder")
              ) {
                continue;
              }
              seenFileIds.add(fileId);

              const cleanName = rawLabel
                .replace(/\s+PDF\s+Shared/i, "")
                .replace(/\s+Microsoft Excel\s+Shared/i, "")
                .replace(/\s+Shared/i, "")
                .trim();

              const type = inferFileType(cleanName, undefined);
              const fileInfo: DriveFileInfo = {
                fileId,
                name: cleanName,
                type,
                viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
                downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
                parentFolderId: fId,
                parentFolderName: fName,
                folderPath: `${fName} / ${cleanName}`,
              };

              filesOut.push(fileInfo);
              folderObj.files.push(fileInfo);
            }
          } catch {}
        }),
      );
    }
  } catch (err: any) {
    console.warn("[google-drive-client] Falha na descoberta pública:", err.message);
  }
}

function normalizePartnerName(folderName: string): string {
  return folderName
    .replace(/^([0-9]+[\.\-\_\s]+)/, "") // remove numeração inicial tipo "01 - "
    .replace(/\s*-\s*(Marco|Leão|Raimundo|Fred e Mariana|Guilherme|Marcos|Toninho POP e Juliana|Wandersson|Todi).*$/i, "") // remove nomes de contatos comuns
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferFileType(fileName: string, mimeType?: string): "pdf" | "xlsx" | "pptx" | "image" | "outros" {
  const lower = fileName.toLowerCase();
  const m = mimeType?.toLowerCase() || "";

  if (lower.endsWith(".pdf") || m.includes("pdf")) return "pdf";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv") || m.includes("spreadsheet") || m.includes("excel")) return "xlsx";
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt") || m.includes("presentation") || m.includes("powerpoint")) return "pptx";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || m.includes("image")) return "image";
  return "outros";
}

function formatBytes(bytes?: number): string | undefined {
  if (!bytes || isNaN(bytes)) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
