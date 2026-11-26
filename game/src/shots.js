// The screenshot scenes behind ?shot=start|play|drop|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// aims at the next ring or rooftop and puts the plane down on the strip, so the frame is what
// a short game really looks like and the same seed always gives the same frame.
import { MISSIONS, STEP } from './config.js';
import { EVENT_OVER, EVENT_LANDED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const DROP_SECONDS = 75;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward a target point: turn to face it, pitch to meet its altitude. Throttle is a
 *  delta toward a cruise setting — the world's step treats it as a lever, not a target.
 *  The turn is a lateral-error controller, not a heading to the point: it asks for the
 *  heading whose sideways speed closes 35% of the lateral error a second, so the plane
 *  crabs onto the target line early instead of drifting toward it from far off. */
function steerToward(state, targetX, targetY, targetZ) {
  const plane = state.plane;
  const error = targetX - plane.x;
  const wantedHeading = Math.asin(
    Math.max(-0.6, Math.min(0.6, (error * 0.35) / Math.max(30, plane.speed))),
  );
  let headingError = wantedHeading - plane.heading;
  while (headingError > Math.PI) headingError -= Math.PI * 2;
  while (headingError < -Math.PI) headingError += Math.PI * 2;
  const turn = Math.max(-1, Math.min(1, headingError * 4));
  const altitudeError = targetY - plane.y;
  const pitch = Math.max(-1, Math.min(1, altitudeError / 45));
  return { pitch, turn, throttle: Math.max(-1, Math.min(1, (0.62 - plane.throttle) * 3)) };
}

/** The autopilot's current aim: the next ring, the next rooftop, or the runway threshold. */
export function autopilot(world) {
  const state = world.state;
  const plane = state.plane;
  const mission = state.mission;
  const ring = state.rings.find((candidate) => !candidate.done && candidate.z > plane.z - 20);
  if (mission.id === 'landing' && (!ring || ring.z > mission.runwayAt - 900)) {
    // Final approach: track the centreline through a lookahead point 150 m ahead, so the
    // plane follows the strip as it wanders, and step down one continuous shallow slope —
    // 6 cm of descent per metre flown — then a short flare to the strip.
    const lookahead = 150;
    const targetX = world.courseX(plane.z + lookahead);
    const wantedHeading = Math.atan2(targetX - plane.x, lookahead);
    let headingError = wantedHeading - plane.heading;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;
    const distance = Math.max(0, mission.runwayAt - plane.z);
    // One continuous shallow slope: 4.5 cm of descent per metre flown, so the sink rate
    // stays gentle all the way to the threshold, then a short flare to the strip.
    const targetAltitude = distance > 60 ? Math.min(140, Math.max(6, distance * 0.06)) : 0;
    const pitch = Math.max(-0.5, Math.min(1, (targetAltitude - plane.y) / 30));
    const targetThrottle = plane.speed > 66 ? 0.15 : 0.4;
    return {
      pitch,
      turn: Math.max(-1, Math.min(1, headingError * 5)),
      throttle: Math.max(-1, Math.min(1, (targetThrottle - plane.throttle) * 3)),
    };
  }
  if (ring) return steerToward(state, ring.x, ring.y, ring.z);
  const pad = state.pads.find((candidate) => !candidate.done && candidate.z > plane.z - 20);
  if (pad) return steerToward(state, pad.x, Math.min(110, pad.y + 90), pad.z);
  return { pitch: 0, turn: 0, throttle: 0 };
}

function runFor(world, seconds, missionIndex) {
  world.reset(missionIndex);
  let events = 0;
  const limit = Math.floor(seconds / STEP);
  for (let index = 0; index < limit; index += 1) {
    const input = autopilot(world);
    events = world.step(STEP, input, false);
    if (events & EVENT_OVER) break;
    // The mail autopilot drops one parcel at a time, released early by the fall time so the
    // parcel's forward travel puts it on the rooftop instead of past it.
    if (world.state.mission.id === 'mail') {
      const plane = world.state.plane;
      const pad = world.state.pads.find((candidate) => !candidate.done && candidate.z > plane.z - 20);
      const noneFalling = world.state.parcels.every((parcel) => !parcel.active);
      if (pad && noneFalling && plane.y < 130) {
        const fallTime = Math.sqrt((2 * Math.max(20, plane.y)) / 22);
        const lead = plane.speed * fallTime;
        const dz = pad.z - plane.z;
        if (dz > lead - 30 && dz < lead + 30 && Math.abs(plane.x - pad.x) < 16) world.dropParcel();
      }
    }
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, drop or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'drop' && name !== 'end') {
    world.reset(0);
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { pitch: 0, turn: 0, throttle: 0 }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'drop') {
    runFor(world, DROP_SECONDS, 1);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    const events = runFor(world, END_LIMIT_SECONDS, 2);
    const landed = (events & EVENT_LANDED) !== 0 || world.state.landed;
    return { screen: landed ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  runFor(world, PLAY_SECONDS, 0);
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
