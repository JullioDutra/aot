import * as THREE from 'three';
import { createFieldChapter } from './field-chapter.js';
import { createGunmen } from './gunmen.js';
import { GUN, createHardening, hardenStep } from './act5-rules.js';
import { CHAPTER_27 } from './act5-scripts.js';

// Chapter 27: the crystal cavern under the Reiss chapel. As Levi, fly from
// pillar to pillar to the altar while the anti-personnel squad shoots from
// the ledges; Historia refuses the syringe; Rod transforms; Eren swallows the
// hardening vial and holds the collapsing cavern up with crystal.
const ALTAR = [0, -40], CEILING = 70;

export function createChapter(args) {
  return createFieldChapter(args, ctx => {
    const { stage, ui, audio, world } = ctx;
    // ── The cavern: crystal pillars from floor to ceiling around the altar ──
    const crystal = new THREE.MeshToonMaterial({ color: '#9fd3e6', emissive: '#2c6a86', emissiveIntensity: .7 });
    const cave = new THREE.Group(); ctx.scene.add(cave); world.anchorRoots.push(cave);
    let seed = 5; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pillars = [];
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2, r = 22 + rand() * 110, x = ALTAR[0] + Math.cos(a) * r, z = ALTAR[1] + 30 + Math.sin(a) * r, w = 2.5 + rand() * 2.5;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(w * .8, w, CEILING, 6), crystal); m.position.set(x, CEILING / 2, z); m.rotation.y = rand(); cave.add(m);
      world.colliders.push({ minX: x - w, maxX: x + w, minZ: z - w, maxZ: z + w, top: CEILING, tag: 'pillar' }); pillars.push({ x, z, w });
    }
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshToonMaterial({ color: '#1b2630', side: THREE.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.position.y = CEILING; cave.add(roof);
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.6, 8), new THREE.MeshToonMaterial({ color: '#c9d6dc' })); altar.position.set(ALTAR[0], .8, ALTAR[1]); ctx.scene.add(altar);
    const glow = new THREE.PointLight('#8fd8ff', 2.4, 160, 1.2); glow.position.set(ALTAR[0], 30, ALTAR[1]); ctx.scene.add(glow);
    stage.ground = (x, z) => (Math.hypot(x - ALTAR[0], z - ALTAR[1]) < 7 ? 1.6 : 0);
    const levi = ctx.cast('levi', 'levi', 0, 0, 0, { blades: true });
    const pilot = ctx.usePilot(levi.rig); pilot.gasRate = .7; pilot.place(0, 0, 100, 0);
    const eren = ctx.cast('eren', 'eren', ALTAR[0], ALTAR[1] - 2, 0, { pose: 'sit' });
    const historia = ctx.cast('historia', 'historia', ALTAR[0] + 2, ALTAR[1] + 2, Math.PI);
    const rod = ctx.cast('rod', 'civilian-m', ALTAR[0] - 2.5, ALTAR[1] + 2, Math.PI, { override: { outfit: 'civilian-coat', hair: { style: 'bald', color: '#8b7a5a' }, face: { marks: ['beard', 'wrinkles'] } } });
    const gunmen = createGunmen(stage, { colliders: world.colliders });
    pillars.filter(p => Math.hypot(p.x - ALTAR[0], p.z - ALTAR[1] - 40) < 70).slice(0, 8).forEach((p, i) => {
      const a = ctx.cast(`squad-${i}`, 'soldier-m', p.x + p.w + .6, p.z, 0, { override: { outfit: 'commander', hair: { style: 'short', color: '#1d1a18' } }, blades: true, y: 18 + (i % 4) * 9 });
      gunmen.add(a, i * .41);
    });
    const giant = ctx.titanForm('gordo'); giant.root.scale.setScalar(40); giant.root.visible = false; giant.root.position.set(ALTAR[0], 0, ALTAR[1] - 30); ctx.scene.add(giant.root);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), crystal); shell.visible = false; ctx.scene.add(shell);
    let health = 100, hitsTaken = 0, hard = createHardening(), erenTitan = null;
    const target = new THREE.Vector3();

    const handlers = {
      cavern: () => { stage.setShot([10, 30, 110], [0, 20, 0], 62); },
      altar: () => { gunmen.hide(); stage.setShot([ALTAR[0] + 6, 3.4, ALTAR[1] + 7], [ALTAR[0], 2, ALTAR[1]], 48); },
      'syringe-held': () => { historia.pose = 'reach'; },
      'syringe-breaks': () => { historia.pose = 'idle'; stage.particles.burst(historia.rig.root.position.clone().setY(2.4), 'spark', 16, 3); audio.play('block', 0, 0, .6); },
      'rod-transforms': () => {
        ui.flash('#fff7d8', 1); stage.shake(2); audio.play('transform', 0, 0, 1); rod.rig.root.visible = false;
        giant.root.visible = true; stage.particles.burst(new THREE.Vector3(ALTAR[0], 20, ALTAR[1] - 20), 'steam', 160, 16);
        for (let i = 0; i < 6; i++) stage.particles.burst(new THREE.Vector3(ALTAR[0] + (i - 3) * 14, CEILING - 2, ALTAR[1] - 10), 'dust', 30, 6);
        stage.setShot([ALTAR[0] + 40, 16, ALTAR[1] + 50], [ALTAR[0], 30, ALTAR[1] - 20], 62);
      },
      'eren-swallows': () => {
        ui.flash('#cfe8f2', 1); audio.play('transform', 0, 0, 1); eren.rig.root.visible = false;
        erenTitan = ctx.titanForm('ataque'); erenTitan.root.position.set(ALTAR[0], 0, ALTAR[1] + 4); erenTitan.root.rotation.y = Math.PI; ctx.scene.add(erenTitan.root);
        erenTitan.arms.forEach(a => { a.rotation.x = -3; }); shell.visible = true; shell.position.set(ALTAR[0], 8, ALTAR[1] + 4);
        stage.setShot([ALTAR[0] + 30, 12, ALTAR[1] + 44], [ALTAR[0], 22, ALTAR[1]], 62);
      },
      'cavern-holds': () => { stage.setShot([ALTAR[0] + 36, 20, ALTAR[1] + 40], [ALTAR[0], 30, ALTAR[1]], 62); },
    };

    function update(dt, input, control) {
      if (giant.root.visible) { giant.animate(stage.time); giant.root.scale.setScalar(Math.min(60, giant.root.scale.x + dt * 4)); }
      if (control === 'odm') {
        const r = pilot.step(dt, input);
        target.copy(r.position).setY(r.position.y + 1);
        const hits = gunmen.update(dt, target);
        if (hits) { health -= hits * GUN.damage; hitsTaken += hits; ui.flash('#6a0909', .7); stage.particles.burst(target, 'blood', 24, 4); ui.toast(`Atingido! Corpo ${Math.max(0, health)}%`, 1.4); }
        if (health <= 0) return 'As escopetas pegaram Levi entre os pilares. Fique atrás do cristal quando a linha vermelha acender.';
        if (Math.hypot(r.position.x - ALTAR[0], r.position.z - ALTAR[1]) < 10) ctx.goals.add('infiltracao');
        return null;
      }
      gunmen.hide();
      if (control === 'lock') {
        hard = hardenStep(hard, dt, !!input.pressed.attack);
        shell.scale.set(4 + hard.crystal * 26, 6 + hard.crystal * 60, 4 + hard.crystal * 26); shell.position.y = 3 + hard.crystal * 30;
        roof.position.y = CEILING - hard.ceiling * 50; if (Math.random() < hard.ceiling) stage.particles.burst(new THREE.Vector3(ALTAR[0] + (Math.random() - .5) * 60, roof.position.y - 1, ALTAR[1] + (Math.random() - .5) * 60), 'dust', 4, 4);
        if (input.pressed.attack) stage.shake(.25);
        if (hard.crushed) return 'O teto desabou antes do cristal. Aperte sem parar: cada aperto endurece mais um pedaço.';
        if (hard.held) ctx.goals.add('cristal');
      }
      return null;
    }

    return {
      script: CHAPTER_27, par: 240,
      start() { stage.setShot([10, 30, 110], [0, 20, 0], 62); },
      handlers, update,
      markerHeight: () => 6,
      status() {
        if (ctx.control === 'odm') return `Gás ${Math.round(pilot.odm.player.gas)}% · Corpo ${Math.max(0, health)}% · Mirando: ${gunmen.list.filter(g => g.state.phase === 'aim').length}`;
        if (ctx.control === 'lock') return `Cristal ${Math.round(hard.crystal * 100)}% · Teto ${Math.round(hard.ceiling * 100)}%`;
        return '';
      },
      restore(snapshot) {
        if (snapshot?.mission === 'infiltracao') { health = 100; pilot.place(0, 0, 100, 0); }
        if (snapshot?.mission === 'cristal') { hard = createHardening(); roof.position.y = CEILING; }
      },
      challenges: () => (ctx.goals.has('infiltracao') && hitsTaken === 0 ? [ctx.data.challenges[0]] : []),
      debug: { exposed() { const g = gunmen.list[0]; g.actor.rig.root.getWorldPosition(target); pilot.place(target.x + 2, target.y + 1, target.z + 2); } },
      snapshot: () => ({ health, hitsTaken, shots: gunmen.list.reduce((n, g) => n + g.state.shots, 0), hard: { crystal: +hard.crystal.toFixed(2), ceiling: +hard.ceiling.toFixed(2), held: hard.held }, giant: giant.root.visible }),
    };
  }, { sky: '#0d141b', fog: [40, 260], light: ['#a6d6ff', 1], hemi: ['#6fa8c8', '#141a20', 1.1], world: { forest: false, castle: false, village: false, trees: false, ground: '#3a4148' } });
}
