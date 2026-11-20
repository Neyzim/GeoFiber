import { Injectable } from '@angular/core';
import type { GeoPoint } from '../models/geo.model';
import type { Selection } from '../network/network-map-state';

/**
 * O que o mapa deve fazer quando abrir: selecionar (e, se `focus`, centralizar) ou só enquadrar
 * as posições dadas (ex.: "Ver no mapa" depois de importar).
 */
export type MapReturnTarget =
  | { selection: NonNullable<Selection>; focus: boolean }
  | { fit: readonly GeoPoint[] };

/**
 * Recado em memória de outra tela para o mapa (ex.: "Voltar" da tela de fusões ou "Ver cabo no
 * mapa"). O mapa recria a página ao voltar, então a seleção é aplicada só depois que a rede
 * carrega. A posição e o zoom vêm das preferências do mapa (`lastView`).
 */
@Injectable({ providedIn: 'root' })
export class MapReturnService {
  private pending: MapReturnTarget | null = null;

  request(selection: NonNullable<Selection>, focus: boolean): void {
    this.pending = { selection, focus };
  }

  requestFit(points: readonly GeoPoint[]): void {
    this.pending = { fit: points };
  }

  /** Devolve o recado e o apaga. */
  take(): MapReturnTarget | null {
    const target = this.pending;
    this.pending = null;
    return target;
  }
}
