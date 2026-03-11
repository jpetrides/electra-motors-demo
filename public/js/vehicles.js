/**
 * Elektra Motors — Vehicle catalog
 * Sourced from AUTO_Cloud_Demo/Docs/Org_Data_Inventory.md
 * ProductCodes map to Product2.ProductCode in the Salesforce auto org.
 */
const VEHICLES = {
  'ELK-SUV-7': {
    id:          'ELK-SUV-7',
    slug:        'elektra-reaktive',
    name:        'Elektra Reaktive',
    trim:        'Touring',
    family:      'SUV',
    year:        2026,
    productCode: 'PC-1491',
    image:       '/images/bg-hero-suv-red.png',
    tagline:     'Seven-seat command. Zero compromises.',
    description: 'The Reaktive Touring seats seven without sacrificing performance. Dual-motor AWD, adaptive air suspension, and a panoramic roof that opens to the sky. The SUV for families who refuse to slow down.',
    msrp:        68900,
    isEV:        false,
    specs: {
      range:     '310 mi',
      zeroToSix: '4.8 s',
      power:     '402 hp',
      seats:     '7',
    },
    trims: [
      { id: 'touring',  name: 'Touring',  msrp: 68900, productCode: 'PC-1491' },
      { id: 'ex',       name: 'EX',       msrp: 63400, productCode: 'PC-5114', sku: 'ELK-SUV-5' },
      { id: 'elite',    name: 'Elite',    msrp: 79500, productCode: 'PC-1720' },
    ],
    colors: [
      { name: 'Obsidian Black',  hex: '#1a1a1a' },
      { name: 'Arctic White',    hex: '#f0f0f0' },
      { name: 'Elektra Red',     hex: '#c0392b' },
      { name: 'Storm Grey',      hex: '#5d6470' },
      { name: 'Pacific Blue',    hex: '#1a4f7a' },
    ],
  },

  'ELK-SUV-5': {
    id:          'ELK-SUV-5',
    slug:        'elektra-reaktive',
    name:        'Elektra Reaktive',
    trim:        'EX',
    family:      'SUV',
    year:        2024,
    productCode: 'PC-5114',
    image:       '/images/bg-hero-suv-red.png',
    tagline:     'Pure performance. Five-seat precision.',
    description: 'The Reaktive EX strips back to performance essentials. Lighter, quicker, with the same AWD backbone — for those who want SUV capability without the extra row.',
    msrp:        63400,
    isEV:        false,
    specs: {
      range:     '330 mi',
      zeroToSix: '4.4 s',
      power:     '402 hp',
      seats:     '5',
    },
    trims: [
      { id: 'ex',    name: 'EX',    msrp: 63400, productCode: 'PC-5114' },
      { id: 'touring', name: 'Touring', msrp: 68900, productCode: 'PC-1491', sku: 'ELK-SUV-7' },
      { id: 'elite', name: 'Elite', msrp: 79500, productCode: 'PC-1720' },
    ],
    colors: [
      { name: 'Obsidian Black',  hex: '#1a1a1a' },
      { name: 'Arctic White',    hex: '#f0f0f0' },
      { name: 'Elektra Red',     hex: '#c0392b' },
      { name: 'Storm Grey',      hex: '#5d6470' },
      { name: 'Pacific Blue',    hex: '#1a4f7a' },
    ],
  },

  'ELK-COUPE-GT': {
    id:          'ELK-COUPE-GT',
    slug:        'elektra-megavolt',
    name:        'Elektra Megavolt',
    trim:        'GT',
    family:      'Sport Coupe',
    year:        2025,
    productCode: 'PC-5795',
    image:       '/images/hero-megavolt.png',
    tagline:     'Track-bred. Street-tamed.',
    description: 'The Megavolt GT is what happens when you hand the keys to the engineers. Low-slung fastback body, sport-tuned suspension, and a twin-motor powertrain that hits 60 in 3.4 seconds. Built for the driver.',
    msrp:        72500,
    isEV:        false,
    specs: {
      range:     '290 mi',
      zeroToSix: '3.4 s',
      power:     '510 hp',
      seats:     '4',
    },
    trims: [
      { id: 'gt',    name: 'GT',    msrp: 72500, productCode: 'PC-5795' },
      { id: 'sport', name: 'Sport', msrp: 61200, productCode: 'PC-9621' },
      { id: 'base',  name: 'Base',  msrp: 52800, productCode: 'PC-9581' },
    ],
    colors: [
      { name: 'Obsidian Black',   hex: '#1a1a1a' },
      { name: 'Phantom Green',    hex: '#1a2d1a' },
      { name: 'Arctic White',     hex: '#f0f0f0' },
      { name: 'Burnt Copper',     hex: '#7a3b1a' },
      { name: 'Stealth Grey',     hex: '#3a3d42' },
    ],
  },

  'ELK-SEDAN-AWD': {
    id:          'ELK-SEDAN-AWD',
    slug:        'elektra-harmonic',
    name:        'Elektra Harmonic',
    trim:        'SE',
    family:      'Sedan',
    year:        2022,
    productCode: 'PC-2841',
    image:       '/images/hero-harmonic.png',
    tagline:     'The sedan redefined. Twice.',
    description: 'The Harmonic SE balances executive refinement with genuine driver engagement. Whisper-quiet cabin, adaptive cruise, Level 2 autonomy standard — and a rear-biased AWD that surprises in corners. Adam Feder drives one.',
    msrp:        54900,
    isEV:        false,
    specs: {
      range:     '340 mi',
      zeroToSix: '5.1 s',
      power:     '340 hp',
      seats:     '5',
    },
    trims: [
      { id: 'se',  name: 'SE',  msrp: 54900, productCode: 'PC-2841' },
      { id: 'xle', name: 'XLE', msrp: 61800, productCode: 'PC-3588' },
    ],
    colors: [
      { name: 'Midnight Blue',   hex: '#1a2a4a' },
      { name: 'Obsidian Black',  hex: '#1a1a1a' },
      { name: 'Pearl White',     hex: '#e8e8e8' },
      { name: 'Slate Grey',      hex: '#48505c' },
      { name: 'Champagne',       hex: '#c8b89a' },
    ],
  },

  'ELK-HATCH-PLUS': {
    id:          'ELK-HATCH-PLUS',
    slug:        'elektra-beam',
    name:        'Elektra Beam',
    trim:        'Plus',
    family:      'Hatchback',
    year:        2025,
    productCode: 'PC-4835',
    image:       '/images/hero-beam.png',
    tagline:     'Urban instincts. Weekend spirit.',
    description: 'The Beam Plus is the car for everywhere. Compact enough for the city, capable enough for the weekend. A hatchback that fits your life — without the compromises that usually come with the word compact.',
    msrp:        39800,
    isEV:        false,
    specs: {
      range:     '360 mi',
      zeroToSix: '6.2 s',
      power:     '220 hp',
      seats:     '5',
    },
    trims: [
      { id: 'eco',     name: 'Eco',     msrp: 34500, productCode: 'PC-2988' },
      { id: 'plus',    name: 'Plus',    msrp: 39800, productCode: 'PC-4835' },
      { id: 'premium', name: 'Premium', msrp: 46200, productCode: 'PC-8799' },
    ],
    colors: [
      { name: 'Graphite',       hex: '#3a3d42' },
      { name: 'Arctic White',   hex: '#f0f0f0' },
      { name: 'Coral Orange',   hex: '#d9581a' },
      { name: 'Sky Blue',       hex: '#1a7ab4' },
      { name: 'Forest Green',   hex: '#1a4a2a' },
    ],
  },

  'ELK-TRUCK-PLAT': {
    id:          'ELK-TRUCK-PLAT',
    slug:        'elektra-ignite',
    name:        'Elektra Ignite',
    trim:        'Platinum',
    family:      'Truck',
    year:        2026,
    productCode: 'PC-2337',
    image:       '/images/hero-ignite.png',
    tagline:     'Work harder. Go further.',
    description: 'The Ignite Platinum is a full-size truck that earns its keep. 1,400 lb payload, 7,500 lb tow rating, integrated power export for job site tools — and enough interior refinement that you actually want to drive it home.',
    msrp:        67200,
    isEV:        false,
    specs: {
      range:     '320 mi',
      zeroToSix: '5.6 s',
      power:     '430 hp',
      seats:     '5',
    },
    trims: [
      { id: 'work',     name: 'Work',     msrp: 52400, productCode: 'PC-5475' },
      { id: 'platinum', name: 'Platinum', msrp: 67200, productCode: 'PC-2337' },
    ],
    colors: [
      { name: 'Gunmetal',        hex: '#3a3d42' },
      { name: 'Midnight Black',  hex: '#1a1a1a' },
      { name: 'Tundra White',    hex: '#e8e8e8' },
      { name: 'Canyon Bronze',   hex: '#7a4a2a' },
      { name: 'Ranger Blue',     hex: '#1a3a5a' },
    ],
  },

  'ELK-EV-PERF': {
    id:          'ELK-EV-PERF',
    slug:        'elektra-regulator',
    name:        'Elektra Regulator',
    trim:        'Performance',
    family:      'Full EV',
    year:        2026,
    productCode: 'PC-6843',
    image:       '/images/hero-regulator.png',
    tagline:     'Zero emissions. Infinite momentum.',
    description: 'The Regulator Performance is Elektra\'s purest expression of electric mobility. Purpose-built EV platform, 400-mile range, 800V ultra-fast charging, and a tri-motor AWD system that rewrites what a production car can feel like.',
    msrp:        89400,
    isEV:        true,
    specs: {
      range:     '400 mi',
      zeroToSix: '2.9 s',
      power:     '670 hp',
      seats:     '5',
    },
    trims: [
      { id: 'standard',    name: 'Standard',    msrp: 64900, productCode: 'PC-4942' },
      { id: 'extended',    name: 'Extended',    msrp: 74500, productCode: 'PC-1087' },
      { id: 'performance', name: 'Performance', msrp: 89400, productCode: 'PC-6843' },
    ],
    colors: [
      { name: 'Obsidian Black',  hex: '#1a1a1a' },
      { name: 'Lunar White',     hex: '#e8eaf0' },
      { name: 'Sapphire Deep',   hex: '#0d1f4a' },
      { name: 'Stealth Grey',    hex: '#3a3d42' },
      { name: 'Electric Teal',   hex: '#007a8a' },
    ],
  },
};

/**
 * All models in display order (for grids and overview pages)
 */
const VEHICLE_LIST = [
  VEHICLES['ELK-SUV-7'],
  VEHICLES['ELK-COUPE-GT'],
  VEHICLES['ELK-SEDAN-AWD'],
  VEHICLES['ELK-HATCH-PLUS'],
  VEHICLES['ELK-TRUCK-PLAT'],
  VEHICLES['ELK-EV-PERF'],
];

/**
 * Look up a vehicle by SKU. Falls back to slug search if SKU not found.
 */
function getVehicle(sku) {
  if (VEHICLES[sku]) return VEHICLES[sku];
  return VEHICLE_LIST.find(v => v.slug === sku) || null;
}

/**
 * Format price as USD string — e.g. "$68,900"
 */
function formatPrice(n) {
  return '$' + n.toLocaleString('en-US');
}
