import { LEGACY_STORAGE_KEYS } from '../constants/map.constants';

/**
 * Apaga os PINs e cabos que versões antigas gravavam no navegador.
 * Desde a Etapa 0 a rede vive no backend; esses dados de teste são descartados.
 */
export function discardLegacyStorage(
  storage: Pick<Storage, 'removeItem'> | null = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Armazenamento bloqueado (modo privado): nada a limpar.
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
