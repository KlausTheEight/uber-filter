import {evaluateTariffTrafficLight} from '../domain/rules/TariffTrafficLightRule';

describe('TariffTrafficLightRule (CU-03)', () => {
  const baseSettings = {
    minRateClpPerKm: 500,
    yellowTolerancePercent: 5, // Umbral amarillo > 475
  };

  it('retorna GREEN cuando la tarifa es igual al mínimo (500 CLP/km)', () => {
    const result = evaluateTariffTrafficLight(
      {priceClp: 2500, totalKm: 5},
      baseSettings,
    );

    expect(result.light).toBe('GREEN');
    expect(result.rateClpPerKm).toBe(500);
    expect(result.reason).toBe('OK');
  });

  it('retorna GREEN cuando supera el mínimo', () => {
    const result = evaluateTariffTrafficLight(
      {priceClp: 3500, totalKm: 5},
      baseSettings,
    );

    expect(result.light).toBe('GREEN');
    expect(result.rateClpPerKm).toBe(700);
  });

  it('retorna YELLOW cuando le falta menos de 5% (480 y 475.1 CLP/km)', () => {
    const r480 = evaluateTariffTrafficLight(
      {priceClp: 2400, totalKm: 5},
      baseSettings,
    );
    const rBorder = evaluateTariffTrafficLight(
      {priceClp: 4751, totalKm: 10},
      baseSettings,
    );

    expect(r480.light).toBe('YELLOW');
    expect(r480.reason).toBe('NEAR_MIN_RATE');
    expect(rBorder.light).toBe('YELLOW');
  });

  it('retorna RED en el límite exacto de 5% debajo del mínimo (475 CLP/km)', () => {
    const result = evaluateTariffTrafficLight(
      {priceClp: 2375, totalKm: 5},
      baseSettings,
    );

    expect(result.light).toBe('RED');
    expect(result.rateClpPerKm).toBe(475);
    expect(result.reason).toBe('LOW_RATE_PER_KM');
  });

  it('retorna RED cuando está muy por debajo del mínimo (360 CLP/km)', () => {
    const result = evaluateTariffTrafficLight(
      {priceClp: 1800, totalKm: 5},
      baseSettings,
    );

    expect(result.light).toBe('RED');
    expect(result.rateClpPerKm).toBe(360);
  });

  it('retorna UNKNOWN con PARSE_ERROR si falta precio o distancia', () => {
    const missingDist = evaluateTariffTrafficLight(
      {priceClp: 3000, totalKm: null},
      baseSettings,
    );
    const zeroDist = evaluateTariffTrafficLight(
      {priceClp: 3000, totalKm: 0},
      baseSettings,
    );
    const missingPrice = evaluateTariffTrafficLight(
      {priceClp: null, totalKm: 4},
      baseSettings,
    );

    expect(missingDist.light).toBe('UNKNOWN');
    expect(missingDist.reason).toBe('PARSE_ERROR');
    expect(zeroDist.light).toBe('UNKNOWN');
    expect(missingPrice.light).toBe('UNKNOWN');
  });
});
