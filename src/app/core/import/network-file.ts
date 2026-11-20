import { unzipSync } from 'fflate';

/** Conteúdo de um KMZ/KML já aberto: o texto do KML e as imagens do KMZ (por caminho). */
export interface NetworkFile {
  fileName: string;
  kml: string;
  icons: ReadonlyMap<string, Blob>;
}

/** Erro de leitura com a mensagem já em pt-BR, pronta para a tela. */
export class NetworkFileError extends Error {}

const INVALID = 'Este arquivo não é um KMZ/KML válido.';

export function openNetworkFile(name: string, bytes: Uint8Array): NetworkFile {
  const lower = name.toLowerCase();
  if (lower.endsWith('.kml')) {
    return { fileName: name, kml: decodeXml(bytes), icons: new Map() };
  }
  if (!lower.endsWith('.kmz')) {
    throw new NetworkFileError('Escolha um arquivo .kmz ou .kml.');
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new NetworkFileError(INVALID);
  }

  const kmlPath = findKmlPath(Object.keys(entries));
  if (kmlPath === null) {
    throw new NetworkFileError('O KMZ não tem nenhum KML dentro.');
  }

  const icons = new Map<string, Blob>();
  for (const [path, data] of Object.entries(entries)) {
    if (/\.(png|jpe?g|gif|bmp|svg)$/i.test(path)) {
      icons.set(path, new Blob([data.slice()]));
    }
  }
  return { fileName: name, kml: decodeXml(entries[kmlPath]), icons };
}

/** Lê o arquivo escolhido pela pessoa e abre como KMZ ou KML. */
export async function readNetworkFile(file: File): Promise<NetworkFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return openNetworkFile(file.name, bytes);
}

/** `doc.kml` na raiz tem prioridade; senão, o primeiro `.kml` encontrado. */
function findKmlPath(paths: readonly string[]): string | null {
  if (paths.includes('doc.kml')) {
    return 'doc.kml';
  }
  return paths.find((path) => path.toLowerCase().endsWith('.kml')) ?? null;
}

/** Decodifica pelo `encoding` declarado no cabeçalho XML (padrão UTF-8). */
function decodeXml(bytes: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const declared = /encoding=["']([^"']+)["']/i.exec(head)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(declared).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}
