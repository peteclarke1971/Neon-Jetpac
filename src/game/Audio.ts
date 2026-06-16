const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

let musicOsc: OscillatorNode | null = null;
let musicInterval: any = null;
let soundEnabled = true;

const getVolumeFactor = (): number => {
  const v = (window as any).__soundVolume;
  return v !== undefined ? v : 1.0;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1, slideFreq?: number) => {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  if (slideFreq) {
    osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
  }

  gain.gain.setValueAtTime(vol * getVolumeFactor(), audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01 * getVolumeFactor(), audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

let thrustGain: GainNode | null = null;
let thrustOsc: OscillatorNode | null = null;

export const audio = {
  toggleSound: (enabled: boolean) => {
    soundEnabled = enabled;
  },

  playShoot: () => {
    playTone(800, 'square', 0.1, 0.1, 200);
  },

  playJump: () => {
    playTone(250, 'triangle', 0.15, 0.15, 600);
  },

  playExplosion: () => {
    if (!soundEnabled) return;
    const dur = 0.3;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    // Simulate noise by rapid frequency modulation
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(10, audioCtx.currentTime + dur);
    
    // Lowpass filter for explosions
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + dur);

    gain.gain.setValueAtTime(0.3 * getVolumeFactor(), audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01 * getVolumeFactor(), audioCtx.currentTime + dur);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  },

  playPickup: () => {
    playTone(1200, 'sine', 0.1, 0.1, 1600);
    setTimeout(() => playTone(1600, 'sine', 0.2, 0.1, 2000), 50);
  },

  playDrop: () => {
    playTone(400, 'square', 0.15, 0.1, 200);
  },

  playPowerup: () => {
    playTone(800, 'triangle', 0.3, 0.2, 1200);
  },

  playLaunch: () => {
    if (!soundEnabled) return;
    const dur = 4.0;
    
    // Low frequency rumble
    const rumbleOsc = audioCtx.createOscillator();
    const rumbleGain = audioCtx.createGain();
    const bqFilter = audioCtx.createBiquadFilter();
    
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(40, audioCtx.currentTime);
    rumbleOsc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + dur);
    
    bqFilter.type = 'lowpass';
    bqFilter.frequency.setValueAtTime(200, audioCtx.currentTime);
    bqFilter.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + dur);

    rumbleGain.gain.setValueAtTime(0, audioCtx.currentTime);
    rumbleGain.gain.linearRampToValueAtTime(0.8 * getVolumeFactor(), audioCtx.currentTime + 0.5);
    rumbleGain.gain.linearRampToValueAtTime(0.01 * getVolumeFactor(), audioCtx.currentTime + dur);
    
    rumbleOsc.connect(bqFilter);
    bqFilter.connect(rumbleGain);
    rumbleGain.connect(audioCtx.destination);
    
    rumbleOsc.start();
    rumbleOsc.stop(audioCtx.currentTime + dur);

    // Rising whine layer
    const whineOsc = audioCtx.createOscillator();
    const whineGain = audioCtx.createGain();
    
    whineOsc.type = 'sine';
    whineOsc.frequency.setValueAtTime(100, audioCtx.currentTime);
    whineOsc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + dur);
    
    whineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    whineGain.gain.linearRampToValueAtTime(0.3 * getVolumeFactor(), audioCtx.currentTime + 1.0);
    whineGain.gain.linearRampToValueAtTime(0.01 * getVolumeFactor(), audioCtx.currentTime + dur);
    
    whineOsc.connect(whineGain);
    whineGain.connect(audioCtx.destination);
    
    whineOsc.start();
    whineOsc.stop(audioCtx.currentTime + dur);
  },

  playGameOver: () => {
    playTone(300, 'sawtooth', 0.5, 0.2, 100);
    setTimeout(() => playTone(250, 'sawtooth', 0.5, 0.2, 80), 400);
    setTimeout(() => playTone(200, 'sawtooth', 1.0, 0.2, 50), 800);
  },

  startThrust: () => {
    if (!soundEnabled) return;
    if (thrustOsc) return;
    thrustOsc = audioCtx.createOscillator();
    thrustOsc.type = 'sawtooth';
    thrustOsc.frequency.value = 60;
    thrustGain = audioCtx.createGain();
    thrustGain.gain.setValueAtTime(0, audioCtx.currentTime);
    thrustGain.gain.linearRampToValueAtTime(0.15 * getVolumeFactor(), audioCtx.currentTime + 0.1);
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    thrustOsc.connect(filter);
    filter.connect(thrustGain);
    thrustGain.connect(audioCtx.destination);
    
    thrustOsc.start();
  },

  stopThrust: () => {
    if (thrustGain && thrustOsc) {
      thrustGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      const to = thrustOsc; // capture in closure
      setTimeout(() => {
        try { to.stop(); to.disconnect(); } catch (e) {}
      }, 100);
      thrustOsc = null;
      thrustGain = null;
    }
  }
};
