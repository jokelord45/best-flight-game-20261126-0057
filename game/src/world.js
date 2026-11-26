// The simulation: one Kestrel courier plane over a seeded valley, flying a course of rings,
// rooftops or a runway. Pure state and rules — no drawing here — stepped at a fixed 1/60 s.
import {
  BALLOON,
  DROP,
  MISSIONS,
  PLANE,
  RING,
  RUNWAY,
  SCORE,
  STEP,
  TERRAIN,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_DROP = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_LANDED = 16;
export const EVENT_FUEL_WARN = 32;
export const EVENT_NEAR_MISS = 64;

/** The course wanders sideways as the plane flies on: a smooth sine walk in metres. */
function courseX(z, phase) {
  return RING.wander * Math.sin(z * 0.0011 + phase);
}

/** Terrain height in metres at (x, z): rolling hills, flattened along the course line. The
 *  runway corridor (z 5200–6500) is graded flat to zero so a landing approach can sink to it. */
function terrainHeight(x, z, phase) {
  const centre = courseX(z, phase);
  if (z > 5200 && z < 6500 && Math.abs(x - centre) < 160) return 0;
  const off = Math.abs(x - centre);
  const hills =
    34 * Math.sin(z * 0.004 + phase) * Math.sin(x * 0.008 + phase * 2) +
    26 * Math.sin(z * 0.0016 + 1.7) * Math.cos(x * 0.003 - phase) +
    18 * Math.sin((x + z) * 0.0021 + phase * 3);
  const flat = Math.max(0, Math.min(1, (off - 60) / 220));
  return Math.max(TERRAIN.floor, 8 + hills * flat);
}

export function createWorld(random) {
  const phase = random.range(0, Math.PI * 2);
  const state = {
    missionIndex: 0,
    mission: MISSIONS[0],
    plane: {
      x: 0,
      y: PLANE.startAltitude,
      z: 0,
      heading: 0,
      speed: PLANE.startSpeed,
      throttle: 0.55,
      bank: 0,
      pitch: 0,
      vspeed: 0,
      fuel: PLANE.fuel,
      damage: 0,
    },
    rings: [],
    pads: [],
    balloons: [],
    parcels: [],
    score: 0,
    ringsHit: 0,
    dropsHit: 0,
    parcelsLeft: DROP.parcels,
    time: 0,
    landed: false,
    crashed: false,
    over: false,
    message: '',
    messageUntil: 0,
    fuelWarned: false,
  };

  // The renderer and the screenshot autopilot ask the state for the course line and the
  // ground height; both are pure functions of the world's seed.
  state.courseX = (z) => courseX(z, phase);
  state.terrainHeight = (x, z) => terrainHeight(x, z, phase);

  function buildCourse(mission) {
    state.rings = [];
    state.pads = [];
    state.balloons = [];
    state.parcels = [];
    let z = 500;
    for (let index = 0; index < mission.rings; index += 1) {
      const ringZ = z + index * RING.gap;
      state.rings.push({
        x: courseX(ringZ, phase) + random.range(-40, 40),
        y: random.range(RING.low, RING.high),
        z: ringZ,
        done: false,
        nearMissed: false,
      });
    }
    for (let index = 0; index < mission.drops; index += 1) {
      const padZ = 700 + index * DROP.gap;
      state.pads.push({
        x: courseX(padZ, phase) + random.range(-70, 70),
        y: terrainHeight(courseX(padZ, phase), padZ, phase),
        z: padZ,
        done: false,
      });
    }
    for (let index = 0; index < BALLOON.count; index += 1) {
      const balloonZ = 600 + index * 430 + random.range(-120, 120);
      state.balloons.push({
        x: courseX(balloonZ, phase) + random.range(-260, 260),
        y: random.range(60, 240),
        z: balloonZ,
        drift: random.range(-6, 6),
        active: true,
        hue: random.pick(['#e5534b', '#4f8fd0', '#f2c94c', '#7fb069']),
      });
    }
  }

  function setMessage(text, seconds = 2.5) {
    state.message = text;
    state.messageUntil = state.time + seconds;
  }

  function reset(missionIndex = 0) {
    state.missionIndex = missionIndex;
    state.mission = MISSIONS[missionIndex];
    const plane = state.plane;
    plane.x = courseX(0, phase);
    plane.y = PLANE.startAltitude;
    plane.z = 0;
    plane.heading = 0;
    plane.speed = PLANE.startSpeed;
    plane.throttle = 0.55;
    plane.bank = 0;
    plane.pitch = 0;
    plane.vspeed = 0;
    plane.fuel = PLANE.fuel;
    plane.damage = 0;
    state.score = 0;
    state.ringsHit = 0;
    state.dropsHit = 0;
    state.parcelsLeft = DROP.parcels;
    state.time = 0;
    state.landed = false;
    state.crashed = false;
    state.over = false;
    state.message = '';
    state.messageUntil = 0;
    state.fuelWarned = false;
    buildCourse(state.mission);
  }

  function dropParcel() {
    if (state.mission.id !== 'mail' || state.parcelsLeft <= 0 || state.over) return false;
    const plane = state.plane;
    state.parcelsLeft -= 1;
    // The parcel keeps the plane's forward speed when it leaves the bay.
    state.parcels.push({ x: plane.x, y: plane.y, z: plane.z, vy: 0, vz: plane.speed, active: true });
    return true;
  }

  function step(dt, input, attract) {
    const plane = state.plane;
    const stepSize = dt || STEP;
    state.time += stepSize;
    let events = EVENT_NONE;

    if (attract) {
      // The title screen flies itself: a gentle cruise down the valley for the backdrop.
      plane.throttle = 0.55;
      plane.speed += (70 - plane.speed) * 0.4 * stepSize;
      plane.heading = Math.sin(state.time * 0.05) * 0.12;
      plane.x = courseX(plane.z, phase);
      plane.y = 130 + Math.sin(state.time * 0.3) * 12;
      plane.z += plane.speed * stepSize;
      plane.bank = Math.cos(state.time * 0.05) * 0.12;
      if (plane.z > 9000) {
        plane.z = 0;
      }
      return events;
    }

    // Throttle and speed.
    plane.throttle = Math.max(0, Math.min(1, plane.throttle + input.throttle * 0.9 * stepSize));
    const targetSpeed = PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    const engineOut = plane.fuel <= 0;
    plane.speed += ((engineOut ? PLANE.minSpeed * 0.55 : targetSpeed) - plane.speed) * 0.9 * stepSize;

    // Turn and bank: the heading follows the stick, the wings follow the turn.
    const turnRate = input.turn * PLANE.turnRate * (0.5 + plane.speed / PLANE.maxSpeed);
    plane.heading += turnRate * stepSize;
    plane.bank += (input.turn * 0.55 - plane.bank) * 3 * stepSize;

    // Pitch: climb and descend, losing a little speed in a hard climb.
    plane.pitch += (input.pitch - plane.pitch) * 4 * stepSize;
    plane.vspeed = plane.pitch * PLANE.climbRate * (0.6 + plane.speed / PLANE.maxSpeed);
    plane.y += plane.vspeed * stepSize;
    if (plane.y > 420) plane.y = 420;

    // Advance along the course.
    const prevZ = plane.z;
    plane.z += plane.speed * Math.cos(plane.heading) * stepSize;
    plane.x += plane.speed * Math.sin(plane.heading) * stepSize;

    // Fuel: the throttle sets the burn; empty tanks mean a glide, not a stop.
    plane.fuel = Math.max(0, plane.fuel - PLANE.fuelBurn * (0.25 + plane.throttle * 0.75) * stepSize);
    if (!state.fuelWarned && plane.fuel < PLANE.fuelWarn && plane.fuel > 0) {
      state.fuelWarned = true;
      events |= EVENT_FUEL_WARN;
      setMessage('LOW FUEL — find the strip or finish fast', 3);
    }

    // Rings: passed when their z crosses the plane's z.
    for (const ring of state.rings) {
      if (ring.done || ring.z <= prevZ || ring.z > plane.z) continue;
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      const dist = Math.hypot(dx, dy);
      if (dist < RING.radius) {
        ring.done = true;
        state.ringsHit += 1;
        state.score += SCORE.ring;
        events |= EVENT_RING;
        setMessage(`RING ${state.ringsHit}/${state.rings.length}  +${SCORE.ring}`);
      } else if (dist < RING.radius * 2.5 && !ring.nearMissed) {
        ring.nearMissed = true;
        state.score += SCORE.nearMiss;
        events |= EVENT_NEAR_MISS;
        setMessage(`Near miss  +${SCORE.nearMiss}`);
      }
    }

    // Balloons drift sideways; a strike costs damage and knocks the plane.
    for (const balloon of state.balloons) {
      if (!balloon.active) continue;
      balloon.x += balloon.drift * stepSize;
      const dz = balloon.z - plane.z;
      if (Math.abs(dz) > 30) continue;
      const dist = Math.hypot(plane.x - balloon.x, plane.y - balloon.y, dz);
      if (dist < BALLOON.radius + 7) {
        balloon.active = false;
        plane.damage = Math.min(100, plane.damage + BALLOON.damage);
        plane.speed *= 0.82;
        plane.y += 8;
        events |= EVENT_HIT;
        setMessage('BALLOON STRIKE — damage!', 2);
        if (plane.damage >= 100) {
          state.crashed = true;
          state.over = true;
          events |= EVENT_OVER;
        }
      }
    }

    // Parcels fall straight down from where they were dropped.
    for (const parcel of state.parcels) {
      if (!parcel.active) continue;
      parcel.vy += 22 * stepSize;
      parcel.y -= parcel.vy * stepSize;
      parcel.z += parcel.vz * stepSize;
      const ground = terrainHeight(parcel.x, parcel.z, phase);
      if (parcel.y <= ground + 2) {
        parcel.active = false;
        const pad = state.pads.find((candidate) => !candidate.done && Math.abs(candidate.z - parcel.z) < 90);
        if (pad && Math.abs(parcel.x - pad.x) < DROP.padHalf + 8) {
          pad.done = true;
          state.dropsHit += 1;
          state.score += SCORE.drop;
          events |= EVENT_DROP;
          setMessage(`PARCEL DELIVERED ${state.dropsHit}/${state.pads.length}  +${SCORE.drop}`);
        } else {
          setMessage('Parcel lost in the fields', 2);
        }
      }
    }

    // Mission complete: every ring, every parcel, or a safe touchdown.
    if (state.mission.id === 'rings' && state.ringsHit >= state.rings.length) {
      state.over = true;
      events |= EVENT_OVER;
      setMessage('COURSE COMPLETE!', 4);
    }
    if (state.mission.id === 'mail' && state.dropsHit >= state.pads.length) {
      state.over = true;
      events |= EVENT_OVER;
      setMessage('ALL PARCELS DELIVERED!', 4);
    }
    if (state.mission.id === 'mail' && state.parcelsLeft === 0 && state.parcels.every((p) => !p.active) && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
      setMessage('Out of parcels — run over', 4);
    }

    // Ground: the runway forgives a gentle touchdown; anywhere else is a crash.
    const ground = terrainHeight(plane.x, plane.z, phase);
    const runway = state.mission.runwayAt;
    const onRunway =
      runway !== null &&
      Math.abs(plane.z - (runway + RUNWAY.length / 2)) < RUNWAY.length / 2 &&
      Math.abs(plane.x - courseX(plane.z, phase)) < RUNWAY.width / 2;
    if (plane.y <= ground + 2 && !state.over) {
      if (onRunway && -plane.vspeed < RUNWAY.maxSink && plane.speed < RUNWAY.maxSpeed) {
        state.landed = true;
        state.over = true;
        state.score += SCORE.landing + Math.round(plane.fuel) * SCORE.fuelBonus;
        events |= EVENT_LANDED | EVENT_OVER;
        setMessage('TOUCHDOWN — welcome home, Kestrel', 4);
      } else {
        state.crashed = true;
        state.over = true;
        events |= EVENT_OVER;
        setMessage(onRunway ? 'Too hard — the Kestrel is down' : 'TERRAIN — the Kestrel is down', 4);
      }
    }
    if (plane.fuel <= 0 && plane.y <= ground + 2 && !state.over) {
      state.crashed = true;
      state.over = true;
      events |= EVENT_OVER;
    }

    return events;
  }

  reset(0);

  return {
    state,
    reset,
    step,
    dropParcel,
    courseX: (z) => courseX(z, phase),
    terrainHeight: (x, z) => terrainHeight(x, z, phase),
  };
}
