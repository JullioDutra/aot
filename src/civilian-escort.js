export const ESCORT_ROUTE = Object.freeze([[-12, 0, 29], [-12, 0, 40], [-5, 0, 46], [5, 0, 46], [10, 0, 48]].map(Object.freeze));
const lengths = ESCORT_ROUTE.slice(1).map((p, i) => Math.hypot(...p.map((v, j) => v - ESCORT_ROUTE[i][j])));
export const ESCORT_LENGTH = lengths.reduce((sum, n) => sum + n, 0);
export const createEscort = () => ({ segment: 0, distance: 0 });
export const completedEscort = () => ({ segment: ESCORT_ROUTE.length - 1, distance: 0 });
export const escortComplete = e => !!e && e.segment === ESCORT_ROUTE.length - 1;
export function validEscort(e) {
  return !!e && Number.isInteger(e.segment) && e.segment >= 0 && e.segment < ESCORT_ROUTE.length && Number.isFinite(e.distance) && e.distance >= 0 && (escortComplete(e) ? e.distance === 0 : e.distance < lengths[e.segment]);
}
export function escortPosition(e) {
  if (!e) return [...ESCORT_ROUTE[0]];
  if (escortComplete(e)) return [...ESCORT_ROUTE.at(-1)];
  const a = ESCORT_ROUTE[e.segment], b = ESCORT_ROUTE[e.segment + 1], ratio = e.distance / lengths[e.segment];
  return a.map((v, i) => v + (b[i] - v) * ratio);
}
export function escortProgress(e) {
  if (!e) return 0;
  return (lengths.slice(0, e.segment).reduce((sum, n) => sum + n, 0) + e.distance) / ESCORT_LENGTH;
}
export function stepEscort(escort, dt, player, threats = []) {
  const next = { ...escort }, position = escortPosition(next);
  let reason = 'moving';
  if (escortComplete(next)) reason = 'safe';
  else if (threats.some(t => Math.hypot(t[0] - position[0], t[2] - position[2]) < 12)) reason = 'danger';
  else if (Math.hypot(...player.map((v, i) => v - position[i])) > 38) reason = 'waiting';
  const before = next.segment;
  if (reason === 'moving' && Number.isFinite(dt) && dt > 0) {
    let travel = dt * 3.6;
    while (travel > 0 && !escortComplete(next)) {
      const remaining = lengths[next.segment] - next.distance;
      if (travel >= remaining) { travel -= remaining; next.segment++; next.distance = 0; }
      else { next.distance += travel; travel = 0; }
    }
  }
  if (escortComplete(next)) reason = 'safe';
  return { escort: next, position: escortPosition(next), reason, reachedWaypoint: next.segment !== before, progress: escortProgress(next) };
}
