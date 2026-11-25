import {CompiledPolygonZone, GeoPoint, QUILICURA_WORK_ZONE} from './geo/PolygonEvaluator';
import {evaluateCashScheduleRule} from './rules/CashScheduleRule';
import {evaluateTariffTrafficLight} from './rules/TariffTrafficLightRule';
import {evaluateWorkZoneRule} from './rules/WorkZoneRule';
import {
  AppSettings,
  EvaluationResult,
  ParsedOffer,
  RuleReasonCode,
  TrafficLight,
} from './types';

export interface EvaluationContext {
  now?: Date;
  workZone?: CompiledPolygonZone;
  originPoint?: GeoPoint | null;
  destinationPoint?: GeoPoint | null;
  /** Hook para CU-02 (Zonas Rojas en Sprint 2) */
  redZoneReason?:
    | 'RED_ZONE_ORIGIN'
    | 'RED_ZONE_DESTINATION'
    | 'RED_ZONE_BOTH'
    | null;
}

function formatClp(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function formatRate(rateClpPerKm: number | null): string {
  return rateClpPerKm !== null ? `${formatClp(rateClpPerKm)}/km` : 'Sin tarifa';
}

function computeAutoRejectDelay(
  light: TrafficLight,
  settings: AppSettings,
): number | null {
  if (!settings.autoRejectEnabled) {
    return null;
  }

  if (light === 'RED') {
    return settings.redAutoRejectSeconds;
  }

  if (light === 'YELLOW' && settings.enableYellowAutoReject) {
    return settings.redAutoRejectSeconds * settings.yellowTimerMultiplier;
  }

  return null;
}

function buildDisplayCopy(
  light: TrafficLight,
  primaryReason: RuleReasonCode,
  rateClpPerKm: number | null,
  offer: ParsedOffer,
  settings: AppSettings,
  zoneName: string,
): {displayHeadline: string; displaySubline: string} {
  const rateText = formatRate(rateClpPerKm);
  const kmText = offer.totalKm !== null ? `${offer.totalKm} km` : 'km n/d';

  switch (primaryReason) {
    case 'CASH_AFTER_HOURS':
      return {
        displayHeadline: 'RECHAZAR · EFECTIVO',
        displaySubline: `Horario restringido · ${rateText}`,
      };
    case 'RED_ZONE_ORIGIN':
    case 'RED_ZONE_DESTINATION':
    case 'RED_ZONE_BOTH':
      return {
        displayHeadline: 'RECHAZAR · ZONA ROJA',
        displaySubline: `Sector restringido · ${rateText}`,
      };
    case 'OUT_OF_WORK_ZONE':
      return {
        displayHeadline: 'RECHAZAR · FUERA DE ZONA',
        displaySubline: `Fuera de ${zoneName} · ${rateText}`,
      };
    case 'LOW_RATE_PER_KM':
      return {
        displayHeadline: `${rateText} · TARIFA BAJA`,
        displaySubline: `Mínimo ${formatClp(settings.minRateClpPerKm)}/km · ${kmText}`,
      };
    case 'NEAR_MIN_RATE':
      return {
        displayHeadline: `${rateText} · CERCA DEL MÍNIMO`,
        displaySubline: `Mínimo ${formatClp(settings.minRateClpPerKm)}/km · ${kmText}`,
      };
    case 'PARSE_ERROR':
      return {
        displayHeadline: 'LECTURA INCOMPLETA',
        displaySubline: 'Revisar tarjeta manualmente',
      };
    case 'UNKNOWN_LOCATION':
      return {
        displayHeadline: `${rateText} · REVISAR ZONA`,
        displaySubline: `Comuna no identificada · ${kmText}`,
      };
    case 'OK':
    default:
      return {
        displayHeadline: `${rateText} · ${light === 'GREEN' ? 'ACEPTAR' : 'REVISAR'}`,
        displaySubline: `${zoneName} OK · ${kmText}`,
      };
  }
}

export function evaluateOffer(
  offer: ParsedOffer,
  settings: AppSettings,
  context: EvaluationContext = {},
): EvaluationResult {
  const now = context.now ?? new Date();
  const workZone = context.workZone ?? QUILICURA_WORK_ZONE;

  // P1: Efectivo por horario (CU-05)
  const cashEval = evaluateCashScheduleRule(offer, settings, now);

  // P2: Zonas Rojas (CU-02 — hook preparado para Sprint 2)
  const redZoneReason = settings.redZonesEnabled
    ? context.redZoneReason ?? null
    : null;

  // P3: Zona de trabajo (CU-01)
  const workZoneEval = evaluateWorkZoneRule(offer, settings, {
    workZone,
    originPoint: context.originPoint,
    destinationPoint: context.destinationPoint,
  });

  // P4: Semáforo tarifario (CU-03)
  const tariffEval = evaluateTariffTrafficLight(offer, settings);

  // Recolectar razones activas en orden estricto de prioridad
  const redReasons: RuleReasonCode[] = [];
  const warningReasons: RuleReasonCode[] = [];

  if (cashEval.blocked) {
    redReasons.push(cashEval.reason);
  }
  if (redZoneReason) {
    redReasons.push(redZoneReason);
  }
  if (workZoneEval.status === 'OUTSIDE') {
    redReasons.push('OUT_OF_WORK_ZONE');
  } else if (workZoneEval.status === 'UNKNOWN') {
    warningReasons.push('UNKNOWN_LOCATION');
  }

  if (tariffEval.light === 'RED') {
    redReasons.push(tariffEval.reason);
  } else if (tariffEval.light === 'UNKNOWN') {
    warningReasons.push('PARSE_ERROR');
  } else if (tariffEval.light === 'YELLOW') {
    warningReasons.push('NEAR_MIN_RATE');
  }

  let light: TrafficLight;
  let primaryReason: RuleReasonCode;

  if (redReasons.length > 0) {
    light = 'RED';
    primaryReason = redReasons[0];
  } else if (tariffEval.light === 'UNKNOWN') {
    light = 'UNKNOWN';
    primaryReason = 'PARSE_ERROR';
  } else if (workZoneEval.status === 'UNKNOWN') {
    light = 'UNKNOWN';
    primaryReason = 'UNKNOWN_LOCATION';
  } else if (tariffEval.light === 'YELLOW') {
    light = 'YELLOW';
    primaryReason = 'NEAR_MIN_RATE';
  } else {
    light = 'GREEN';
    primaryReason = 'OK';
  }

  const allReasons: RuleReasonCode[] =
    redReasons.length > 0 || warningReasons.length > 0
      ? [...redReasons, ...warningReasons]
      : ['OK'];

  const {displayHeadline, displaySubline} = buildDisplayCopy(
    light,
    primaryReason,
    tariffEval.rateClpPerKm,
    offer,
    settings,
    workZone.name,
  );

  return {
    offerHash: offer.offerHash,
    light,
    rateClpPerKm: tariffEval.rateClpPerKm,
    primaryReason,
    allReasons,
    displayHeadline,
    displaySubline,
    autoRejectDelaySec: computeAutoRejectDelay(light, settings),
  };
}
