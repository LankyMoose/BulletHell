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
  new Howl({
    src: ['vfx/music_9.mp3'],
    onend: () => musicPlayer.next(),
    html5: true,
  }),
];

export class MusicPlayer {
  constructor() {
    this.currentTrack = Math.floor(Math.random() * musicTracks.length - 1);
    this.playing = false;
  }
  next() {
    musicTracks[this.currentTrack]?.stop();
    this.currentTrack++;
    if (this.currentTrack > musicTracks.length - 1) this.currentTrack = 0;
    this.play();
    console.log('now playing ', this.currentTrack);
  }
  prev() {
    musicTracks[this.currentTrack]?.stop();
    this.currentTrack--;
    if (this.currentTrack < 0) this.currentTrack = musicTracks.length - 1;
    this.play();
  }
  resume() {
    this.play();
  }
  play() {
    musicTracks[this.currentTrack].play();
    this.playing = true;
  }
  pause() {
    musicTracks[this.currentTrack].pause();
    this.playing = false;
  }
  togglePlay() {
    if (musicTracks[this.currentTrack].playing()) return this.pause();
    return this.resume();
  }
}

export const musicPlayer = new MusicPlayer();
