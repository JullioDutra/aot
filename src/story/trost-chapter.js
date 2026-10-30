import * as THREE from 'three';
import { createTitanForm } from '../titan-forms.js';
import { createTrost, TROST } from './trost-world.js';
import { createStage, createWalker, createOdmPilot, createHorde, createTitanPilot, titanForm } from './kit.js';

// Shared adapter for the battle of Trost (chapters 6–12). The base owns the
// city, the camera, the ODM pilot, the walking player, the horde and the
// player's titan; each chapter plugs a plan with its events and rules:
//   plan(ctx) → { script, par, start(), handlers, update(dt, input, mode, view) → fail?,
//                 status(), challenges(), checkpoint(), restore(snapshot), debug, snapshot() }
// Stohess (chapter 18) reuses the city with its gate intact: options.breach.
export function createTrostChapter({ scene, camera, ui, audio, data, number }, plan, { breach = number > 6, sky = '#c8d3d4', fog = [180, 640], light, hemi, liberio = number >= 36 && number <= 38 } = {}) {
  document.body.classList.add('combat-chapter');
  const stage = createStage({ scene, camera, ui, audio, sky, fog, sun: [-120, 170, 90], shadow: 170, ...(light ? { light } : {}), ...(hemi ? { hemi } : {}) });
  const world = createTrost(scene, { liberio });
  stage.ground = (x, z) => 0;
  // The Colossal kicked the gate in chapter 6; later chapters start with the breach.
  if (breach) world.breakGate();
  const horde = createHorde(stage, { anchorRoots: world.anchorRoots });
  const actors = {};
  const ctx = {
    stage, world, horde, ui, audio, scene, camera, data, number, TROST, THREE, goals: new Set(), mission: null, control: 'none', player: null, pilot: null, walker: null, titan: null,
    cast(id, spec, x, z, yaw = 0, options = {}) { const a = stage.actor(id, spec, x, z, yaw, options); if (options.y !== undefined) a.rig.root.position.y = options.y; actors[id] = a; return a; },
    actors,
    // Player rig flying with ODM (Eren, Mikasa, Armin, Jean… depending on the chapter).
    usePilot(rig, options = {}) { ctx.pilot = createOdmPilot(stage, rig, { colliders: world.colliders, anchorRoots: world.anchorRoots, bounds: 236, ...options }); return ctx.pilot; },
    useWalker(actor, options = {}) { ctx.walker = createWalker(stage, actor, { colliders: [], bounds: TROST.bounds, ...options }); ctx.player = actor; return ctx.walker; },
    useTitan(start, yaw) { ctx.titan = createTitanPilot(stage, 'ataque', { start, yaw }); return ctx.titan; },
    titanForm: id => createTitanForm(titanForm(id)),
    roof: (x, z) => world.roofAt(x, z),
    onRoof(a, x, z, yaw) { stage.place(a, x, z, yaw); a.rig.root.position.y = world.roofAt(x, z) + .02; },
  };
  const hooks = plan(ctx);
  let control = 'none';

  function update(dt, input, mode, view) {
    stage.tick(dt);
    ctx.mission = view.mission?.id ?? ctx.mission;
    if (mode !== control) { control = ctx.control = mode; if (['odm', 'walk', 'titan', 'carry'].includes(mode)) stage.clearShot(); hooks.onControl?.(mode); }
    const fail = hooks.update(dt, input, control, view);
    let desired = null, fov = 55;
    if (control === 'odm' && ctx.pilot) { desired = ctx.pilot.view(); fov = ctx.pilot.fov(); }
    else if ((control === 'titan' || control === 'carry') && ctx.titan) { desired = ctx.titan.view(); fov = 60; }
    else if (ctx.walker) desired = ctx.walker.view();
    const focus = control === 'odm' && ctx.pilot ? ctx.pilot.odm.player.position : ctx.titan && (control === 'titan' || control === 'carry') ? ctx.titan.titan.root.position : ctx.player?.rig.root.position;
    if (focus) stage.focusLight(focus.x, focus.z);
    stage.frame(dt, desired, fov);
    return fail ? { fail } : null;
  }
  function playerPosition() {
    if (control === 'odm' && ctx.pilot) return [ctx.pilot.odm.player.position.x, ctx.pilot.odm.player.position.z];
    if ((control === 'titan' || control === 'carry') && ctx.titan) return [ctx.titan.titan.root.position.x, ctx.titan.titan.root.position.z];
    const p = ctx.player?.rig.root.position; return p ? [p.x, p.z] : [0, 0];
  }

  hooks.start?.(); stage.frame(1, ctx.walker?.view() ?? null);
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
    // The shell saves the checkpoint as a new sub-mission starts, before update() sees it.
    checkpoint: mission => ({ mission: mission?.id ?? ctx.mission, ...(hooks.checkpoint?.() ?? {}) }),
    restore(snapshot) { stage.clearShot(); ctx.goals.delete(snapshot?.mission); hooks.restore?.(snapshot); },
    challengesDone: () => hooks.challenges?.() ?? [],
    debug: {
      teleport([x, z]) {
        if (control === 'odm' && ctx.pilot) ctx.pilot.place(x, world.roofAt(x, z) + 2, z);
        else if ((control === 'titan' || control === 'carry') && ctx.titan) ctx.titan.place(x, z);
        else if (ctx.player) ctx.onRoof(ctx.player, x, z);
      },
      // Review hook: frame a fixed camera shot.
      shot(position, target, fov = 55) { stage.setShot(position, target, fov); },
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
    snapshot: () => ({ control, mission: ctx.mission, goals: [...ctx.goals], kills: horde.list.filter(t => !t.alive).length, titans: horde.alive().length, gas: ctx.pilot ? Math.round(ctx.pilot.odm.player.gas) : null, finisher: !!ctx.pilot?.finisher, ...(hooks.snapshot?.() ?? {}) }),
  };
}

// Standard ODM combat step against the horde: cut napes, die when grabbed.
export function odmCombat(ctx, dt, input, { prey = [], grabMessage = 'Um titã agarrou você. Fique acima da altura dos ombros deles e ataque por trás.', freeze = false } = {}) {
  const r = ctx.pilot.step(dt, input);
  const P = r.position;
  const result = ctx.horde.update(dt, { prey: [{ id: 'player', position: P }, ...prey], cut: r.strike ? { position: P, reach: r.reach } : null, freeze });
  if (result.killed.length) ctx.ui.toast(`Nuca cortada · ${ctx.horde.list.filter(t => !t.alive).length}`, 1);
  if (result.grabbed?.prey.id === 'player') { ctx.stage.particles.burst(P.clone().setY(P.y + 1), 'blood', 30, 4); ctx.ui.flash('#6a0909', .7); return { fail: grabMessage, ...r, ...result }; }
  return { ...r, ...result };
}
