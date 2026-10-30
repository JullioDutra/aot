import * as THREE from 'three';
import { toon } from '../character-model.js';
import { createTrostChapter } from './trost-chapter.js';
import { castExtra } from './extras.js';
import { detonate, SPEARS } from './act6-rules.js';
import { CHAPTER_31 } from './act6-scripts.js';

// Chapter 31: thunder spears. As Hange, blind the Armored Titan, then plant a
// spear in its nape while the squad plants theirs; pull the cord in time and
// the six blasts open the armor together. Bertholdt's barrel comes over the
// wall and the Colossal's blast sweeps the roofs; Moblit pushes Hange into a
// well.
const SPOT = [0, -120], FUSE = 2.5;

export function createChapter(args) {
  return createTrostChapter(args, ctx => {
    const { stage, world, ui, audio } = ctx;
    const hange = ctx.cast('hange', 'hange', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(hange.rig); pilot.place(SPOT[0] + 20, 0, SPOT[1] + 40, -.4);
    const moblit = castExtra(ctx, 'moblit', SPOT[0] - 8, SPOT[1] + 22, Math.PI, { pose: 'odm', blades: true });
    const squad = [0, 1, 2, 3, 4].map(i => ctx.cast(`squad-${i}`, i % 2 ? 'soldier-f' : 'soldier-m', SPOT[0] - 12 + i * 6, SPOT[1] + 26, Math.PI, { pose: 'odm', y: 14 + i * 2, blades: true }));
    const armored = ctx.titanForm('blindado'); armored.root.position.set(SPOT[0], 0, SPOT[1]); ctx.scene.add(armored.root); world.anchorRoots.push(armored.root);
    const spearMat = toon('#5a4a3a'), spearGeo = new THREE.CylinderGeometry(.08, .08, 1.6, 6);
    const spears = []; let eyes = new Set(), pull = null, result = null, mine = false, barrel = null, wave = null, plantClock = 0;
    const tmp = new THREE.Vector3(), nape = new THREE.Vector3();

    const eye = (side, out) => { armored.head.getWorldPosition(out); const y = armored.root.rotation.y, H = armored.spec.height; return out.add(new THREE.Vector3(Math.sin(y) * H * .06 + Math.cos(y) * side * H * .03, H * .01, Math.cos(y) * H * .06 - Math.sin(y) * side * H * .03)); };
    function plant(by) {
      armored.nape.getWorldPosition(nape); const m = new THREE.Mesh(spearGeo, spearMat); m.position.copy(nape).add(new THREE.Vector3((Math.random() - .5) * 1.2, .4, -.4)); m.rotation.x = .7; ctx.scene.add(m);
      spears.push({ mesh: m, by, at: stage.time, blew: null }); audio.play('block', 3, 0, .5);
    }
    function blow(s, time) { if (s.blew !== null) return; s.blew = time; stage.particles.burst(s.mesh.position, 'spark', 30, 6); stage.particles.burst(s.mesh.position, 'dust', 20, 5); s.mesh.visible = false; audio.play('heavy', 2, 0, 1); stage.shake(.6); }

    const handlers = {
      'hange-squad': () => { stage.setShot([SPOT[0] + 26, 18, SPOT[1] + 36], [SPOT[0], 10, SPOT[1]], 58); },
      'armor-open': () => {
        armored.nape.getWorldPosition(nape); stage.particles.burst(nape, 'steam', 80, 8); stage.particles.burst(nape, 'blood', 40, 6); armored.root.rotation.x = .5;
        stage.setShot([nape.x + 10, nape.y + 4, nape.z + 12], [nape.x, nape.y, nape.z], 52);
      },
      'barrel-thrown': () => {
        barrel = { mesh: new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), toon('#6b4a2c')), t: 0 }; ctx.scene.add(barrel.mesh);
        stage.setShot([SPOT[0] - 30, 30, SPOT[1] + 60], [SPOT[0], 60, SPOT[1] - 40], 62);
      },
      blast: () => {
        ui.flash('#fff6d8', 1); stage.shake(2.5); audio.play('defeat', 0, 0, 1);
        wave = { mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3d8', transparent: true, opacity: .6, depthWrite: false })), t: 0 };
        wave.mesh.position.set(SPOT[0], 30, SPOT[1] - 30); ctx.scene.add(wave.mesh);
        moblit.pose = 'reach'; stage.place(moblit, SPOT[0] + 30, SPOT[1] + 50); moblit.rig.root.position.y = 0; hange.rig.root.visible = true; pilot.odm.releaseAll();
        stage.place(hange, SPOT[0] + 31.5, SPOT[1] + 50.5); hange.pose = 'fall';
        stage.after(1.2, () => { stage.particles.burst(moblit.rig.root.position.clone().setY(1.2), 'blood', 40, 6); moblit.pose = 'lie'; squad.forEach(s => { s.pose = 'lie'; s.rig.root.position.y = 0; }); });
        stage.setShot([SPOT[0] + 36, 4, SPOT[1] + 58], [SPOT[0] + 30, 1.5, SPOT[1] + 50], 52);
      },
    };

    function update(dt, input, control) {
      armored.animate(stage.time);
      if (barrel) { barrel.t += dt; const k = Math.min(1, barrel.t / 2.2); barrel.mesh.position.set(SPOT[0], 30 + Math.sin(k * Math.PI) * 60, SPOT[1] - 260 + k * 230); barrel.mesh.rotation.x += dt * 4; if (k >= 1) { barrel.mesh.visible = false; } }
      if (wave) { wave.t += dt; wave.mesh.scale.setScalar(4 + wave.t * 60); wave.mesh.material.opacity = Math.max(0, .6 - wave.t * .25); }
      if (control !== 'odm') return null;
      const r = pilot.step(dt, input);
      if (ctx.mission === 'cegar') {
        if (r.strike) for (const side of [-1, 1]) if (!eyes.has(side) && eye(side, tmp).distanceTo(r.position) < r.reach) { eyes.add(side); stage.particles.burst(tmp, 'blood', 30, 4); ui.toast(`Olho cortado · ${eyes.size} / 2`, 1.2); break; }
        if (eyes.size === 2) { armored.head.rotation.x = .3; ctx.goals.add('cegar'); }
        return null;
      }
      if (ctx.mission === 'lancas') {
        // The squad plants theirs one after another.
        plantClock += dt; const squadSpears = spears.filter(s => s.by === 'squad').length;
        if (squadSpears < SPEARS.needed - 1 && plantClock > 1.2 * (squadSpears + 1)) { plant('squad'); const a = squad[squadSpears]; armored.nape.getWorldPosition(nape); a.rig.root.position.copy(nape).add(new THREE.Vector3(-4 + squadSpears * 2, 2, 3)); }
        armored.nape.getWorldPosition(nape);
        if (r.strike && !mine && nape.distanceTo(r.position) < r.reach + 1) { mine = true; plant('hange'); ui.toast('Lança cravada! Puxe a corda (G).', 1.4); }
        // Squad spears not caught by the pull go off on their own after the fuse.
        for (const s of spears) if (s.blew === null && s.by === 'squad' && stage.time - s.at > FUSE && mine) blow(s, stage.time);
        if (input.interact && mine && pull === null) { pull = stage.time; spears.forEach(s => blow(s, pull + (s.by === 'squad' ? Math.random() * .3 : 0))); }
        if (spears.length >= SPEARS.needed && spears.every(s => s.blew !== null)) { result = detonate(spears.map(s => s.blew)); if (result.opened) ctx.goals.add('lancas'); }
      }
      return null;
    }

    return {
      script: CHAPTER_31, par: 220,
      start() { stage.setShot([SPOT[0] + 26, 18, SPOT[1] + 36], [SPOT[0], 10, SPOT[1]], 58); },
      handlers, update,
      markerHeight: () => 12,
      status() {
        if (ctx.control !== 'odm') return '';
        if (ctx.mission === 'cegar') return `Gás ${Math.round(pilot.odm.player.gas)}% · Olhos ${eyes.size} / 2`;
        return `Gás ${Math.round(pilot.odm.player.gas)}% · Lanças na nuca ${spears.length} / ${SPEARS.needed}${mine ? ' · a sua está cravada: G puxa a corda' : ''}`;
      },
      restore(snapshot) {
        pilot.place(SPOT[0] + 20, 0, SPOT[1] + 40, -.4);
        if (snapshot?.mission === 'cegar') { eyes.clear(); armored.head.rotation.x = 0; }
        if (snapshot?.mission === 'lancas') { spears.forEach(s => ctx.scene.remove(s.mesh)); spears.length = 0; mine = false; pull = null; result = null; plantClock = 0; }
      },
      challenges: () => (result?.together ? [ctx.data.challenges[0]] : []),
      debug: {
        eye(side) { eye(side, tmp); pilot.place(tmp.x, tmp.y - .4, tmp.z + 1); pilot.strikeNow(); },
        plant() { armored.nape.getWorldPosition(nape); pilot.place(nape.x, nape.y + .5, nape.z - 1.5); pilot.strikeNow(); },
      },
      snapshot: () => ({ eyes: eyes.size, spears: spears.length, mine, pulled: pull !== null, result, moblit: moblit.pose }),
    };
  }, { breach: false });
}
