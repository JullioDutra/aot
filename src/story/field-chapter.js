import * as THREE from 'three';
import { createHorse } from './props.js';
import { createField, FIELD } from './field-world.js';
import { createStage, createWalker, createOdmPilot, createHorde, createTitanPilot, createRider, titanForm } from './kit.js';
import { createTitanForm } from '../titan-forms.js';
import { createFemale } from './female-titan.js';
import { FLARES } from './act3-rules.js';

// Shared adapter for the chapters outside the walls (13–17 and later
// expeditions): the plain, the forest of giant trees and the castle. Same
// contract as the Trost adapter, plus riding (control 'ride'), mounted
// soldiers, smoke flares and the Female Titan.
export function createFieldChapter({ scene, camera, ui, audio, data, number }, plan, { sky = '#c4d2d6', fog = [160, 700], world: worldOptions = {}, light, hemi } = {}) {
  document.body.classList.add('combat-chapter');
  const stage = createStage({ scene, camera, ui, audio, sky, fog, sun: [-140, 190, 110], shadow: 170, ...(light ? { light } : {}), ...(hemi ? { hemi } : {}) });
  const world = createField(scene, worldOptions);
  const horde = createHorde(stage, { anchorRoots: world.anchorRoots });
  const bounds = { minX: -FIELD.bounds, maxX: FIELD.bounds, minZ: -FIELD.bounds, maxZ: FIELD.bounds };
  const actors = {}, mounts = [], flares = [];
  const puffGeometry = new THREE.SphereGeometry(1, 8, 6);
  const ctx = {
    stage, world, horde, ui, audio, scene, camera, data, number, FIELD, THREE, goals: new Set(), mission: null, control: 'none', player: null, pilot: null, walker: null, titan: null, rider: null, female: null,
    actors, mounts,
    cast(id, spec, x, z, yaw = 0, options = {}) { const a = stage.actor(id, spec, x, z, yaw, options); if (options.y !== undefined) a.rig.root.position.y = options.y; actors[id] = a; return a; },
    usePilot(rig, options = {}) { ctx.pilot = createOdmPilot(stage, rig, { colliders: world.colliders, anchorRoots: world.anchorRoots, bounds: FIELD.bounds, ...options }); return ctx.pilot; },
    useWalker(actor, options = {}) { ctx.walker = createWalker(stage, actor, { colliders: world.colliders, bounds, ...options }); ctx.player = actor; return ctx.walker; },
    useRider(actor, color) { ctx.rider = createRider(stage, actor, { colliders: world.colliders, bounds, color }); ctx.player = actor; return ctx.rider; },
    useTitan(start, yaw, form = 'ataque') { ctx.titan = createTitanPilot(stage, form, { start, yaw }); return ctx.titan; },
    useFemale(options = {}) { ctx.female = createFemale(stage, { anchorRoots: world.anchorRoots, ...options }); return ctx.female; },
    titanForm: id => createTitanForm(titanForm(id)),
    // A soldier on horseback that rides toward `goal` at `speed` (or follows a slot function).
    mount(actor, x, z, color = '#6b4a33') {
      const horse = createHorse(color); horse.root.position.set(x, 0, z); scene.add(horse.root);
      horse.saddle.add(actor.rig.root); actor.rig.root.position.set(0, -.95, 0); actor.rig.root.rotation.set(0, 0, 0); actor.pose = 'ride';
      const m = { actor, horse, goal: null, slot: null, speed: 0, alive: true, fall: 0, mounted: true };
      mounts.push(m); return m;
    },
    // Throws the rider off: a scripted death or a fall.
    unseat(m, { blood = true } = {}) {
      if (!m.mounted) return; m.mounted = false; m.alive = !blood;
      const p = new THREE.Vector3(); m.actor.rig.root.getWorldPosition(p); scene.add(m.actor.rig.root); m.actor.rig.root.position.set(p.x, 0, p.z);
      m.actor.pose = blood ? 'lie' : 'fall'; m.speed *= .4;
      if (blood) stage.particles.burst(p, 'blood', 40, 5);
    },
    flare(x, z, color = 'red', height = 60) {
      const puffs = []; for (let i = 0; i < 18; i++) { const mesh = new THREE.Mesh(puffGeometry, new THREE.MeshBasicMaterial({ color: FLARES[color], transparent: true, opacity: 0, depthWrite: false })); mesh.position.set(x, 1 + i * height / 18, z); scene.add(mesh); puffs.push(mesh); }
      const f = { puffs, t: 0, color, height, x, z }; flares.push(f); audio.play('dodge', 8, 0, .4); return f;
    },
  };
  const hooks = plan(ctx);
  let control = 'none';

  function updateMounts(dt) {
    for (const m of mounts) {
      if (!m.mounted) { m.horse.animate(stage.time, Math.min(1, m.speed / 17)); if (m.speed > 0) { m.speed = Math.max(0, m.speed - dt * 5); const y = m.horse.root.rotation.y; m.horse.root.position.x += Math.sin(y) * m.speed * dt; m.horse.root.position.z += Math.cos(y) * m.speed * dt; } continue; }
      const goal = m.slot ? m.slot() : m.goal;
      if (!goal) { m.horse.animate(stage.time, 0); continue; }
      const p = m.horse.root.position, dx = goal[0] - p.x, dz = goal[1] - p.z, d = Math.hypot(dx, dz);
      const want = m.slot ? Math.min(24, d * 1.6) : m.speed;
      if (d > .4) { const step = Math.min(d, want * dt); p.x += dx / d * step; p.z += dz / d * step; const yaw = Math.atan2(dx, dz); m.horse.root.rotation.y += Math.atan2(Math.sin(yaw - m.horse.root.rotation.y), Math.cos(yaw - m.horse.root.rotation.y)) * Math.min(1, dt * 6); }
      m.horse.animate(stage.time, d > .4 ? Math.min(1.2, want / 17) : 0);
    }
  }
  function updateFlares(dt) {
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i]; f.t += dt;
      f.puffs.forEach((m, k) => { const born = k * .06; const age = f.t - born; m.visible = age > 0; if (age <= 0) return; m.scale.setScalar(1.4 + Math.min(4, age * .6)); m.material.opacity = Math.max(0, .85 - age / 14); m.position.x = f.x + Math.sin(age * .3 + k) * age * .3; });
      if (f.t > 14) { f.puffs.forEach(m => { scene.remove(m); m.material.dispose(); }); flares.splice(i, 1); }
    }
  }

  function update(dt, input, mode, view) {
    stage.tick(dt); updateMounts(dt); updateFlares(dt);
    ctx.mission = view.mission?.id ?? ctx.mission;
    if (mode !== control) { control = ctx.control = mode; if (['odm', 'walk', 'titan', 'ride'].includes(mode)) stage.clearShot(); hooks.onControl?.(mode); }
    const fail = hooks.update(dt, input, control, view);
    let desired = null, fov = 55;
    if (control === 'odm' && ctx.pilot) { desired = ctx.pilot.view(); fov = ctx.pilot.fov(); }
    else if (control === 'titan' && ctx.titan) { desired = ctx.titan.view(); fov = 60; }
    else if (control === 'ride' && ctx.rider) { desired = ctx.rider.view(); fov = 60 + ctx.rider.speed * .3; }
    else if (ctx.rider && !ctx.walker) desired = ctx.rider.view();
    else if (ctx.walker) desired = ctx.walker.view();
    const focus = playerVector();
    if (focus) stage.focusLight(focus.x, focus.z);
    stage.frame(dt, desired, fov);
    return fail ? { fail } : null;
  }
  function playerVector() {
    const custom = hooks.playerVector?.(control); if (custom) return custom;
    if (control === 'odm' && ctx.pilot) return ctx.pilot.odm.player.position;
    if (control === 'titan' && ctx.titan) return ctx.titan.titan.root.position;
    if (control === 'ride' && ctx.rider) return ctx.rider.position;
    if (ctx.player?.rig.root.parent === scene) return ctx.player.rig.root.position;
    return ctx.rider?.position ?? null;
  }
  const playerPosition = () => { const p = playerVector(); return p ? [p.x, p.z] : [0, 0]; };

  hooks.start?.(); stage.frame(1, ctx.rider?.view() ?? ctx.walker?.view() ?? null);
  return {
    script: hooks.script, par: hooks.par ?? 360, wantsPointerLock: true,
    playerPosition, markerHeight: hooks.markerHeight ?? (() => (control === 'odm' ? 14 : 3)),
    goals: () => ctx.goals,
    status: () => hooks.status?.() ?? '',
    onStoryEvent(event) {
      if (event.kind === 'event') hooks.handlers[event.id]?.(event);
      if (event.kind === 'choice') ui.toast(event.reflection, 3.5);
      hooks.onEvent?.(event);
    },
    update,
    checkpoint: mission => ({ mission: mission?.id ?? ctx.mission, ...(hooks.checkpoint?.() ?? {}) }),
    restore(snapshot) { stage.clearShot(); ctx.goals.delete(snapshot?.mission); hooks.restore?.(snapshot); },
    challengesDone: () => hooks.challenges?.() ?? [],
    debug: {
      teleport([x, z]) {
        if (control === 'odm' && ctx.pilot) ctx.pilot.place(x, world.topAt(x, z) + 2, z);
        else if (control === 'titan' && ctx.titan) ctx.titan.place(x, z);
        else if (control === 'ride' && ctx.rider) ctx.rider.place(x, z);
        else if (ctx.player?.rig.root.parent === scene) stage.place(ctx.player, x, z);
      },
      // Test hook: put the pilot just behind a living titan's nape, flying at it.
      finisher() {
        const t = horde.alive().find(x => x.titan.root.visible); if (!t || !ctx.pilot) return false;
        const n = horde.nape(t), yaw = t.titan.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
        t.kind = 'idle'; ctx.pilot.place(n.x - fx * 4, n.y - 1.5, n.z - fz * 4); ctx.pilot.odm.player.velocity.set(fx * 9, 2, fz * 9); ctx.pilot.odm.player.grounded = false;
        return true;
      },
      goal(id) { ctx.goals.add(id); hooks.onGoal?.(id); },
      ...(hooks.debug ?? {}),
    },
    snapshot: () => ({ control, mission: ctx.mission, goals: [...ctx.goals], kills: horde.list.filter(t => !t.alive).length, gas: ctx.pilot ? Math.round(ctx.pilot.odm.player.gas) : null, finisher: !!ctx.pilot?.finisher, ...(hooks.snapshot?.() ?? {}) }),
  };
}
