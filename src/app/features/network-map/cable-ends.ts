import { CableAttachmentResponse } from '../../core/api/api-types';

/**
 * Frase simples com o início e o fim do cabo, a partir da lista de elementos do cabo.
 * Ex.: "De OLT-CENTRO para CEO-01 (passa por 2)".
 */
export function describeCableEnds(list: readonly CableAttachmentResponse[]): string {
  const start = list.find((item) => item.role === 'START');
  const end = list.find((item) => item.role === 'END');
  const passes = list.filter((item) => item.role === 'PASS_THROUGH').length;
  if (!start && !end) {
    return 'Início e fim ainda não definidos';
  }
  const from = start?.elementName ?? 'início não definido';
  const to = end?.elementName ?? 'fim não definido';
  const through = passes > 0 ? ` (passa por ${passes})` : '';
  return `De ${from} para ${to}${through}`;
}
