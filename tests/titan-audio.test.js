import test from 'node:test';
import assert from 'node:assert/strict';
import { titanAudioMix, titanAudioCues } from '../src/titan-audio-cues.js';
import { ArenaAudio } from '../src/arena-audio.js';

test('stereo follows camera heading while attenuation includes altitude and occlusion', () => {
  assert.equal(titanAudioMix([10, 0, 0], [0, 0, 0], 0).pan, 1);
  assert.equal(titanAudioMix([-10, 0, 0], [0, 0, 0], 0).pan, -1);
  assert.equal(titanAudioMix([10, 0, 0], [0, 0, 0], Math.PI).pan, -1);
  const clear = titanAudioMix([0, 20, 0], [0, 0, 0], 0);
  assert.equal(clear.pan, 0); assert.equal(clear.distance, 20);
  assert.equal(titanAudioMix([0, 20, 0], [0, 0, 0], 0, true).level, clear.level * .25);
  assert.equal(titanAudioMix([0, 80, 0], [0, 0, 0], 0).level, 0);
  assert.equal(titanAudioMix([0, 0, 0], [0, 0, 0], 0).level, 1);
});
test('footsteps depend on traveled distance, preserve remainder and do not repeat while stopped', () => {
  const previous = { phase: 'walk', position: [0, 0, 0] };
  const next = { ...previous, position: [0, 0, 3] };
  const a = titanAudioCues(previous, next, 15);
  assert.deepEqual(a.cues, ['step']); assert.ok(Math.abs(a.stride - .6) < 1e-9);
  assert.deepEqual(titanAudioCues(next, next, 15, a.stride).cues, []);
  const half = titanAudioCues(previous, { ...next, position: [0, 0, 1.5] }, 15);
  assert.deepEqual(half.cues, []);
  const second = titanAudioCues({ ...next, position: [0, 0, 1.5] }, next, 15, half.stride);
  assert.deepEqual(second, a);
});
test('attack warning and impact emit once at phase transitions even for a missed swing', () => {
  const s = { phase: 'walk', position: [0, 0, 0] };
  const windup = { ...s, phase: 'windup' }, recover = { ...s, phase: 'recover' };
  assert.deepEqual(titanAudioCues(s, windup, 15).cues, ['warning']);
  assert.deepEqual(titanAudioCues(windup, windup, 15).cues, []);
  assert.deepEqual(titanAudioCues(windup, recover, 15).cues, ['heavy']);
  assert.deepEqual(titanAudioCues(s, { ...s, phase: 'guardPrepare' }, 18).cues, ['dodge']);
});

class Param { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
class Node {
  constructor() { this.gain = new Param(); this.frequency = new Param(); this.pan = new Param(); }
  connect() {} disconnect() { this.disconnected = true; } start() {}
  stop(time) { if (time === undefined) this.onended?.(); }
}
class Context {
  constructor() { this.state = 'running'; this.sampleRate = 16; this.currentTime = 0; this.destination = {}; }
  resume() { return Promise.resolve(); }
  createGain() { return new Node(); } createOscillator() { return new Node(); }
  createBufferSource() { return new Node(); } createBiquadFilter() { return new Node(); }
  createStereoPanner() { this.lastPan = new Node(); return this.lastPan; }
  createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
}
test('audio pans, limits voices, silences on pause/mute and releases its output nodes', async () => {
  const audio = new ArenaAudio(Context); await audio.start();
  audio.play('step', 10, -.8, .5); const panner = audio.context.lastPan;
  assert.equal(panner.pan.value, -.8);
  for (let i = 0; i < 20; i++) audio.play('warning');
  assert.equal(audio.snapshot().activeVoices, 20);
  // Sources may finish on separate callbacks: 19 active leaves no room for a pair.
  [...audio.voices][0].onended();
  const atCapacity = audio.played; audio.play('step');
  assert.equal(audio.snapshot().activeVoices, 19); assert.equal(audio.played, atCapacity);
  audio.pause(); assert.equal(audio.snapshot().activeVoices, 0); assert.equal(panner.disconnected, true);
  const played = audio.played; audio.play('step'); assert.equal(audio.played, played);
  await audio.start(); audio.play('heavy'); assert.equal(audio.played, played + 1);
  audio.setEnabled(false); assert.equal(audio.snapshot().activeVoices, 0);
  audio.play('step'); assert.equal(audio.played, played + 1);
});
test('missing stereo or audio support leaves gameplay usable', async () => {
  const audio = new ArenaAudio(Context); await audio.start();
  audio.context.createStereoPanner = undefined; audio.play('step');
  assert.equal(audio.played, 1); audio.pause();
  const absent = new ArenaAudio(null); await absent.start(); absent.play('step');
  assert.equal(absent.snapshot().available, false);
});
