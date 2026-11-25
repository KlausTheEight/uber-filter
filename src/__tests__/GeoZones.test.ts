import rmCommunes from '../assets/geojson/rm_communes.json';
import {
  isPointInBoundingBox,
  isPointInsideZone,
  QUILICURA_WORK_ZONE,
} from '../domain/geo/PolygonEvaluator';

describe('PolygonEvaluator y Zona Quilicura (CU-01)', () => {
  it('incluye las 52 comunas normalizadas de la Región Metropolitana', () => {
    expect(rmCommunes).toHaveLength(52);
    expect(new Set(rmCommunes).size).toBe(52);
    expect(rmCommunes).toContain('quilicura');
    expect(rmCommunes).toContain('conchali');
    expect(rmCommunes).toContain('nunoa');
  });

  it.each([
    ['Plaza de Quilicura', -33.3665, -70.7295],
    ['Mall Arauco Quilicura', -33.3685, -70.7315],
    ['Av. Lo Cruzat', -33.3560, -70.7420],
    ['Av. Manuel Antonio Matta', -33.3670, -70.7200],
    ['Sector Lo Marcoleta / Las Torres', -33.3610, -70.7520],
    ['Sector San Ignacio / Buenaventura', -33.3450, -70.7100],
  ])('acepta punto dentro de Quilicura: %s', (_label, lat, lng) => {
    expect(isPointInsideZone({lat, lng}, QUILICURA_WORK_ZONE)).toBe(true);
  });

  it.each([
    ['Renca (sur de Vespucio)', -33.4050, -70.7300],
    ['Conchalí', -33.3850, -70.6800],
    ['Huechuraba (Av. El Salto)', -33.3790, -70.6250],
    ['Lampa (norte / Valle Grande)', -33.3150, -70.7500],
    ['Pudahuel (Aeropuerto AMB)', -33.3930, -70.7860],
    ['Independencia', -33.4150, -70.6650],
    ['Santiago Centro', -33.4489, -70.6693],
    ['Providencia', -33.4288, -70.6110],
  ])('rechaza punto fuera de Quilicura: %s', (_label, lat, lng) => {
    expect(isPointInsideZone({lat, lng}, QUILICURA_WORK_ZONE)).toBe(false);
  });

  it('descarta puntos lejanos en el pre-check de bounding box', () => {
    expect(
      isPointInBoundingBox(
        {lat: -33.4489, lng: -70.6693},
        QUILICURA_WORK_ZONE.bbox,
      ),
    ).toBe(false);
  });

  it('evalúa 100 consultas geoespaciales en menos de 20 ms', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i += 1) {
      isPointInsideZone({lat: -33.3665, lng: -70.7295}, QUILICURA_WORK_ZONE);
      isPointInsideZone({lat: -33.4288, lng: -70.6110}, QUILICURA_WORK_ZONE);
    }
    const elapsedMs = Date.now() - start;
    expect(elapsedMs).toBeLessThan(20);
  });
});
