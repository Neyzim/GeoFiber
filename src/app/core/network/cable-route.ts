import { CableAttachmentRequest, CableAttachmentResponse } from '../api/api-types';
import { ElementRef } from './network-map-repository';

/** Um elemento (OLT ou caixa) na lista do cabo, com o nome para exibir. */
export interface RouteItem {
  ref: ElementRef;
  name: string;
}

/** Papéis pela posição: primeiro START, último END, o resto PASS_THROUGH. */
export function toAttachmentRequests(items: readonly RouteItem[]): CableAttachmentRequest[] {
  return items.map((item, index) => {
    const role =
      index === 0 ? 'START' : index === items.length - 1 ? 'END' : 'PASS_THROUGH';
    return item.ref.kind === 'olt'
      ? { role, oltId: item.ref.id }
      : { role, boxId: item.ref.id };
  });
}

/** Mensagem do problema da lista, ou `null` se pode salvar. Lista vazia limpa a lista. */
export function validateRoute(items: readonly RouteItem[]): string | null {
  if (items.length === 1) {
    return 'Escolha pelo menos o início e o fim.';
  }
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.ref.kind}:${item.ref.id}`;
    if (seen.has(key)) {
      return `${item.name} aparece mais de uma vez.`;
    }
    seen.add(key);
  }
  return null;
}

/** Converte a lista salva no backend em itens editáveis. */
export function toRouteItems(list: readonly CableAttachmentResponse[]): RouteItem[] {
  return [...list]
    .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
    .flatMap((item): RouteItem[] => {
      const name = item.elementName ?? 'Sem nome';
      if (item.oltId) return [{ ref: { kind: 'olt', id: item.oltId }, name }];
      if (item.boxId) return [{ ref: { kind: 'box', id: item.boxId }, name }];
      return [];
    });
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names.join('');
  }
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/** Frase simples: "Este cabo sai de X, passa por Y e Z e termina em W." */
export function describeCableRoute(list: readonly CableAttachmentResponse[]): string {
  const start = list.find((item) => item.role === 'START')?.elementName;
  const end = list.find((item) => item.role === 'END')?.elementName;
  const through = [...list]
    .filter((item) => item.role === 'PASS_THROUGH')
    .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
    .map((item) => item.elementName ?? 'Sem nome');

  if (!start && !end) {
    return 'Ainda não sabemos de onde este cabo sai nem aonde chega.';
  }
  if (start && !end) {
    return `Este cabo sai de ${start}; o fim ainda não foi definido.`;
  }
  if (!start && end) {
    return `Este cabo termina em ${end}; o início ainda não foi definido.`;
  }
  const middle = through.length > 0 ? `, passa por ${joinNames(through)}` : '';
  return `Este cabo sai de ${start}${middle} e termina em ${end}.`;
}
