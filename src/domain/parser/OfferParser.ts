import {ParsedOffer, ScreenBounds} from '../types';
import {normalizeText} from './AddressNormalizer';

export interface ParseOfferOptions {
  includePickupDistance: boolean;
  detectedAtIso?: string;
  rejectButtonBounds?: ScreenBounds;
}

const PRICE_REGEX = /(?:CLP\s*|\$\s*)(\d{1,3}(?:\.\d{3})+|\d{3,6})(?!\d)/i;
const DISTANCE_REGEX = /(\d+(?:[.,]\d+)?)\s*(km|m)\b/i;
const DURATION_REGEX = /\b\d+\s*min\b/i;
const CASH_REGEX = /\b(efectivo|cash)\b/i;

const PICKUP_HINTS = /(distancia|recogida|recoger|pickup|away)/i;
const TRIP_HINTS = /(de viaje|viaje|trip|recorrido)/i;

const UI_NOISE_EXACT = new Set([
  'uberx',
  'uber comfort',
  'comfort',
  'uber flash',
  'flash',
  'uber xl',
  'uber planet',
  'uber moto',
  'aceptar',
  'rechazar',
  'ignorar',
  'exclusivo',
  'efectivo',
  'pago en efectivo',
  'viaje en efectivo',
  'cash',
  'verificado',
  'usuario verificado',
  'tarifa dinamica',
  'alta demanda',
  'radar de viajes',
  'x',
]);

function roundKm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parsePriceClp(textNodes: string[]): number | null {
  for (const raw of textNodes) {
    const match = raw.match(PRICE_REGEX);
    if (match) {
      const numeric = parseInt(match[1].replace(/\./g, ''), 10);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
  }
  return null;
}

function extractDistanceKm(node: string): number | null {
  const match = node.match(DISTANCE_REGEX);
  if (!match) {
    return null;
  }
  const value = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const unit = match[2].toLowerCase();
  return unit === 'm' ? roundKm(value / 1000) : roundKm(value);
}

function parseDistances(textNodes: string[]): {
  pickupKm: number | null;
  tripKm: number | null;
} {
  let pickupKm: number | null = null;
  let tripKm: number | null = null;
  const untagged: number[] = [];

  for (const node of textNodes) {
    const km = extractDistanceKm(node);
    if (km === null) {
      continue;
    }

    if (PICKUP_HINTS.test(node) && pickupKm === null) {
      pickupKm = km;
    } else if (TRIP_HINTS.test(node) && tripKm === null) {
      tripKm = km;
    } else {
      untagged.push(km);
    }
  }

  // Si no venían etiquetas explícitas, asigna por orden de aparición
  if (pickupKm === null && tripKm === null) {
    if (untagged.length >= 2) {
      pickupKm = untagged[0];
      tripKm = untagged[1];
    } else if (untagged.length === 1) {
      tripKm = untagged[0];
    }
  } else if (tripKm === null && untagged.length > 0) {
    tripKm = untagged[0];
  } else if (pickupKm === null && untagged.length > 0) {
    pickupKm = untagged[0];
  }

  return {pickupKm, tripKm};
}

function isAddressCandidate(node: string): boolean {
  const trimmed = node.trim();
  if (trimmed.length < 5) {
    return false;
  }
  // Debe contener al menos 3 letras seguidas (descarta ratings "4,92 ★", números sueltos, etc.)
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}/.test(trimmed)) {
    return false;
  }
  if (
    PRICE_REGEX.test(trimmed) ||
    DISTANCE_REGEX.test(trimmed) ||
    DURATION_REGEX.test(trimmed) ||
    CASH_REGEX.test(trimmed)
  ) {
    return false;
  }

  const normalized = normalizeText(trimmed);
  if (UI_NOISE_EXACT.has(normalized)) {
    return false;
  }

  return true;
}

/**
 * Hash FNV-1a 32-bit en JS puro (compatible con Hermes/React Native sin node:crypto).
 */
function computeOfferHash(parts: Array<string | number | boolean | null>): string {
  const payload = parts.map(p => String(p ?? '')).join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `offer_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function parseOfferFromTextNodes(
  textNodes: string[],
  options: ParseOfferOptions,
): ParsedOffer {
  const priceClp = parsePriceClp(textNodes);
  const {pickupKm, tripKm} = parseDistances(textNodes);

  let totalKm: number | null = null;
  if (options.includePickupDistance) {
    if (pickupKm !== null || tripKm !== null) {
      const sum = roundKm((pickupKm ?? 0) + (tripKm ?? 0));
      totalKm = sum > 0 ? sum : null;
    }
  } else {
    totalKm = tripKm !== null && tripKm > 0 ? tripKm : null;
  }

  const isCash = textNodes.some(node => CASH_REGEX.test(node));

  const addresses = textNodes.filter(isAddressCandidate).map(s => s.trim());
  let originText: string | null = null;
  let destinationText: string | null = null;

  if (addresses.length >= 2) {
    originText = addresses[0];
    destinationText = addresses[1];
  } else if (addresses.length === 1) {
    destinationText = addresses[0];
  }

  const offerHash = computeOfferHash([
    priceClp,
    totalKm,
    isCash,
    originText ? normalizeText(originText) : null,
    destinationText ? normalizeText(destinationText) : null,
  ]);

  return {
    offerHash,
    detectedAtIso: options.detectedAtIso ?? new Date().toISOString(),
    priceClp,
    pickupKm,
    tripKm,
    totalKm,
    isCash,
    originText,
    destinationText,
    rejectButtonBounds: options.rejectButtonBounds,
  };
}
