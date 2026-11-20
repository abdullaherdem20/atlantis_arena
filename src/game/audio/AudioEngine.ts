import type { GameSettings } from '../../types/game';

export type MusicTrack = 'menu' | 'select' | 'battle' | 'final' | 'duel' | 'victory' | 'defeat';
export type SoundEffect = 'click' | 'select' | 'start' | 'attack' | 'heavy' | 'damage' | 'critical' | 'heal' | 'shield' | 'shieldBreak' | 'ice' | 'water' | 'football' | 'boxing' | 'ultimate' | 'elimination' | 'round' | 'announcement' | 'wheelSpin' | 'wheelStop' | 'alarm' | 'barcode' | 'error' | 'victory' | 'defeat';

const tracks: Record<MusicTrack, number[]> = {
  menu: [52, 59, 64, 59, 55, 62, 67, 62],
  select: [57, 60, 64, 69, 64, 60, 62, 67],
  battle: [45, 52, 57, 60, 45, 55, 59, 64],
  final: [43, 50, 55, 58, 62, 58, 65, 62],
  duel: [40, 47, 52, 55, 59, 55, 52, 47],
  victory: [60, 64, 67, 72, 67, 72, 76, 79],
  defeat: [55, 52, 48, 43, 45, 40, 38, 36],
};

const midi = (note: number): number => 440 * 2 ** ((note - 69) / 12);

class AudioEngine {
  private context?: AudioContext;
  private settings: GameSettings = { master: .8, music: .55, effects: .75, announcements: .8, muted: false, reducedMotion: false, lowGraphics: false, speed: 1 };
  private musicTimer?: number;
  private musicStep = 0;
  private currentTrack?: MusicTrack;
  private lastSfx = 0;

  configure(settings: GameSettings): void { this.settings = settings; }

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'square', delay = 0): void {
    if (!this.context || this.settings.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * this.settings.master), start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  playMusic(track: MusicTrack): void {
    this.unlock();
    if (this.currentTrack === track && this.musicTimer) return;
    this.stopMusic();
    this.currentTrack = track;
    this.musicStep = 0;
    const playStep = () => {
      const pattern = tracks[track];
      const note = pattern[this.musicStep % pattern.length]!;
      const volume = this.settings.music * .055;
      this.tone(midi(note), .14, volume, 'square');
      if (this.musicStep % 2 === 0) this.tone(midi(note - 24), .22, volume * .8, 'triangle');
      if (this.musicStep % 4 === 0) this.tone(82, .06, volume * .45, 'sawtooth');
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, track === 'duel' ? 130 : track === 'battle' || track === 'final' ? 165 : 220);
  }

  stopMusic(): void { if (this.musicTimer) window.clearInterval(this.musicTimer); this.musicTimer = undefined; this.currentTrack = undefined; }

  sfx(effect: SoundEffect): void {
    this.unlock();
    const now = performance.now();
    if (now - this.lastSfx < 34 && !['ultimate', 'victory', 'defeat'].includes(effect)) return;
    this.lastSfx = now;
    const v = this.settings.effects * .12;
    const map: Record<SoundEffect, [number, number, OscillatorType]> = {
      click: [660, .05, 'square'], select: [880, .08, 'square'], start: [220, .25, 'sawtooth'], attack: [150, .07, 'square'], heavy: [92, .16, 'sawtooth'], damage: [118, .1, 'square'], critical: [980, .16, 'sawtooth'], heal: [740, .22, 'sine'], shield: [410, .18, 'triangle'], shieldBreak: [1260, .12, 'square'], ice: [1120, .12, 'triangle'], water: [320, .16, 'sine'], football: [186, .1, 'square'], boxing: [104, .13, 'sawtooth'], ultimate: [130, .45, 'sawtooth'], elimination: [90, .32, 'square'], round: [520, .12, 'square'], announcement: [780, .18, 'square'], wheelSpin: [460, .09, 'square'], wheelStop: [1020, .2, 'square'], alarm: [940, .28, 'square'], barcode: [1320, .06, 'square'], error: [110, .24, 'square'], victory: [784, .45, 'square'], defeat: [165, .5, 'triangle'],
    };
    const [frequency, duration, type] = map[effect];
    const channelVolume = ['announcement', 'wheelSpin', 'wheelStop', 'alarm'].includes(effect) ? this.settings.announcements : this.settings.effects;
    this.tone(frequency, duration, channelVolume * .12, type);
    if (effect === 'ultimate' || effect === 'victory') this.tone(frequency * 1.5, duration * .75, v * .7, 'square', .08);
  }
}

export const audioEngine = new AudioEngine();
