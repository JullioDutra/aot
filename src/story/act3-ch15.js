import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { castExtra } from './extras.js';
import { CHAPTER_15 } from './act3-scripts.js';

// Chapter 15: the center of the formation rides into the forest of giant
// trees. As Eren, keep your place behind Levi between the trunks while the
// Female Titan closes in and the rear guard dies trying to stop her. The
// decision to trust the squad always ends with Eren riding on.
const TRAIL = [[0, -300], [0, -360], [-3, -420], [3, -480], [0, -540], [0, -600], [0, -660]];
const LEVI_SPEED = 15.5, FORMATION = 18, WAYPOINT = -470;
// Harpoon cannons around her, as offsets from where she is caught.
export const TRAP = [[-30, 30, -20], [30, 32, -20], [-36, 26, 15], [36, 28, 15], [-24, 34, -40], [24, 34, -40], [-40, 22, -5], [40, 22, -5]];
const CLOSE = -636;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, FIELD } = ctx;
    const eren = ctx.cast('eren', 'eren', 0, 0, 0);
    const rider = ctx.useRider(eren, '#5a3f2c'); rider.place(0, -290, 0);
    const levi = ctx.mount(ctx.cast('levi', 'levi', 0, -278), 0, -278, '#2f241c');
    const squad = ['petra', 'oluo', 'eld', 'gunther'].map((id, i) => ctx.mount(castExtra(ctx, id, 0, 0), (i % 2 ? 4 : -4), -284 + i * 3, ['#7a5a3f', '#6b4a33', '#5a3f2c', '#4a3428'][i]));
    const offsets = [[-4, 6], [4, 6], [-5, 14], [5, 14]];
    squad.forEach((m, i) => { m.slot = () => [levi.horse.root.position.x + offsets[i][0], levi.horse.root.position.z + offsets[i][1]]; });
    const female = ctx.useFemale(); female.place(0, -150, Math.PI);
    const rear = [0, 1, 2].map(i => ctx.cast(`rear-${i}`, i % 2 ? 'soldier-f' : 'soldier-m', 0, 0, 0, { pose: 'odm' })); rear.forEach(a => { a.rig.root.visible = false; });
    let leg = 0, riding = false, outside = 0, gap = 0, caught = 0, attackTimer = 5, attacker = null, fallen = 0, bumps = 0, broke = false, pinned = null, handRaised = false;
    const tmp = new THREE.Vector3();

    function leviStep(dt) {
      const p = levi.horse.root.position;
      if (leg < TRAIL.length && Math.hypot(TRAIL[leg][0] - p.x, TRAIL[leg][1] - p.z) < 2) leg++;
      levi.goal = TRAIL[Math.min(leg, TRAIL.length - 1)]; levi.speed = riding ? LEVI_SPEED : 0;
    }
    // A soldier from the rear guard dives at her; she swats or grabs him.
    function rearAttack(dt) {
      if (!attacker && (attackTimer -= dt) <= 0) {
        const a = rear[fallen % rear.length]; attacker = { a, t: 0 }; a.rig.root.visible = true; a.pose = 'odm'; attackTimer = 7;
      }
      if (!attacker) return;
      const { a } = attacker, F = female.root.position, H = female.spec.height; attacker.t += dt;
      const k = Math.min(1, attacker.t / 1.3);
      a.rig.root.position.set(F.x + 10 - k * 8, H * (1.3 - k * .4), F.z + 14 - k * 12);
      if (k > .6) { female.titan.arms[1].rotation.x = -2; female.titan.arms[1].rotation.z = -.5; }
      if (attacker.t > 1.4) { a.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 6, 0, .7); a.rig.root.visible = false; attacker = null; fallen++; female.resetLimbs(); ui.toast(`A retaguarda caiu · ${fallen}`, 1.4); }
    }

    const handlers = {
      'forest-entry': () => { stage.setShot([8, 4, -320], [0, 30, -400], 60); riding = true; },
      'female-behind': () => { stage.setShot([rider.position.x + 6, 6, rider.position.z - 14], [female.root.position.x, 10, female.root.position.z], 58); },
      'hand-raised': () => { handRaised = true; eren.pose = 'manual'; eren.rig.root.rotation.set(0, 0, 0); stage.setShot([rider.position.x + 2, 3, rider.position.z - 4], [rider.position.x, 2.4, rider.position.z], 40); },
      'trap-sprung': () => {
        const F = female.root.position; F.set(0, 0, Math.min(F.z, FIELD.clearing[1] + 30)); female.root.rotation.y = Math.PI;
        const trap = TRAP.map(([x, y, z]) => [F.x + x, y, F.z + z]);
        pinned = female.pin(trap); stage.shake(1.2); audio.play('heavy', 0, 0, 1);
        for (const a of trap) stage.particles.burst(new THREE.Vector3(...a), 'dust', 14, 4);
        stage.setShot([F.x + 24, 14, F.z + 34], [F.x, 9, F.z], 60);
      },
    };

    function update(dt, input, control) {
      leviStep(dt);
      const F = female.root.position;
      if (pinned) { female.update(dt); return null; }
      if (handRaised && control !== 'none') { handRaised = false; eren.pose = 'ride'; }
      let r;
      if (control === 'ride') r = rider.step(dt, input);
      else {
        // Cutscenes keep Eren in his slot behind the captain.
        const L = levi.horse.root.position; rider.position.set(L.x, 0, L.z + 8); rider.yaw = 0; rider.horse.root.rotation.y = Math.PI; rider.speed = riding ? LEVI_SPEED : 0;
        rider.horse.animate(stage.time, rider.speed / 17); r = { position: rider.position };
      }
      if (rider.bumped > .5 && control === 'ride' && Math.random() < dt * 4) bumps++;
      // She keeps 40–60 m behind the player and speeds up when the gap grows.
      const behind = Math.hypot(F.x - r.position.x, F.z - r.position.z);
      female.update(dt, { goal: [r.position.x, r.position.z], speed: riding ? Math.min(21, Math.max(9, 14 + (behind - 48) * .35)) : 0, aggressive: false });
      if (riding) rearAttack(dt);
      if (control !== 'ride') return null;
      gap = Math.hypot(levi.horse.root.position.x - r.position.x, levi.horse.root.position.z - r.position.z);
      outside = gap > FORMATION ? outside + dt : 0; if (outside > 0) broke = true;
      if (outside > 6) return 'Você ficou para trás do capitão. Na floresta, quem sai da formação fica sozinho com ela.';
      caught = behind < 14 ? caught + dt : 0;
      if (caught > .5) { ui.flash('#6a0909', .7); return 'A titã alcançou o seu cavalo. Galope a toda velocidade quando ela se aproximar e não bata nos troncos.'; }
      if (ctx.mission === 'troncos' && r.position.z <= WAYPOINT) ctx.goals.add('troncos');
      if (ctx.mission === 'confiar' && r.position.z <= CLOSE) ctx.goals.add('armadilha');
      return null;
    }

    return {
      script: CHAPTER_15, par: 200,
      start() { stage.setShot([8, 4, -300], [0, 3, -280], 55); },
      handlers, update,
      status() {
        if (ctx.control !== 'ride') return '';
        const behind = Math.round(Math.hypot(female.root.position.x - rider.position.x, female.root.position.z - rider.position.z));
        return `Distância de Levi ${Math.round(gap)} m${gap > FORMATION ? ' (fora da formação)' : ''} · Titã atrás: ${behind} m · Faltam ${Math.max(0, Math.round(rider.position.z - (ctx.mission === 'troncos' ? WAYPOINT : CLOSE)))} m`;
      },
      checkpoint: () => ({ leg, levi: levi.horse.root.position.toArray(), rider: rider.position.toArray(), female: female.root.position.toArray() }),
      restore(snapshot) {
        if (!snapshot?.rider) return;
        leg = snapshot.leg; levi.horse.root.position.fromArray(snapshot.levi); rider.place(snapshot.rider[0], snapshot.rider[2], 0);
        female.resetLimbs(); female.attack = null; female.root.position.fromArray(snapshot.female); outside = caught = 0;
        if (ctx.mission === 'confiar') ctx.goals.delete('armadilha');
      },
      challenges: () => (ctx.goals.has('armadilha') && !broke ? [ctx.data.challenges[0]] : []),
      debug: { autopilot(on = true) { rider.auto = on ? () => [levi.horse.root.position.x, levi.horse.root.position.z + 6] : null; } },
      snapshot: () => ({ gap: Math.round(gap), bumps, broke, fallen, pinned: !!pinned, rider: [Math.round(rider.position.x), Math.round(rider.position.z)], female: [Math.round(female.root.position.x), Math.round(female.root.position.z)], levi: [Math.round(levi.horse.root.position.x), Math.round(levi.horse.root.position.z)] }),
    };
  }, { sky: '#aebcaa', fog: [70, 420] });
}
