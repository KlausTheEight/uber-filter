import {AppSettings, ParsedOffer, RuleReasonCode} from '../types';

export interface CashRuleEvaluation {
  blocked: boolean;
  reason: RuleReasonCode;
}

export function parseTimeToMinutes(timeHHmm: string): number {
  const match = timeHHmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Formato de hora inválido: "${timeHHmm}". Esperado HH:mm`);
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Hora fuera de rango: "${timeHHmm}"`);
  }

  return hours * 60 + minutes;
}

export function isWithinRestrictedTimeRange(
  now: Date,
  startTime: string,
  endTime: string,
): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin === endMin) {
    return false;
  }

  // Rango que cruza medianoche (ej. 21:00 -> 06:00)
  if (startMin > endMin) {
    return nowMin >= startMin || nowMin < endMin;
  }

  // Rango dentro del mismo día (ej. 14:00 -> 18:00)
  return nowMin >= startMin && nowMin < endMin;
}

export function evaluateCashScheduleRule(
  offer: Pick<ParsedOffer, 'isCash'>,
  settings: Pick<
    AppSettings,
    | 'cashFilterEnabled'
    | 'rejectCashAllDay'
    | 'cashRejectStartTime'
    | 'cashRejectEndTime'
  >,
  now: Date = new Date(),
): CashRuleEvaluation {
  if (!settings.cashFilterEnabled || !offer.isCash) {
    return {blocked: false, reason: 'OK'};
  }

  if (settings.rejectCashAllDay) {
    return {blocked: true, reason: 'CASH_AFTER_HOURS'};
  }

  const blocked = isWithinRestrictedTimeRange(
    now,
    settings.cashRejectStartTime,
    settings.cashRejectEndTime,
  );

  return {
    blocked,
    reason: blocked ? 'CASH_AFTER_HOURS' : 'OK',
  };
}
