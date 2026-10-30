import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createFieldChapter } from './field-chapter.js';
import { createFounder, FOUNDER } from './founder.js';
import { holdsCable } from './act8-rules.js';
import { CHAPTER_45 } from './act8-scripts.js';

// Chapter 45: on top of the Founder. The seaplane lands on the walking spine;
// only bone holds a cable — a hook in flesh tears loose after a moment. Titans
// of the Paths come out of the bones in waves and go for the plane and Falco.
const PLANE_Z = -20, NEEDED = 8, TEAR = .6;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, horde, ui, audio, world } = ctx;
    const founder = createFounder(ctx.scene, world);
    const deck = founder.top(PLANE_Z);
    const plane = new THREE.Group(); plane.position.set(deck.x, deck.y + 1.4, deck.z); ctx.scene.add(plane);
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1, 14, 12), toon('#c9c2b0')); fuselage.rotation.x = Math.PI / 2; plane.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(22, .3, 2.6), toon('#b8b0a0')); wing.position.y = 1.4; plane.add(wing);
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(mikasa.rig);
    const falco = ctx.cast('falco', 'falco', deck.x + 2, deck.z + 6, 0, { y: deck.y });
    const crew = ['armin', 'jean', 'connie', 'reiner', 'pieck', 'levi'].map((id, i) => ctx.cast(id, id, deck.x - 3 + (i % 3) * 3, deck.z + 10 + Math.floor(i / 3) * 3, Math.PI, { y: deck.y, pose: id === 'levi' ? 'sit' : 'idle', blades: true }));
    founder.carry(plane, falco.rig.root, ...crew.map(a => a.rig.root));
    let fleshUsed = false, tear = [0, 0], spawned = 0, planeHit = false, wave = 0;
    const tmp = new THREE.Vector3();

    function spawnWave() {
      wave++;
      for (let i = 0; i < 5; i++) {
        const z = PLANE_Z - 70 + i * 26 + (wave % 2) * 8, top = founder.top(z), t = horde.spawn(['nariz', 'gordo', 'cabeludo', 'barbudo', 'pequeno'][(i + wave) % 5], top.x + (i % 2 ? 3 : -3), top.z, { height: 5 + (i * 2) % 5, sight: 200 });
        t.titan.root.position.y = top.y; spawned++;
        stage.particles.burst(t.titan.root.position.clone().setY(top.y + 3), 'steam', 30, 6);
      }
    }

    const handlers = {
      founder: () => { pilot.place(deck.x + 30, FOUNDER.y + 40, deck.z + 40, -.6); stage.setShot([60, FOUNDER.y + 40, 80], [0, FOUNDER.y, -60], 64); },
      wave: () => { spawnWave(); stage.setShot([deck.x + 24, deck.y + 10, deck.z - 30], [deck.x, deck.y + 3, deck.z - 50], 58); },
    };

    function update(dt, input, control) {
      // The spine sways as the Founder walks.
      founder.bob(Math.sin(stage.time * .8) * .6);
      if (control !== 'odm') { horde.update(dt, { freeze: true }); return null; }
      const r = pilot.step(dt, input), P = r.position;
      // Flesh does not hold: a cable in it tears loose.
      pilot.odm.hooks.forEach((h, i) => {
        if (!h.active) { tear[i] = 0; return; }
        if (holdsCable(h.object?.userData.tag)) return;
        fleshUsed = true; tear[i] += dt; if (tear[i] > TEAR) { pilot.odm.release(h.side); tear[i] = 0; ui.toast('A carne rasgou: só osso segura o cabo.', 1.4); }
      });
      if (ctx.mission === 'pouso') {
        if (Math.hypot(P.x - deck.x, P.z - deck.z) < 14 && P.y > FOUNDER.y) ctx.goals.add('pouso');
        if (P.y < 2) return 'Mikasa caiu da coluna do Fundador. Prenda os cabos nos ossos, nunca na carne.';
        return null;
      }
      if (ctx.mission === 'ondas') {
        // The titans walk the spine toward the plane and Falco.
        const prey = [{ id: 'plane', position: new THREE.Vector3(deck.x, 0, deck.z) }, { id: 'player', position: P.clone().setY(P.y - deck.y) }];
        const result = horde.update(dt, { prey, cut: r.strike ? { position: P, reach: r.reach } : null });
        horde.alive().forEach(t => { t.titan.root.position.y = founder.top(t.titan.root.position.z).y; });
        if (result.killed.length) ui.toast(`Titã dos Caminhos · ${horde.list.filter(t => !t.alive).length} / ${NEEDED}`, 1);
        if (result.grabbed?.prey.id === 'plane') { planeHit = true; return 'Um titã dos Caminhos chegou ao avião. Corte quem anda pela coluna antes que chegue nele.'; }
        if (result.grabbed?.prey.id === 'player') { ui.flash('#6a0909', .7); return 'Um titã dos Caminhos agarrou Mikasa.'; }
        if (horde.alive().length < 2 && spawned < 15) spawnWave();
        if (horde.list.filter(t => !t.alive).length >= NEEDED) ctx.goals.add('ondas');
        if (P.y < 2) return 'Mikasa caiu da coluna do Fundador.';
      }
      return null;
    }

    return {
      script: CHAPTER_45, par: 220,
      start() { pilot.place(deck.x + 30, FOUNDER.y + 40, deck.z + 40, -.6); stage.setShot([60, FOUNDER.y + 40, 80], [0, FOUNDER.y, -60], 64); },
      handlers, update,
      onControl(mode) { if (mode === 'odm' && ctx.mission === 'ondas') pilot.place(deck.x, deck.y + .5, deck.z - 12, 0); },
      markerHeight: () => FOUNDER.y + 6,
      status() {
        if (ctx.control !== 'odm') return '';
        const hooked = pilot.odm.hooks.filter(h => h.active).map(h => (holdsCable(h.object?.userData.tag) ? 'osso' : 'carne!'));
        return `Gás ${Math.round(pilot.odm.player.gas)}%${hooked.length ? ` · Cabos em: ${hooked.join(', ')}` : ''}${ctx.mission === 'ondas' ? ` · Titãs ${horde.list.filter(t => !t.alive).length} / ${NEEDED}` : ''}`;
      },
      restore(snapshot) {
        if (snapshot?.mission === 'pouso') pilot.place(deck.x + 30, FOUNDER.y + 40, deck.z + 40, -.6);
        if (snapshot?.mission === 'ondas') { horde.list.forEach(t => { t.alive = false; t.titan.root.visible = false; }); spawned = 0; spawnWave(); }
      },
      challenges: () => (ctx.goals.has('ondas') && !fleshUsed ? [ctx.data.challenges[0]] : []),
      debug: {
        land() { pilot.place(deck.x, deck.y + .5, deck.z + 4); },
        nearest() { const t = horde.alive()[0]; if (!t) return; horde.nape(t, tmp); const y = t.titan.root.rotation.y; pilot.place(tmp.x - Math.sin(y) * 1.5, tmp.y + .4, tmp.z - Math.cos(y) * 1.5); pilot.strikeNow(); },
      },
      snapshot: () => ({ kills: horde.list.filter(t => !t.alive).length, fleshUsed, planeHit, wave }),
    };
  }, { sky: '#c9a88a', fog: [120, 700], light: ['#ffcf9a', 2], world: { forest: false, castle: false, village: false, trees: false, ground: '#6a5a4a' } });
}
