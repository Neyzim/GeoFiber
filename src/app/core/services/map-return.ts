import { Injectable } from '@angular/core';
import type { Selection } from '../network/network-map-state';

/** O que o mapa deve selecionar (e, se `focus`, centralizar) quando abrir. */
export interface MapReturnTarget {
  selection: NonNullable<Selection>;
  focus: boolean;
}

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

  /** Devolve o recado e o apaga. */
  take(): MapReturnTarget | null {
    const target = this.pending;
    this.pending = null;
    return target;
  }
}
