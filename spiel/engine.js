// Shared deterministic race simulation. Keep the server copy byte-identical.
export const VERSION = 'scull-200-v2';
export const STEP = 10;
export function createRace(seed) {
  return { seed: seed >>> 0, step: 0, dist: 0, speed: 0, yaw: 0, lateral: 0,
    holding: false, recovery: false, progress: 0, combo: 0, strokes: 0,
    catchQuality: 1, driveTarget: 640, recoveryTarget: 1100, recoveryOrigin: 1,
    driveCenter: .84, recoveryCenter: .84, holdAt: 0, recoveryAt: 0,
    steer: 0, wave: null, waveIndex: 0, courseIndex: 0,
    lastBuoy: -1200, hits: 0, finish: null, message: 'Der erste Durchzug beginnt.' };
}
export function input(s, type) {
  if (s.finish !== null) return;
  const now = s.step * STEP;
  if (type === 'left') { s.steer = 1; return; }
  if (type === 'right') { s.steer = -1; return; }
  if (type === 'neutral') { s.steer = 0; return; }
  if (type === 'wave') {
    if (s.wave && !s.wave.handled && now - s.wave.born >= 100 && now - s.wave.born <= 700) {
      s.wave.handled = true; s.message = 'Welle sauber abgefangen.';
    }
    return;
  }
  if (type === 'down' && !s.holding) {
    if (s.strokes && s.recovery) {
      const error = Math.abs(now - s.recoveryAt - s.recoveryTarget);
      s.catchQuality = Math.exp(-((error / 160) ** 2));
      if (error > 220) { s.speed *= .72; s.combo = 0; }
    }
    s.holding = true; s.recovery = false; s.holdAt = now; s.progress = 0; s.strokes++;
    s.driveCenter = .58 + .28 * (.5 + .5 * Math.sin(s.strokes * 2.13 + (s.seed % 1000) / 1000));
    s.driveTarget = s.driveCenter * 780;
  }
  if (type === 'up' && s.holding) {
    s.holding = false;
    const duration = now - s.holdAt;
    const driveQuality = Math.exp(-(((duration - s.driveTarget) / 105) ** 2));
    const quality = driveQuality * s.catchQuality;
    s.combo = quality > .72 ? s.combo + 1 : 0;
    s.speed = Math.min(14, s.speed + .15 + quality ** 1.7 * (3.1 + Math.min(s.combo, 8) * .5));
    if (driveQuality < .25) s.speed *= .78;
    s.driveQuality = driveQuality;
    s.message = quality > .85 ? 'Präzise! Tempo-Serie aufgebaut.' : driveQuality < .5 ? 'Goldfenster verpasst – wenig Vortrieb.' : 'Durchzug passt. Den nächsten Einsatz treffen.';
    s.recovery = true; s.recoveryOrigin = Math.max(.15, s.progress); s.recoveryAt = now;
    s.recoveryCenter = .61 + .24 * (.5 + .5 * Math.cos(s.strokes * 1.7 + (s.seed % 1000) / 1000));
    s.recoveryTarget = s.recoveryCenter * 1400;
  }
}
export function advance(s) {
  if (s.finish !== null) return;
  const dt = STEP / 1000, now = s.step * STEP;
  s.speed *= Math.exp(-(.31 - Math.min(s.combo, 8) * .019) * dt);
  s.dist = Math.min(200, s.dist + s.speed * Math.max(.4, Math.cos(s.yaw)) * dt);
  s.lateral = Math.max(-1.1, Math.min(1.1, s.lateral + s.yaw * Math.max(s.speed, 1.8) * .09 * dt));
  if (Math.abs(s.lateral) > .87) {
    s.speed *= Math.exp(-.65 * dt);
    if (now - s.lastBuoy > 1200) { s.speed *= .72; s.combo = 0; s.lastBuoy = now; s.hits++; s.message = 'Bojen getroffen – zurück in die Bahn!'; }
  }
  const waves = [20, 65, 110, 160], courses = [35, 85, 135, 180];
  if (!s.wave && s.waveIndex < waves.length && s.dist >= waves[s.waveIndex]) { s.wave = { born: now, handled: false }; s.waveIndex++; }
  if (s.wave && now - s.wave.born > 1800) {
    if (!s.wave.handled) { s.speed *= .52; s.combo = 0; s.message = 'Welle verpasst – Tempo verloren.'; }
    s.wave = null;
  }
  if (s.courseIndex < courses.length && s.dist >= courses[s.courseIndex]) { s.yaw += s.courseIndex % 2 ? -.45 : .45; s.courseIndex++; }
  if (s.holding && s.steer) {
    const target = Math.abs(s.lateral) < .06 ? 0 : -s.steer * .32;
    s.yaw += (target - s.yaw) * (1 - Math.exp(-5 * dt));
  }
  if (s.holding) s.progress = Math.min(1, (now - s.holdAt) / 780);
  if (s.recovery) s.progress = Math.max(0, s.recoveryOrigin * (1 - (now - s.recoveryAt) / s.recoveryTarget));
  s.step++;
  if (s.dist >= 200) { s.finish = s.step * STEP; s.holding = false; s.recovery = false; }
}
export function replay(seed, events) {
  if (!Array.isArray(events) || events.length < 2 || events.length > 4000) throw Error('Ungültige Eingaben');
  const valid = new Set(['down', 'up', 'left', 'right', 'neutral', 'wave']);
  let last = -1, atStep = -1, perStep = 0;
  for (const e of events) {
    if (!Array.isArray(e) || e.length !== 2 || !Number.isInteger(e[0]) || e[0] < last || e[0] > 60000 || e[0] < 0 || !valid.has(e[1])) throw Error('Ungültige Eingaben');
    if (atStep === e[0]) perStep++; else { atStep = e[0]; perStep = 1; }
    if (perStep > 6) throw Error('Zu viele gleichzeitige Eingaben');
    last = e[0];
  }
  if (events[0][0] !== 0 || events[0][1] !== 'down') throw Error('Ungültiger Start');
  const s = createRace(seed); let i = 0;
  while (s.step < 60000 && s.finish === null) {
    while (i < events.length && events[i][0] === s.step) { input(s, events[i][1]); i++; }
    advance(s);
    if (i === events.length && s.step > last + 5000 && s.speed < .01) break;
  }
  if (s.finish === null || i !== events.length) throw Error('Rennen nicht beendet');
  return s;
}
