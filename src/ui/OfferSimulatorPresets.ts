export interface SimulatedOfferPreset {
  id: string;
  label: string;
  description: string;
  textNodes: string[];
}

export const SIMULATOR_PRESETS: SimulatedOfferPreset[] = [
  {
    id: 'quilicura_good',
    label: 'Quilicura OK',
    description: '$3.500 · 5,0 km · Tarjeta',
    textNodes: [
      'UberX',
      '$3.500',
      '4,95 ★',
      '4 min (1,2 km) de distancia',
      'San Luis Norte 1200, Quilicura',
      '10 min (3,8 km) de viaje',
      'Mall Arauco Quilicura',
      'Aceptar',
    ],
  },
  {
    id: 'quilicura_yellow',
    label: 'Tarifa Amarilla',
    description: '$2.400 · 5,0 km ($480/km)',
    textNodes: [
      'UberX',
      '$2.400',
      '4,89 ★',
      '3 min (1,0 km) de distancia',
      'Av. Lo Cruzat 0350, Quilicura',
      '9 min (4,0 km) de viaje',
      'Av. Manuel Antonio Matta 540, Quilicura',
      'Aceptar',
    ],
  },
  {
    id: 'quilicura_cash',
    label: 'Efectivo Quilicura',
    description: '$2.450 · 4,7 km · Efectivo',
    textNodes: [
      'UberX',
      'Exclusivo',
      '$2.450',
      'Efectivo',
      '4,88 ★',
      '2 min (600 m) de distancia',
      'Av. Lo Cruzat 0350, Quilicura',
      '9 min (4,1 km) de viaje',
      'Av. Manuel Antonio Matta 540, Quilicura',
      'Aceptar',
    ],
  },
  {
    id: 'out_of_zone',
    label: 'Fuera de Zona',
    description: 'Quilicura → Providencia · $12.500',
    textNodes: [
      'Comfort',
      '$12.500',
      '1,5 km de distancia',
      "Av. O'Higgins 420, Quilicura",
      '18,5 km de viaje',
      'Av. Providencia 2100, Providencia',
      'Aceptar',
    ],
  },
  {
    id: 'origin_huechuraba',
    label: 'Origen Huechuraba',
    description: 'Huechuraba → Quilicura (prueba modo zona)',
    textNodes: [
      'UberX',
      '$3.600',
      '1,5 km de distancia',
      'Av. El Salto 1500, Huechuraba',
      '4,5 km de viaje',
      'Mall Arauco Quilicura',
      'Aceptar',
    ],
  },
  {
    id: 'incomplete_card',
    label: 'Lectura Incompleta',
    description: 'Sin distancia (debe dar UNKNOWN seguro)',
    textNodes: ['UberX', '$3.000', "Av. O'Higgins 420, Quilicura"],
  },
];
