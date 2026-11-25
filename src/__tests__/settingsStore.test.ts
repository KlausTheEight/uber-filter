import {
  DEFAULT_SETTINGS,
  InMemoryStorage,
  SETTINGS_STORAGE_KEY,
  SettingsStore,
} from '../data/settingsStore';

describe('SettingsStore', () => {
  it('retorna valores por defecto seguros cuando no hay nada guardado', () => {
    const store = new SettingsStore(new InMemoryStorage());
    const settings = store.getAll();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.minRateClpPerKm).toBe(500);
    expect(settings.autoRejectEnabled).toBe(false);
    expect(settings.dryRunMode).toBe(true);
  });

  it('actualiza campos parciales sin sobrescribir el resto', () => {
    const store = new SettingsStore(new InMemoryStorage());

    store.update({minRateClpPerKm: 650, cashRejectStartTime: '20:30'});
    const settings = store.getAll();

    expect(settings.minRateClpPerKm).toBe(650);
    expect(settings.cashRejectStartTime).toBe('20:30');
    expect(settings.yellowTolerancePercent).toBe(5);
    expect(settings.redAutoRejectSeconds).toBe(5);
  });

  it('vuelve a defaults si el JSON almacenado está corrupto', () => {
    const storage = new InMemoryStorage();
    storage.set(SETTINGS_STORAGE_KEY, '{json-roto');
    const store = new SettingsStore(storage);

    expect(store.getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('restaura todos los valores al llamar reset()', () => {
    const store = new SettingsStore(new InMemoryStorage());
    store.update({minRateClpPerKm: 900, autoRejectEnabled: true});

    const resetSettings = store.reset();

    expect(resetSettings).toEqual(DEFAULT_SETTINGS);
    expect(store.getAll().minRateClpPerKm).toBe(500);
  });
});
