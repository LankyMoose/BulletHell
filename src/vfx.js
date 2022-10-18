import { Howl, Howler } from 'howler';
import { GAME_VOLUME } from './constants';

Howler.volume(GAME_VOLUME);

const trackSources = [
  '//stream.music.cdn.unippm.com/BER/BER1262/Collide/BER_1262_2_Collide_Nonte_993669.mp3',
  '//stream.music.cdn.unippm.com/CHAP/CHAP521/Night_Invasion/CHAP_521_15_Night_Invasion_Everitt_Everitt_1428267.mp3',
  '//stream.music.cdn.unippm.com/FRONT/FRONT104/Diablo/FRONT_104_4_Diablo_Frankel_1228626.mp3',
  '//stream.music.cdn.unippm.com/SEE/SEE022/Comic_Cons/SEE_22_2_Comic_Cons_Simms_Whittaker_Gilbey_794809.mp3',
  '//stream.music.cdn.unippm.com/MAT/MAT252/Frenetic_Disorder/MAT_252_5_Frenetic_Disorder_Niska_Wahl_717907.mp3',
  '//stream.music.cdn.unippm.com/BBCPM/BBCPM100/Fresh_Challenge/BBCPM_100_5_Fresh_Challenge_Stefanski_1364985.mp3',
  '//stream.music.cdn.unippm.com/BBCPM/BBCPM119/Rapid_Response/BBCPM_119_3_Rapid_Response_Salmins_1483914.mp3',
];

export const musicTracks = trackSources.map(
  (ts) => new Howl({ src: [ts], onend: () => musicPlayer.next(), html5: true })
);

export class MusicPlayer {
  constructor() {
    this.trackIndex = Math.floor(Math.random() * (musicTracks.length - 1));
  }
  get currentTrack() {
    return musicTracks[this.trackIndex];
  }
  next() {
    this.currentTrack?.stop();
    this.trackIndex++;
    if (this.trackIndex > musicTracks.length - 1) this.trackIndex = 0;
    this.play();
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
    console.log('now playing', 'https:' + trackSources[this.trackIndex]);
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
