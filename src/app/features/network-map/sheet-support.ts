import { Observable, forkJoin, map, of } from 'rxjs';
import { AttachedCableResponse } from '../../core/api/api-types';
import { CableApi } from '../../core/api/resources/cable-api';
import { CableFibers } from '../../core/network/box-interior';

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
