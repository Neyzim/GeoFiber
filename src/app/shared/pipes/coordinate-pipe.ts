import { Pipe, PipeTransform } from '@angular/core';
import { GeoPoint, toDegreesMinutesSeconds } from '../../core/models/geo.model';

export type CoordinateFormat = 'decimal' | 'dms';

/** Formata um ponto geográfico em graus decimais ou em graus/minutos/segundos. */
@Pipe({ name: 'coordinate' })
export class CoordinatePipe implements PipeTransform {
  transform(
    value: GeoPoint | null | undefined,
    format: CoordinateFormat = 'decimal',
    precision = 5,
  ): string {
    if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
      return '—';
    }
    if (format === 'dms') {
      const lat = toDegreesMinutesSeconds(value.lat, 'N', 'S');
      const lng = toDegreesMinutesSeconds(value.lng, 'L', 'O');
      return `${lat} ${lng}`;
    }
    return `${value.lat.toFixed(precision)}, ${value.lng.toFixed(precision)}`;
  }
}
