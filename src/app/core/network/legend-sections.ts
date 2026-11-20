import type { LegendGroup, LegendLeaf, LegendSection } from '../../shared/map/map-legend';
import { MapCable, MapElement } from './map-element';
import { CABLE_ROLES, ELEMENT_GROUPS, statusDefinition } from './network-catalog';

/**
 * Monta a árvore da legenda: "Elementos" (por tipo) e "Cabos" (por função), na ordem do
 * catálogo e sem grupos vazios. Clientes não têm ações de edição.
 */
export function buildLegendSections(
  elements: readonly MapElement[],
  cables: readonly MapCable[],
  hidden: ReadonlySet<string>,
  canEdit = true,
): [LegendSection, LegendSection] {
  const elementGroups: LegendGroup[] = ELEMENT_GROUPS.map((definition) => {
    const items = elements
      .filter((item) => item.group === definition.group)
      .map<LegendLeaf>((item) => ({
        id: item.key,
        kind: 'element',
        label: item.name,
        statusColor: statusDefinition(item.status).color,
        statusLabel: statusDefinition(item.status).label,
        editable: canEdit && item.kind !== 'customer',
      }));
    return {
      key: definition.group,
      kind: 'element' as const,
      label: definition.label,
      code: definition.code,
      color: definition.color,
      count: items.length,
      hidden: hidden.has(definition.group),
      items,
    };
  }).filter((group) => group.count > 0);

  const cableGroups: LegendGroup[] = CABLE_ROLES.map((definition) => {
    const items = cables
      .filter((item) => item.role === definition.role)
      .map<LegendLeaf>((item) => ({
        id: item.id,
        kind: 'cable',
        label: item.name,
        statusColor: statusDefinition(item.status).color,
        statusLabel: statusDefinition(item.status).label,
        editable: canEdit,
      }));
    return {
      key: definition.role,
      kind: 'cable' as const,
      label: definition.label,
      code: definition.code,
      color: definition.color,
      count: items.length,
      hidden: hidden.has(definition.role),
      dashed: false,
      items,
    };
  }).filter((group) => group.count > 0);

  return [
    { key: 'elements', label: 'Elementos', total: elements.length, groups: elementGroups },
    { key: 'cables', label: 'Cabos', total: cables.length, groups: cableGroups },
  ];
}
