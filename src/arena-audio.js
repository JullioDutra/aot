// Synthesized locally. No recordings, anime music or external resources.
export class ArenaAudio {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext) {
    this.Context = Context; this.context = null; this.enabled = true; this.paused = false; this.master = null; this.voices = new Set(); this.played = 0;
  }
  async start() {
    if (!this.enabled || !this.Context) return;
    try {
      if (!this.context) {
        this.context = new this.Context(); this.master = this.context.createGain(); this.master.gain.value = .32; this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.paused = false; await this.context.resume();
    } catch { /* Audio failure must never prevent gameplay. */ }
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.silence(); else if (!this.paused) void this.start(); }
  silence() { for (const source of this.voices) { try { source.stop(); } catch { /* Already stopped. */ } } this.voices.clear(); }
  pause() { this.paused = true; this.silence(); }
  play(kind, distance = 0) {
    if (!this.enabled || this.paused || !this.context || this.context.state !== 'running' || this.voices.size > 18) return;
    const presets = {
      step: [48, .22, .18, 120], punch: [85, .22, .42, 750], heavy: [48, .42, .55, 420],
      block: [180, .18, .3, 1700], transform: [38, 1.25, .65, 650], steam: [130, .45, .08, 2200],
      dodge: [95, .2, .14, 1100], defeat: [32, .9, .5, 260],
    };
    const [frequency, duration, volume, cutoff] = presets[kind] || presets.punch;
    const now = this.context.currentTime, gain = this.context.createGain();
    gain.gain.setValueAtTime(.001, now); gain.gain.linearRampToValueAtTime(volume / (1 + distance * .025), now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + duration); gain.connect(this.master);
    const oscillator = this.context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(22, now + duration); oscillator.connect(gain);
    const noise = this.context.createBufferSource(), filter = this.context.createBiquadFilter(); noise.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = cutoff; noise.connect(filter); filter.connect(gain);
    let ended = 0;
    for (const source of [oscillator, noise]) {
      this.voices.add(source); source.onended = () => { this.voices.delete(source); source.disconnect(); if (++ended === 2) { filter.disconnect(); gain.disconnect(); } };
      source.start(now); source.stop(now + duration);
    }
    this.played++;
  }
  snapshot() { return { enabled: this.enabled, paused: this.paused, available: !!this.context, activeVoices: this.voices.size, played: this.played }; }
}
