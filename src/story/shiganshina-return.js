import { createShiganshina, BOUNDS } from './shiganshina-world.js';
import { createStage, createWalker, titanForm } from './kit.js';
import { createTitanForm } from '../titan-forms.js';

// Shared adapter for the chapters that return to the Shiganshina of the
// prologue (29 and 34): the same streets, landmarks and Yeager house, five
// years later. Same plan contract as the Trost and field adapters, with a
// walking player only.
export function createReturnChapter({ scene, camera, ui, audio, data, number }, plan, { sky = '#c9d2d0', fog = [120, 520], light, hemi } = {}) {
  const stage = createStage({ scene, camera, ui, audio, sky, fog, sun: [-120, 140, 80], ...(light ? { light } : {}), ...(hemi ? { hemi } : {}) });
  const world = createShiganshina(scene); stage.ground = world.groundHeight; stage.colliders = world.colliders;
  // Five years after the fall: the outer gate is a hole and the streets are empty.
  world.breakOuterGate();
  const actors = {};
  const ctx = {
    stage, world, ui, audio, scene, camera, data, number, goals: new Set(), mission: null, control: 'none', player: null, walker: null, actors,
    cast(id, spec, x, z, yaw = 0, options = {}) { const a = stage.actor(id, spec, x, z, yaw, options); if (options.y !== undefined) a.rig.root.position.y = options.y; actors[id] = a; return a; },
    useWalker(actor, options = {}) { ctx.walker = createWalker(stage, actor, { colliders: world.colliders, bounds: BOUNDS, ...options }); ctx.player = actor; return ctx.walker; },
    titanForm: id => createTitanForm(titanForm(id)),
  };
  const hooks = plan(ctx);
  let control = 'none';

  function update(dt, input, mode, view) {
    stage.tick(dt);
    ctx.mission = view.mission?.id ?? ctx.mission;
    if (mode !== control) { control = ctx.control = mode; if (mode === 'walk') stage.clearShot(); hooks.onControl?.(mode); }
    if (control === 'walk' && ctx.walker) ctx.walker.step(dt, input, input.run ? 'run' : 'walk', view.kind === 'line');
    const fail = hooks.update(dt, input, control, view);
    const p = ctx.player?.rig.root.position; if (p) stage.focusLight(p.x, p.z);
    stage.frame(dt, ctx.walker?.view() ?? null, 55);
    return fail ? { fail } : null;
  }
  const playerPosition = () => { const p = ctx.player?.rig.root.position; return p ? [p.x, p.z] : [0, 0]; };

  hooks.start?.(); stage.frame(1, ctx.walker?.view() ?? null);
  return {
    script: hooks.script, par: hooks.par ?? 300, wantsPointerLock: true,
    playerPosition, markerHeight: hooks.markerHeight ?? (() => 2.6),
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
      teleport([x, z]) { if (ctx.player) stage.place(ctx.player, x, z); },
      goal(id) { ctx.goals.add(id); hooks.onGoal?.(id); },
      ...(hooks.debug ?? {}),
    },
    snapshot: () => ({ control, mission: ctx.mission, goals: [...ctx.goals], ...(hooks.snapshot?.() ?? {}) }),
  };
}
