import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {point as turfPoint} from '@turf/helpers';
import type {Feature, MultiPolygon, Polygon} from 'geojson';
import quilicuraRaw from '../../assets/geojson/quilicura.geojson.json';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type GeoPolygonFeature = Feature<Polygon | MultiPolygon>;

export interface CompiledPolygonZone {
  id: string;
  name: string;
  feature: GeoPolygonFeature;
  bbox: BoundingBox;
}

export function computeBoundingBox(feature: GeoPolygonFeature): BoundingBox {
  const [minLng, minLat, maxLng, maxLat] = bbox(feature);
  return {minLng, minLat, maxLng, maxLat};
}

export function compilePolygonZone(
  id: string,
  name: string,
  feature: GeoPolygonFeature,
): CompiledPolygonZone {
  return {
    id,
    name,
    feature,
    bbox: computeBoundingBox(feature),
  };
}

export function isPointInBoundingBox(
  point: GeoPoint,
  box: BoundingBox,
): boolean {
  return (
    point.lng >= box.minLng &&
    point.lng <= box.maxLng &&
    point.lat >= box.minLat &&
    point.lat <= box.maxLat
  );
}

/**
 * Evalúa si un punto (lat, lng) está dentro de una zona poligonal compilada.
 * Aplica pre-check de Bounding Box antes del cálculo poligonal exacto.
 */
export function isPointInsideZone(
  point: GeoPoint,
  zone: CompiledPolygonZone,
): boolean {
  if (!isPointInBoundingBox(point, zone.bbox)) {
    return false;
  }

  // Recordatorio GeoJSON: el orden es siempre [longitud, latitud]
  return booleanPointInPolygon(turfPoint([point.lng, point.lat]), zone.feature);
}

export const QUILICURA_WORK_ZONE: CompiledPolygonZone = compilePolygonZone(
  'quilicura',
  'Quilicura',
  quilicuraRaw as unknown as GeoPolygonFeature,
);
