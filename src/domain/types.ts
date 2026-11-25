export type WorkZoneMode = 'BOTH_INSIDE' | 'DESTINATION_ONLY';

export interface AppSettings {
  // General
  serviceEnabled: boolean;

  // CU-01: Zona de Trabajo
  workZoneEnabled: boolean;
  workZoneMode: WorkZoneMode;
  workZoneBufferMeters: number;

  // CU-02: Zonas Rojas
  redZonesEnabled: boolean;

  // CU-03: Semáforo Tarifario
  minRateClpPerKm: number;
  yellowTolerancePercent: number;
  includePickupDistance: boolean;

  // CU-04: Timers y Auto-Rechazo
  autoRejectEnabled: boolean;
  dryRunMode: boolean;
  redAutoRejectSeconds: number;
  yellowTimerMultiplier: number;
  enableYellowAutoReject: boolean;

  // CU-05: Efectivo por Horario
  cashFilterEnabled: boolean;
  rejectCashAllDay: boolean;
  cashRejectStartTime: string; // Formato "HH:mm"
  cashRejectEndTime: string; // Formato "HH:mm"

  // CU-06: Alerta Cambio de Destino
  destinationChangeAlertEnabled: boolean;
  maxAllowedDeltaKm: number;
  maxAllowedDeltaPercent: number;
  alarmVolumePercent: number;
}

export type TrafficLight = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type RuleReasonCode =
  | 'OK'
  | 'CASH_AFTER_HOURS'
  | 'RED_ZONE_ORIGIN'
  | 'RED_ZONE_DESTINATION'
  | 'RED_ZONE_BOTH'
  | 'OUT_OF_WORK_ZONE'
  | 'UNKNOWN_LOCATION'
  | 'LOW_RATE_PER_KM'
  | 'NEAR_MIN_RATE'
  | 'PARSE_ERROR';

export interface ScreenBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ParsedOffer {
  offerHash: string;
  detectedAtIso: string;
  priceClp: number | null;
  pickupKm: number | null;
  tripKm: number | null;
  totalKm: number | null;
  isCash: boolean;
  originText: string | null;
  destinationText: string | null;
  rejectButtonBounds?: ScreenBounds;
}

export interface EvaluationResult {
  offerHash: string;
  light: TrafficLight;
  rateClpPerKm: number | null;
  primaryReason: RuleReasonCode;
  allReasons: RuleReasonCode[];
  displayHeadline: string;
  displaySubline: string;
  autoRejectDelaySec: number | null;
}
