// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, horizonY: 300 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The three missions, in the order the title screen lists them. */
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Thread 12 golden rings over the valley before your fuel runs dry.',
    rings: 12,
    drops: 0,
    runwayAt: null,
  },
  {
    id: 'mail',
    name: 'Airmail Drop',
    blurb: 'Drop 5 parcels onto the marked rooftops. 8 parcels in the bay — make them count.',
    rings: 0,
    drops: 5,
    runwayAt: null,
  },
  {
    id: 'landing',
    name: 'Dawn Landing',
    blurb: 'Follow the beacon rings to the strip at first light and put her down gently.',
    rings: 6,
    drops: 0,
    runwayAt: 6000,
  },
];

/** The aircraft: a single-engine courier plane, the Kestrel. Speeds in m/s, altitudes in m. */
export const PLANE = {
  minSpeed: 38,
  maxSpeed: 132,
  accel: 26,
  climbRate: 26,
  turnRate: 0.55,
  startAltitude: 120,
  startSpeed: 62,
  fuel: 100,
  /** Fuel burned per second at full throttle; idle burns a quarter of that. */
  fuelBurn: 1.15,
  fuelWarn: 25,
};

/** Scoring. */
export const SCORE = {
  ring: 100,
  drop: 150,
  landing: 500,
  /** Bonus per unit of fuel left on a landing. */
  fuelBonus: 2,
  nearMiss: 25,
};

/** Rings: how wide they are, how far apart along the course, and how far the course wanders. */
export const RING = {
  radius: 26,
  gap: 420,
  /** Lateral wander of the course, in metres, as a smooth sine walk. */
  wander: 150,
  /** Altitude band the rings sit in. */
  low: 70,
  high: 260,
};

/** Drop zones: rooftops the mail run aims at. */
export const DROP = {
  gap: 900,
  padHalf: 18,
  /** Highest altitude a drop still counts from. */
  maxHeight: 130,
  parcels: 8,
};

/** Hazards: hot-air balloons drifting over the valley. */
export const BALLOON = {
  count: 14,
  radius: 12,
  /** Damage taken on a balloon strike. */
  damage: 34,
};

/** The runway: a strip the dawn landing ends on. */
export const RUNWAY = {
  width: 26,
  length: 420,
  /** Touchdown is safe only below this vertical speed (m/s) and speed (m/s). */
  maxSink: 6,
  maxSpeed: 72,
};

/** Terrain: rolling hills under the course, drawn as parallax ridges plus a valley floor. */
export const TERRAIN = {
  /** Height of the valley floor the plane must stay above. */
  floor: 0,
  /** Hills rise this high at their peaks. */
  hillHeight: 90,
  /** Distance, in metres, between the far ridge and the near ground band. */
  farZ: 4200,
  nearZ: 120,
};

/** The camera: how far ahead the pilot can see, and the projection scale. */
export const CAMERA = {
  viewDistance: 4200,
  focal: 620,
};

export const PALETTE = {
  skyTop: '#1d4e89',
  skyMid: '#7fb2e0',
  skyHorizon: '#f6d9a8',
  sun: '#ffd97a',
  cloud: '#ffffff',
  ridgeFar: '#7d9bb8',
  ridgeMid: '#5d7f57',
  ridgeNear: '#4a6b43',
  ground: '#6f9a52',
  fieldA: '#7fae5e',
  fieldB: '#5d8a48',
  runway: '#3c4148',
  runwayLine: '#f2f2f2',
  ring: '#ffc93c',
  ringGlow: 'rgba(255, 201, 60, 0.35)',
  balloon: '#e5534b',
  balloonStripe: '#f2c94c',
  planeBody: '#e8e4d8',
  planeTrim: '#c23b2e',
  planeGlass: '#9fd4e8',
  hud: '#eef4f8',
  hudDim: '#9fb4c4',
  hudWarn: '#ffb02e',
  hudBad: '#ff5d4d',
  panel: 'rgba(10, 22, 34, 0.72)',
  text: '#eef1f5',
  muted: '#8b93a3',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'kestrel-courier.best';
