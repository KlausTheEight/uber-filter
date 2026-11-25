import {DEFAULT_SETTINGS} from '../data/settingsStore';
import {parseOfferFromTextNodes} from '../domain/parser/OfferParser';
import {evaluateOffer} from '../domain/RulesEngine';
import {
  detectCommuneFromAddress,
  evaluateWorkZoneRule,
} from '../domain/rules/WorkZoneRule';
import {AppSettings} from '../domain/types';
import {UBER_SNAPSHOTS} from './fixtures/uberScreenSnapshots';

function localTime(hour: number, minute: number): Date {
  return new Date(2026, 10, 25, hour, minute, 0);
}

describe('WorkZoneRule (CU-01)', () => {
  it('prioriza la comuna al final de la dirección sobre nombres de calles', () => {
    expect(detectCommuneFromAddress('Av. Independencia 1200, Quilicura')).toBe(
      'quilicura',
    );
    expect(
      detectCommuneFromAddress(
        'Av. Lo Cruzat 0350, Quilicura, Región Metropolitana',
      ),
    ).toBe('quilicura');
    expect(detectCommuneFromAddress('Calle Quilicura 150, Santiago')).toBe(
      'santiago',
    );
    expect(detectCommuneFromAddress('Mall Arauco Quilicura')).toBe('quilicura');
    expect(detectCommuneFromAddress('Av. Las Torres 900')).toBeNull();
  });

  it('respeta modo BOTH_INSIDE vs DESTINATION_ONLY', () => {
    const offer = {
      originText: 'Av. El Salto 1500, Huechuraba',
      destinationText: 'Mall Arauco Quilicura',
    };

    const bothInside = evaluateWorkZoneRule(offer, {
      workZoneEnabled: true,
      workZoneMode: 'BOTH_INSIDE',
    });
    const destOnly = evaluateWorkZoneRule(offer, {
      workZoneEnabled: true,
      workZoneMode: 'DESTINATION_ONLY',
    });

    expect(bothInside.status).toBe('OUTSIDE');
    expect(bothInside.reason).toBe('OUT_OF_WORK_ZONE');
    expect(destOnly.status).toBe('INSIDE');
    expect(destOnly.reason).toBe('OK');
  });

  it('usa evaluación por polígono cuando se entregan coordenadas GPS', () => {
    const result = evaluateWorkZoneRule(
      {originText: 'Sin comuna', destinationText: 'Sin comuna'},
      {workZoneEnabled: true, workZoneMode: 'BOTH_INSIDE'},
      {
        originPoint: {lat: -33.3665, lng: -70.7295}, // Plaza de Quilicura
        destinationPoint: {lat: -33.3560, lng: -70.7420}, // Av. Lo Cruzat
      },
    );

    expect(result.status).toBe('INSIDE');
    expect(result.reason).toBe('OK');
  });
});

describe('RulesEngine (Orquestador P1 → P4)', () => {
  const activeSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    autoRejectEnabled: true,
    redAutoRejectSeconds: 5,
    yellowTimerMultiplier: 3,
    enableYellowAutoReject: true,
  };

  it('aprueba GREEN para oferta dentro de Quilicura con buena tarifa y horario permitido', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCardGoodRate,
      {includePickupDistance: true},
    );

    const result = evaluateOffer(offer, activeSettings, {
      now: localTime(15, 0),
    });

    expect(result.light).toBe('GREEN');
    expect(result.primaryReason).toBe('OK');
    expect(result.rateClpPerKm).toBe(700);
    expect(result.autoRejectDelaySec).toBeNull();
  });

  it('aplica P1 (Efectivo nocturno) sobre tarifa GREEN dentro de Quilicura', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCashStandard,
      {includePickupDistance: true},
    );

    const nightResult = evaluateOffer(offer, activeSettings, {
      now: localTime(21, 30),
    });
    const dayResult = evaluateOffer(offer, activeSettings, {
      now: localTime(15, 0),
    });

    expect(nightResult.light).toBe('RED');
    expect(nightResult.primaryReason).toBe('CASH_AFTER_HOURS');
    expect(nightResult.autoRejectDelaySec).toBe(5);

    expect(dayResult.light).toBe('GREEN');
    expect(dayResult.primaryReason).toBe('OK');
  });

  it('mantiene jerarquía P1 > P3 > P4 cuando chocan múltiples rechazos', () => {
    const offer = parseOfferFromTextNodes(
      [
        'UberX',
        '$2.000',
        'Efectivo',
        '10 km de viaje',
        'Av. Lo Cruzat 0350, Quilicura',
        'Av. Providencia 2100, Providencia',
      ],
      {includePickupDistance: true},
    );

    const result = evaluateOffer(offer, activeSettings, {
      now: localTime(22, 15),
    });

    expect(result.light).toBe('RED');
    expect(result.primaryReason).toBe('CASH_AFTER_HOURS');
    expect(result.allReasons).toEqual([
      'CASH_AFTER_HOURS',
      'OUT_OF_WORK_ZONE',
      'LOW_RATE_PER_KM',
    ]);
  });

  it('calcula timer multiplicado en YELLOW y lo desactiva si enableYellowAutoReject es false', () => {
    const offer = parseOfferFromTextNodes(
      [
        'UberX',
        '$2.400', // 480 CLP/km -> YELLOW
        '5,0 km de viaje',
        'Av. Lo Cruzat 0350, Quilicura',
        'Mall Arauco Quilicura',
      ],
      {includePickupDistance: true},
    );

    const withYellowReject = evaluateOffer(offer, activeSettings, {
      now: localTime(14, 0),
    });
    const withoutYellowReject = evaluateOffer(
      offer,
      {...activeSettings, enableYellowAutoReject: false},
      {now: localTime(14, 0)},
    );

    expect(withYellowReject.light).toBe('YELLOW');
    expect(withYellowReject.primaryReason).toBe('NEAR_MIN_RATE');
    expect(withYellowReject.autoRejectDelaySec).toBe(15);

    expect(withoutYellowReject.light).toBe('YELLOW');
    expect(withoutYellowReject.autoRejectDelaySec).toBeNull();
  });

  it('retorna UNKNOWN sin auto-rechazo cuando falta comuna o datos de tarifa', () => {
    const missingCommuneOffer = parseOfferFromTextNodes(
      [
        'UberX',
        '$3.500',
        '5 km de viaje',
        'Av. Las Torres 900',
        'Calle Los Alerces 120',
      ],
      {includePickupDistance: true},
    );
    const missingDistOffer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.missingDistance,
      {includePickupDistance: true},
    );

    const r1 = evaluateOffer(missingCommuneOffer, activeSettings, {
      now: localTime(14, 0),
    });
    const r2 = evaluateOffer(missingDistOffer, activeSettings, {
      now: localTime(14, 0),
    });

    expect(r1.light).toBe('UNKNOWN');
    expect(r1.primaryReason).toBe('UNKNOWN_LOCATION');
    expect(r1.autoRejectDelaySec).toBeNull();

    expect(r2.light).toBe('UNKNOWN');
    expect(r2.primaryReason).toBe('PARSE_ERROR');
    expect(r2.autoRejectDelaySec).toBeNull();
  });

  it('no entrega autoRejectDelaySec cuando autoRejectEnabled está apagado', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.clpPrefixAndDotDecimal,
      {includePickupDistance: true},
    );

    const result = evaluateOffer(
      offer,
      {...activeSettings, autoRejectEnabled: false},
      {now: localTime(22, 0)},
    );

    expect(result.light).toBe('RED');
    expect(result.autoRejectDelaySec).toBeNull();
  });
});
