import * as THREE from 'three';
import { createTransformationFx } from '../transformation-fx.js';
import { createTrostChapter } from './trost-chapter.js';
import { CHAPTER_6 } from './trost-scripts.js';

// Chapter 6: the Colossal returns beside the cannon crew on the Trost wall.
const TOP = 51.4;
const COLOSSAL = new THREE.Vector3(-6, 0, -216);

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio, TROST } = ctx;
    const fx = createTransformationFx(ctx.scene, { height: 60, duration: 2.4 }); let fxAt = null;
    const colossal = ctx.titanForm('colossal'); colossal.root.position.set(COLOSSAL.x, -62, COLOSSAL.z); colossal.root.visible = false; ctx.scene.add(colossal.root); world.anchorRoots.push(colossal.root);
    const outfit = { outfit: 'training' };
    const eren = ctx.cast('eren', 'eren', 22, -198, Math.PI, { y: TOP, override: outfit });
    const crew = [['sasha', 'sasha', 25], ['connie', 'connie', 27.5], ['thomas', 'recruit-m', 19, { hair: { style: 'short', color: '#c9a35a' } }], ['mina', 'soldier-f', 16.5, { hair: { style: 'ponytail-low', color: '#2a2220' } }], ['samuel', 'recruit-m', 30, { hair: { style: 'buzz', color: '#3a2d22' } }]]
      .map(([id, spec, x, extra]) => ctx.cast(id, spec, x, -197.5, Math.PI, { y: TOP, override: { ...outfit, ...(extra ?? {}) } }));
    const samuel = ctx.actors.samuel;
    const pilot = ctx.usePilot(eren.rig);
    let blast = 0, samuelFall = 0, samuelSaved = false, sweep = 7, sweepX = 0, nukeClock = 0, rising = false, vanished = false;

    const handlers = {
      'wall-morning': () => { stage.setShot([31, TOP + 2.4, -190], [21, TOP + 1, -198], 50); ctx.actors.sasha.pose = 'reach'; },
      'colossal-return': () => {
        fx.start(COLOSSAL.clone(), 850); fxAt = stage.time; ui.flash('#fff6dd', .9); audio.play('transform', 20, 0, 1); stage.shake(1.6);
        stage.after(.5, () => { colossal.root.visible = true; rising = true; });
        stage.setShot([20, TOP + 3, -186], [-4, 50, -214], 62);
        stage.after(3.2, () => { world.breakGate(); stage.shake(2.4); audio.play('defeat', 10, 0, 1); stage.particles.burst(new THREE.Vector3(0, 8, TROST.wallZ + 6), 'dust', 60, 14); stage.setShot([34, 26, -140], [-4, 42, -212], 60); });
      },
      'steam-blast': () => {
        blast = 4.6; pilot.place(22, TOP + .1, -197.5, 0); stage.clearShot(); crew.forEach((a, i) => { a.pose = 'odm'; a.rig.root.position.set(a.rig.root.position.x, TOP - 4 - (i % 3) * 3, -194.4); a.rig.root.rotation.y = Math.PI; });
        samuelFall = .001; stage.particles.burst(new THREE.Vector3(-4, 50, -208), 'steam', 90, 16); ui.flash('#ffffff', .5); audio.play('heavy', 6, 0, 1);
      },
      'colossal-vanish': () => {
        vanished = true; stage.particles.burst(colossal.root.position.clone().setY(48), 'steam', 140, 20); ui.flash('#ffffff', .6);
        stage.after(.8, () => { colossal.root.visible = false; }); const P = pilot.odm.player.position; stage.setShot([P.x + 6, P.y + 2, P.z + 8], [P.x, P.y, P.z - 10], 60);
      },
      'bell-alarm': () => { audio.play('warning', 10, 0, .8); stage.setShot([20, 40, -120], [0, 8, -200], 60); },
      'squad-formed': () => {
        pilot.odm.releaseAll(); eren.rig.root.visible = true; stage.place(eren, 6, 20, 0); eren.pose = 'idle';
        const squad = [ctx.actors.thomas, ctx.actors.mina, ctx.cast('armin', 'armin', 4, 22, 0, { override: outfit }), ctx.cast('nack', 'recruit-m', 8, 22, 0, { override: outfit }), ctx.cast('milieus', 'recruit-m', 10, 20, 0, { override: { ...outfit, hair: { style: 'middlepart', color: '#222' } } })];
        squad.forEach((a, i) => { stage.place(a, 2 + i * 2.2, 22, Math.PI); a.pose = 'salute'; });
        stage.setShot([7, 2.2, 15], [7, 1.6, 22], 50);
      },
    };

    function update(dt, input, control, view) {
      if (fxAt !== null) fx.update(stage.time - fxAt);
      if (colossal.root.visible) {
        colossal.animate(stage.time);
        if (rising) colossal.root.position.y = Math.min(0, colossal.root.position.y + dt * 22);
        colossal.arms.forEach((a, i) => { if (!sweepX || i === 0) { a.rotation.x = -2.5; a.rotation.z = (i ? -1 : 1) * .3; } });
        if (Math.random() < .5) stage.particles.burst(new THREE.Vector3(COLOSSAL.x + (Math.random() - .5) * 26, 40 + Math.random() * 14, COLOSSAL.z), 'steam', 1, 4);
      }
      if (blast <= 0 && ctx.mission === 'canhoes') for (const a of crew) a.rig.root.position.y = TOP;
      if (samuelFall > 0 && !samuelSaved) {
        samuelFall += dt; const p = samuel.rig.root.position; p.z = -194; p.y = Math.max(22, TOP - samuelFall * samuelFall * 4);
        if (control === 'odm' && pilot.odm.player.position.distanceTo(p) < 4.5) { samuelSaved = true; ui.toast('Você segurou o Samuel!', 1.6); }
      }
      if (samuelSaved) { const P = pilot.odm.player.position; samuel.rig.root.position.set(P.x + .6, P.y - .4, P.z + .4); }
      if (control !== 'odm') return null;
      const r = pilot.step(dt, input), P = r.position;
      // The steam blast pushes everything on the wall top into the city.
      if (blast > 0 && ctx.mission === 'vapor') {
        blast -= dt; const attached = pilot.odm.hooks.some(h => h.active);
        // A second of warning before the jet reaches the top of the wall.
        if (!attached && blast < 3.4) pilot.odm.player.velocity.add(new THREE.Vector3(0, 6 * dt, 34 * dt));
        if (blast <= 0) { if (attached || P.y > 30) ctx.goals.add('vapor'); }
        if (P.y < 2) return 'O vapor jogou você da muralha. Prenda um cabo na face interna dela assim que o jato começar.';
      } else if (ctx.mission === 'vapor' && P.y > 30) ctx.goals.add('vapor');
      else if (ctx.mission === 'vapor' && P.y < 2) return 'O vapor jogou você da muralha. Prenda um cabo na face interna dela assim que o jato começar.';
      if (ctx.mission === 'nuca') {
        nukeClock += dt;
        // Telegraphed sweep of the right arm across the wall top.
        sweep -= dt;
        if (sweep < 1.4 && sweep > 1.35) ui.toast('O Colossal vai varrer o alto da muralha! Saia do chão!', 1.3);
        if (sweep < 1.4) { colossal.arms[0].rotation.x = -1.3; colossal.arms[0].rotation.y = -1.2 + (1.4 - Math.max(0, sweep)) * 1.6; sweepX = 1; }
        if (sweep <= 0) {
          sweep = 6.5; sweepX = 0; stage.shake(1.2); audio.play('heavy', 6, 0, 1); for (const c of world.cannons) if (Math.random() < .3) c.rotation.z = 1.2;
          if (P.y < TOP + 3.5 && Math.abs(P.z - TROST.wallZ) < 7) return 'O braço do Colossal varreu o alto da muralha. Quando ele erguer o braço, salte ou fique pendurado.';
        }
        const nape = colossal.nape.getWorldPosition(new THREE.Vector3());
        if (r.strike && P.distanceTo(nape) < r.reach + 3) ctx.goals.add('nuca');
      }
      return null;
    }

    return {
      script: CHAPTER_6, par: 240,
      start() { stage.setShot([31, TOP + 2.4, -190], [21, TOP + 1, -198], 50); },
      handlers, update,
      markerHeight: () => TOP,
      status: () => (ctx.control === 'odm' ? `Gás ${Math.round(pilot.odm.player.gas)}%${ctx.mission === 'vapor' && blast > 0 ? ` · Vapor ${blast.toFixed(1)} s` : ''}${ctx.mission === 'nuca' ? ` · ${nukeClock.toFixed(0)} s` : ''}` : ''),
      checkpoint: () => ({}),
      onEvent(event) { if (event.kind === 'mission' && event.id === 'nuca') { blast = 0; pilot.place(22, TOP + .1, -197.5, Math.atan2(COLOSSAL.x - 22, -(COLOSSAL.z + 197.5))); pilot.pitch = .35; sweep = 7; nukeClock = 0; } },
      onGoal(id) { if (id === 'vapor') blast = 0; },
      restore(snapshot) {
        if (snapshot?.mission === 'vapor') { handlers['steam-blast'](); samuelSaved = false; samuel.rig.root.position.set(30, TOP, -197.5); }
        if (snapshot?.mission === 'nuca') { pilot.place(22, TOP + .1, -197.5, 0); sweep = 7; nukeClock = 0; }
      },
      challenges() {
        const done = [];
        if (samuelSaved) done.push(ctx.data.challenges[0]);
        if (ctx.goals.has('nuca') && nukeClock < 25) done.push(ctx.data.challenges[1]);
        return done;
      },
      debug: {
        nape() { const n = colossal.nape.getWorldPosition(new THREE.Vector3()); pilot.place(n.x, n.y, n.z - 2); pilot.strikeNow(); },
        // Puts Eren just off the wall face; the test then presses the cable key.
        hook() { pilot.place(22, 34, -191, 0); pilot.pitch = .2; return true; },
      },
      snapshot: () => ({ blast: +blast.toFixed(1), samuelSaved, colossal: colossal.root.visible ? +colossal.root.position.y.toFixed(1) : null, vanished, player: pilot.odm.player.position.toArray().map(v => +v.toFixed(1)), hooks: pilot.odm.hooks.map(h => h.active) }),
    };
  });
}
