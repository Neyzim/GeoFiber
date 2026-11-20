import { GeoPoint } from '../models/geo.model';
import { CoordinateDto } from './api-types';

/**
 * Único ponto de conversão entre a API (`{longitude, latitude}`, longitude primeiro)
 * e o app/Leaflet (`{lat, lng}`).
 */
export function toGeoPoint(coordinate: CoordinateDto): GeoPoint {
  return { lat: coordinate.latitude, lng: coordinate.longitude };
}

export function toCoordinate(point: GeoPoint): CoordinateDto {
  return { longitude: point.lng, latitude: point.lat };
}

export function toGeoPoints(coordinates: readonly CoordinateDto[]): GeoPoint[] {
  return coordinates.map(toGeoPoint);
}

export function toCoordinates(points: readonly GeoPoint[]): CoordinateDto[] {
  return points.map(toCoordinate);
}
