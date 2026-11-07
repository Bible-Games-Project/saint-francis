import { SaveManager } from "./SaveManager";

/**
 * Small Web Audio based audio system. The project ships without composed
 * music/SFX assets yet, so this generates a warm, generative ambient pad for
 * "Music" and short synthesized blips for "Sounds" (UI feedback). Both are
 * driven live by the persisted volume/toggle settings, and both go silent
 * immediately when their toggle is off — this is the real audio system the
 * Settings screen controls, ready to be swapped for authored audio files
 * later without changing the Settings UI.
 */
class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicStarted = false;
  private unlocked = false;

  init(): void {
    const start = () => this.unlock();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    SaveManager.onChange(() => this.applySettings());
  }

  private unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicLevel();
    this.musicGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxLevel();
    this.sfxGain.connect(this.ctx.destination);

    this.startAmbientPad();
  }

  private musicLevel(): number {
    const s = SaveManager.getMusicSettings();
    return s.enabled ? s.volume * 0.3 : 0;
  }

  private sfxLevel(): number {
    const s = SaveManager.getSoundsSettings();
    return s.enabled ? s.volume : 0;
  }

  private applySettings(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(this.musicLevel(), now + 0.2);
    this.sfxGain.gain.linearRampToValueAtTime(this.sfxLevel(), now + 0.05);
  }

  /** A slow, warm four-note drone with gentle independent breathing per voice. */
  private startAmbientPad(): void {
    if (!this.ctx || !this.musicGain || this.musicStarted) return;
    this.musicStarted = true;
    const ctx = this.ctx;
    const notes = [130.81, 196.0, 246.94, 329.63]; // C3, G3, B3, E4 - open, warm

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;

      const voiceGain = ctx.createGain();
      const base = 0.22 / notes.length;
      voiceGain.gain.value = 0;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + i * 0.015;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = base * 0.5;
      lfo.connect(lfoGain).connect(voiceGain.gain);

      osc.connect(voiceGain).connect(this.musicGain!);
      osc.start();
      lfo.start();

      voiceGain.gain.linearRampToValueAtTime(base, ctx.currentTime + 4 + i * 0.6);
    });
  }

  private blip(freq: number, duration: number, type: OscillatorType = "sine"): void {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(env).connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  playHover(): void {
    this.blip(660, 0.09, "sine");
  }

  playClick(): void {
    this.blip(523.25, 0.14, "triangle");
  }

  playConfirm(): void {
    this.blip(392, 0.1, "triangle");
    setTimeout(() => this.blip(587.33, 0.16, "triangle"), 90);
  }

  playBack(): void {
    this.blip(440, 0.1, "sine");
  }

  playPickup(): void {
    this.blip(494, 0.07, "sine");
    setTimeout(() => this.blip(659.25, 0.1, "sine"), 60);
  }

  playDoor(): void {
    this.blip(220, 0.22, "triangle");
  }
}

export const AudioManager = new AudioManagerImpl();
