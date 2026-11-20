import { MapElement } from './map-element';
import { ElementGroup } from './network-catalog';

const GROUP_WORDS: Readonly<Record<ElementGroup, [string, string]>> = {
  olt: ['OLT', 'OLTs'],
  CTO: ['CTO', 'CTOs'],
  CEO: ['CEO', 'CEOs'],
  DIO: ['DIO', 'DIOs'],
  customer: ['cliente', 'clientes'],
};

const ORDER: readonly ElementGroup[] = ['olt', 'DIO', 'CEO', 'CTO', 'customer'];

function count(value: number, [one, many]: readonly [string, string]): string {
  return `${value} ${value === 1 ? one : many}`;
}

function join(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

export interface ViewCounts {
  visible: readonly MapElement[];
  totalElements: number;
  visibleCables: number;
  totalCables: number;
}

/** "Você está vendo 1 OLT, 3 CTOs e 12 clientes, ligados por 5 cabos." */
export function describeView({ visible, totalElements, visibleCables, totalCables }: ViewCounts): string {
  if (totalElements === 0 && totalCables === 0) {
    return 'A rede ainda está vazia. Use "Adicionar elemento" para cadastrar a primeira OLT ou caixa.';
  }
  const parts = ORDER.map((group) => {
    const amount = visible.filter((element) => element.group === group).length;
    return amount ? count(amount, GROUP_WORDS[group]) : '';
  }).filter(Boolean);

  const what = parts.length ? join(parts) : 'nenhum ponto';
  const cables = visibleCables
    ? `ligados por ${count(visibleCables, ['cabo', 'cabos'])}`
    : 'sem cabos';
  let sentence = `Você está vendo ${what}, ${cables}.`;

  const hiddenElements = Math.max(0, totalElements - visible.length);
  const hiddenCables = Math.max(0, totalCables - visibleCables);
  if (hiddenElements || hiddenCables) {
    const hidden = [
      hiddenElements ? count(hiddenElements, ['ponto', 'pontos']) : '',
      hiddenCables ? count(hiddenCables, ['cabo', 'cabos']) : '',
    ].filter(Boolean);
    sentence += ` Filtros, busca ou camadas ocultas estão escondendo ${join(hidden)}.`;
  }
  return sentence;
}
