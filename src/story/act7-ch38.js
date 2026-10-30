import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { createGunmen } from './gunmen.js';
import { CHAPTER_38 } from './act7-scripts.js';

// Chapter 38: the raid on Liberio. As Mikasa, cut down the anti-titan teams on
// the roofs before they fire on Eren; as Armin, fly over the harbor and become
// the Colossal above the fleet; then protect the airship's ropes. Gabi gets on
// board and Sasha dies on the way home.
const EREN = [0, 96], HARBOR = [0, -190];

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio } = ctx;
    const mikasa = ctx.cast('mikasa', 'mikasa', 0, 0, 0, { blades: true });
    const armin = ctx.cast('armin', 'armin', 0, 0, 0, { blades: true }); armin.rig.root.visible = false;
    let pilot = ctx.usePilot(mikasa.rig); pilot.place(4, 0, EREN[1] + 40, 0);
    const eren = ctx.titanForm('ataque'); eren.root.position.set(EREN[0], 0, EREN[1]); ctx.scene.add(eren.root); world.anchorRoots.push(eren.root);
    const roofs = world.buildings.filter(b => Math.hypot(b.x - EREN[0], b.z - EREN[1]) < 70).sort((a, b) => Math.hypot(a.x - EREN[0], a.z - EREN[1]) - Math.hypot(b.x - EREN[0], b.z - EREN[1])).slice(0, 10);
    const lances = createGunmen(stage, { colliders: [] });
    roofs.slice(0, 6).forEach((b, i) => lances.add(ctx.cast(`lance-${i}`, 'soldier-m', b.x, b.z, 0, { override: { outfit: 'marley', hair: { style: 'buzz', color: '#2a2420' } }, y: b.h }), 1.5 + i * .5));
    const riflemen = createGunmen(stage, { colliders: [] });
    roofs.slice(6, 10).forEach((b, i) => { const a = ctx.cast(`rifle-${i}`, 'soldier-m', b.x, b.z, 0, { override: { outfit: 'marley', hair: { style: 'short', color: '#2a2420' } }, y: b.h }); a.rig.root.visible = false; riflemen.add(a, i * .4); });
    // The fleet beyond the wall and the airship above the city.
    const steel = toon('#4a4a4e'), fleet = [-60, -20, 20, 60].map((x, i) => { const s = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 60), steel); s.position.set(x, 3, -260 - (i % 2) * 20); ctx.scene.add(s); return s; });
    const airship = new THREE.Group(); airship.position.set(20, 60, 40); ctx.scene.add(airship);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), toon('#9a8a6a')); bag.scale.set(10, 8, 34); airship.add(bag);
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 12), toon('#5b3f2b')); gondola.position.y = -9.5; airship.add(gondola);
    const ropes = [-1, 1].map(s => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s * 2, -11, 0), new THREE.Vector3(s * 6, -60, 6)]), new THREE.LineBasicMaterial({ color: '#d8c8a0' })); airship.add(l); return l; });
    airship.visible = false;
    const sasha = ctx.cast('sasha', 'sasha', 0, 0, 0); const gabi = ctx.cast('gabi', 'gabi', 0, 0, 0); stage.show([sasha, gabi], false);
    const colossal = ctx.titanForm('colossal'); colossal.root.visible = false; colossal.root.position.set(HARBOR[0], 0, -250); ctx.scene.add(colossal.root);
    let erenHits = 0, cut = { descida: 0, retirada: 0 }, ropeHits = 0, wave = null;
    const chest = new THREE.Vector3(), tmp = new THREE.Vector3(), rope = new THREE.Vector3();

    function cutNear(list, r, mission) {
      for (const g of list.list) { if (!g.alive) continue; g.actor.rig.root.getWorldPosition(tmp); if (tmp.distanceTo(r.position) < r.reach) { list.kill(g); stage.particles.burst(tmp.setY(tmp.y + 1), 'blood', 30, 4); cut[mission]++; ui.toast(`Derrubado · ${cut[mission]}`, 1); break; } }
    }

    const handlers = {
      'survey-falls': () => { stage.setShot([EREN[0] + 40, 30, EREN[1] + 40], [EREN[0], 10, EREN[1]], 60); },
      'harbor-blast': () => {
        ui.flash('#fff6d8', 1); stage.shake(2.6); audio.play('defeat', 0, 0, 1); colossal.root.visible = true; armin.rig.root.visible = false;
        wave = { mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3d8', transparent: true, opacity: .7, depthWrite: false })), t: 0 }; wave.mesh.position.set(HARBOR[0], 30, -250); ctx.scene.add(wave.mesh);
        fleet.forEach((s, i) => { s.rotation.z = (i % 2 ? .5 : -.5); s.position.y = -2; });
        stage.particles.burst(new THREE.Vector3(HARBOR[0], 40, -250), 'steam', 200, 20);
        stage.setShot([HARBOR[0] + 60, 80, -120], [HARBOR[0], 30, -250], 66);
      },
      airship: () => { airship.visible = true; stage.show([sasha, gabi], true); airship.updateWorldMatrix(true, true); gondola.getWorldPosition(tmp); stage.place(sasha, tmp.x - 1, tmp.z - 2); stage.place(gabi, tmp.x + 1, tmp.z + 3); sasha.rig.root.position.y = gabi.rig.root.position.y = tmp.y - 1.4; stage.face(gabi, tmp.x - 1, tmp.z - 2); stage.setShot([tmp.x + 6, tmp.y + 1, tmp.z], [tmp.x, tmp.y - .5, tmp.z], 50); },
      gunshot: () => { ui.flash('#ffffff', .5); audio.play('block', 0, 0, 1); gabi.pose = 'punch'; sasha.rig.root.getWorldPosition(tmp); stage.particles.burst(tmp.setY(tmp.y + 1.2), 'blood', 40, 4); sasha.pose = 'lie'; },
    };

    function update(dt, input, control) {
      eren.animate(stage.time); eren.arms[1].rotation.x = -1 - Math.sin(stage.time * 2) * .6;
      if (colossal.root.visible) colossal.animate(stage.time);
      if (wave) { wave.t += dt; wave.mesh.scale.setScalar(6 + wave.t * 70); wave.mesh.material.opacity = Math.max(0, .7 - wave.t * .3); }
      if (control !== 'odm') { lances.hide(); riflemen.hide(); return null; }
      const r = pilot.step(dt, input);
      if (ctx.mission === 'descida') {
        eren.chest.getWorldPosition(chest);
        const hits = lances.update(dt, chest); if (hits) { erenHits += hits; stage.particles.burst(chest, 'blood', 30, 5); ui.toast('Uma lança antititã acertou o Eren!', 1.4); }
        if (r.strike) cutNear(lances, r, 'descida');
        if (cut.descida >= 6) ctx.goals.add('descida');
        if (erenHits >= 4) return 'As lanças antititã derrubaram o Eren. Corte as equipes que estão mirando (linha vermelha) primeiro.';
      }
      if (ctx.mission === 'porto' && Math.hypot(r.position.x - HARBOR[0], r.position.z - HARBOR[1]) < 15) ctx.goals.add('porto');
      if (ctx.mission === 'retirada') {
        airship.updateWorldMatrix(true, true); rope.set(airship.position.x + 4, 20, airship.position.z + 4);
        const hits = riflemen.update(dt, rope); if (hits) { ropeHits += hits; ui.toast(`Tiro nas cordas · ${ropeHits} / 6`, 1); }
        if (r.strike) cutNear(riflemen, r, 'retirada');
        if (cut.retirada >= 4) ctx.goals.add('retirada');
        if (ropeHits >= 6) return 'Os atiradores cortaram as cordas do dirigível. Derrube quem está mirando nelas.';
      }
      return null;
    }

    return {
      script: CHAPTER_38, par: 260,
      start() { stage.setShot([EREN[0] + 40, 30, EREN[1] + 40], [EREN[0], 10, EREN[1]], 60); },
      handlers, update,
      onControl(mode) {
        if (mode !== 'odm') return;
        if (ctx.mission === 'porto') { mikasa.rig.root.visible = false; armin.rig.root.visible = true; pilot = ctx.usePilot(armin.rig); pilot.place(0, 52, -160, 0); }
        if (ctx.mission === 'retirada') { armin.rig.root.visible = false; mikasa.rig.root.visible = true; pilot = ctx.usePilot(mikasa.rig); pilot.place(airship.position.x, 0, airship.position.z + 30, Math.PI); airship.visible = true; riflemen.list.forEach(g => { g.actor.rig.root.visible = true; }); }
      },
      markerHeight: () => 10,
      status() {
        if (ctx.control !== 'odm') return '';
        if (ctx.mission === 'descida') return `Gás ${Math.round(pilot.odm.player.gas)}% · Lanças derrubadas ${cut.descida} / 6 · Mirando o Eren: ${lances.list.filter(g => g.alive && g.state.phase === 'aim').length} · Acertos no Eren ${erenHits}`;
        if (ctx.mission === 'porto') return `Gás ${Math.round(pilot.odm.player.gas)}% · Porto a ${Math.round(Math.hypot(pilot.odm.player.position.x - HARBOR[0], pilot.odm.player.position.z - HARBOR[1]))} m`;
        return `Gás ${Math.round(pilot.odm.player.gas)}% · Atiradores ${cut.retirada} / 4 · Tiros nas cordas ${ropeHits} / 6`;
      },
      restore(snapshot) {
        if (snapshot?.mission === 'descida') { erenHits = 0; pilot.place(4, 0, EREN[1] + 40, 0); }
        if (snapshot?.mission === 'retirada') ropeHits = 0;
      },
      challenges: () => (ctx.goals.has('descida') && erenHits === 0 ? [ctx.data.challenges[0]] : []),
      debug: {
        cut(which = 'lances') { const list = which === 'lances' ? lances : riflemen, g = list.list.find(g => g.alive); if (!g) return; g.actor.rig.root.getWorldPosition(tmp); pilot.place(tmp.x + 1.5, tmp.y + .5, tmp.z + 1.5); pilot.strikeNow(); },
        harbor() { pilot.place(HARBOR[0], 30, HARBOR[1]); },
      },
      snapshot: () => ({ erenHits, cut: { ...cut }, ropeHits, blast: !!wave, sasha: sasha.pose }),
    };
  }, { breach: false });
}
