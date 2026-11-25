import rmCommunes from '../../assets/geojson/rm_communes.json';
import {
  CompiledPolygonZone,
  GeoPoint,
  isPointInsideZone,
  QUILICURA_WORK_ZONE,
} from '../geo/PolygonEvaluator';
import {normalizeAddress} from '../parser/AddressNormalizer';
import {AppSettings, ParsedOffer, RuleReasonCode} from '../types';

export type LocationZoneStatus = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN';

export interface WorkZoneContext {
  workZone?: CompiledPolygonZone;
  targetCommuneNormalized?: string;
  originPoint?: GeoPoint | null;
  destinationPoint?: GeoPoint | null;
}

export interface WorkZoneEvaluation {
  status: LocationZoneStatus;
  reason: RuleReasonCode;
  originStatus: LocationZoneStatus;
  destinationStatus: LocationZoneStatus;
}

// Ordenamos de mayor a menor longitud para evitar colisiones entre comunas compuestas
const SORTED_COMMUNES = [...rmCommunes].sort((a, b) => b.length - a.length);

function findCommuneInSegment(segment: string): string | null {
  const cleaned = normalizeAddress(segment).replace(/[-/]/g, ' ');
  if (!cleaned) {
    return null;
  }

  let bestMatch: {commune: string; index: number} | null = null;
  for (const commune of SORTED_COMMUNES) {
    const regex = new RegExp(`(?:^|\\s)${commune}(?=\\s|$)`);
    const match = regex.exec(cleaned);
    if (match) {
      // Si hay varias menciones sin coma, priorizamos la que aparece más al final
      const endIndex = match.index + match[0].length;
      if (!bestMatch || endIndex > bestMatch.index) {
        bestMatch = {commune, index: endIndex};
      }
    }
  }

  return bestMatch ? bestMatch.commune : null;
}

/**
 * Extrae la comuna desde una dirección chilena evaluando segmentos de derecha a izquierda
 * para evitar falsos positivos con calles que tienen nombre de comuna (ej. Av. Independencia).
 */
export function detectCommuneFromAddress(address: string | null): string | null {
  if (!address || !address.trim()) {
    return null;
  }

  const segments = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const found = findCommuneInSegment(segments[i]);
    if (found) {
      return found;
    }
  }

  return null;
}

function evaluateSingleLocation(
  addressText: string | null,
  point: GeoPoint | null | undefined,
  workZone: CompiledPolygonZone,
  targetCommuneNormalized: string,
): LocationZoneStatus {
  if (point) {
    return isPointInsideZone(point, workZone) ? 'INSIDE' : 'OUTSIDE';
  }

  const detectedCommune = detectCommuneFromAddress(addressText);
  if (!detectedCommune) {
    return 'UNKNOWN';
  }

  return detectedCommune === targetCommuneNormalized ? 'INSIDE' : 'OUTSIDE';
}

export function evaluateWorkZoneRule(
  offer: Pick<ParsedOffer, 'originText' | 'destinationText'>,
  settings: Pick<AppSettings, 'workZoneEnabled' | 'workZoneMode'>,
  context: WorkZoneContext = {},
): WorkZoneEvaluation {
  if (!settings.workZoneEnabled) {
    return {
      status: 'INSIDE',
      reason: 'OK',
      originStatus: 'INSIDE',
      destinationStatus: 'INSIDE',
    };
  }

  const workZone = context.workZone ?? QUILICURA_WORK_ZONE;
  const targetCommune = context.targetCommuneNormalized ?? workZone.id;

  const originStatus = evaluateSingleLocation(
    offer.originText,
    context.originPoint,
    workZone,
    targetCommune,
  );
  const destinationStatus = evaluateSingleLocation(
    offer.destinationText,
    context.destinationPoint,
    workZone,
    targetCommune,
  );

  if (settings.workZoneMode === 'DESTINATION_ONLY') {
    if (destinationStatus === 'OUTSIDE') {
      return {
        status: 'OUTSIDE',
        reason: 'OUT_OF_WORK_ZONE',
        originStatus,
        destinationStatus,
      };
    }
    if (destinationStatus === 'UNKNOWN') {
      return {
        status: 'UNKNOWN',
        reason: 'UNKNOWN_LOCATION',
        originStatus,
        destinationStatus,
      };
    }
    return {
      status: 'INSIDE',
      reason: 'OK',
      originStatus,
      destinationStatus,
    };
  }

  // Modo BOTH_INSIDE (por defecto)
  if (originStatus === 'OUTSIDE' || destinationStatus === 'OUTSIDE') {
    return {
      status: 'OUTSIDE',
      reason: 'OUT_OF_WORK_ZONE',
      originStatus,
      destinationStatus,
    };
  }

  if (originStatus === 'UNKNOWN' || destinationStatus === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      reason: 'UNKNOWN_LOCATION',
      originStatus,
      destinationStatus,
    };
  }

  return {
    status: 'INSIDE',
    reason: 'OK',
    originStatus,
    destinationStatus,
  };
}
