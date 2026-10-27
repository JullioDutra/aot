import { clamp } from './mechanics.js';

export const MOVES = Object.freeze({
  light: { cost: 12, windup: .28, recovery: .42, damage: 18, range: 9.5 },
  heavy: { cost: 28, windup: .7, recovery: .8, damage: 38, range: 10.5 },
  grab: { cost: 35, windup: .25, recovery: 1.15, damage: 52, range: 8.5 },
});

export function createArenaState() {
  return {
    form: 'human', time: 0, formClock: 0, health: 100, stamina: 100, energy: 100,
    transforms: 0, fatigue: 0, dodgeCooldown: 0, dodge: null, action: null,
    guarding: false, regenerating: false, lastEffort: -10, lastDamage: -10,
    player: { x: 0, z: 24, yaw: Math.PI },
    enemy: { x: 0, z: -10, yaw: 0, health: 160, action: 'idle', clock: 0 },
    stats: { hits: 0, misses: 0, blocked: 0, dodged: 0, damageDealt: 0 },
  };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const facing = (a, b) => {
  const d = distance(a, b);
  return d < .01 || ((b.x - a.x) * Math.sin(a.yaw) + (b.z - a.z) * Math.cos(a.yaw)) / d > .35;
};
const restrict = p => { const length = Math.hypot(p.x, p.z); if (length > 52) { p.x *= 52 / length; p.z *= 52 / length; } };

export function arenaCommand(s, command, direction = [0, 0]) {
  if (s.form === 'won' || s.form === 'lost') return { accepted: false, reason: 'Operação encerrada.' };
  if (command === 'transform') {
    if (s.form !== 'human') return { accepted: false, reason: 'A transformação já está em curso.' };
    if (s.fatigue > 0) return { accepted: false, reason: 'Recupere o fôlego antes de transformar novamente.' };
    if (s.transforms >= 2 || s.energy < 25) return { accepted: false, reason: 'Reservas insuficientes. Reinicie o ensaio.' };
    s.transforms++; s.form = 'transforming'; s.formClock = 2.2; s.energy -= 15;
    return { accepted: true };
  }
  if (s.form !== 'titan') return { accepted: false, reason: 'Pressione T para assumir a forma titã.' };
  if (command === 'exit') {
    s.form = 'exiting'; s.formClock = 1.6; s.action = null; s.dodge = null; s.guarding = false; s.regenerating = false;
    return { accepted: true };
  }
  if (s.action || s.dodge) return { accepted: false, reason: 'Espere a recuperação do movimento.' };
  if (s.guarding) return { accepted: false, reason: 'Solte a defesa para atacar ou esquivar.' };
  if (command === 'dodge') {
    if (s.stamina < 18 || s.dodgeCooldown > 0) return { accepted: false, reason: 'Esquiva indisponível. Recupere resistência.' };
    let [x, z] = direction; const length = Math.hypot(x, z);
    if (length < .01) { x = -Math.sin(s.player.yaw); z = -Math.cos(s.player.yaw); } else { x /= length; z /= length; }
    s.stamina -= 18; s.lastEffort = s.time; s.dodgeCooldown = 1.2; s.dodge = { x, z, remaining: .32 };
    return { accepted: true };
  }
  const move = MOVES[command];
  if (!move) return { accepted: false, reason: 'Comando indisponível.' };
  if (s.stamina < move.cost) return { accepted: false, reason: 'Resistência insuficiente. Dê um passo atrás.' };
  if (command === 'grab' && (s.enemy.action !== 'recovery' || distance(s.player, s.enemy) > move.range)) return { accepted: false, reason: 'Agarre durante a recuperação do inimigo, a até 8,5 m.' };
  s.stamina -= move.cost; s.lastEffort = s.time; s.action = { kind: command, elapsed: 0, struck: false };
  return { accepted: true };
}

// Shared by the renderer and deterministic tests. Call with dt <= 1/60.
// Pausing is implemented by not advancing this simulation.
export function stepArena(s, dt, input = {}) {
  const events = [];
  if (s.form === 'won' || s.form === 'lost') return events;
  s.time += dt; s.fatigue = Math.max(0, s.fatigue - dt); s.dodgeCooldown = Math.max(0, s.dodgeCooldown - dt);
  const move = input.move || [0, 0]; const length = Math.hypot(...move);
  const mx = length > 0 ? move[0] / Math.max(1, length) : 0, mz = length > 0 ? move[1] / Math.max(1, length) : 0;
  if (s.form === 'transforming' || s.form === 'exiting') {
    s.formClock -= dt;
    if (s.formClock <= 0) {
      const entered = s.form === 'transforming'; s.form = entered ? 'titan' : 'human'; s.action = null;
      s.enemy.action = 'idle'; s.enemy.clock = entered ? 1.2 : 0;
      if (!entered) { s.fatigue = 5; s.player.z += 4; restrict(s.player); }
      events.push({ kind: entered ? 'transformed' : 'exited' });
    }
    return events;
  }
  if (s.form === 'human') {
    s.player.x += mx * dt * 4; s.player.z += mz * dt * 4;
    if (length > 0) s.player.yaw = Math.atan2(mx, mz);
    restrict(s.player); return events;
  }
  if (input.lock !== false) s.player.yaw = Math.atan2(s.enemy.x - s.player.x, s.enemy.z - s.player.z);
  else if (Number.isFinite(input.yaw)) s.player.yaw = input.yaw;
  s.guarding = !!input.guard && !s.action && !s.dodge && s.stamina > 0;
  s.regenerating = !!input.regenerate && !s.action && !s.dodge && !s.guarding && s.time - s.lastDamage > 2 && s.health < 100;
  s.energy = Math.max(0, s.energy - dt * (s.regenerating ? 5 : 1));
  if (s.regenerating) s.health = Math.min(100, s.health + dt * 5);
  if (s.guarding) { s.stamina = Math.max(0, s.stamina - dt * 3); s.lastEffort = s.time; }
  if (!s.action && !s.dodge && !s.guarding && s.time - s.lastEffort > .7) s.stamina = Math.min(100, s.stamina + dt * 16);
  const moveSpeed = s.action ? 1.8 : s.guarding || s.regenerating ? 2.5 : 7.5;
  if (s.dodge) {
    s.player.x += s.dodge.x * dt * 22; s.player.z += s.dodge.z * dt * 22; s.dodge.remaining -= dt;
    if (s.dodge.remaining <= 0) s.dodge = null;
  } else { s.player.x += mx * dt * moveSpeed; s.player.z += mz * dt * moveSpeed; }
  restrict(s.player);

  if (s.action) {
    const moveData = MOVES[s.action.kind];
    // Guard breaks briefly stun instead of looking like an ordinary attack.
    if (!moveData) { s.action.elapsed += dt; if (s.action.elapsed >= .8) s.action = null; }
    else {
      s.action.elapsed += dt;
      if (!s.action.struck && s.action.elapsed >= moveData.windup) {
        s.action.struck = true;
        const canGrab = s.action.kind !== 'grab' || s.enemy.action === 'recovery';
        if (distance(s.player, s.enemy) <= moveData.range && facing(s.player, s.enemy) && canGrab) {
          s.enemy.health = Math.max(0, s.enemy.health - moveData.damage); s.stats.hits++; s.stats.damageDealt += moveData.damage;
          const kind = s.action.kind; events.push({ kind: 'hit', target: 'enemy', damage: moveData.damage, move: kind });
          if (kind !== 'light') {
            s.enemy.x += Math.sin(s.player.yaw) * 2; s.enemy.z += Math.cos(s.player.yaw) * 2;
            s.enemy.action = 'recovery'; s.enemy.clock = kind === 'grab' ? 2.3 : 1.2;
          }
        } else { s.stats.misses++; events.push({ kind: 'miss' }); }
      }
      if (s.action.elapsed >= moveData.windup + moveData.recovery) s.action = null;
    }
  }
  if (s.enemy.health <= 0) { s.form = 'won'; s.guarding = false; events.push({ kind: 'won' }); return events; }

  const gap = distance(s.player, s.enemy);
  if (s.enemy.action === 'idle') {
    s.enemy.clock = Math.max(0, s.enemy.clock - dt);
    s.enemy.yaw = Math.atan2(s.player.x - s.enemy.x, s.player.z - s.enemy.z);
    if (gap > 8) { s.enemy.x += Math.sin(s.enemy.yaw) * dt * 4; s.enemy.z += Math.cos(s.enemy.yaw) * dt * 4; }
    if (gap <= 9 && s.enemy.clock <= 0) { s.enemy.action = 'windup'; s.enemy.clock = .95; events.push({ kind: 'warning' }); }
  } else {
    s.enemy.clock -= dt;
    if (s.enemy.clock <= 0) {
      if (s.enemy.action === 'windup') {
        if (gap <= 11 && facing(s.enemy, s.player)) {
          if (s.dodge) { s.stats.dodged++; events.push({ kind: 'dodged' }); }
          else {
            let damage = 20;
            if (s.guarding && facing(s.player, s.enemy)) {
              if (s.stamina >= 20) { s.stamina -= 20; damage = 4; s.stats.blocked++; events.push({ kind: 'blocked' }); }
              else { s.stamina = 0; s.guarding = false; s.action = { kind: 'stun', elapsed: 0 }; events.push({ kind: 'guard-break' }); }
            }
            s.health = Math.max(0, s.health - damage); s.lastDamage = s.time;
            events.push({ kind: 'hit', target: 'player', damage });
          }
        } else { s.stats.dodged++; events.push({ kind: 'enemy-miss' }); }
        s.enemy.action = 'recovery'; s.enemy.clock = 1.65;
      } else { s.enemy.action = 'idle'; s.enemy.clock = .4; }
    }
  }
  // Separate the bodies without allowing an overlap or teleport through the rival.
  const separation = distance(s.player, s.enemy);
  if (separation < 6 && separation > .001) {
    const push = (6 - separation) / 2, nx = (s.player.x - s.enemy.x) / separation, nz = (s.player.z - s.enemy.z) / separation;
    s.player.x += nx * push; s.player.z += nz * push; s.enemy.x -= nx * push; s.enemy.z -= nz * push;
  }
  restrict(s.player); restrict(s.enemy);
  if (s.health <= 0) { s.form = 'lost'; s.guarding = false; events.push({ kind: 'lost' }); }
  else if (s.energy <= 0) {
    s.form = 'exiting'; s.formClock = 1.6; s.action = null; s.dodge = null; s.guarding = false; s.regenerating = false;
    events.push({ kind: 'exhausted' });
  }
  return events;
}
