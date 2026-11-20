import { Observable, forkJoin, map, of } from 'rxjs';
import { AttachedCableResponse } from '../../core/api/api-types';
import { CableApi } from '../../core/api/resources/cable-api';
import { CableFibers } from '../../core/network/box-interior';
import type { ElementGroup } from '../../core/network/network-catalog';
import type { SheetTab } from '../../shared/common/sheet-tabs';

/** Abas da ficha da caixa: CTO mostra portas (e fusões se houver); CEO/DIO, fusões e splitters. */
export function boxTabs(group: ElementGroup, hasSpliceContent: boolean): SheetTab[] {
  const resumo: SheetTab = { id: 'resumo', label: 'Resumo' };
  if (group === 'CTO') {
    const tabs: SheetTab[] = [resumo, { id: 'portas', label: 'Portas' }];
    if (hasSpliceContent) {
      tabs.push({ id: 'fusoes', label: 'Fusões' });
    }
    return tabs;
  }
  return [resumo, { id: 'fusoes', label: 'Fusões' }, { id: 'splitters', label: 'Splitters' }];
}

/** Fibras de cada cabo ligado a uma caixa ou OLT (para dar nome às fibras nas fichas). */
export function loadCableFibers(
  cableApi: CableApi,
  cables: readonly AttachedCableResponse[],
): Observable<CableFibers[]> {
  if (cables.length === 0) {
    return of([]);
  }
  return forkJoin(
    cables.map((cable) =>
      cableApi.listFibers(cable.cableId ?? '').pipe(
        map((fibers) => ({
          cableId: cable.cableId ?? '',
          name: cable.name ?? 'Cabo sem nome',
          fibers,
        })),
      ),
    ),
  );
}
