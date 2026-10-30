import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { odmCombat } from './trost-chapter.js';
import { createBossThreat } from './boss-threat.js';
import { finisherWindow } from '../titan-hook.js';
import { CHAPTER_39 } from './act8-scripts.js';

// Chapter 39: Levi's forest. Zeke screams and the soldiers who drank the wine
// become titans around Levi; he cuts them down knowing every face, takes the
// Beast Titan apart again and ties Zeke to a thunder spear — which Zeke pulls.
const CAMP = [0, -600], NEEDED = 10, PARTS = ['braco-e', 'braco-d', 'olho-e', 'olho-d', 'nuca'];

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio } = ctx;
    const levi = ctx.cast('levi', 'levi', CAMP[0] + 6, CAMP[1] + 10, Math.PI, { blades: true });
    const pilot = ctx.usePilot(levi.rig); pilot.gasRate = .7;
    const zeke = ctx.cast('zeke', 'zeke', CAMP[0], CAMP[1], 0, { pose: 'sit' });
    const soldiers = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return ctx.cast(`soldier-${i}`, i % 3 ? 'soldier-m' : 'soldier-f', CAMP[0] + Math.cos(a) * 16, CAMP[1] + Math.sin(a) * 16, -a); });
    const beast = ctx.titanForm('bestial'); beast.root.visible = false; beast.root.position.set(CAMP[0] - 10, 0, CAMP[1] - 40); ctx.scene.add(beast.root); ctx.world.anchorRoots.push(beast.root);
    let grounded = false, cuts = new Set(), blast = false;
    const threat = createBossThreat(stage, beast, 'beast', { blind: () => cuts.has('olho-e') && cuts.has('olho-d'), disarmed: () => cuts.has('braco-e') && cuts.has('braco-d') });
    const tmp = new THREE.Vector3();

    function point(id, out) {
      if (id === 'nuca') return beast.nape.getWorldPosition(out);
      if (id.startsWith('braco')) return beast.arms[id === 'braco-e' ? 0 : 1].getWorldPosition(out);
      beast.head.getWorldPosition(out); const H = beast.spec.height, y = beast.root.rotation.y, side = id === 'olho-e' ? -1 : 1;
      return out.add(new THREE.Vector3(Math.sin(y) * H * .06 + Math.cos(y) * side * H * .03, H * .01, Math.cos(y) * H * .06 - Math.sin(y) * side * H * .03));
    }

    const handlers = {
      'forest-camp': () => { stage.setShot([CAMP[0] + 14, 4, CAMP[1] + 18], [CAMP[0], 2, CAMP[1]], 52); },
      'zeke-screams': () => {
        stage.shake(1.4); audio.play('transform', 0, 0, 1);
        soldiers.forEach((s, i) => stage.after(.15 * i, () => {
          ui.flash('#fff7d8', .3); const p = s.rig.root.position; s.rig.root.visible = false;
          horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], p.x, p.z, { height: 6 + (i * 3) % 8, sight: 120 });
          stage.particles.burst(new THREE.Vector3(p.x, 3, p.z), 'steam', 30, 6);
        }));
        stage.setShot([CAMP[0] + 30, 20, CAMP[1] + 30], [CAMP[0], 6, CAMP[1]], 60);
      },
      'spear-tied': () => {
        beast.root.visible = false; zeke.rig.root.visible = true; stage.place(zeke, CAMP[0] - 10, CAMP[1] - 34); zeke.pose = 'lie';
        stage.place(levi, CAMP[0] - 8, CAMP[1] - 32); levi.rig.root.position.y = 0; pilot.odm.releaseAll();
        stage.setShot([CAMP[0] - 4, 3, CAMP[1] - 26], [CAMP[0] - 9, 1, CAMP[1] - 33], 48);
      },
      'cart-blast': () => { blast = true; ui.flash('#fff2c8', 1); stage.shake(2); audio.play('defeat', 0, 0, 1); stage.particles.burst(new THREE.Vector3(CAMP[0] - 9, 2, CAMP[1] - 33), 'dust', 120, 12); stage.particles.burst(new THREE.Vector3(CAMP[0] - 9, 2, CAMP[1] - 33), 'blood', 40, 6); levi.pose = 'lie'; zeke.rig.root.visible = false; },
    };

    function update(dt, input, control) {
      if (beast.root.visible) beast.animate(stage.time);
      if (control !== 'odm') { horde.update(dt, { freeze: true }); return null; }
      if (ctx.mission === 'companheiros') {
        const r = odmCombat(ctx, dt, input, { grabMessage: 'Um dos soldados transformados agarrou Levi. Corte de cima, sem descer.' });
        if (r.fail) return r.fail;
        if (pilot.odm.player.grounded && r.position.y < 1) grounded = true;
        if (horde.list.filter(t => !t.alive).length >= NEEDED) ctx.goals.add('companheiros');
        return null;
      }
      if (ctx.mission === 'bestial') {
        if (!beast.root.visible) { beast.root.visible = true; zeke.rig.root.visible = false; horde.list.forEach(t => { t.titan.root.visible = false; t.alive = false; }); }
        const r = pilot.step(dt, input);
        threat.update(dt, pilot, { active: cuts.size < PARTS.length });
        if (pilot.odm.player.health <= 0) return 'O Bestial derrubou Levi. Corte os braços primeiro: sem eles ele não golpeia nem arremessa pedras.';
        // The nape stays shut until arms and eyes are gone; then the finisher opens.
        const open = PARTS.filter(p => !cuts.has(p) && (p !== 'nuca' || cuts.size === PARTS.length - 1));
        if (open.length === 1 && open[0] === 'nuca') { point('nuca', tmp); const y = beast.root.rotation.y; ui.finisher?.(finisherWindow([r.position.x, r.position.y + 1, r.position.z], pilot.odm.player.velocity.toArray(), tmp.toArray(), [Math.sin(y), 0, Math.cos(y)], { onTitan: pilot.odm.hookedTo(beast.root) }).ready ? tmp.clone() : null); }
        if (r.strike) {
          const near = open.map(id => ({ id, d: point(id, tmp).distanceTo(r.position) })).sort((a, b) => a.d - b.d)[0];
          if (near && near.d <= r.reach) { cuts.add(near.id); point(near.id, tmp); if (near.id === 'nuca') ui.slowmo?.(.45); stage.particles.burst(tmp, 'blood', 40, 6); audio.play('punch', 2, 0, .8); ui.toast(`Corte · ${cuts.size} / ${PARTS.length}`, 1); if (near.id.startsWith('braco')) beast.arms[near.id === 'braco-e' ? 0 : 1].visible = false; }
        }
        if (cuts.size === PARTS.length) { beast.root.rotation.x = -1.2; ctx.goals.add('bestial'); }
      }
      return null;
    }

    return {
      script: CHAPTER_39, par: 240,
      start() { stage.setShot([CAMP[0] + 14, 4, CAMP[1] + 18], [CAMP[0], 2, CAMP[1]], 52); },
      handlers, update,
      onControl(mode) {
        if (mode === 'odm' && ctx.mission === 'companheiros') pilot.place(CAMP[0] + 6, 0, CAMP[1] + 10, Math.PI);
        if (mode === 'odm' && ctx.mission === 'bestial') pilot.place(CAMP[0] + 10, 0, CAMP[1] - 10, -.59);
      },
      markerHeight: () => 14,
      status() {
        if (ctx.control !== 'odm') return '';
        if (ctx.mission === 'companheiros') return `Gás ${Math.round(pilot.odm.player.gas)}% · Abatidos ${horde.list.filter(t => !t.alive).length} / ${NEEDED}${grounded ? ' · tocou o chão' : ''}`;
        return `Gás ${Math.round(pilot.odm.player.gas)}% · Vida ${Math.max(0, Math.round(pilot.odm.player.health))}% · Bestial: ${cuts.size} / ${PARTS.length} cortes${cuts.size === PARTS.length - 1 ? ' · nuca aberta' : ''}`;
      },
      restore(snapshot) {
        if (snapshot?.mission === 'companheiros') { grounded = false; horde.list.forEach(t => horde.reset(t)); }
        if (snapshot?.mission === 'bestial') { threat.reset(); pilot.odm.player.health = 100; cuts.clear(); beast.arms.forEach(a => { a.visible = true; }); beast.root.rotation.x = 0; }
      },
      challenges: () => (ctx.goals.has('companheiros') && !grounded ? [ctx.data.challenges[0]] : []),
      debug: {
        nearest() { const t = horde.alive()[0]; if (!t) return; horde.nape(t, tmp); const y = t.titan.root.rotation.y; pilot.place(tmp.x - Math.sin(y) * 1.5, tmp.y + .4, tmp.z - Math.cos(y) * 1.5); pilot.strikeNow(); },
        part(id) { point(id, tmp); pilot.place(tmp.x, tmp.y - .3, tmp.z + 1); pilot.strikeNow(); },
      },
      snapshot: () => ({ kills: horde.list.filter(t => !t.alive).length, grounded, cuts: [...cuts], blast, boss: threat.snapshot(), health: pilot.odm.player.health }),
    };
  }, { sky: '#aebcaa', fog: [70, 420] });
}
