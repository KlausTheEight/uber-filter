import {AppSettings, ParsedOffer, RuleReasonCode, TrafficLight} from '../types';

export interface TariffEvaluation {
  light: TrafficLight;
  rateClpPerKm: number | null;
  yellowThresholdClpPerKm: number;
  reason: RuleReasonCode;
}

export function evaluateTariffTrafficLight(
  offer: Pick<ParsedOffer, 'priceClp' | 'totalKm'>,
  settings: Pick<AppSettings, 'minRateClpPerKm' | 'yellowTolerancePercent'>,
): TariffEvaluation {
  const yellowThresholdClpPerKm = Number(
    (
      (settings.minRateClpPerKm * (100 - settings.yellowTolerancePercent)) /
      100
    ).toFixed(6),
  );

  if (
    offer.priceClp === null ||
    offer.priceClp <= 0 ||
    offer.totalKm === null ||
    offer.totalKm <= 0
  ) {
    return {
      light: 'UNKNOWN',
      rateClpPerKm: null,
      yellowThresholdClpPerKm,
      reason: 'PARSE_ERROR',
    };
  }

  const exactRate = offer.priceClp / offer.totalKm;
  const rateClpPerKm = Math.round(exactRate * 100) / 100;

  if (exactRate >= settings.minRateClpPerKm) {
    return {
      light: 'GREEN',
      rateClpPerKm,
      yellowThresholdClpPerKm,
      reason: 'OK',
    };
  }

  if (exactRate > yellowThresholdClpPerKm) {
    return {
      light: 'YELLOW',
      rateClpPerKm,
      yellowThresholdClpPerKm,
      reason: 'NEAR_MIN_RATE',
    };
  }

  return {
    light: 'RED',
    rateClpPerKm,
    yellowThresholdClpPerKm,
    reason: 'LOW_RATE_PER_KM',
  };
}
