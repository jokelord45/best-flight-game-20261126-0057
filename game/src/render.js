// Everything the eye sees: a chase view from behind the Kestrel over a seeded valley — sky,
// sun and drifting clouds, parallax ridges, a perspective valley floor, the runway, golden
// rings, balloons and rooftops — then the plane itself and the instruments a pilot reads.
import {
  BALLOON,
  CAMERA,
  DROP,
  FIELD,
  FONT,
  MISSIONS,
  PALETTE,
  RING,
  RUNWAY,
} from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const TAU = Math.PI * 2;

/** Clouds keep their place in the sky and cycle ahead of the plane as it flies on. */
const cloudRandom = createRandom(20261126);
const CLOUDS = Array.from({ length: 26 }, () => ({
  x: cloudRandom.range(-1600, 1600),
  y: cloudRandom.range(200, 430),
  baseZ: cloudRandom.range(0, 9000),
  size: cloudRandom.range(60, 190),
  speed: cloudRandom.range(0.4, 1),
}));

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function headingLabel(degrees) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(((degrees % 360) + 360) % 360 / 45) % 8];
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = FIELD.width;
    canvas.height = FIELD.height;
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  /** Project a world point into screen space from the plane's seat. */
  function project(state, x, y, z) {
    const plane = state.plane;
    const dx = x - plane.x;
    const dy = y - plane.y;
    const dz = z - plane.z;
    const forward = dz * Math.cos(plane.heading) + dx * Math.sin(plane.heading);
    if (forward < 8) return null;
    const lateral = dx * Math.cos(plane.heading) - dz * Math.sin(plane.heading);
    const scale = CAMERA.focal / forward;
    return {
      x: FIELD.width / 2 + lateral * scale,
      y: FIELD.horizonY - dy * scale + plane.pitch * 26,
      scale,
      forward,
    };
  }

  function drawSky(state) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.horizonY + 40);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyHorizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.horizonY + 40);
    // Sun, low over the valley to the east.
    const sunX = FIELD.width * 0.78 - state.plane.heading * 500;
    const sunY = 108 - state.plane.pitch * 20;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    glow.addColorStop(0, 'rgba(255, 217, 122, 0.9)');
    glow.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 120, sunY - 120, 240, 240);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, TAU);
    ctx.fill();
  }

  function drawClouds(state) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const cloud of CLOUDS) {
      const dz = ((cloud.baseZ - state.plane.z) % 9000 + 9000) % 9000 + 250;
      const point = project(state, cloud.x, cloud.y, state.plane.z + dz);
      if (!point || point.y > FIELD.horizonY + 10) continue;
      const size = cloud.size * Math.min(1.4, point.scale * 1.6);
      ctx.globalAlpha = Math.max(0.25, Math.min(0.9, point.scale * 1.1));
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, size, size * 0.32, 0, 0, TAU);
      ctx.ellipse(point.x - size * 0.5, point.y + size * 0.08, size * 0.6, size * 0.22, 0, 0, TAU);
      ctx.ellipse(point.x + size * 0.5, point.y + size * 0.06, size * 0.55, size * 0.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Two ridge silhouettes, parallaxed by heading, give the valley its depth. */
  function drawRidges(state) {
    const layers = [
      { color: PALETTE.ridgeFar, amp: 46, base: 0, parallax: 120 },
      { color: PALETTE.ridgeMid, amp: 66, base: 14, parallax: 260 },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, FIELD.height);
      const shift = -state.plane.heading * layer.parallax;
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y =
          FIELD.horizonY -
          layer.base -
          layer.amp * (0.5 + 0.5 * Math.sin((x + shift) * 0.006 + layer.parallax)) -
          layer.amp * 0.35 * Math.sin((x + shift) * 0.017 + 2);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(FIELD.width, FIELD.height);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** The valley floor: a perspective grid of fields scrolling toward the pilot. */
  function drawGround(state) {
    const grad = ctx.createLinearGradient(0, FIELD.horizonY, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.ground);
    grad.addColorStop(1, '#3f6b34');
    ctx.fillStyle = grad;
    ctx.fillRect(0, FIELD.horizonY, FIELD.width, FIELD.height - FIELD.horizonY);
    // Field patches: quads between successive distance rows, alternating shade.
    const rows = 14;
    for (let row = rows; row >= 1; row -= 1) {
      const zNear = state.plane.z + row * 160;
      const zFar = state.plane.z + (row - 1) * 160;
      const near = project(state, 0, 0, zNear);
      const far = project(state, 0, 0, zFar);
      if (!near || !far) continue;
      const yNear = near.y;
      const yFar = far.y;
      if (yNear <= FIELD.horizonY) continue;
      for (let col = -4; col < 4; col += 1) {
        const xLeft = col * 130;
        const xRight = (col + 1) * 130;
        const nL = project(state, xLeft, 0, zNear);
        const nR = project(state, xRight, 0, zNear);
        const fL = project(state, xLeft, 0, zFar);
        const fR = project(state, xRight, 0, zFar);
        if (!nL || !nR || !fL || !fR) continue;
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.fieldA : PALETTE.fieldB;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(fL.x, Math.max(yFar, FIELD.horizonY));
        ctx.lineTo(fR.x, Math.max(yFar, FIELD.horizonY));
        ctx.lineTo(nR.x, yNear);
        ctx.lineTo(nL.x, yNear);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRunway(state) {
    const runway = state.mission.runwayAt;
    if (runway === null) return;
    const zStart = runway;
    const zEnd = runway + RUNWAY.length;
    if (zEnd < state.plane.z - 50 || zStart > state.plane.z + CAMERA.viewDistance) return;
    const centre = (z) => state.courseX(z);
    const corners = [
      project(state, centre(zStart) - RUNWAY.width / 2, 0, zStart),
      project(state, centre(zStart) + RUNWAY.width / 2, 0, zStart),
      project(state, centre(zEnd) + RUNWAY.width / 2, 0, zEnd),
      project(state, centre(zEnd) - RUNWAY.width / 2, 0, zEnd),
    ];
    if (corners.some((corner) => corner === null)) return;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes, scrolling with the ground.
    ctx.fillStyle = PALETTE.runwayLine;
    for (let z = zStart + 20; z < zEnd; z += 60) {
      const a = project(state, centre(z) - 1.2, 0, z);
      const b = project(state, centre(z) + 1.2, 0, z);
      const c = project(state, centre(z + 28) + 1.2, 0, z + 28);
      const d = project(state, centre(z + 28) - 1.2, 0, z + 28);
      if (!a || !b || !c || !d) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
    // Threshold chevrons at the near end.
    const label = project(state, centre(zStart), 0, zStart);
    if (label) {
      ctx.fillStyle = PALETTE.hud;
      ctx.font = `bold ${Math.max(12, Math.round(label.scale * 9))}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('27', label.x, label.y - 8);
    }
  }

  function drawRings(state) {
    const rings = [...state.rings].sort((a, b) => b.z - a.z);
    for (const ring of rings) {
      if (ring.z < state.plane.z - 10) continue;
      const point = project(state, ring.x, ring.y, ring.z);
      if (!point) continue;
      const radius = RING.radius * point.scale;
      if (radius < 2 || radius > 900) continue;
      ctx.save();
      ctx.globalAlpha = ring.done ? 0.25 : 1;
      ctx.strokeStyle = PALETTE.ring;
      ctx.lineWidth = Math.max(2, radius * 0.14);
      ctx.shadowColor = PALETTE.ring;
      ctx.shadowBlur = radius * 0.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = Math.max(1, radius * 0.04);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.86, -2.4, -1.2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPads(state) {
    for (const pad of state.pads) {
      if (pad.done || pad.z < state.plane.z - 10) continue;
      const point = project(state, pad.x, pad.y, pad.z);
      if (!point) continue;
      const radius = DROP.padHalf * point.scale * 1.4;
      if (radius < 3 || radius > 400) continue;
      // Beacon column so the rooftop is findable from far off.
      ctx.strokeStyle = 'rgba(255, 93, 77, 0.55)';
      ctx.lineWidth = Math.max(1, radius * 0.12);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x, point.y - radius * 6);
      ctx.stroke();
      ctx.fillStyle = '#ff5d4d';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.45, 0, TAU);
      ctx.fill();
    }
  }

  function drawBalloons(state) {
    const balloons = [...state.balloons].filter((b) => b.active).sort((a, b) => b.z - a.z);
    for (const balloon of balloons) {
      if (balloon.z < state.plane.z - 20) continue;
      const point = project(state, balloon.x, balloon.y, balloon.z);
      if (!point) continue;
      const radius = BALLOON.radius * point.scale;
      if (radius < 2 || radius > 500) continue;
      ctx.fillStyle = balloon.hue;
      ctx.beginPath();
      ctx.arc(point.x, point.y - radius, radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(point.x - radius * 0.35, point.y - radius * 1.25, radius * 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#5a4632';
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.moveTo(point.x - radius * 0.5, point.y - radius * 0.1);
      ctx.lineTo(point.x - radius * 0.3, point.y + radius * 0.55);
      ctx.moveTo(point.x + radius * 0.5, point.y - radius * 0.1);
      ctx.lineTo(point.x + radius * 0.3, point.y + radius * 0.55);
      ctx.stroke();
      ctx.fillStyle = '#7a5a38';
      ctx.fillRect(point.x - radius * 0.32, point.y + radius * 0.5, radius * 0.64, radius * 0.5);
    }
  }

  function drawParcels(state) {
    ctx.fillStyle = '#c98f4e';
    for (const parcel of state.parcels) {
      if (!parcel.active) continue;
      const point = project(state, parcel.x, parcel.y, parcel.z);
      if (!point) continue;
      const size = Math.max(2, 5 * point.scale);
      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    }
  }

  /** The Kestrel herself, seen from behind: wings, tail, fin and nav lights, banking with the turn. */
  function drawPlane(state) {
    const plane = state.plane;
    const cx = FIELD.width / 2;
    const cy = FIELD.horizonY + 118 - plane.pitch * 30 + Math.sin(state.time * 9) * 1.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(plane.bank * 0.9);
    // Main wings.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-118, 6);
    ctx.quadraticCurveTo(-70, -14, -16, -4);
    ctx.lineTo(16, -4);
    ctx.quadraticCurveTo(70, -14, 118, 6);
    ctx.quadraticCurveTo(70, 12, 16, 8);
    ctx.lineTo(-16, 8);
    ctx.quadraticCurveTo(-70, 12, -118, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-118, 2, 14, 7);
    ctx.fillRect(104, 2, 14, 7);
    // Fuselage, tapering to the tail.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-13, -58);
    ctx.quadraticCurveTo(0, -66, 13, -58);
    ctx.lineTo(17, 26);
    ctx.quadraticCurveTo(0, 34, -17, 26);
    ctx.closePath();
    ctx.fill();
    // Cockpit glass, seen from behind over the roof.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.ellipse(0, -38, 9, 16, 0, 0, TAU);
    ctx.fill();
    // Tail fin and stabilisers.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-4, -56);
    ctx.lineTo(0, -92);
    ctx.lineTo(7, -56);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-34, -52);
    ctx.lineTo(34, -52);
    ctx.lineTo(26, -44);
    ctx.lineTo(-26, -44);
    ctx.closePath();
    ctx.fill();
    // Nav lights: red port, green starboard.
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-118, 5, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4dff88';
    ctx.beginPath();
    ctx.arc(118, 5, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best) {
    const plane = state.plane;
    const knots = Math.round(plane.speed * 1.944);
    const feet = Math.round(plane.y * 3.281);
    const headingDeg = Math.round(((plane.heading * 180) / Math.PI % 360) + 360) % 360;

    function panel(x, y, width, height) {
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, x, y, width, height, 10);
      ctx.fill();
    }
    function label(text, x, y, size = 12) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = `${size}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(text, x, y);
    }
    function value(text, x, y, size = 26) {
      ctx.fillStyle = PALETTE.hud;
      ctx.font = `bold ${size}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(text, x, y);
    }

    // Airspeed, altitude, vertical speed.
    panel(18, 16, 250, 96);
    label('AIRSPEED  KT', 32, 38);
    value(String(knots), 32, 68);
    label('ALT  FT', 150, 38);
    value(String(feet), 150, 68);
    ctx.fillStyle = plane.vspeed >= 0 ? '#7be495' : '#ffb02e';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${plane.vspeed >= 0 ? '+' : ''}${Math.round(plane.vspeed * 3.281 * 60)} fpm`, 32, 96);

    // Compass tape across the top centre.
    panel(440, 16, 400, 44);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, 440, 16, 400, 44, 10);
    ctx.clip();
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    for (let offset = -60; offset <= 60; offset += 5) {
      const deg = headingDeg + offset;
      const x = 640 + offset * 3.1;
      const norm = ((deg % 360) + 360) % 360;
      const isCardinal = norm % 45 === 0;
      ctx.fillStyle = isCardinal ? PALETTE.hud : PALETTE.hudDim;
      ctx.fillRect(x, 50, isCardinal ? 2 : 1, isCardinal ? 12 : 7);
      // Numbers only every 30 degrees: at 3.1 px a degree, denser labels collide.
      if (isCardinal) ctx.fillText(norm === 0 ? 'N' : headingLabel(norm), x, 32);
      else if (norm % 30 === 0) ctx.fillText(String(norm), x, 32);
    }
    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(640, 16);
    ctx.lineTo(632, 26);
    ctx.lineTo(648, 26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Score, fuel, damage.
    panel(1012, 16, 250, 96);
    label('SCORE', 1026, 38);
    value(String(state.score), 1026, 68);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${best}`, 1248, 96);

    // Fuel and damage bars, bottom left.
    panel(18, 596, 250, 108);
    label('FUEL', 32, 620);
    ctx.fillStyle = '#24303c';
    roundRect(ctx, 32, 628, 222, 12, 6);
    ctx.fill();
    ctx.fillStyle = plane.fuel < 25 ? PALETTE.hudBad : '#7be495';
    roundRect(ctx, 32, 628, Math.max(0, 222 * (plane.fuel / 100)), 12, 6);
    ctx.fill();
    label('DAMAGE', 32, 664);
    ctx.fillStyle = '#24303c';
    roundRect(ctx, 32, 672, 222, 12, 6);
    ctx.fill();
    ctx.fillStyle = plane.damage > 66 ? PALETTE.hudBad : PALETTE.hudWarn;
    roundRect(ctx, 32, 672, Math.max(0, 222 * (plane.damage / 100)), 12, 6);
    ctx.fill();

    // Artificial horizon and throttle, bottom right.
    panel(1012, 596, 250, 108);
    const hx = 1072;
    const hy = 650;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, 34, 0, TAU);
    ctx.clip();
    ctx.translate(hx, hy);
    ctx.rotate(-plane.bank * 0.9);
    ctx.translate(0, plane.pitch * 22);
    ctx.fillStyle = '#7fb2e0';
    ctx.fillRect(-40, -40, 80, 40);
    ctx.fillStyle = '#5d8a48';
    ctx.fillRect(-40, 0, 80, 40);
    ctx.restore();
    ctx.strokeStyle = PALETTE.hud;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 34, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(hx - 24, hy);
    ctx.lineTo(hx + 24, hy);
    ctx.stroke();
    label('THROTTLE', 1140, 620);
    ctx.fillStyle = '#24303c';
    roundRect(ctx, 1140, 628, 108, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#7fb2e0';
    roundRect(ctx, 1140, 628, Math.max(0, 108 * plane.throttle), 12, 6);
    ctx.fill();
    label(`${headingDeg}° ${headingLabel(headingDeg)}`, 1140, 664);
    label(`HDG ${headingDeg}°`, 1140, 686);

    // Mission objective line under the compass.
    const mission = state.mission;
    let objective = '';
    if (mission.id === 'rings') objective = `Rings ${state.ringsHit}/${state.rings.length}`;
    else if (mission.id === 'mail') objective = `Parcels ${state.dropsHit}/${state.pads.length} · in bay ${state.parcelsLeft}`;
    else objective = `Rings ${state.ringsHit}/${state.rings.length} · then land on runway 27`;
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${mission.name} — ${objective}`, 640, 84);

    // Centre message.
    if (state.message && state.time < state.messageUntil) {
      ctx.font = `bold 24px ${FONT}`;
      ctx.textAlign = 'center';
      const width = ctx.measureText(state.message).width + 44;
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, 640 - width / 2, 108, width, 44, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.ring;
      ctx.fillText(state.message, 640, 138);
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('KESTREL COURIER', 640, 180);
    ctx.fillStyle = PALETTE.ring;
    ctx.font = `22px ${FONT}`;
    ctx.fillText('An original flight game — three sorties over the valley at dawn', 640, 216);
    MISSIONS.forEach((mission, index) => {
      const y = 300 + index * 74;
      ctx.fillStyle = index === state.missionIndex ? 'rgba(255, 201, 60, 0.16)' : PALETTE.panel;
      roundRect(ctx, 340, y - 34, 600, 60, 12);
      ctx.fill();
      ctx.fillStyle = PALETTE.ring;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`${index + 1} · ${mission.name}`, 366, y - 6);
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(mission.blurb, 366, y + 18);
    });
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ pitch · ←→ turn · W/S throttle · Space drop a parcel · P pause · M mute', 640, 556);
    ctx.fillText('Press 1, 2 or 3 to pick a sortie, then Enter or click to fly.', 640, 584);
    if (best > 0) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText(`Best score ${best}`, 640, 622);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 340);
    ctx.font = `18px ${FONT}`;
    ctx.fillText('Press P or Enter to keep flying', 640, 380);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    const title = state.landed
      ? 'TOUCHDOWN'
      : state.crashed
        ? 'THE KESTREL IS DOWN'
        : state.mission.id === 'mail' && state.dropsHit >= state.pads.length
          ? 'ALL PARCELS DELIVERED'
          : 'SORTIE COMPLETE';
    ctx.fillStyle = state.landed || !state.crashed ? PALETTE.ring : PALETTE.hudBad;
    ctx.font = `bold 48px ${FONT}`;
    ctx.fillText(title, 640, 280);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`Score ${state.score}`, 640, 340);
    ctx.font = `18px ${FONT}`;
    ctx.fillStyle = PALETTE.hudDim;
    const detail =
      state.mission.id === 'rings'
        ? `Rings ${state.ringsHit}/${state.rings.length}`
        : state.mission.id === 'mail'
          ? `Parcels delivered ${state.dropsHit}/${state.pads.length} · ${state.parcelsLeft} left in the bay`
          : `Rings ${state.ringsHit}/${state.rings.length} · fuel ${Math.round(state.plane.fuel)}% left`;
    ctx.fillText(detail, 640, 376);
    if (state.score > best) {
      ctx.fillStyle = PALETTE.ring;
      ctx.fillText('New best score!', 640, 410);
    } else if (best > 0) {
      ctx.fillText(`Best ${best}`, 640, 410);
    }
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText('Press Enter or click to fly again', 640, 470);
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawSky(state);
    drawClouds(state);
    drawRidges(state);
    drawGround(state);
    drawRunway(state);
    drawPads(state);
    drawRings(state);
    drawBalloons(state);
    drawParcels(state);
    drawPlane(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw, project };
}
