import {
  normalizeAddress,
  normalizeText,
} from '../domain/parser/AddressNormalizer';
import {parseOfferFromTextNodes} from '../domain/parser/OfferParser';
import {UBER_SNAPSHOTS} from './fixtures/uberScreenSnapshots';

describe('AddressNormalizer', () => {
  it('quita tildes, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizeText('  Av.   O’Higgins   Ñuñoa  ')).toBe(
      'av. o’higgins nunoa',
    );
  });

  it('expande abreviaturas chilenas comunes', () => {
    expect(normalizeAddress('Av. Lo Cruzat 0350, Quilicura')).toBe(
      'avenida lo cruzat 0350 quilicura',
    );
    expect(normalizeAddress('Pje. Sta. Luisa 145')).toBe(
      'pasaje santa luisa 145',
    );
  });
});

describe('OfferParser', () => {
  it('parsea tarjeta estándar de Uber Chile con metros, km y efectivo', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCashStandard,
      {includePickupDistance: true, detectedAtIso: '2026-11-25T21:10:00Z'},
    );

    expect(offer.priceClp).toBe(2450);
    expect(offer.pickupKm).toBe(0.6);
    expect(offer.tripKm).toBe(4.1);
    expect(offer.totalKm).toBe(4.7);
    expect(offer.isCash).toBe(true);
    expect(offer.originText).toBe('Av. Lo Cruzat 0350, Quilicura');
    expect(offer.destinationText).toBe(
      'Av. Manuel Antonio Matta 540, Quilicura',
    );
  });

  it('suma recogida + viaje cuando includePickupDistance es true', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCardGoodRate,
      {includePickupDistance: true},
    );

    expect(offer.priceClp).toBe(3500);
    expect(offer.pickupKm).toBe(1.2);
    expect(offer.tripKm).toBe(3.8);
    expect(offer.totalKm).toBe(5);
    expect(offer.isCash).toBe(false);
  });

  it('usa solo distancia de viaje cuando includePickupDistance es false', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCardGoodRate,
      {includePickupDistance: false},
    );

    expect(offer.pickupKm).toBe(1.2);
    expect(offer.tripKm).toBe(3.8);
    expect(offer.totalKm).toBe(3.8);
  });

  it('soporta prefijo CLP, decimales con punto y variante "Pago en efectivo"', () => {
    const offer = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.clpPrefixAndDotDecimal,
      {includePickupDistance: true},
    );

    expect(offer.priceClp).toBe(12500);
    expect(offer.pickupKm).toBe(1.5);
    expect(offer.tripKm).toBe(18.5);
    expect(offer.totalKm).toBe(20);
    expect(offer.isCash).toBe(true);
    expect(offer.destinationText).toBe('Av. Providencia 2100, Providencia');
  });

  it('maneja tarjeta con una sola distancia y una sola dirección', () => {
    const offer = parseOfferFromTextNodes(UBER_SNAPSHOTS.singleDistanceOnly, {
      includePickupDistance: true,
    });

    expect(offer.priceClp).toBe(2400);
    expect(offer.pickupKm).toBeNull();
    expect(offer.tripKm).toBe(5);
    expect(offer.totalKm).toBe(5);
    expect(offer.originText).toBeNull();
    expect(offer.destinationText).toBe('Av. Las Torres 900, Quilicura');
  });

  it('asigna recogida y viaje por orden cuando no hay etiquetas de texto', () => {
    const offer = parseOfferFromTextNodes(UBER_SNAPSHOTS.untaggedTwoDistances, {
      includePickupDistance: true,
    });

    expect(offer.pickupKm).toBe(0.85);
    expect(offer.tripKm).toBe(3.15);
    expect(offer.totalKm).toBe(4);
    expect(offer.originText).toBe('Pje. Los Alerces 120, Quilicura');
    expect(offer.destinationText).toBe('Sta. Luisa 450, Quilicura');
  });

  it('retorna totalKm null si falta distancia (sin lanzar excepción)', () => {
    const offer = parseOfferFromTextNodes(UBER_SNAPSHOTS.missingDistance, {
      includePickupDistance: true,
    });

    expect(offer.priceClp).toBe(3000);
    expect(offer.totalKm).toBeNull();
  });

  it('retorna priceClp null si falta monto (sin lanzar excepción)', () => {
    const offer = parseOfferFromTextNodes(UBER_SNAPSHOTS.missingPrice, {
      includePickupDistance: true,
    });

    expect(offer.priceClp).toBeNull();
    expect(offer.totalKm).toBe(4.1);
  });

  it('detecta variante en inglés "Cash"', () => {
    const offer = parseOfferFromTextNodes(['$2.000', 'Cash', '4 km'], {
      includePickupDistance: true,
    });
    expect(offer.isCash).toBe(true);
  });

  it('genera offerHash determinístico para deduplicar la misma oferta', () => {
    const first = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCashStandard,
      {includePickupDistance: true},
    );
    const second = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCashStandard,
      {includePickupDistance: true},
    );
    const different = parseOfferFromTextNodes(
      UBER_SNAPSHOTS.quilicuraCardGoodRate,
      {includePickupDistance: true},
    );

    expect(first.offerHash).toBe(second.offerHash);
    expect(first.offerHash).not.toBe(different.offerHash);
  });
});
