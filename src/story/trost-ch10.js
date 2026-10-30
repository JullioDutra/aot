import * as THREE from 'three';
import { strideTitan } from './kit.js';
import { createTrostChapter, odmCombat } from './trost-chapter.js';
import { CHAPTER_10 } from './trost-final-scripts.js';

// Chapter 10: the unknown titan seen from Armin's rooftop, then from inside —
// Eren fighting as a titan — until it collapses and Eren comes out of the nape.
const WATCH = 25;

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, horde, ui, audio } = ctx;
    const outfit = { outfit: 'training' };
    const roof = world.buildings.reduce((best, b) => (Math.hypot(b.x + 20, b.z - 90) < Math.hypot(best.x + 20, best.z - 90) ? b : best));
    const armin = ctx.cast('armin', 'armin', roof.x, roof.z, Math.PI, { override: outfit, y: roof.h });
    const watchers = ['mikasa', 'connie'].map((id, i) => ctx.cast(id, id, roof.x + 1.5 + i * 1.5, roof.z + 1, Math.PI, { override: outfit, y: world.roofAt(roof.x + 1.5 + i * 1.5, roof.z + 1) }));
    const eren = ctx.cast('eren', 'eren', 0, 0, 0, { override: outfit }); eren.rig.root.visible = false;
    const pilot = ctx.usePilot(armin.rig);
    const unknown = ctx.titanForm('ataque'); unknown.root.position.set(roof.x + 8, 0, roof.z - 34); ctx.scene.add(unknown.root); world.anchorRoots.push(unknown.root);
    for (let i = 0; i < 10; i++) horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], roof.x - 40 + (i % 5) * 22, roof.z - 70 - Math.floor(i / 5) * 30, { height: 5 + (i * 3) % 8, sight: 22 });
    let watch = 0, spotted = false, punch = 0, target = null, crushed = 0, health = 100, collapse = 0, phase = 0;
    const tmp = new THREE.Vector3();

    // Unknown titan brain: walk to the nearest pure titan, punch, repeat.
    function fight(dt) {
      unknown.animate(stage.time);
      if (!target?.alive) target = horde.alive().filter(t => t.titan.root.visible).sort((a, b) => a.titan.root.position.distanceTo(unknown.root.position) - b.titan.root.position.distanceTo(unknown.root.position))[0] ?? null;
      if (!target) return;
      const p = target.titan.root.position;
      if (unknown.root.position.distanceTo(p) > 7) { phase += dt * 5; strideTitan(unknown, [p.x, p.z], 6.5, dt, phase); unknown.arms[1].rotation.x = -.3; return; }
      punch += dt; unknown.arms[1].rotation.x = punch < .5 ? -1.8 : -.4;
      if (punch > .7) { punch = 0; horde.kill(target); target.titan.head.visible = false; stage.shake(.4); audio.play('heavy', 20, 0, .7); target = null; }
    }

    const handlers = {
      'unknown-reveal': () => { stage.setShot([roof.x + 6, roof.h + 4, roof.z + 8], [unknown.root.position.x, 8, unknown.root.position.z], 55); },
      'inside-titan': () => {
        ui.flash('#5a0b0b', .8); pilot.odm.releaseAll();
        const titan = ctx.useTitan([unknown.root.position.x, unknown.root.position.z], Math.PI); unknown.root.visible = false;
        titan.titan.root.rotation.y = unknown.root.rotation.y; stage.setShot([unknown.root.position.x + 8, 12, unknown.root.position.z + 18], [unknown.root.position.x, 10, unknown.root.position.z], 60);
        for (let i = 0; i < 5; i++) horde.spawn(['nariz', 'gordo', 'cabeludo'][i % 3], unknown.root.position.x - 30 + i * 14, unknown.root.position.z - 30, { height: 7 + i % 3, sight: 60 });
      },
      'titan-collapses': () => {
        collapse = .001; const t = ctx.titan.titan; t.nape.getWorldPosition(tmp);
        stage.after(1.4, () => {
          stage.particles.burst(tmp, 'steam', 80, 8); eren.rig.root.visible = true; eren.rig.root.position.copy(tmp).setY(Math.max(1, tmp.y - 2)); eren.pose = 'manual'; eren.rig.root.rotation.set(-1.2, 0, 0);
          stage.place(watchers[0], tmp.x + 1.2, tmp.z + 2); watchers[0].pose = 'reach'; ctx.onRoof(armin, tmp.x - 1.2, tmp.z + 2.6); armin.pose = 'idle';
          stage.setShot([tmp.x + 4, tmp.y + 5, tmp.z + 6], [tmp.x, tmp.y - 1, tmp.z], 50);
        });
        stage.setShot([t.root.position.x + 10, 26, t.root.position.z + 14], [t.root.position.x, 4, t.root.position.z], 58);
      },
    };

    function update(dt, input, control, view) {
      if (collapse > 0) {
        collapse = Math.min(1, collapse + dt * .5); const t = ctx.titan.titan; t.root.rotation.x = -collapse * 1.3; t.root.position.y = -collapse * 2;
        if (Math.random() < .6) stage.particles.burst(t.root.position.clone().setY(6), 'steam', 2, 5); return null;
      }
      if (control === 'titan') {
        const r = ctx.titan.step(dt, input, true);
        const P = ctx.titan.titan.root.position;
        const result = horde.update(dt, { prey: [{ id: 'eren', position: P }] });
        if (r.punch) for (const t of horde.alive()) if (t.titan.root.visible && t.titan.root.position.distanceTo(r.punch.position.clone().setY(0)) < r.punch.radius + 2) { horde.kill(t); t.titan.head.visible = false; crushed++; stage.shake(.6); ui.toast(`Esmagado · ${crushed} / 4`, 1); }
        if (result.grabbed) { health -= 8; ui.flash('#6a0909', .4); stage.particles.burst(P.clone().setY(9), 'blood', 30, 5); audio.play('punch', 2, 0, .9); }
        if (health <= 0) return 'Os titãs derrubaram o titã de Eren. Soque quem estiver mais perto e não deixe que cerquem você.';
        if (crushed >= 4) ctx.goals.add('despertar');
        return null;
      }
      fight(dt);
      if (control !== 'odm') { horde.update(dt, { prey: [], freeze: true }); return null; }
      const r = odmCombat(ctx, dt, input, { grabMessage: 'Um titã pegou Armin. Observe de longe: os titãs não ligam para o desconhecido, mas ligam para você.' });
      if (r.fail) return r.fail;
      const d = r.position.distanceTo(unknown.root.position);
      if (d >= 15 && d <= 70) watch += dt;
      for (const t of horde.alive()) if (t.titan.root.visible && Math.hypot(t.titan.root.position.x - r.position.x, t.titan.root.position.z - r.position.z) < 16 && r.position.y < t.titan.spec.height + 2) spotted = true;
      if (watch >= WATCH) ctx.goals.add('observar');
      return null;
    }

    return {
      script: CHAPTER_10, par: 260,
      start() { pilot.place(roof.x, roof.h + .1, roof.z, Math.PI); pilot.yaw = 0; stage.setShot([roof.x + 6, roof.h + 4, roof.z + 8], [unknown.root.position.x, 8, unknown.root.position.z], 55); },
      handlers, update,
      markerHeight: () => 14,
      status() {
        if (ctx.control === 'odm') { const d = Math.round(pilot.odm.player.position.distanceTo(unknown.root.position)); return `Gás ${Math.round(pilot.odm.player.gas)}% · Distância ${d} m${d < 15 ? ' (perto demais)' : d > 70 ? ' (longe demais)' : ''} · Observado ${Math.floor(watch)} / ${WATCH} s`; }
        if (ctx.control === 'titan') return `Titãs esmagados ${crushed} / 4 · Corpo ${Math.max(0, health)}%`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'observar') { pilot.place(roof.x, roof.h + .1, roof.z, 0); watch = 0; spotted = false; }
        if (snapshot?.mission === 'despertar') { health = 100; crushed = 0; }
      },
      challenges: () => (ctx.goals.has('observar') && !spotted ? [ctx.data.challenges[0]] : []),
      debug: { punchAll() { ctx.titan.punchQueued = true; } },
      snapshot: () => ({ watch: +watch.toFixed(1), spotted, crushed, health, collapse: +collapse.toFixed(2), erenOut: eren.rig.root.visible, unknownKills: horde.list.filter(t => !t.alive).length }),
    };
  });
}
