import { Howl, Howler } from 'howler';
Howler.volume(0.5);

export const musicTracks = [
  new Howl({
    src: ['vfx/music_0.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_1.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_2.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_3.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_4.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_5.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_6.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_7.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
  new Howl({
    src: ['vfx/music_8.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
];

export class MusicPlayer {
  constructor() {
    this.trackIndex = Math.floor(Math.random() * musicTracks.length - 1);
  }
  get currentTrack() {
    return musicTracks[this.trackIndex];
  }
  next() {
    this.currentTrack?.stop();
    this.trackIndex++;
    if (this.trackIndex > musicTracks.length - 1) this.trackIndex = 0;
    this.play();
    console.log('now playing ', this.trackIndex);
  }
  prev() {
    musicTracks[this.trackIndex]?.stop();
    this.trackIndex--;
    if (this.trackIndex < 0) this.trackIndex = musicTracks.length - 1;
    this.play();
  }
  resume() {
    this.play();
  }
  play() {
    this.currentTrack.play();
  }
  pause() {
    this.currentTrack.pause();
  }
  togglePlay() {
    if (this.currentTrack.playing()) return this.pause();
    return this.play();
  }
  setLowPass(freq) {
    //this.currentTrack.frequency(freq);
  }
  resetLowPass() {
    //this.currentTrack.frequency(10e3);
  }
}

export const musicPlayer = new MusicPlayer();
window.musicPlayer = musicPlayer;
