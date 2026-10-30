import * as THREE from 'three';
import { BOSSES, relative, chooseAttack, attackHits, throwTarget } from './boss-rules.js';

// Telegraphed attacks of a shifter boss against an ODM pilot: arm swats
// with a red arc on the side that will be swept, stomps with a ring at the
// feet, thrown rocks with a shadow where they land and (Female) a crystal
// that hardens the nape for a few seconds. The chapter decides when the boss
// is active, blind or disarmed, and what losing all health means.
const red = new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide });
const MESSAGES = { swat: 'Golpe do braço! Saia pelo lado oposto, por cima da cabeça ou por trás.', stomp: 'Pisão! Não fique no chão perto dos pés.', throw: 'Pedra arremessada! Saia da sombra.' };

export function createBossThreat(stage, titan, kind, { blind = () => false, disarmed = () => false, track = true } = {}) {
  const boss = BOSSES[kind], scene = stage.scene;
  const arc = new THREE.Mesh(new THREE.CircleGeometry(1, 24, 0, Math.PI), red.clone()); arc.rotation.x = -Math.PI / 2; arc.visible = false; scene.add(arc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.2, 1, 32), red.clone()); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), red.clone()); shadow.rotation.x = -Math.PI / 2; shadow.visible = false; scene.add(shadow);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), new THREE.MeshLambertMaterial({ color: '#77736a' })); rock.visible = false; scene.add(rock);
  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: .55, depthWrite: false })); crystal.visible = false; scene.add(crystal);
  const state = { cooldown: 2, throwCooldown: 3, hardenCooldown: 0, hardened: 0, attack: null, timer: 0, hits: 0, flight: null, blind: false };
  const tmp = new THREE.Vector3();

  function hide() { arc.visible = ring.visible = shadow.visible = rock.visible = false; }
  function height() { return titan.spec.height * titan.root.scale.y; }
  function arm(attack) { return attack === 'swat-left' ? 1 : 0; }

  // pilot: kit ODM pilot. Returns { hit, attack } on the frame an attack lands.
  function update(dt, pilot, { active = true } = {}) {
    const P = pilot.odm.player.position, R = titan.root, H = height();
    state.blind = blind();
    state.cooldown -= dt; state.throwCooldown -= dt; state.hardenCooldown -= dt;
    if (state.hardened > 0) { state.hardened -= dt; titan.nape.getWorldPosition(tmp); crystal.position.copy(tmp); crystal.scale.setScalar(H * .07); crystal.visible = state.hardened > 0; }
    if (!active || disarmed()) { state.attack = null; hide(); return null; }
    const rel = relative(R.position.toArray(), R.rotation.y, H, P.toArray());
    // Turn toward the pilot unless blind or committed to a swing.
    if (track && !state.blind && !state.attack) { const want = Math.atan2(P.x - R.position.x, P.z - R.position.z); let d = want - R.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); R.rotation.y += d * Math.min(1, dt * boss.turn); }
    if (state.flight) return flyRock(dt, pilot);
    if (!state.attack) {
      const next = chooseAttack(kind, rel, state);
      if (!next) return null;
      if (next === 'harden') { state.hardened = boss.harden.duration; state.hardenCooldown = boss.harden.cooldown; stage.ui.toast('Ela endureceu a nuca! Espere o cristal sumir.', 1.6); stage.audio.play('punch', 1, 0, .5); return null; }
      state.attack = next; state.timer = (boss[next.startsWith('swat') ? 'swat' : next].windup);
      if (next === 'throw') { const target = throwTarget(P.toArray(), pilot.odm.player.velocity.toArray(), 1.4); shadow.position.set(target[0], .05, target[2]); shadow.scale.setScalar(boss.throw.radius); shadow.visible = true; }
      stage.ui.toast(MESSAGES[next.startsWith('swat') ? 'swat' : next], 1);
    }
    // Windup: telegraph and pose.
    state.timer -= dt;
    const a = state.attack;
    if (a.startsWith('swat')) {
      const i = arm(a); titan.arms[i].rotation.x = -2.3; titan.arms[i].rotation.z = (i ? -1 : 1) * .4;
      arc.visible = true; arc.scale.setScalar(H * boss.swat.reach); arc.position.set(R.position.x, .06, R.position.z); arc.rotation.z = R.rotation.y + (i ? -Math.PI / 2 : Math.PI / 2); // half disk on the swept side
    } else if (a === 'stomp') { ring.visible = true; ring.scale.setScalar(H * boss.stomp.reach); ring.position.set(R.position.x, .06, R.position.z); titan.legs[0].rotation.x = -.9; }
    else if (a === 'throw') { titan.arms[1].rotation.x = -2.6; }
    if (state.timer > 0) return null;
    // Impact.
    hide(); state.attack = null; state.cooldown = boss.cooldown;
    if (a === 'throw') { titan.hands[1].getWorldPosition(tmp); state.flight = { from: tmp.clone(), to: shadow.position.clone(), t: 0 }; rock.visible = shadow.visible = true; titan.arms[1].rotation.x = .3; state.throwCooldown = boss.throw.cooldown; return null; }
    if (a.startsWith('swat')) { const i = arm(a); titan.arms[i].rotation.x = .5; titan.arms[i].rotation.z = 0; } else titan.legs[0].rotation.x = 0;
    stage.shake?.(.5);
    const now = relative(R.position.toArray(), R.rotation.y, H, P.toArray());
    if (!attackHits(kind, a, now)) return null;
    return strike(pilot, boss[a.startsWith('swat') ? 'swat' : 'stomp'].damage, a);
  }

  function flyRock(dt, pilot) {
    const f = state.flight; f.t += dt / 1.4;
    rock.position.lerpVectors(f.from, f.to, Math.min(1, f.t)); rock.position.y += Math.sin(Math.min(1, f.t) * Math.PI) * 18; rock.rotation.x += dt * 4;
    if (f.t < 1) return null;
    state.flight = null; rock.visible = shadow.visible = false;
    stage.particles.burst(f.to.clone().setY(1), 'dust', 40, 8); stage.shake?.(.8);
    if (pilot.odm.player.position.distanceTo(f.to) > BOSSES[kind].throw.radius) return null;
    return strike(pilot, BOSSES[kind].throw.damage, 'throw');
  }

  function strike(pilot, damage, attack) {
    const p = pilot.odm.player, away = p.position.clone().sub(titan.root.position).setY(0).normalize();
    p.health -= damage; p.velocity.addScaledVector(away, 20).setY(9); pilot.odm.releaseAll(); state.hits++;
    stage.ui.flash('#7a1010', .55); stage.audio.play('punch', 2, 0, 1); stage.particles.burst(p.position.clone().setY(p.position.y + 1), 'blood', 20, 4);
    return { hit: true, attack, damage };
  }

  return {
    state, update,
    hardened: () => state.hardened > 0,
    reset() { Object.assign(state, { cooldown: 2, throwCooldown: 3, hardenCooldown: 0, hardened: 0, attack: null, timer: 0, hits: 0, flight: null }); hide(); crystal.visible = false; },
    snapshot: () => ({ attack: state.attack, hits: state.hits, hardened: state.hardened > 0, blind: blind(), throwing: !!state.flight }),
  };
}
