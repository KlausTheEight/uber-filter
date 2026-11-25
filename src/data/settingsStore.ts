import {AppSettings} from '../domain/types';

export const SETTINGS_STORAGE_KEY = 'uberfilter.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  serviceEnabled: false,

  workZoneEnabled: true,
  workZoneMode: 'BOTH_INSIDE',
  workZoneBufferMeters: 150,

  redZonesEnabled: true,

  minRateClpPerKm: 500,
  yellowTolerancePercent: 5,
  includePickupDistance: true,

  autoRejectEnabled: false,
  dryRunMode: true,
  redAutoRejectSeconds: 5,
  yellowTimerMultiplier: 3,
  enableYellowAutoReject: true,

  cashFilterEnabled: true,
  rejectCashAllDay: false,
  cashRejectStartTime: '21:00',
  cashRejectEndTime: '06:00',

  destinationChangeAlertEnabled: true,
  maxAllowedDeltaKm: 2.0,
  maxAllowedDeltaPercent: 30,
  alarmVolumePercent: 85,
};

export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export class InMemoryStorage implements KeyValueStorage {
  private readonly store = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export class SettingsStore {
  constructor(private readonly storage: KeyValueStorage) {}

  getAll(): AppSettings {
    const raw = this.storage.getString(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {...DEFAULT_SETTINGS};
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {...DEFAULT_SETTINGS, ...parsed};
    } catch {
      return {...DEFAULT_SETTINGS};
    }
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const next: AppSettings = {
      ...this.getAll(),
      ...partial,
    };
    this.storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  reset(): AppSettings {
    this.storage.delete(SETTINGS_STORAGE_KEY);
    return {...DEFAULT_SETTINGS};
  }
}
