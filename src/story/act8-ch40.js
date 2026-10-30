import * as THREE from 'three';
import { createTrostChapter } from './trost-chapter.js';
import { createGunmen } from './gunmen.js';
import { castExtra } from './extras.js';
import { GUN } from './act5-rules.js';
import { SHELL, shellPhase, shellHits } from './act8-rules.js';
import { CHAPTER_40 } from './act8-scripts.js';

// Chapter 40: Marley attacks Shiganshina at night (the walled city stands in).
// Cut the soldiers taking the wall cannons; as Eren, catch the Jaw Titan in
// the air when it leaps; walk to Zeke while Pieck's artillery lands where you
// stood when she aimed. Colt tries to pull Falco away from Zeke.
const ZEKE = [0, 120], JAW = Object.freeze({ crouch: 1.3, leap: .6, recover: 1 });

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio, TROST } = ctx;
    const TOP = TROST.wallHeight + 1.4;
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mikasa.rig); pilot.place(10, 0, -150, 0);
    const gunmen = createGunmen(stage, { colliders: world.colliders });
    // Raiders stand behind the cannon line (carriages reach wallZ + 2.5).
    const raiders = [-56, -28, 28, 56, 84].map((x, i) => { const a = ctx.cast(`raider-${i}`, 'soldier-m', x, TROST.wallZ + 3.6, 0, { override: { outfit: 'marley', hair: { style: 'buzz', color: '#2a2420' } }, y: TOP }); return gunmen.add(a, i * .5); });
    const jaw = ctx.titanForm('mandibula'); jaw.root.visible = false; ctx.scene.add(jaw.root);
    const cart = ctx.titanForm('carroca'); cart.root.position.set(-40, TOP, TROST.wallZ); ctx.scene.add(cart.root);
    const beast = ctx.titanForm('bestial'); beast.root.position.set(ZEKE[0], 0, ZEKE[1] + 12); beast.root.rotation.y = Math.PI; beast.root.visible = false; ctx.scene.add(beast.root);
    const colt = castExtra(ctx, 'colt', ZEKE[0] + 6, ZEKE[1] - 4, Math.PI); const falco = ctx.cast('falco', 'falco', ZEKE[0] + 5, ZEKE[1] - 3, Math.PI); stage.show([colt, falco], false);
    const ring = new THREE.Mesh(new THREE.RingGeometry(SHELL.radius - .8, SHELL.radius, 32), new THREE.MeshBasicMaterial({ color: '#ff9a30', transparent: true, opacity: .85, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; ctx.scene.add(ring);
    let kills = 0, hits = 0, jawState = { phase: 'crouch', t: 0 }, caught = 0, health = 100, march = 0, aim = null, was = 'reload', shellsTaken = 0;
    const target = new THREE.Vector3(), tmp = new THREE.Vector3();

    const handlers = {
      'raid-night': () => { stage.setShot([30, TOP + 6, TROST.wallZ + 30], [0, TOP, TROST.wallZ], 58); },
      'eren-titan': () => {
        ui.flash('#fff7d8', 1); audio.play('transform', 0, 0, 1); gunmen.hide();
        const t = ctx.useTitan([0, -60], 0); t.titan.root.rotation.y = Math.PI; t.yaw = 0;
        jaw.root.visible = true; jaw.root.position.set(0, 0, -90);
        stage.setShot([24, 14, -40], [0, 6, -80], 58);
      },
      'colt-runs': () => {
        beast.root.visible = true; stage.show([colt, falco], true); ring.visible = false;
        stage.walkTo(colt, [[ZEKE[0] + 20, ZEKE[1] - 20]], 5, 'run'); falco.follow = colt;
        stage.setShot([ZEKE[0] + 16, 6, ZEKE[1] - 22], [ZEKE[0] + 4, 6, ZEKE[1]], 55);
      },
    };

    function update(dt, input, control) {
      cart.animate(stage.time); if (beast.root.visible) beast.animate(stage.time);
      if (control === 'odm') {
        const r = pilot.step(dt, input); target.copy(r.position).setY(r.position.y + 1);
        const shots = gunmen.update(dt, target); if (shots) { hits += shots; health -= shots * GUN.damage; ui.flash('#6a0909', .6); }
        if (r.strike) for (const g of gunmen.list) { if (!g.alive) continue; g.actor.rig.root.getWorldPosition(tmp); if (tmp.distanceTo(r.position) < r.reach) { gunmen.kill(g); kills++; stage.particles.burst(tmp.setY(tmp.y + 1), 'blood', 30, 4); ui.toast(`Soldado derrubado · ${kills} / 5`, 1); break; } }
        if (health <= 0) return 'Os soldados de Marley acertaram Mikasa no alto da muralha. Chegue por trás das ameias.';
        if (kills >= 5) ctx.goals.add('muralha');
        return null;
      }
      gunmen.hide();
      if (control !== 'titan') return null;
      const r = ctx.titan.step(dt, input, true), E = ctx.titan.titan.root.position;
      if (ctx.mission === 'mandibula') {
        // The Jaw crouches, leaps at Eren's neck and lands; a punch in the air catches it.
        jaw.animate(stage.time); jawState.t += dt; const d = Math.hypot(E.x - jaw.root.position.x, E.z - jaw.root.position.z);
        jaw.root.rotation.y = Math.atan2(E.x - jaw.root.position.x, E.z - jaw.root.position.z);
        if (jawState.phase === 'crouch') { jaw.root.position.y = 0; jaw.chest.rotation.x = .6; if (d > 14) { jaw.root.position.x += (E.x - jaw.root.position.x) / d * 6 * dt; jaw.root.position.z += (E.z - jaw.root.position.z) / d * 6 * dt; } if (jawState.t > JAW.crouch) jawState = { phase: 'leap', t: 0 }; }
        else if (jawState.phase === 'leap') {
          const k = jawState.t / JAW.leap; jaw.root.position.y = Math.sin(k * Math.PI) * 10; jaw.root.position.x += (E.x - jaw.root.position.x) * dt * 2; jaw.root.position.z += (E.z - jaw.root.position.z) * dt * 2;
          if (r.punch && d < 18) { caught++; jawState = { phase: 'recover', t: 0 }; stage.shake(1); jaw.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 30, 5); ui.toast(`Agarrou o Mandíbula · ${caught} / 2`, 1.2); }
          else if (jawState.t > JAW.leap) { health -= 15; ctx.titan.titan.head.getWorldPosition(tmp); stage.particles.burst(tmp, 'blood', 30, 5); ui.flash('#6a0909', .5); jawState = { phase: 'recover', t: 0 }; }
        } else { jaw.root.position.y = Math.max(0, jaw.root.position.y - dt * 20); if (jawState.t > JAW.recover) jawState = { phase: 'crouch', t: 0 }; }
        if (health <= 0) return 'As mandíbulas de Porco arrancaram a nuca do Eren. Soque no exato momento do pulo.';
        if (caught >= 2) { jaw.root.rotation.x = -1.3; jaw.root.position.y = 0; ctx.goals.add('mandibula'); }
        return null;
      }
      if (ctx.mission === 'zeke') {
        march += dt; const phase = shellPhase(march);
        if (phase === 'aim' && was !== 'aim') { aim = [E.x, E.z]; ring.position.set(E.x, .1, E.z); }
        ring.visible = phase === 'aim';
        if (phase === 'impact' && was === 'aim') { stage.particles.burst(new THREE.Vector3(aim[0], 2, aim[1]), 'dust', 40, 8); stage.shake(.8); audio.play('heavy', 4, 0, 1); if (shellHits(aim, [E.x, E.z])) { health -= SHELL.damage; shellsTaken++; ui.flash('#6a0909', .5); } }
        was = phase;
        if (health <= 0) return 'A artilharia de Pieck derrubou o Eren. Saia do círculo laranja assim que ele aparecer.';
        if (Math.hypot(E.x - ZEKE[0], E.z - ZEKE[1]) < 14) ctx.goals.add('zeke');
      }
      return null;
    }

    return {
      script: CHAPTER_40, par: 260,
      start() { stage.setShot([30, TOP + 6, TROST.wallZ + 30], [0, TOP, TROST.wallZ], 58); },
      handlers, update,
      onControl(mode) { if (mode === 'titan') health = 100; if (mode === 'odm') health = 100; },
      markerHeight: () => 10,
      status() {
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Corpo ${Math.max(0, health)}% · Soldados ${kills} / 5`;
        if (ctx.control === 'titan' && ctx.mission === 'mandibula') return `Corpo ${Math.max(0, health)}% · Agarrões ${caught} / 2 · Mandíbula: ${{ crouch: 'agachado', leap: 'PULANDO', recover: 'caiu' }[jawState.phase]}`;
        if (ctx.control === 'titan') return `Corpo ${Math.max(0, health)}%${ring.visible ? ' · PIECK MIROU: saia do círculo' : ''}`;
        return '';
      },
      restore(snapshot) {
        health = 100;
        if (snapshot?.mission === 'muralha') { pilot.place(10, 0, -150, 0); }
        if (snapshot?.mission === 'mandibula') { caught = 0; jawState = { phase: 'crouch', t: 0 }; jaw.root.position.set(0, 0, -90); jaw.root.rotation.x = 0; }
        if (snapshot?.mission === 'zeke') march = 0;
      },
      challenges: () => (ctx.goals.has('zeke') && shellsTaken === 0 ? [ctx.data.challenges[0]] : []),
      debug: {
        raider() { const g = gunmen.list.find(g => g.alive); if (!g) return; g.actor.rig.root.getWorldPosition(tmp); pilot.place(tmp.x, tmp.y + .5, tmp.z + 1.5); pilot.strikeNow(); },
        catchJaw() { jawState = { phase: 'leap', t: .2 }; const E = ctx.titan.titan.root.position; jaw.root.position.set(E.x, 0, E.z - 8); ctx.titan.punchQueued = true; },
      },
      snapshot: () => ({ kills, caught, health, shellsTaken, jaw: jawState.phase }),
    };
  }, { breach: false, sky: '#1d2534', fog: [80, 520], light: ['#9fb4d8', 1.2], hemi: ['#7f93b8', '#2a2a30', 1] });
}
