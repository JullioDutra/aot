import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { odmCombat } from './trost-chapter.js';
import { TRAP } from './act3-ch15.js';
import { CHAPTER_16 } from './act3-scripts.js';

// Chapter 16: the Female Titan pinned in the clearing. As Mikasa, keep the
// forest titans off the harpoon crews; Levi finds the nape hardened; her
// scream calls every titan in the forest, which devour her body while she
// slips out of it.
const PIN = [0, -590], NEEDED = { arpoes: 5, grito: 6 };

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio, FIELD } = ctx;
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mikasa.rig);
    const levi = ctx.cast('levi', 'levi', 0, 0, 0, { pose: 'odm' }); levi.rig.root.visible = false;
    const erwin = ctx.cast('erwin', 'erwin', PIN[0] + 30, PIN[1] - 36, -2.4);
    const female = ctx.useFemale(); female.place(...PIN, Math.PI);
    let cables = female.pin(TRAP.map(([x, y, z]) => [PIN[0] + x, y, PIN[1] + z]));
    // Harpoon cannons with their crews at the edge of the clearing.
    const metal = toon('#3d3a36'), wood = toon('#5b3f2b');
    const cannons = [0, 1, 2, 3, 4, 5].map(i => {
      const a = i / 6 * Math.PI * 2 + .3, x = PIN[0] + Math.cos(a) * 36, z = PIN[1] + Math.sin(a) * 36;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(PIN[0] - x, PIN[1] - z); stage.scene.add(g);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.4, .5, 3.2, 10), metal); barrel.rotation.x = Math.PI / 2 - .5; barrel.position.set(0, 1.3, .4); g.add(barrel);
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.6, .9, 2.2), wood); cart.position.y = .45; g.add(cart);
      const crew = ctx.cast(`crew-${i}`, i % 2 ? 'soldier-f' : 'soldier-m', x + Math.cos(a) * 2, z + Math.sin(a) * 2, g.rotation.y);
      return { g, crew, alive: true, position: new THREE.Vector3(x, 0, z), id: `cannon-${i}` };
    });
    let wave = null, lost = 0, kills = { arpoes: 0, grito: 0 }, eaters = [], gone = false;
    const tmp = new THREE.Vector3();

    function spawnWave(count, sight, toFemale) {
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + Math.random() * .4, r = 95 + (i % 3) * 18;
        horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][i % 5], PIN[0] + Math.cos(a) * r, PIN[1] + Math.sin(a) * r, { height: 6 + (i * 3) % 7, sight });
      }
      wave = toFemale ? 'grito' : 'arpoes';
    }
    function destroy(cannon) {
      cannon.alive = false; lost++; cannon.crew.pose = 'lie'; cannon.g.rotation.z = .6;
      stage.particles.burst(cannon.position.clone().setY(1.5), 'blood', 40, 5); audio.play('defeat', 4, 0, .5);
      ui.toast(`Um canhão caiu · ${lost} perdido${lost > 1 ? 's' : ''}`, 2);
    }

    const handlers = {
      pinned: () => { pilot.place(PIN[0] + 10, 0, PIN[1] + 26, -.37); stage.setShot([PIN[0] + 26, 16, PIN[1] + 44], [PIN[0], 9, PIN[1]], 60); },
      'nape-hard': () => {
        female.hardened = true; female.napePosition(tmp); levi.rig.root.visible = true; levi.rig.root.position.copy(tmp).add(new THREE.Vector3(1.5, 1, -1.5)); levi.pose = 'strike';
        stage.particles.burst(tmp, 'spark', 30, 6); audio.play('dodge', 2, 0, .8);
        stage.setShot([tmp.x + 6, tmp.y + 3, tmp.z - 8], [tmp.x, tmp.y, tmp.z], 50);
      },
      scream: () => {
        levi.rig.root.visible = false; female.pose = 'scream'; stage.shake(1.4); audio.play('transform', 0, 0, 1);
        horde.list.forEach(t => { if (t.alive) { t.titan.root.visible = false; t.alive = false; } });
        spawnWave(12, 200, true);
        stage.setShot([PIN[0] + 10, 6, PIN[1] + 22], [PIN[0], 13, PIN[1]], 55);
      },
      devoured: () => {
        // Every titan left throws itself at her; she melts into steam inside the pile.
        horde.alive().forEach((t, i) => { const a = i * 1.1; t.kind = 'idle'; t.titan.root.position.set(PIN[0] + Math.cos(a) * 5, 0, PIN[1] + Math.sin(a) * 5); t.titan.root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); t.titan.chest.rotation.x = .6; eaters.push(t); });
        female.pose = 'still'; female.titan.root.rotation.x = -.3;
        stage.after(2.2, () => { gone = true; female.root.visible = false; stage.scene.remove(cables); female.napePosition(tmp); stage.particles.burst(new THREE.Vector3(PIN[0], 10, PIN[1]), 'steam', 120, 10); });
        stage.setShot([PIN[0] + 24, 18, PIN[1] + 30], [PIN[0], 6, PIN[1]], 58);
      },
    };

    function update(dt, input, control) {
      female.update(dt);
      if (gone && Math.random() < .5) stage.particles.burst(new THREE.Vector3(PIN[0], 6, PIN[1]), 'steam', 2, 6);
      if (control !== 'odm') { horde.update(dt, { freeze: true }); return null; }
      if (!wave && ctx.mission === 'arpoes') spawnWave(8, 160, false);
      const targets = ctx.mission === 'grito' ? [{ id: 'female', position: new THREE.Vector3(PIN[0], 0, PIN[1]) }] : cannons.filter(c => c.alive).map(c => ({ id: c.id, position: c.position }));
      const before = horde.list.filter(t => !t.alive).length;
      const r = odmCombat(ctx, dt, input, { prey: targets, grabMessage: 'Um titã agarrou Mikasa. Corte de cima, sem descer ao nível das mãos.' });
      if (r.fail) return r.fail;
      kills[ctx.mission] = (kills[ctx.mission] ?? 0) + horde.list.filter(t => !t.alive).length - before;
      if (r.grabbed) {
        const c = cannons.find(c => c.id === r.grabbed.prey.id);
        if (c?.alive) destroy(c);
        if (r.grabbed.prey.id === 'female' && !eaters.includes(r.grabbed.titan)) { const t = r.grabbed.titan; t.kind = 'idle'; t.titan.chest.rotation.x = .6; eaters.push(t); ui.toast(`Um titã começou a devorá-la · ${eaters.length}`, 1.4); }
      }
      if (lost >= 3) return 'Três equipes de canhão caíram. Sem os arpões, ela se solta.';
      if (kills[ctx.mission] >= NEEDED[ctx.mission]) ctx.goals.add(ctx.mission);
      return null;
    }

    return {
      script: CHAPTER_16, par: 260,
      start() { pilot.place(PIN[0] + 10, 0, PIN[1] + 26, -.37); stage.setShot([PIN[0] + 26, 16, PIN[1] + 44], [PIN[0], 9, PIN[1]], 60); },
      handlers, update,
      status() {
        if (ctx.control !== 'odm') return '';
        const k = kills[ctx.mission] ?? 0;
        return ctx.mission === 'arpoes' ? `Gás ${Math.round(pilot.odm.player.gas)}% · Titãs ${k} / ${NEEDED.arpoes} · Canhões ${cannons.filter(c => c.alive).length} / 6` : `Gás ${Math.round(pilot.odm.player.gas)}% · Titãs ${k} / ${NEEDED.grito} · Devorando: ${eaters.length}`;
      },
      restore(snapshot) {
        pilot.place(PIN[0] + 10, 0, PIN[1] + 26, -.37); pilot.odm.player.gas = 100;
        horde.list.forEach(t => { t.alive = false; t.titan.root.visible = false; });
        kills[snapshot?.mission] = 0; wave = null; eaters = [];
        if (snapshot?.mission === 'arpoes') { lost = 0; cannons.forEach(c => { c.alive = true; c.crew.pose = 'idle'; c.g.rotation.z = 0; }); }
        if (snapshot?.mission === 'grito') spawnWave(12, 200, true);
      },
      challenges: () => (ctx.goals.has('arpoes') && lost === 0 ? [ctx.data.challenges[0]] : []),
      debug: { nearest() { const t = horde.alive().sort((a, b) => a.titan.root.position.distanceTo(pilot.odm.player.position) - b.titan.root.position.distanceTo(pilot.odm.player.position))[0]; if (!t) return; horde.nape(t, tmp); const y = t.titan.root.rotation.y; pilot.place(tmp.x - Math.sin(y) * 2, tmp.y + .5, tmp.z - Math.cos(y) * 2); pilot.strikeNow(); } },
      snapshot: () => ({ kills: { ...kills }, lost, eaters: eaters.length, gone, cannons: cannons.filter(c => c.alive).length }),
    };
  }, { sky: '#aebcaa', fog: [70, 420] });
}
