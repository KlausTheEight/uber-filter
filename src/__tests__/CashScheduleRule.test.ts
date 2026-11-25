import {
  evaluateCashScheduleRule,
  isWithinRestrictedTimeRange,
} from '../domain/rules/CashScheduleRule';

function localTime(hour: number, minute: number): Date {
  return new Date(2026, 10, 25, hour, minute, 0);
}

describe('CashScheduleRule (CU-05)', () => {
  const baseSettings = {
    cashFilterEnabled: true,
    rejectCashAllDay: false,
    cashRejectStartTime: '21:00',
    cashRejectEndTime: '06:00',
  };

  it('maneja todos los bordes de una franja que cruza medianoche (21:00 - 06:00)', () => {
    expect(isWithinRestrictedTimeRange(localTime(20, 59), '21:00', '06:00')).toBe(false);
    expect(isWithinRestrictedTimeRange(localTime(21, 0), '21:00', '06:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(23, 59), '21:00', '06:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(0, 0), '21:00', '06:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(1, 40), '21:00', '06:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(5, 59), '21:00', '06:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(6, 0), '21:00', '06:00')).toBe(false);
    expect(isWithinRestrictedTimeRange(localTime(15, 20), '21:00', '06:00')).toBe(false);
  });

  it('bloquea efectivo pasada las 21:00 y permite tarjeta a la misma hora', () => {
    const cashOffer = evaluateCashScheduleRule(
      {isCash: true},
      baseSettings,
      localTime(21, 5),
    );
    const cardOffer = evaluateCashScheduleRule(
      {isCash: false},
      baseSettings,
      localTime(22, 15),
    );

    expect(cashOffer).toEqual({blocked: true, reason: 'CASH_AFTER_HOURS'});
    expect(cardOffer).toEqual({blocked: false, reason: 'OK'});
  });

  it('permite efectivo durante el día pero bloquea si rejectCashAllDay es true', () => {
    const dayAllowed = evaluateCashScheduleRule(
      {isCash: true},
      baseSettings,
      localTime(15, 20),
    );
    const allDayBlocked = evaluateCashScheduleRule(
      {isCash: true},
      {...baseSettings, rejectCashAllDay: true},
      localTime(15, 20),
    );

    expect(dayAllowed.blocked).toBe(false);
    expect(allDayBlocked.blocked).toBe(true);
  });

  it('soporta franjas dentro del mismo día (ej. 14:00 - 18:00)', () => {
    expect(isWithinRestrictedTimeRange(localTime(13, 59), '14:00', '18:00')).toBe(false);
    expect(isWithinRestrictedTimeRange(localTime(14, 0), '14:00', '18:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(17, 59), '14:00', '18:00')).toBe(true);
    expect(isWithinRestrictedTimeRange(localTime(18, 0), '14:00', '18:00')).toBe(false);
  });
});
