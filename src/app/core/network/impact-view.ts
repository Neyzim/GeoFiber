import type { ImpactResponse, ImpactTotals } from '../api/impact-types';
import type { GeoPath, GeoPoint } from '../models/geo.model';

/** Limite de clientes listados pelo backend; acima disso a lista vem cortada. */
export const IMPACT_CUSTOMER_LIMIT = 2000;

/** Traçado do cabo afetado: roxo, para não se confundir com o rastreio. */
const TARGET_COLOR = '#7b1fa2';
const TARGET_WEIGHT = 6;

/** Marcador de impacto: caixa, cliente ou OLT afetados. */
export interface ImpactMarker {
  key: string;
  kind: 'box' | 'customer' | 'olt';
  label: string;
  point: GeoPoint;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Frase de resumo, conforme o tipo do item afetado. */
export function summaryLine(response: ImpactResponse): string {
  const totals: ImpactTotals = response.totals ?? {};
  const customers = totals.customers ?? 0;
  const boxes = totals.boxes ?? 0;
  if (customers === 0) {
    return 'Nenhum cliente depende deste item.';
  }

  const subject = response.target?.kind === 'BOX' ? 'Se esta caixa parar'
    : response.target?.kind === 'OLT' ? 'Se esta OLT parar'
    : 'Se este cabo sair';
  const clients = customers === 1 ? '1 cliente fica sem sinal' : `${customers} clientes ficam sem sinal`;
  const where = boxes > 0 ? `, em ${boxes} ${plural(boxes, 'caixa', 'caixas')}` : '';
  return `${subject}, ${clients}${where}.`;
}

/** Contagens numa linha: "12 clientes · 3 caixas · 1 OLT". */
export function totalsLine(totals: ImpactTotals): string {
  const customers = totals.customers ?? 0;
  const boxes = totals.boxes ?? 0;
  const olts = totals.olts ?? 0;
  return [
    `${customers} ${plural(customers, 'cliente', 'clientes')}`,
    `${boxes} ${plural(boxes, 'caixa', 'caixas')}`,
    `${olts} ${plural(olts, 'OLT', 'OLTs')}`,
  ].join(' · ');
}

/** Aviso de lista cortada; `null` quando a lista está completa. */
export function truncatedNote(response: ImpactResponse): string | null {
  if (!response.truncated) return null;
  return `Mostrando os primeiros ${IMPACT_CUSTOMER_LIMIT} clientes; o total é ${response.totals?.customers ?? 0}.`;
}

/** Marcadores de caixas, clientes e OLTs que têm posição. O item alvo não entra. */
export function impactMarkers(response: ImpactResponse): ImpactMarker[] {
  const markers: ImpactMarker[] = [];
  for (const box of response.boxes ?? []) {
    const point = box.coordinates?.[0];
    if (point) {
      markers.push({ key: `impact-box-${box.id}`, kind: 'box', label: box.label ?? '', point: toPoint(point) });
    }
    for (const customer of box.customers ?? []) {
      const at = customer.coordinates?.[0];
      if (at) {
        markers.push({
          key: `impact-customer-${customer.id}`,
          kind: 'customer',
          label: customer.name || '(sem nome)',
          point: toPoint(at),
        });
      }
    }
  }
  for (const olt of response.olts ?? []) {
    const point = olt.coordinates?.[0];
    if (point) {
      markers.push({ key: `impact-olt-${olt.id}`, kind: 'olt', label: olt.label ?? '', point: toPoint(point) });
    }
  }
  return markers;
}

/** Traçado do cabo alvo em destaque; só cabo tem traçado (caixa e OLT têm só posição). */
export function impactTargetPath(response: ImpactResponse): GeoPath | null {
  const coordinates = response.target?.coordinates ?? [];
  if (response.target?.kind !== 'CABLE' || coordinates.length < 2) return null;
  return {
    id: 'impact-target',
    points: coordinates.map(toPoint),
    color: TARGET_COLOR,
    weight: TARGET_WEIGHT,
    emphasis: true,
  };
}

function toPoint(c: { latitude: number; longitude: number }): GeoPoint {
  return { lat: c.latitude, lng: c.longitude };
}
