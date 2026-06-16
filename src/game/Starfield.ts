import { BackdropSettings, getSkyGradientStops, normalizeBackdropSettings } from './StageProfiles';

export interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  twinkleSpeed: number;
  t: number;
  layer: number;
  speedMultiplier: number;
}

export interface Nebula {
  x: number;
  y: number;
  radius: number;
  colorA: string;
  colorB: string;
  pulseSpeed: number;
  t: number;
  vx: number;
  vy: number;
  scale?: number;
}

export interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  speed: number;
  active: boolean;
  cooldown: number;
  color: string;
}

export interface AuroraRibbon {
  yOffset: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  t: number;
  color: string;
  lineWidth: number;
}

export interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
  rotSpeed: number;
  curveSpeed: number;
  t: number;
}

export interface AsteroidDebris {
  x: number;
  y: number;
  size: number;
  speedMultiplier: number;
  rot: number;
  rotSpeed: number;
  points: { x: number; y: number }[];
}

export class Starfield {
  stars: Star[] = [];
  nebulas: Nebula[] = [];
  meteors: Meteor[] = [];
  auroras: AuroraRibbon[] = [];
  weatherParticles: WeatherParticle[] = [];
  asteroids: AsteroidDebris[] = [];
  
  width: number = 800;
  height: number = 600;
  
  scrollX: number = 0;
  scrollY: number = 0;
  
  ticks: number = 0;
  
  // Reactivity states
  private flareIntensity: number = 0;
  private explosionHeatPulse: number = 0;

  constructor(width: number, height: number, count: number) {
    this.width = width;
    this.height = height;

    // 1. Create Stars (Pre-seeded layers)
    const spaceColors = ['#ffffff', '#a8d5ff', '#ffb5a8', '#f5f5f5', '#00ffff', '#ff88ff', '#fdec74', '#99f6e4'];
    for (let i = 0; i < count; i++) {
      const layer = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.4,
        color: spaceColors[Math.floor(Math.random() * spaceColors.length)],
        twinkleSpeed: Math.random() * 0.04 + 0.008,
        t: Math.random() * Math.PI * 2,
        layer: layer,
        speedMultiplier: layer === 1 ? 0.06 : layer === 2 ? 0.18 : 0.45
      });
    }

    // 2. Create drifting interstellar nebulae
    const nebulaColors = [
      { a: 'rgba(99, 102, 241, 0.18)', b: 'rgba(168, 85, 247, 0)' },   // Indigo-violet
      { a: 'rgba(236, 72, 153, 0.15)', b: 'rgba(219, 39, 119, 0)' },   // Pink
      { a: 'rgba(14, 165, 233, 0.16)', b: 'rgba(6, 182, 212, 0)' },   // Cyan-blue
      { a: 'rgba(245, 158, 11, 0.12)', b: 'rgba(239, 68, 68, 0)' },   // Amber-red
      { a: 'rgba(16, 185, 129, 0.14)', b: 'rgba(20, 184, 166, 0)' }   // Emerald-teal
    ];

    for (let i = 0; i < 4; i++) {
      const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      this.nebulas.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.8,
        radius: Math.random() * 140 + 100,
        colorA: col.a,
        colorB: col.b,
        pulseSpeed: Math.random() * 0.005 + 0.002,
        t: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08
      });
    }

    // 3. Create shooting meteors
    const meteorColors = ['#00ffff', '#ff55ff', '#ffffff', '#ffd700', '#10b981'];
    for (let i = 0; i < 3; i++) {
      this.meteors.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        vx: -(Math.random() * 4 + 4),
        vy: Math.random() * 2 + 1,
        length: Math.random() * 45 + 25,
        thickness: Math.random() * 1.5 + 1.0,
        speed: Math.random() * 3 + 4,
        active: false,
        cooldown: Math.random() * 200 + 100,
        color: meteorColors[Math.floor(Math.random() * meteorColors.length)]
      });
    }

    // 4. Create Auroras
    const auroraColors = [
      'rgba(16, 185, 129, 0.16)',
      'rgba(6, 182, 212, 0.14)',
      'rgba(139, 92, 246, 0.12)'
    ];
    for (let i = 0; i < 3; i++) {
      this.auroras.push({
        yOffset: height * 0.12 + i * (height * 0.22) + Math.random() * 40,
        amplitude: Math.random() * 18 + 12,
        wavelength: Math.random() * 160 + 140,
        speed: Math.random() * 0.012 + 0.004,
        t: Math.random() * Math.PI * 2,
        color: auroraColors[i % auroraColors.length],
        lineWidth: Math.random() * 14 + 6
      });
    }

    // 5. Generate background asteroids
    for (let i = 0; i < 15; i++) {
      const points: { x: number; y: number }[] = [];
      const steps = 6 + Math.floor(Math.random() * 4);
      const rad = Math.random() * 16 + 6;
      for (let s = 0; s < steps; s++) {
        const angle = (s / steps) * Math.PI * 2;
        const offset = rad * (0.85 + Math.random() * 0.3);
        points.push({
          x: Math.cos(angle) * offset,
          y: Math.sin(angle) * offset
        });
      }
      this.asteroids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: rad,
        speedMultiplier: Math.random() * 0.08 + 0.02,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        points
      });
    }
  }

  // Event trigger for gameplay flare responses (e.g. rocket launch, player death, boss entry)
  public triggerReaction(type: string) {
    if (type === 'explosion' || type === 'death') {
      this.explosionHeatPulse = 1.0;
    } else {
      this.flareIntensity = 1.0;
    }
  }

  private updatePhysics(fever: number, warp: number, weather: string, settings?: any) {
    this.ticks++;

    // Decay reactive indicators
    if (this.flareIntensity > 0) this.flareIntensity -= 0.04;
    if (this.explosionHeatPulse > 0) this.explosionHeatPulse -= 0.05;

    // Apply scroll offsets
    const baseWarpMultiplier = 1 + warp * 4;
    this.scrollX = (this.scrollX || 0) + (0.15 + fever * 0.4) * baseWarpMultiplier;
    this.scrollY = (this.scrollY || 0) + warp * 5.5;

    // 1. Interstellar Nebulae
    const nebSpeedScale = settings?.nebulaPulseSpeed !== undefined ? settings.nebulaPulseSpeed : 1.0;
    for (const neb of this.nebulas) {
      neb.t += neb.pulseSpeed * (1 + fever * 0.6) * nebSpeedScale;
      neb.x += neb.vx * (1 + fever) * (settings?.nebulaDrift !== undefined ? settings.nebulaDrift : 1.0);
      neb.y += neb.vy * (1 + fever) * (settings?.nebulaDrift !== undefined ? settings.nebulaDrift : 1.0);

      if (neb.x < -300) neb.x = this.width + 300;
      if (neb.x > this.width + 300) neb.x = -300;
      if (neb.y < -300) neb.y = this.height + 300;
      if (neb.y > this.height + 300) neb.y = -300;
    }

    // 2. Backgroud Asteroids
    const asteroidSpeedScale = settings?.asteroidSpeed !== undefined ? settings.asteroidSpeed : 1.0;
    for (const ast of this.asteroids) {
      ast.x -= ast.speedMultiplier * (1 + fever * 0.8) * asteroidSpeedScale;
      ast.rot += ast.rotSpeed * (1 + fever * 0.5);
      if (ast.x < -ast.size * 2) {
        ast.x = this.width + ast.size * 2;
        ast.y = Math.random() * this.height;
      }
    }

    // 3. Shooting Meteors
    const isMeteorsOn = settings?.shootingStarsEnabled !== false;
    const frequency = settings?.meteorRate !== undefined ? settings.meteorRate : 1.0; 
    const frequencyDiv = frequency <= 0.2 ? 0.3 : frequency <= 0.6 ? 0.6 : frequency <= 1.2 ? 1.0 : frequency <= 3.0 ? 3.0 : 7.0;

    for (const m of this.meteors) {
      if (m.active) {
        const speedSel = settings?.meteorSpeed || 'normal';
        let speedMul = 1.0;
        if (speedSel === 'slow') speedMul = 0.5;
        else if (speedSel === 'fast') speedMul = 1.6;
        else if (speedSel === 'ludicrous') speedMul = 3.2;

        m.x += m.vx * (1 + warp * 1.8) * speedMul;
        m.y += m.vy * (1 + warp * 1.4) * speedMul;

        if (m.x < -200 || m.x > this.width + 200 || m.y > this.height + 200 || m.y < -200) {
          m.active = false;
          m.cooldown = (Math.random() * 250 + 100) / frequencyDiv;
        }
      } else {
        m.cooldown -= 1 * frequencyDiv;
        if (m.cooldown <= 0 && isMeteorsOn) {
          m.active = true;
          const starDir = settings?.starDirection || 'left';
          
          if (starDir === 'left') {
            m.x = this.width + Math.random() * 200;
            m.y = Math.random() * this.height * 0.5;
            m.vx = -(Math.random() * 5 + 4);
            m.vy = Math.random() * 1.5 + 0.5;
          } else if (starDir === 'right') {
            m.x = -Math.random() * 200;
            m.y = Math.random() * this.height * 0.5;
            m.vx = (Math.random() * 5 + 4);
            m.vy = Math.random() * 1.5 + 0.5;
          } else if (starDir === 'up') {
            m.x = Math.random() * this.width;
            m.y = this.height + Math.random() * 200;
            m.vx = (Math.random() - 0.5) * 2;
            m.vy = -(Math.random() * 5 + 4);
          } else { // down
            m.x = Math.random() * this.width;
            m.y = -Math.random() * 200;
            m.vx = (Math.random() - 0.5) * 2;
            m.vy = (Math.random() * 5 + 4);
          }

          const sizeSel = settings?.meteorSize || 'normal';
          let thick = Math.random() * 1.5 + 1.0;
          let len = Math.random() * 45 + 25;
          if (sizeSel === 'tiny') {
            thick = Math.random() * 0.8 + 0.5;
            len = Math.random() * 20 + 12;
          } else if (sizeSel === 'massive') {
            thick = Math.random() * 3.0 + 2.5;
            len = Math.random() * 80 + 50;
          } else if (sizeSel === 'colossal') {
            thick = Math.random() * 6.0 + 5.0;
            len = Math.random() * 150 + 100;
          }
          m.thickness = thick;
          m.length = len;

          const colSel = settings?.meteorColorPalette || 'orange';
          const spaceColors = {
            'cyan': '#00ffff',
            'pink': '#ff0077',
            'orange': '#f97316',
            'emerald': '#10b981',
            'yellow': '#ffd700',
            'purple': '#a855f7',
            'white': '#ffffff',
            'rainbow': '#ff3366'
          };
          m.color = spaceColors[colSel as keyof typeof spaceColors] || '#ffffff';
        }
      }
    }

    // 4. Aurora ribbons
    for (const aur of this.auroras) {
      aur.t += aur.speed * (settings?.trippyIntensity !== undefined ? (1 + settings.trippyIntensity * 1.5) : 1);
    }

    // 5. Weather particles update
    const pLimit = settings?.maxAmbientParticles || 150;
    for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
      const p = this.weatherParticles[i];
      p.life--;
      if (p.life <= 0) {
        this.weatherParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * (1 + fever * 0.3);
      p.y += p.vy * (1 + fever * 0.3);
      p.angle += p.rotSpeed;
      p.alpha = Math.max(0, p.alpha * 0.995);

      if (weather === 'spurs') {
        p.t += p.curveSpeed;
        p.vx += Math.sin(p.t) * 0.04;
      }
    }

    // Spawn new weather particles up to limit
    if (weather && weather !== 'none' && this.weatherParticles.length < pLimit) {
      const rate = weather === 'acid_rain' || weather === 'plasma_rain' || weather === 'data_rain' || weather === 'electrical_storm' ? 0.7 : weather === 'solar_flare' ? 0.08 : 0.22;
      if (Math.random() < rate * (1 + fever * 0.6)) {
        this.spawnWeatherParticle(weather);
      }
    }
  }

  private spawnWeatherParticle(type: string) {
    if (type === 'acid_rain') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: -15,
        vx: -1.2 - Math.random() * 1.2,
        vy: 5.5 + Math.random() * 3.5,
        size: Math.random() * 1.6 + 0.6,
        color: Math.random() < 0.2 ? '#d9f99d' : '#a3e635', // Electric Lime Acid
        alpha: Math.random() * 0.65 + 0.35,
        life: 120,
        maxLife: 120,
        angle: 0.15,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'spurs') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: this.height + 15,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.82 + 0.35),
        size: Math.random() * 4.2 + 1.0,
        color: Math.random() < 0.4 ? '#22d3ee' : '#34d399', // Bio Spores (cyan/green)
        alpha: Math.random() * 0.6 + 0.4,
        life: Math.random() * 280 + 140,
        maxLife: 420,
        angle: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        curveSpeed: Math.random() * 0.025 + 0.008,
        t: Math.random() * Math.PI
      });
    } else if (type === 'ash') {
      this.weatherParticles.push({
        x: this.width + 12,
        y: Math.random() * this.height,
        vx: -(Math.random() * 1.4 + 0.72),
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 3.2 + 0.8,
        color: Math.random() < 0.32 ? '#f87171' : '#78716c', // volcanic charcoal with glowing red ember
        alpha: Math.random() * 0.6 + 0.4,
        life: Math.random() * 240 + 70,
        maxLife: 320,
        angle: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.035,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'embers') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: this.height + 15,
        vx: (Math.random() - 0.5) * 0.75,
        vy: -(Math.random() * 1.6 + 1.0),
        size: Math.random() * 2.8 + 0.8,
        color: Math.random() < 0.45 ? '#fbbf24' : '#ef4444', // Magma ember sparks
        alpha: Math.random() * 0.85 + 0.15,
        life: Math.random() * 130 + 55,
        maxLife: 185,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'ice_shards') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: -15,
        vx: (Math.random() - 0.5) * 0.9,
        vy: Math.random() * 1.3 + 0.7,
        size: Math.random() * 3.6 + 1.2,
        color: Math.random() < 0.48 ? '#ffffff' : '#c084fc', // ICE crystals (white / light purple shimmer)
        alpha: Math.random() * 0.75 + 0.25,
        life: Math.random() * 230 + 160,
        maxLife: 400,
        angle: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.045,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'solar_flare') {
      this.weatherParticles.push({
        x: 0,
        y: Math.random() * this.height,
        vx: 3.4,
        vy: 0,
        size: Math.random() * 12 + 4,
        color: 'rgba(239, 68, 68, 0.12)', // Solar radiation flare bands
        alpha: 0.55,
        life: 250,
        maxLife: 250,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'electrical_storm') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: -15,
        vx: -0.5 - Math.random() * 0.5,
        vy: 6.0 + Math.random() * 4.0,
        size: Math.random() * 2.5 + 0.8,
        color: Math.random() < 0.35 ? '#a855f7' : '#06b6d4', // Purplish lightning sparks
        alpha: Math.random() * 0.8 + 0.2,
        life: 100,
        maxLife: 100,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'plasma_rain') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: -15,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 4.5 + Math.random() * 3.0,
        size: Math.random() * 2.2 + 0.8,
        color: Math.random() < 0.5 ? '#f43f5e' : '#ec4899', // Bright neon rose/pink rain
        alpha: Math.random() * 0.7 + 0.3,
        life: 130,
        maxLife: 130,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'data_rain') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: -15,
        vx: 0,
        vy: 3.0 + Math.random() * 2.5,
        size: Math.random() * 3.0 + 1.2,
        color: Math.random() < 0.25 ? '#34d399' : '#10b981', // Falling digital matrix digits (green)
        alpha: Math.random() * 0.85 + 0.15,
        life: 150,
        maxLife: 150,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0,
        t: 0
      });
    } else if (type === 'underwater_bubbles') {
      this.weatherParticles.push({
        x: Math.random() * this.width,
        y: this.height + 15,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(Math.random() * 1.8 + 0.8),
        size: Math.random() * 3.2 + 1.0,
        color: Math.random() < 0.4 ? 'rgba(14, 165, 233, 0.4)' : 'rgba(186, 230, 253, 0.5)', // Rising hollow cyan water bubbles
        alpha: Math.random() * 0.6 + 0.2,
        life: Math.random() * 260 + 100,
        maxLife: 360,
        angle: 0,
        rotSpeed: 0,
        curveSpeed: 0.1,
        t: Math.random() * Math.PI
      });
    } else {
      // Procedural fallback to handle all other 20+ creative weather effects coherently!
      const isRain = type.includes('rain') || type.includes('drizzle') || type.includes('streaks');
      const isSnow = type.includes('snow');
      const isRising = type.includes('steam') || type.includes('fumes') || type.includes('rising');
      const isSparks = type.includes('sparks') || type.includes('shards') || type.includes('crystal') || type.includes('pixels') || type.includes('debris');
      const isDrifter = type.includes('dust') || type.includes('pollen') || type.includes('fireflies') || type.includes('particles') || type.includes('spores');

      let x = Math.random() * this.width;
      let y = -15;
      let vx = (Math.random() - 0.5) * 1.0;
      let vy = 1.5 + Math.random() * 1.5;
      let size = Math.random() * 2.5 + 0.8;
      let alpha = Math.random() * 0.7 + 0.25;
      let life = Math.random() * 150 + 100;
      let color = '#ffffff';
      let curveSpeed = 0;
      let rotSpeed = 0;

      if (isRain) {
        vy = 5.0 + Math.random() * 3.5;
        vx = -0.5 - Math.random() * 0.5;
        size = Math.random() * 1.8 + 0.5;
        color = type.includes('neon') ? '#f43f5e' : '#a5f3fc'; // Pink neon drizzle or light cyan rain streaks
      } else if (isSnow) {
        vy = 0.6 + Math.random() * 0.8;
        vx = (Math.random() - 0.5) * 0.5;
        size = Math.random() * 3.0 + 1.2;
        color = '#ffffff';
        curveSpeed = 0.02;
      } else if (isRising) {
        y = this.height + 15;
        vy = -(Math.random() * 0.9 + 0.4);
        vx = (Math.random() - 0.5) * 0.8;
        size = Math.random() * 4.5 + 1.5;
        color = type.includes('toxic') ? 'rgba(132, 204, 22, 0.25)' : 'rgba(226, 232, 240, 0.3)';
        life = 200;
      } else if (isSparks) {
        vy = 2.0 + Math.random() * 2.5;
        vx = (Math.random() - 0.5) * 2.0;
        size = Math.random() * 2.2 + 0.7;
        rotSpeed = (Math.random() - 0.5) * 0.15;
        if (type.includes('prismatic') || type.includes('confetti')) {
          const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#22d3ee'];
          color = colors[Math.floor(Math.random() * colors.length)];
        } else if (type.includes('crystal')) {
          color = '#bae6fd'; // Cyan ice glittering
        } else if (type.includes('meteor')) {
          color = '#f97316'; // Orange spark arcs
        } else if (type.includes('glitch')) {
          color = Math.random() < 0.5 ? '#00ffcc' : '#ff0077';
          size = Math.random() * 3.0 + 2.0;
        } else {
          color = '#a855f7'; // Purple ion sparks
        }
      } else if (isDrifter) {
        vy = 0.8 + Math.random() * 0.8;
        vx = (Math.random() - 0.5) * 1.2;
        curveSpeed = 0.03;
        if (type.includes('fireflies')) {
          color = '#fef08a'; // yellow glows
          vy = (Math.random() - 0.5) * 0.8;
          y = Math.random() * this.height;
        } else if (type.includes('pollen')) {
          color = '#86efac'; // light green
        } else if (type.includes('aurora')) {
          color = Math.random() < 0.5 ? '#2dd4bf' : '#a855f7'; // teal/purple aurora bits
        } else {
          color = 'rgba(255, 255, 255, 0.6)'; // gentle space dust
        }
      }

      this.weatherParticles.push({
        x,
        y,
        vx,
        vy,
        size,
        color,
        alpha,
        life,
        maxLife: life,
        angle: Math.random() * Math.PI,
        rotSpeed,
        curveSpeed,
        t: Math.random() * Math.PI
      });
    }
  }

  // Draw background sky, stars, nebulae, planets, custom astronomical elements
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, options?: any) {
    this.width = width;
    this.height = height;

    const fever = options?.feverIntensity || 0;
    const warp = options?.warpAmount || 0;
    const theme = options?.theme;
    
    // Extracted customizable parameters
    const stageId = options?.stageId || 1;
    const userSettings = normalizeBackdropSettings(options?.backdropSettings);

    // Use customized settings if present, otherwise fall back to selected select box props
    const backdrop = userSettings?.backdropTheme || options?.backdropTheme || this.getCuratedBackdrop(stageId);
    const sky = userSettings?.skyPalette || options?.skyPalette || this.getCuratedSky(stageId);
    const weather = userSettings?.weatherEffect || options?.weatherEffect || this.getCuratedWeather(stageId);

    // Apply gameplay physics
    this.updatePhysics(fever, warp, weather, userSettings);

    ctx.save();

    // 1. Full-screen Trippy Color Shifting Rotation effect
    const triValue = userSettings?.trippyIntensity !== undefined ? userSettings.trippyIntensity : 0;
    const trippySpeed = userSettings?.trippyColorCycleSpeed !== undefined ? userSettings.trippyColorCycleSpeed : 1.0;
    if (triValue > 0.05) {
      const hueShift = (this.ticks * 0.65 * trippySpeed) % 360;
      ctx.filter = `hue-rotate(${hueShift * triValue}deg)`;
    }

    // Dynamic screen Shake reactivity translate offset
    if (options?.shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * options.shakeAmount * 0.8;
      const sy = (Math.random() - 0.5) * options.shakeAmount * 0.8;
      ctx.translate(sx, sy);
    }

    // 2. Clear Sky Gradient Background using getSkyGradientStops
    let skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    const stops = getSkyGradientStops(sky, theme?.id, userSettings);
    if (stops.length === 4) {
      skyGrad.addColorStop(0, stops[0]);
      skyGrad.addColorStop(0.33, stops[1]);
      skyGrad.addColorStop(0.66, stops[2]);
      skyGrad.addColorStop(1, stops[3]);
    } else {
      skyGrad.addColorStop(0, stops[0]);
      if (stops[1]) skyGrad.addColorStop(0.5, stops[1]);
      if (stops[2]) skyGrad.addColorStop(1, stops[2]);
    }

    // Sudden heat pulse reaction overlays
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    if (this.explosionHeatPulse > 0.01) {
      ctx.fillStyle = `rgba(239, 68, 68, ${this.explosionHeatPulse * 0.18})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Render Auroras
    const showAuroras = sky === 'radioactive_aurora' || sky === 'void_purple' || backdrop === 'dimensional_void' || userSettings?.auroraRibbonsEnabled;
    if (showAuroras) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const aur of this.auroras) {
        ctx.beginPath();
        ctx.strokeStyle = aur.color;
        ctx.lineWidth = aur.lineWidth;
        const pts = 36;
        const step = width / pts;
        for (let x = 0; x <= pts; x++) {
          const px = x * step;
          const py = aur.yOffset + Math.sin(x * (step / aur.wavelength) + aur.t) * aur.amplitude;
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.shadowBlur = 20;
        ctx.shadowColor = aur.color;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Render Nebulae with custom shape styles and palettes
    const nebConfigDensity = userSettings?.nebulaDensity !== undefined ? userSettings.nebulaDensity : 4;
    const nebOpacityConfig = userSettings?.nebulaOpacity !== undefined ? userSettings.nebulaOpacity : 0.45;
    const nebScaleConfig = userSettings?.nebulaScale !== undefined ? userSettings.nebulaScale : 1.0;
    const nebShape = userSettings?.nebulaShapeStyle || 'soft_blobs';
    const nebPalette = userSettings?.nebulaColorPalette || 'indigo_violet';
    const nebBanding = userSettings?.nebulaBanding !== undefined ? userSettings.nebulaBanding : 0.0;
    const nebWispiness = userSettings?.nebulaWispiness !== undefined ? userSettings.nebulaWispiness : 0.0;
    
    if (backdrop === 'layered_nebula' || backdrop === 'crystal_clouds' || backdrop === 'dimensional_void' || nebOpacityConfig > 0.1) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const intensity = Math.max(0.12, nebOpacityConfig) * (1 + fever * 0.2) + (this.flareIntensity * 0.15);
      
      const renderLimit = Math.min(this.nebulas.length, nebConfigDensity);
      for (let i = 0; i < renderLimit; i++) {
        const neb = this.nebulas[i];
        let colorA = neb.colorA;
        
        switch (nebPalette) {
          case 'pink_magenta': colorA = 'rgba(236, 72, 153, 0.16)'; break;
          case 'cyan_blue': colorA = 'rgba(6, 182, 212, 0.18)'; break;
          case 'amber_red': colorA = 'rgba(245, 158, 11, 0.15)'; break;
          case 'emerald_teal': colorA = 'rgba(16, 185, 129, 0.15)'; break;
          case 'indigo_violet': colorA = 'rgba(139, 92, 246, 0.16)'; break;
          case 'toxic_lime': colorA = 'rgba(163, 230, 53, 0.16)'; break;
          case 'icy_white_blue': colorA = 'rgba(186, 230, 253, 0.18)'; break;
          case 'red_black': colorA = 'rgba(220, 38, 38, 0.14)'; break;
          case 'pastel_candy': colorA = 'rgba(244, 114, 182, 0.16)'; break;
          case 'solar_gold': colorA = 'rgba(234, 179, 8, 0.16)'; break;
          case 'blacklight_uv': colorA = 'rgba(168, 85, 247, 0.17)'; break;
          case 'rainbow': {
            const h = (i * 90 + this.ticks * 0.2) % 360;
            colorA = `hsla(${h}, 70%, 50%, 0.15)`;
            break;
          }
        }

        const sizeMultiplier = nebScaleConfig * (1 + Math.sin(neb.t) * 0.08);
        const radius = neb.radius * sizeMultiplier;
        
        ctx.globalAlpha = intensity;

        if (nebShape === 'ribbon_bands') {
          ctx.strokeStyle = colorA;
          ctx.lineWidth = 25 * nebScaleConfig;
          ctx.beginPath();
          ctx.moveTo(0, neb.y);
          ctx.bezierCurveTo(width * 0.3, neb.y - 40, width * 0.7, neb.y + 45, width, neb.y);
          ctx.stroke();
        } else if (nebShape === 'crystal_dust') {
          ctx.fillStyle = colorA;
          ctx.beginPath();
          ctx.moveTo(neb.x, neb.y - radius * 0.6);
          ctx.lineTo(neb.x + radius * 0.6, neb.y);
          ctx.lineTo(neb.x, neb.y + radius * 0.6);
          ctx.lineTo(neb.x - radius * 0.6, neb.y);
          ctx.closePath();
          ctx.fill();
        } else if (nebShape === 'spiral_cloud') {
          ctx.strokeStyle = colorA;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let rot = 0; rot < Math.PI * 3; rot += 0.2) {
            const dr = (rot / (Math.PI * 3)) * radius;
            const sx = neb.x + Math.cos(rot + this.ticks * 0.005) * dr;
            const sy = neb.y + Math.sin(rot + this.ticks * 0.005) * dr;
            if (rot === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        } else if (nebShape === 'vertical_aurora') {
          const gradC = ctx.createLinearGradient(neb.x - 40, 0, neb.x + 40, 0);
          gradC.addColorStop(0, 'rgba(0,0,0,0)');
          gradC.addColorStop(0.5, colorA);
          gradC.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradC;
          ctx.fillRect(neb.x - 70, 0, 140, height);
        } else {
          const radGrad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, radius);
          radGrad.addColorStop(0, colorA);
          radGrad.addColorStop(0.4, 'rgba(8, 5, 20, 0.03)');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = radGrad;
          ctx.fillRect(0, 0, width, height);
        }

        if (nebBanding > 0.01) {
          ctx.strokeStyle = colorA;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(neb.x, neb.y, radius * 0.72, radius * 0.2, 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 5. Render Black Hole Accumulator (Accretion disk system)
    const isBHActive = backdrop === 'black_hole' || userSettings?.blackHoleEnabled;
    if (isBHActive) {
      ctx.save();
      const bhScale = userSettings?.blackHoleScale || 1.0;
      const bhX = userSettings?.blackHolePosX !== undefined ? userSettings.blackHolePosX : width - 180;
      const bhY = userSettings?.blackHolePosY !== undefined ? userSettings.blackHolePosY : 170;
      const swirlRot = -this.ticks * 0.022;

      const dynamicBHScale = bhScale * (1 + this.flareIntensity * 0.1);
      const bhGlow = ctx.createRadialGradient(bhX, bhY, 20 * dynamicBHScale, bhX, bhY, 120 * dynamicBHScale);
      
      let accretionColorHex = '#fb923c';
      if (userSettings?.blackHoleColor === 'orange') accretionColorHex = '#f97316';
      else if (userSettings?.blackHoleColor === 'blue') accretionColorHex = '#06b6d4';
      else if (userSettings?.blackHoleColor === 'magenta') accretionColorHex = '#ec4899';
      else if (userSettings?.blackHoleColor === 'white') accretionColorHex = '#f3f4f6';
      else if (userSettings?.blackHoleColor === 'emerald') accretionColorHex = '#10b981';
      else if (userSettings?.blackHoleColor === 'red') accretionColorHex = '#ef4444';
      else if (userSettings?.blackHoleColor === 'rainbow') {
        const hc = (this.ticks * 1.5) % 360;
        accretionColorHex = `hsl(${hc}, 80%, 55%)`;
      }

      bhGlow.addColorStop(0, accretionColorHex + '66');
      bhGlow.addColorStop(0.32, 'rgba(124, 58, 237, 0.18)');
      bhGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bhGlow;
      ctx.shadowBlur = 30 * dynamicBHScale;
      ctx.shadowColor = accretionColorHex;
      ctx.beginPath();
      ctx.arc(bhX, bhY, 120 * dynamicBHScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = accretionColorHex;
      ctx.lineWidth = 1.6 * (userSettings?.blackHoleRingIntensity !== undefined ? userSettings.blackHoleRingIntensity : 1.0);
      ctx.globalAlpha = 0.5;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.ellipse(bhX, bhY, (24 + i * 16) * dynamicBHScale, (10 + i * 5) * dynamicBHScale, swirlRot + (i * 0.25), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * dynamicBHScale;
      ctx.beginPath();
      ctx.moveTo(bhX - 68 * dynamicBHScale, bhY - 6 * dynamicBHScale);
      ctx.quadraticCurveTo(bhX, bhY - 20 * dynamicBHScale, bhX + 68 * dynamicBHScale, bhY - 6 * dynamicBHScale);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bhX - 60 * dynamicBHScale, bhY + 6 * dynamicBHScale);
      ctx.quadraticCurveTo(bhX, bhY + 24 * dynamicBHScale, bhX + 60 * dynamicBHScale, bhY + 6 * dynamicBHScale);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(bhX, bhY, 22 * dynamicBHScale, 0, Math.PI * 2);
      ctx.fill();

      const pPull = userSettings?.blackHoleParticlePull !== undefined ? userSettings.blackHoleParticlePull : 8;
      if (pPull > 0) {
        ctx.fillStyle = accretionColorHex;
        ctx.globalAlpha = 0.8;
        for (let j = 0; j < pPull; j++) {
          const theta = (this.ticks * 0.04 + j * (Math.PI / 4)) % (Math.PI * 2);
          const r = (85 - (this.ticks * 0.52 + j * 18) % 65) * dynamicBHScale;
          const px = bhX + Math.cos(theta) * r;
          const py = bhY + Math.sin(theta) * (r * 0.35);
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 6. Draw Giant Planets & Suns (Customizer-friendly planetary renderer)
    const activePlanet = userSettings?.planetType || (backdrop === 'alien_planet' ? 'ringed_giant' : (backdrop === 'dying_sun' ? 'red_sun' : 'none'));
    if (activePlanet && activePlanet !== 'none') {
      const pScale = userSettings?.planetScale !== undefined ? userSettings.planetScale : 1.0;
      const pX = userSettings?.planetPosX !== undefined ? userSettings.planetPosX : 130;
      const pY = userSettings?.planetPosY !== undefined ? userSettings.planetPosY : 410;
      const pRings = userSettings?.planetOrbitRings || false;
      const pGlow = userSettings?.planetAtmosphereGlow !== undefined ? userSettings.planetAtmosphereGlow : 0.6;
      this.drawPlanetBody(ctx, activePlanet, pScale, pX, pY, pRings, pGlow, userSettings);
    }

    // Secondary planet system (smaller moons / binary suns)
    const secondaryPlanet = userSettings?.planetSecondaryType || 'none';
    if (secondaryPlanet && secondaryPlanet !== 'none') {
      const p2Scale = userSettings?.planetSecondaryScale !== undefined ? userSettings.planetSecondaryScale : 0.5;
      const p2X = userSettings?.planetSecondaryPosX !== undefined ? userSettings.planetSecondaryPosX : width - 110;
      const p2Y = userSettings?.planetSecondaryPosY !== undefined ? userSettings.planetSecondaryPosY : 290;
      const p2Rings = userSettings?.planetSecondaryOrbitRings || false;
      const p2Glow = userSettings?.planetSecondaryAtmosphereGlow !== undefined ? userSettings.planetSecondaryAtmosphereGlow : 0.3;
      this.drawPlanetBody(ctx, secondaryPlanet, p2Scale, p2X, p2Y, p2Rings, p2Glow, userSettings);
    }

    // 7. Render Landscape / Parallax Ground Terrain (sits behind gameplay)
    const tType = userSettings?.terrainType || 'none';
    if (tType && tType !== 'none') {
      this.drawBackgroundTerrain(ctx, width, height, tType, theme, userSettings);
    }

    // 8. Background Silhouettes / Orbital Stations Structures
    const selectStruct = userSettings?.structureType || (backdrop === 'space_station' ? 'orbital_ring' : 'none');
    if (selectStruct && selectStruct !== 'none') {
      const structOpacity = userSettings?.structureOpacity !== undefined ? userSettings.structureOpacity : 0.8;
      this.drawStructuresBackground(ctx, width, height, selectStruct, structOpacity, userSettings);
    }

    // 9. Render Asteroids Starfield layer
    const asteroidEnabled = userSettings?.asteroidBeltEnabled || backdrop === 'crystal_clouds';
    if (asteroidEnabled) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme?.bgPrimary || '#050716';
      ctx.strokeStyle = theme?.particleA || '#ffffff';
      ctx.lineWidth = 1.0;

      const viewLimit = Math.min(this.asteroids.length, userSettings?.asteroidCount !== undefined ? userSettings.asteroidCount : 10);
      for (let i = 0; i < viewLimit; i++) {
        const ast = this.asteroids[i];
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rot);

        ctx.beginPath();
        ctx.moveTo(ast.points[0].x, ast.points[0].y);
        for (let p = 1; p < ast.points.length; p++) {
          ctx.lineTo(ast.points[p].x, ast.points[p].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();
    }

    // 10. Render Parallax Starfields
    const designStarsMul = userSettings?.starDensity !== undefined ? (userSettings.starDensity / 150) : 1.0;
    const twinkMultiplier = userSettings?.starTwinkleSpeed !== undefined ? userSettings.starTwinkleSpeed : 1.0;
    const isMeteorsOn = userSettings?.shootingStarsEnabled !== undefined ? userSettings.shootingStarsEnabled : true;
    
    const limitedStarsCount = Math.floor(this.stars.length * designStarsMul);
    for (let sIndex = 0; sIndex < Math.min(this.stars.length, limitedStarsCount); sIndex++) {
      const star = this.stars[sIndex];
      star.t += star.twinkleSpeed * (1 + fever * 0.3) * twinkMultiplier;
      const alpha = (Math.sin(star.t) + 1) / 2;

      ctx.globalAlpha = (star.layer === 1 ? 0.35 : star.layer === 2 ? 0.62 : 0.88) * (alpha * 0.65 + 0.35);

      // Parallax layout offsets with customizable direction drift
      const starDir = userSettings?.starDirection || 'left';
      let dirDx = 0;
      let dirDy = 0;
      const driftSpeed = 0.08 * this.ticks;
      
      if (starDir === 'left') {
        dirDx = -driftSpeed;
      } else if (starDir === 'right') {
        dirDx = driftSpeed;
      } else if (starDir === 'up') {
        dirDy = -driftSpeed;
      } else if (starDir === 'down') {
        dirDy = driftSpeed;
      }

      let sx = star.x - (this.scrollX * star.speedMultiplier) + (dirDx * star.speedMultiplier);
      sx = ((sx % width) + width) % width;
      let sy = star.y + (this.scrollY * star.speedMultiplier) + (dirDy * star.speedMultiplier);
      sy = ((sy % height) + height) % height;

      // Custom Star palette recoloring option
      let starCol = star.color;
      if (userSettings?.starColorPalette === 'neon') {
        const neons = ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#a855f7'];
        starCol = neons[sIndex % neons.length];
      } else if (userSettings?.starColorPalette === 'pastel') {
        const pastels = ['#bae6fd', '#fbcfe8', '#ccfbf1', '#fef3c7', '#ddd6fe'];
        starCol = pastels[sIndex % pastels.length];
      } else if (userSettings?.starColorPalette === 'white') {
        starCol = '#ffffff';
      } else if (userSettings?.starColorPalette === 'multicolor') {
        const multis = ['#00ffff', '#ec4899', '#fbbf24', '#ffffff', '#10b981'];
        starCol = multis[sIndex % multis.length];
      }

      if (warp > 0.05 && star.layer === 3) {
        // High Speed Warp Streaking
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1.0, warp * 1.5);
        ctx.fillRect(sx, sy, 2.2, 32 * warp);

        ctx.fillStyle = theme?.particleA || '#00ffff';
        ctx.globalAlpha = warp * 0.33;
        ctx.fillRect(sx - 0.5, sy, 3.2, 60 * warp);
      } else if (star.size > 1.35 && alpha > 0.6) {
        // Glowing bright cross star
        ctx.fillStyle = starCol;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (alpha > 0.75 && star.layer === 3) {
          ctx.strokeStyle = starCol;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(sx - 4.5, sy); ctx.lineTo(sx + 4.5, sy);
          ctx.moveTo(sx, sy - 4.5); ctx.lineTo(sx, sy + 4.5);
          ctx.stroke();
        }
      } else {
        // Standard pin stars
        ctx.fillStyle = starCol;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 11. Shooting meteor streaks
    if (isMeteorsOn) {
      ctx.save();
      for (const m of this.meteors) {
        if (!m.active) continue;

        const mStyle = userSettings?.meteorStyle || 'streak';
        const isRainbow = userSettings?.meteorColorPalette === 'rainbow';
        const baseColor = isRainbow ? `hsl(${(this.ticks * 5) % 360}, 100%, 70%)` : m.color;

        ctx.globalAlpha = 1.0;

        if (mStyle === 'comet') {
          // Glow head
          const headRad = Math.max(3.5, m.thickness * 1.35);
          const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, headRad * 2.5);
          headGlow.addColorStop(0, '#ffffff');
          headGlow.addColorStop(0.3, baseColor);
          headGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = headGlow;
          ctx.beginPath();
          ctx.arc(m.x, m.y, headRad * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Long elegant tail
          const metGrad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.length * 0.22, m.y - m.vy * m.length * 0.22);
          metGrad.addColorStop(0, '#ffffff');
          metGrad.addColorStop(0.2, baseColor);
          metGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.strokeStyle = metGrad;
          ctx.lineWidth = m.thickness;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x + m.vx * m.length * 0.45, m.y + m.vy * m.length * 0.45);
          ctx.stroke();

          // Tiny tail sparks
          ctx.fillStyle = baseColor;
          for (let i = 0; i < 3; i++) {
            const dist = Math.random() * 30 + 10;
            const sx = m.x + m.vx * dist * 0.15 + (Math.random() - 0.5) * 4;
            const sy = m.y + m.vy * dist * 0.15 + (Math.random() - 0.5) * 4;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.random() * 1.2 + 0.4, 0, Math.PI * 2);
            ctx.fill();
          }

        } else if (mStyle === 'fireball') {
          const headRad = Math.max(4.0, m.thickness * 1.5);
          
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f97316';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(m.x, m.y, headRad, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(m.x + m.vx * 1.2, m.y + m.vy * 1.2, headRad * 0.75, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(m.x, m.y, headRad * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          const metGrad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.length * 0.15, m.y - m.vy * m.length * 0.15);
          metGrad.addColorStop(0, '#facc15');
          metGrad.addColorStop(0.3, '#f97316');
          metGrad.addColorStop(0.7, '#ef4444');
          metGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.strokeStyle = metGrad;
          ctx.lineWidth = m.thickness + 1.8;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x + m.vx * m.length * 0.35, m.y + m.vy * m.length * 0.35);
          ctx.stroke();

        } else if (mStyle === 'plasma_blast') {
          const thickness = m.thickness + 1.2;
          const px1 = m.x;
          const py1 = m.y;
          const px2 = m.x + m.vx * m.length * 0.2;
          const py2 = m.y + m.vy * m.length * 0.2;

          ctx.shadowBlur = 12;
          ctx.shadowColor = '#d946ef';

          ctx.strokeStyle = '#d946ef';
          ctx.lineWidth = thickness + 2.5;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();

          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = thickness;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, thickness * 0.35);
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();

          ctx.shadowBlur = 0;

        } else {
          // Streak
          const metGrad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.length * 0.18, m.y - m.vy * m.length * 0.18);
          metGrad.addColorStop(0, '#ffffff');
          metGrad.addColorStop(0.32, baseColor);
          metGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.strokeStyle = metGrad;
          ctx.lineWidth = m.thickness;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x + m.vx * m.length * 0.32, m.y + m.vy * m.length * 0.32);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 12. Render Fog/Haze bottom layer
    if (userSettings?.fogEnabled) {
      ctx.save();
      const fOpacity = userSettings.fogOpacity !== undefined ? userSettings.fogOpacity : 0.3;
      const fHeight = userSettings.fogHeight !== undefined ? userSettings.fogHeight : 100;
      const fColor = userSettings.fogColor || '#0a0d24';
      const fGrad = ctx.createLinearGradient(0, height - fHeight, 0, height);
      fGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fGrad.addColorStop(1, fColor);
      ctx.globalAlpha = fOpacity;
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, height - fHeight, width, fHeight);
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Planet helper method for crisp modular rendering
  drawPlanetBody(ctx: CanvasRenderingContext2D, type: string, scale: number, x: number, y: number, rings: boolean, glow: number, userSettings?: any) {
    ctx.save();
    const pR = 75 * scale;
    
    // Draw Atmosphere Glow
    if (glow > 0.05) {
      let glowColor = 'rgba(6, 182, 212, 0.4)';
      if (type === 'crater_moon' || type === 'shattered_moon') glowColor = 'rgba(156, 163, 175, 0.2)';
      else if (type === 'toxic_world') glowColor = 'rgba(132, 204, 22, 0.3)';
      else if (type === 'ice_world') glowColor = 'rgba(14, 165, 233, 0.35)';
      else if (type === 'lava_planet') glowColor = 'rgba(239, 68, 68, 0.4)';
      else if (type === 'cyber_grid') glowColor = 'rgba(236, 72, 153, 0.35)';
      else if (type === 'neutron_star') glowColor = 'rgba(168, 85, 247, 0.6)';

      const pg = ctx.createRadialGradient(x, y, pR - 6, x, y, pR + 25);
      pg.addColorStop(0, glowColor);
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg;
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(x, y, pR + 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    if (type === 'red_sun' || type === 'eclipse' || type === 'pulsar' || type === 'neutron_star') {
      const isEclipse = type === 'eclipse';
      const isPulsar = type === 'pulsar';
      const isNeutron = type === 'neutron_star';
      
      const sunRadius = pR * 2.2 + Math.sin(this.ticks * 0.015) * 8;
      const sunGrad = ctx.createRadialGradient(x, y, sunRadius * 0.3, x, y, sunRadius);
      
      if (isEclipse) {
        sunGrad.addColorStop(0, '#02000d');
        sunGrad.addColorStop(0.2, '#110303');
        sunGrad.addColorStop(0.55, '#ef4444');
      } else if (isPulsar) {
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.3, '#38bdf8');
        sunGrad.addColorStop(0.7, '#8b5cf6');
      } else if (isNeutron) {
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.4, '#c084fc');
        sunGrad.addColorStop(0.8, '#4f46e5');
      } else {
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.2, '#ff9900');
        sunGrad.addColorStop(0.55, '#ef4444');
      }
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(x, y, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      if (isEclipse) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(x, y, pR * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#010103';
        ctx.beginPath();
        ctx.arc(x, y, pR * 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (isPulsar) {
        // Double diagonal energy beams emanating out
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        ctx.beginPath();
        ctx.moveTo(x - sunRadius * 1.5, y - sunRadius * 0.8);
        ctx.lineTo(x + sunRadius * 1.5, y + sunRadius * 0.8);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      return;
    }

    // Render other sphere bodies
    ctx.beginPath();
    ctx.arc(x, y, pR, 0, Math.PI * 2);
    ctx.clip();

    let c1 = '#06b6d4';
    let c2 = '#0f172a';

    if (type === 'crater_moon') {
      c1 = '#9ca3af'; c2 = '#111827';
    } else if (type === 'toxic_world') {
      c1 = '#84cc16'; c2 = '#022c22';
    } else if (type === 'ice_world') {
      c1 = '#38bdf8'; c2 = '#0f172a';
    } else if (type === 'lava_planet') {
      c1 = '#dc2626'; c2 = '#020205';
    } else if (type === 'cyber_grid') {
      c1 = '#ec4899'; c2 = '#310015';
    } else if (type === 'shattered_moon') {
      c1 = '#7c2d12'; c2 = '#0c0402';
    }

    const spaceGrad = ctx.createLinearGradient(x - pR, y, x + pR, y);
    spaceGrad.addColorStop(0, c1);
    spaceGrad.addColorStop(1, c2);
    ctx.fillStyle = spaceGrad;
    ctx.beginPath();
    ctx.arc(x, y, pR, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'ringed_giant' || type === 'jupiter_gas') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4 * scale;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(x, y + i * 16 * scale, pR * 0.95, pR * 0.2, 0.08, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (type === 'crater_moon') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.arc(x - 20 * scale, y - 20 * scale, 14 * scale, 0, Math.PI * 2);
      ctx.arc(x + 22 * scale, y + 10 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.arc(x - 10 * scale, y + 32 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'lava_planet') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x - pR, y - 15 * scale);
      ctx.lineTo(x + pR, y + 15 * scale);
      ctx.moveTo(x, y - pR * 0.6);
      ctx.lineTo(x - 10 * scale, y + pR * 0.5);
      ctx.stroke();
    } else if (type === 'cyber_grid') {
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = -pR; g <= pR; g += 15 * scale) {
        ctx.moveTo(x + g, y - pR);
        ctx.lineTo(x + g * 0.8, y + pR);
        ctx.moveTo(x - pR, y + g);
        ctx.lineTo(x + pR, y + g);
      }
      ctx.stroke();
    } else if (type === 'shattered_moon') {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(x - pR * 0.5, y - pR * 0.8);
      ctx.lineTo(x + pR * 0.3, y - pR * 0.1);
      ctx.lineTo(x - pR * 0.1, y + pR * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    const terminatorG = ctx.createRadialGradient(x + pR * 0.6, y - pR * 0.5, pR * 0.1, x, y, pR * 1.15);
    terminatorG.addColorStop(0, 'rgba(0,0,0,0)');
    terminatorG.addColorStop(0.7, 'rgba(2, 1, 10, 0.75)');
    terminatorG.addColorStop(1, 'rgba(2, 1, 10, 0.96)');
    ctx.fillStyle = terminatorG;
    ctx.beginPath();
    ctx.arc(x, y, pR + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (rings || type === 'ringed_giant') {
      ctx.save();
      ctx.strokeStyle = type === 'toxic_world' ? 'rgba(132, 204, 22, 0.28)' : 'rgba(6, 182, 212, 0.28)';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.ellipse(x, y, pR * 1.62, pR * 0.32, -0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Draw Background Parallax Landscape of mountain shapes/lava dunes
  drawBackgroundTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, type: string, theme: any, userSettings?: any) {
    ctx.save();
    const layerCount = userSettings?.terrainLayers !== undefined ? userSettings.terrainLayers : 2;
    const opacityMult = userSettings?.terrainOpacity !== undefined ? userSettings.terrainOpacity : 0.8;
    const scrollDepth = userSettings?.terrainParallax !== undefined ? userSettings.terrainParallax : 0.4;
    
    const colors: Record<string, [string, string, string]> = {
      'distant_mountains': ['#111c30', '#0a0d17', '#38bdf8'],
      'alien_mountains': ['#1e1b4b', '#030712', '#ec4899'],
      'crater_hills': ['#1f2937', '#111827', '#9ca3af'],
      'desert_dunes': ['#78350f', '#451a03', '#f59e0b'],
      'volcanic_ridges': ['#450a0a', '#180202', '#ef4444'],
      'frozen_peaks': ['#1e3a8a', '#172554', '#60a5fa'],
      'crystal_spikes': ['#3b0764', '#120024', '#d946ef'],
      'toxic_swamp_canopy': ['#14532d', '#052e16', '#a3e635'],
      'alien_forest': ['#0f766e', '#0d5c56', '#2dd4bf'],
      'moonbase_horizon': ['#4b5563', '#1e293b', '#e5e7eb'],
      'city_rooftops': ['#080a15', '#020308', '#22d3ee'],
      'ruined_temple_ridge': ['#2a2b2e', '#131415', '#cbd5e1'],
      'biomechanical_ribs': ['#280315', '#0a0005', '#f43f5e'],
      'coral_reefs': ['#155e75', '#083344', '#06b6d4'],
      'industrial_pipes': ['#1e293b', '#0f172a', '#94a3b8'],
      'station_gantry': ['#0f172a', '#020617', '#eab308'],
      'asteroid_surface': ['#1e1e24', '#0a0a0c', '#c084fc'],
      'black_lava_ridges': ['#180302', '#050000', '#f97316'],
      'rolling_neon_hills': ['#1c043d', '#0a0024', '#f43f5e']
    };
    
    // Quick compatibility mapper
    const mapType = (t: string): string => {
      if (t === 'scifi_mountains') return 'distant_mountains';
      if (t === 'crystal_peaks') return 'frozen_peaks';
      if (t === 'sandy_dunes') return 'desert_dunes';
      if (t === 'lava_ridges') return 'volcanic_ridges';
      if (t === 'rocky_crater') return 'crater_hills';
      return t;
    };

    const targetType = mapType(type);
    const lookup = colors[targetType as keyof typeof colors] || ['#111224', '#04050e', '#38bdf8'];
    
    for (let layer = 1; layer <= layerCount; layer++) {
      ctx.fillStyle = layer === 1 ? lookup[0] : lookup[1];
      ctx.globalAlpha = (layer === 1 ? 0.35 : layer === 2 ? 0.65 : 0.88) * opacityMult;
      
      const speed = scrollDepth * (layer === 1 ? 0.4 : layer === 2 ? 1.0 : 1.4);
      const tX = - (this.scrollX * speed * 0.8) % width;
      
      ctx.beginPath();
      ctx.moveTo(0, height);

      const horizonY = height - 120 + layer * 32;

      if (targetType === 'crystal_spikes') {
        const spacing = 45;
        ctx.lineTo(-50, height);
        for (let sx = -100; sx <= width + 150; sx += spacing) {
          const globalX = sx - tX;
          const spikeH = 70 + layer * 30 + Math.sin(globalX * 0.05 + layer) * 55 * Math.sin(globalX * 0.005);
          ctx.lineTo(globalX, horizonY);
          ctx.lineTo(globalX + spacing * 0.5, horizonY - spikeH);
          ctx.lineTo(globalX + spacing, horizonY);
        }
      } else if (targetType === 'city_rooftops') {
        const blockW = 60 + layer * 18;
        ctx.lineTo(-100, height);
        for (let sx = -150; sx <= width + 200; sx += blockW) {
          const globalX = sx - tX;
          const buildH = 65 + layer * 28 + Math.sin(globalX * 0.015) * 35;
          ctx.lineTo(globalX, horizonY);
          ctx.lineTo(globalX, horizonY - buildH);
          ctx.lineTo(globalX + blockW - 4, horizonY - buildH);
          ctx.lineTo(globalX + blockW - 4, horizonY);
        }
      } else if (targetType === 'industrial_pipes') {
        // Render network matrices
        ctx.fillRect(0, horizonY - 45, width, 18); // horizontal core pipe
        ctx.fillStyle = lookup[2] + '33';
        for (let px = 60; px < width + 100; px += 140) {
          const globalX = px - tX;
          ctx.fillRect(globalX - 8, horizonY - 75, 16, 60); // vertical pipe couplers
        }
        ctx.fillStyle = layer === 1 ? lookup[0] : lookup[1];
        ctx.fillRect(0, horizonY - 10, width, 250);
      } else if (targetType === 'station_gantry') {
        ctx.fillRect(0, horizonY - 20, width, 14);
        ctx.strokeStyle = lookup[2];
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let bx = -100; bx < width + 100; bx += 25) {
          const globalX = bx - tX;
          ctx.moveTo(globalX, horizonY - 20);
          ctx.lineTo(globalX + 12.5, horizonY - 6);
          ctx.lineTo(globalX + 25, horizonY - 20);
        }
        ctx.stroke();
        ctx.fillStyle = layer === 1 ? lookup[0] : lookup[1];
        ctx.fillRect(0, horizonY - 6, width, 250);
      } else if (targetType === 'alien_forest' || targetType === 'toxic_swamp_canopy') {
        const trunkW = 12 + layer * 6;
        ctx.lineTo(-50, height);
        for (let sx = -100; sx <= width + 150; sx += 70) {
          const globalX = sx - tX;
          const treeH = 75 + layer * 25 + Math.sin(globalX * 0.03) * 20;
          const bulbX = globalX + 35;
          // draw trunk
          ctx.fillRect(bulbX - trunkW / 2, horizonY - treeH, trunkW, treeH);
          // draw organic circular canopies
          ctx.beginPath();
          ctx.arc(bulbX, horizonY - treeH, trunkW * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (targetType === 'ruined_temple_ridge') {
        const colW = 16 + layer * 8;
        ctx.lineTo(-50, height);
        for (let sx = -100; sx <= width + 150; sx += 110) {
          const globalX = sx - tX;
          const pillarH = 50 + layer * 25 + Math.sin(globalX * 0.02) * 35;
          ctx.lineTo(globalX, horizonY);
          // Draw broken classical column pillars
          ctx.fillRect(globalX, horizonY - pillarH, colW, pillarH);
          if (Math.sin(globalX * 0.1) > 0.1) {
            ctx.fillRect(globalX - 6, horizonY - pillarH - 8, colW + 12, 8); // capitals
          }
        }
      } else if (targetType === 'biomechanical_ribs') {
        ctx.lineTo(-50, height);
        for (let sx = -100; sx <= width + 150; sx += 80) {
          const globalX = sx - tX;
          const ribH = 50 + layer * 30 + Math.cos(globalX * 0.02) * 20;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(globalX, horizonY, ribH * 0.4, ribH, 0.2, Math.PI * 1.1, Math.PI * 1.9);
          ctx.strokeStyle = layer === 1 ? lookup[0] : lookup[1];
          ctx.lineWidth = 10 - layer * 2;
          ctx.stroke();
          ctx.restore();
        }
      } else if (targetType === 'coral_reefs') {
        ctx.lineTo(-50, height);
        for (let sx = -100; sx <= width + 150; sx += 55) {
          const globalX = sx - tX;
          const coralH = 45 + layer * 22 + Math.cos(globalX * 0.04) * 20;
          ctx.lineTo(globalX, horizonY);
          ctx.lineTo(globalX, horizonY - coralH);
          ctx.lineTo(globalX + 12, horizonY - coralH - 10); // branch
          ctx.lineTo(globalX + 12, horizonY - coralH);
          ctx.lineTo(globalX + 24, horizonY - coralH + 8);
          ctx.lineTo(globalX + 24, horizonY);
        }
      } else {
        // Mountain varieties / Sand dunes / Lunar dust horizons
        ctx.lineTo(-100, height);
        for (let sx = -150; sx <= width + 200; sx += 30) {
          const globalX = sx - tX;
          let groundY = horizonY;
          
          if (targetType === 'desert_dunes' || targetType === 'rolling_neon_hills') {
            // Broad smooth wind-swept sand/grid arcs
            groundY += Math.sin(globalX * 0.008 + layer) * 45;
          } else if (targetType === 'volcanic_ridges' || targetType === 'black_lava_ridges') {
            groundY += Math.cos(globalX * 0.016) * 50 + Math.sin(globalX * 0.05) * 16;
          } else if (targetType === 'crater_hills' || targetType === 'moonbase_horizon') {
            // Lunar rolling humps with craters
            groundY += Math.sin(globalX * 0.007 + layer) * 28 + (Math.cos(globalX * 0.035) > 0.75 ? 18 : 0);
          } else {
            // Standard scifi cliffs
            groundY += Math.sin(globalX * 0.012 + layer) * 40 + Math.cos(globalX * 0.035) * 12;
          }
          ctx.lineTo(globalX, groundY);
        }
      }
      ctx.lineTo(width + 100, height);
      ctx.closePath();
      ctx.fill();

      // Top highlighted glowing neon border
      if (layer === layerCount && lookup[2]) {
        ctx.strokeStyle = lookup[2];
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = 0.65 * opacityMult;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw Structures overlay helper
  drawStructuresBackground(ctx: CanvasRenderingContext2D, width: number, height: number, type: string, opacity: number, userSettings?: any) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#060913';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1.25;

    // Apply soft horizontal parallax drift so structures float cinematic style
    const sdX = - (this.scrollX * 0.08) % (width + 300);
    const ssX = width * 0.45 + sdX;
    const ssY = 145;

    if (type === 'orbital_ring') {
      ctx.fillRect(ssX - 95, ssY - 12, 60, 24);
      ctx.fillRect(ssX + 35, ssY - 12, 60, 24);
      ctx.beginPath();
      for (let gx = ssX - 95; gx <= ssX - 35; gx += 12) {
        ctx.moveTo(gx, ssY - 12); ctx.lineTo(gx, ssY + 12);
      }
      for (let gx = ssX + 35; gx <= ssX + 95; gx += 12) {
        ctx.moveTo(gx, ssY - 12); ctx.lineTo(gx, ssY + 12);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(ssX - 30, ssY - 4, 60, 8);
      ctx.rect(ssX - 8, ssY - 24, 16, 48);
      ctx.arc(ssX, ssY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (this.ticks % 28 < 14) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ssX - 90, ssY, 3.0, 0, Math.PI * 2);
        ctx.arc(ssX + 90, ssY, 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'city_skyline') {
      ctx.beginPath();
      for (let sx = 0; sx < width; sx += 35) {
        const h = 40 + Math.sin(sx * 0.05 + 1.2) * 25 + Math.cos(sx * 0.1) * 10;
        ctx.rect(sx, height - h, 30, h);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.3;
      for (let sx = 10; sx < width; sx += 35) {
        const wh = 20 + Math.sin(sx * 0.05 + 1.2) * 20;
        if (wh > 10) {
          ctx.fillRect(sx, height - wh, 6, 6);
          ctx.fillRect(sx + 10, height - wh + 8, 6, 6);
        }
      }
    } else if (type === 'antenna_array') {
      const ax = ssX + 120;
      const ay = height - 160;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 160);
      ctx.lineTo(ax - 20, ay + 160);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax + 20, ay + 160);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ax, ay, 20, 0, Math.PI, true);
      ctx.stroke();

      if (this.ticks % 20 < 10) {
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(ax, ay - 8, 4.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'monoliths') {
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#a21caf';
      ctx.lineWidth = 1.5;
      const pillars = [ssX - 120, ssX, ssX + 120];
      for (const px of pillars) {
        ctx.beginPath();
        ctx.rect(px - 15, height - 200, 30, 200);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.fillRect(px - 2.0, height - 160, 4.0, 160);
      }
    } else if (type === 'space_elevator') {
      const ex = ssX - 80;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(ex - 4, 0);
      ctx.lineTo(ex - 4, height);
      ctx.moveTo(ex + 4, 0);
      ctx.lineTo(ex + 4, height);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      for (let ty = 0; ty < height; ty += 20) {
        ctx.moveTo(ex - 4, ty);
        ctx.lineTo(ex + 4, ty + 10);
      }
      ctx.stroke();

      ctx.fillStyle = '#030712';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.0;
      const carY = (this.ticks * 0.4) % height;
      ctx.beginPath();
      ctx.rect(ex - 12, carY - 14, 24, 28);
      ctx.fill();
      ctx.stroke();

    } else if (type === 'alien_city') {
      // Curved spires, bio-domes, glowing gold accents
      ctx.fillStyle = '#030712';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      
      const spires = [ssX - 140, ssX - 60, ssX, ssX + 80];
      for (const sx of spires) {
        ctx.beginPath();
        ctx.moveTo(sx - 15, height);
        ctx.quadraticCurveTo(sx, height - 120, sx, height - 220); // tall curved horn spire
        ctx.quadraticCurveTo(sx + 8, height - 120, sx + 25, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Warning orbs
        if (this.ticks % 30 < 15) {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(sx, height - 215, 3.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 'neon_city') {
      // blocky staggered outline grids
      ctx.strokeStyle = '#d946ef';
      ctx.fillStyle = '#02000a';
      ctx.lineWidth = 2.0;
      
      const positions = [ssX - 150, ssX - 100, ssX - 40, ssX + 20, ssX + 80];
      positions.forEach((x, i) => {
        const bH = 100 + (i % 3) * 45;
        const bW = 55;
        ctx.fillRect(x, height - bH, bW, bH);
        ctx.strokeRect(x, height - bH, bW, bH);

        // draw neon windows
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(x + 10, height - bH + 20, bW - 20, bH - 40);
      });
    } else if (type === 'moonbase_domes') {
      // spheroid moonbase domes
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.75;
      
      const domeX = ssX;
      const domeY = height - 25;
      ctx.beginPath();
      ctx.arc(domeX, domeY, 55, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inside research tower
      ctx.fillStyle = '#030712';
      ctx.fillRect(domeX - 10, domeY - 45, 20, 45);
      ctx.strokeRect(domeX - 10, domeY - 45, 20, 45);
    } else if (type === 'orbital_shipyard') {
      // crossed scaffold framing, yellow guidelines, sparks flaring
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(ssX - 120, ssY - 60, 240, 120);
      // truss crossing lines
      for (let tx = ssX - 120; tx < ssX + 120; tx += 40) {
        ctx.moveTo(tx, ssY - 60); ctx.lineTo(tx + 40, ssY + 60);
        ctx.moveTo(tx + 40, ssY - 60); ctx.lineTo(tx, ssY + 60);
      }
      ctx.stroke();

      // simulated laser welding sparks
      if (this.ticks % 14 < 6) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const rx = ssX - 80 + (this.ticks % 3) * 60;
        ctx.arc(rx, ssY - 20, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (type === 'derelict_ship') {
      // massive shattered space military cruiser parts floating
      ctx.fillStyle = '#0b0f19';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      
      ctx.save();
      ctx.translate(ssX, ssY);
      // Fragment 1 (Front nose)
      ctx.beginPath();
      ctx.moveTo(-110, -10);
      ctx.lineTo(-40, -35);
      ctx.lineTo(-35, 15);
      ctx.lineTo(-100, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fragment 2 (Engines block)
      ctx.beginPath();
      ctx.moveTo(10, -30);
      ctx.lineTo(90, -45);
      ctx.lineTo(105, 30);
      ctx.lineTo(20, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Emergency flashing warning beacons
      if (this.ticks % 36 < 14) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(85, -20, 3.5, 0, Math.PI * 2);
        ctx.arc(-80, 5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (type === 'satellite_swarm') {
      // panel antennas and blue panels
      ctx.save();
      ctx.translate(ssX, ssY);
      const swarm = [
        { x: -100, y: -40, size: 12 },
        { x: 30, y: -50, size: 14 },
        { x: 110, y: 30, size: 10 }
      ];
      swarm.forEach((sat) => {
        // Core ball
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, sat.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Solar panels left/right
        ctx.fillStyle = '#172554';
        ctx.fillRect(sat.x - sat.size * 1.5, sat.y - sat.size * 0.25, sat.size, sat.size * 0.5);
        ctx.fillRect(sat.x + sat.size * 0.5, sat.y - sat.size * 0.25, sat.size, sat.size * 0.5);
        ctx.strokeRect(sat.x - sat.size * 1.5, sat.y - sat.size * 0.25, sat.size, sat.size * 0.5);
        ctx.strokeRect(sat.x + sat.size * 0.5, sat.y - sat.size * 0.25, sat.size, sat.size * 0.5);
      });
      ctx.restore();
    } else if (type === 'refinery_towers') {
      // industrial fuming silos
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      
      const towers = [ssX - 80, ssX, ssX + 80];
      towers.forEach((tx) => {
        // cylindrical cooling towers
        ctx.beginPath();
        ctx.moveTo(tx - 22, height);
        ctx.lineTo(tx - 15, height - 140);
        ctx.lineTo(tx + 15, height - 140);
        ctx.lineTo(tx + 22, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // heating core flare
        ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
        ctx.fillRect(tx - 10, height - 60, 20, 50);
      });
    } else if (type === 'giant_radio_dishes') {
      const rx = ssX;
      const ry = height - 150;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.75;

      ctx.beginPath();
      ctx.moveTo(rx - 30, height);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + 30, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rx, ry, 45, Math.PI, 0, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx, ry - 55); // center feed receiver mast
      ctx.stroke();
    } else if (type === 'crystal_city') {
      ctx.fillStyle = 'rgba(217, 70, 239, 0.15)';
      ctx.strokeStyle = '#a21caf';
      ctx.lineWidth = 2.0;

      const crystalsX = [ssX - 100, ssX, ssX + 100];
      crystalsX.forEach((cx, step) => {
        const crdH = 120 + step * 40;
        ctx.beginPath();
        ctx.moveTo(cx, height);
        ctx.lineTo(cx - 24, height - crdH * 0.6);
        ctx.lineTo(cx, height - crdH);
        ctx.lineTo(cx + 24, height - crdH * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    } else if (type === 'ruined_temple') {
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1.5;

      const pillarX = [ssX - 130, ssX - 30, ssX + 70];
      pillarX.forEach((px) => {
        // standing pillars with column cracks
        ctx.fillRect(px, height - 210, 25, 210);
        ctx.strokeRect(px, height - 210, 25, 210);
        // broken rubble pediment pieces
        ctx.fillRect(px - 15, height - 25, 12, 10);
      });
    } else if (type === 'biomechanical_hive') {
      ctx.fillStyle = '#1c0116';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.75;

      const hiveX = ssX;
      const hiveY = height - 170;
      // organic shell cocoon dome
      ctx.beginPath();
      ctx.ellipse(hiveX, height - 25, 70, 140, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // glowing pores
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(hiveX, hiveY + 30, 8.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'power_pylons') {
      const px = ssX;
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.75;

      ctx.beginPath();
      ctx.moveTo(px - 25, height);
      ctx.lineTo(px, height - 240);
      ctx.lineTo(px + 25, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, height - 240, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // power electric laser arc spark
      if (this.ticks % 20 < 10) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#c084fc';
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px, height - 240);
        ctx.lineTo(px - 45 + Math.random() * 90, height - 200 - Math.random() * 80);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else if (type === 'ancient_gateway') {
      const gx = ssX;
      const gy = height - 160;
      ctx.fillStyle = '#020205';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3.0;

      // floating cosmic gateway portal
      ctx.beginPath();
      ctx.rect(gx - 60, height - 240, 120, 220);
      ctx.fill();
      ctx.stroke();

      // Concentric portals ripples
      ctx.fillStyle = 'rgba(236,72,153,0.12)';
      ctx.beginPath();
      ctx.ellipse(gx, height - 130, 40, 80, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'station_scaffold') {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.25;
      
      ctx.beginPath();
      ctx.rect(ssX - 110, height - 210, 220, 200);
      for (let sx = ssX - 110; sx < ssX + 110; sx += 44) {
        ctx.moveTo(sx, height - 210);
        ctx.lineTo(sx + 44, height);
      }
      ctx.stroke();
    } else if (type === 'ring_station') {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.0;
      ctx.fillStyle = '#090d16';

      ctx.beginPath();
      ctx.arc(ssX, ssY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ssX, ssY, 40, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'mining_rig') {
      const rx = ssX;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.75;

      ctx.fillRect(rx - 60, height - 160, 120, 135);
      ctx.strokeRect(rx - 60, height - 160, 120, 135);
      
      // Exhaust flame chimney
      ctx.fillStyle = '#f97316';
      ctx.fillRect(rx - 8, height - 190, 16, 30);
    } else if (type === 'alien_bridge') {
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(0, height - 180);
      ctx.bezierCurveTo(width * 0.3, height - 100, width * 0.7, height - 100, width, height - 180);
      ctx.stroke();
    } else if (type === 'floating_citadels') {
      ctx.fillStyle = '#181b22';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(ssX - 70, height - 140);
      ctx.lineTo(ssX + 70, height - 140);
      ctx.lineTo(ssX, height - 40); // floating chunk base
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillRect(ssX - 35, height - 190, 70, 50); // castle tower
    } else if (type === 'underwater_domes') {
      ctx.fillStyle = 'rgba(14, 116, 144, 0.15)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.arc(ssX, height - 45, 80, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'giant_pipes') {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.8;

      ctx.fillRect(0, height - 160, width, 40);
      ctx.strokeRect(0, height - 160, width, 40);
      // circular valve node wheel
      ctx.beginPath();
      ctx.arc(ssX, height - 140, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (type === 'abandoned_arcade_signs') {
      ctx.save();
      ctx.translate(ssX, ssY);
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#d946ef';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#d946ef'; // pink sign boards
      ctx.lineWidth = 1.5;

      // 1UP sign board
      ctx.fillRect(-80, -20, 50, 25);
      ctx.strokeRect(-80, -20, 50, 25);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('1UP', -68, -4);

      // RETRO crab board
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.strokeStyle = '#22d3ee';
      ctx.strokeRect(30, -30, 60, 30);
      ctx.strokeRect(33, -27, 54, 24);
      
      ctx.restore();
    }
    ctx.restore();
  }

  // Draw weather-overlay elements on top of main gameplay card (in front of platform / player)
  drawWeatherOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, options?: any) {
    const userSettings = normalizeBackdropSettings(options?.backdropSettings);
    const weather = userSettings?.weatherEffect || options?.weatherEffect || 'none';

    // 1. Procedural lightning flash for electrical storm
    if (weather === 'electrical_storm') {
      if (Math.random() < 0.05) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let lx = Math.random() * width;
        ctx.moveTo(lx, 0);
        for (let ly = 10; ly < height; ly += 25) {
          lx += (Math.random() - 0.5) * 32;
          ctx.lineTo(lx, ly);
        }
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.stroke();
        ctx.restore();
      }
    }

    if (this.weatherParticles.length === 0) return;

    ctx.save();
    const densitySet = userSettings?.weatherDensityMultiplier !== undefined ? userSettings.weatherDensityMultiplier : 1.0;

    const visibleLimit = Math.floor(this.weatherParticles.length * densitySet);
    for (let i = 0; i < Math.min(this.weatherParticles.length, visibleLimit); i++) {
      const p = this.weatherParticles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (weather === 'underwater_bubbles') {
        // Hollow rising spheres with a light shine
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      if (p.vy > 3.0) {
        // High Speed Rain
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 1.6, p.y + p.vy * 1.6);
        ctx.stroke();
      } else if (p.vx > 1.5 && p.vy === 0) {
        // Solar flare sweep radiations
        ctx.fillRect(p.x, p.y, width, p.size);
      } else if (p.vx !== 0 && p.rotSpeed > 0.01) {
        // Rotating icy crystal snow shards
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Float bubbles, volcanic magma sparks
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.color === '#fbbf24' || p.color === '#ef4444') {
          ctx.globalAlpha = p.alpha * 0.32;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  getCuratedBackdrop(stage: number): string {
    const list = [
      'deep_stars',
      'alien_planet',
      'dimensional_void',
      'crystal_clouds',
      'black_hole',
      'space_station',
      'crystal_clouds',
      'dimensional_void',
      'black_hole',
      'alien_planet',
      'space_station',
      'dying_sun'
    ];
    return list[(stage - 1) % list.length];
  }

  getCuratedSky(stage: number): string {
    const list = [
      'space_black',
      'neon_twilight',
      'void_purple',
      'acid_mist',
      'void_purple',
      'neon_twilight',
      'void_purple',
      'space_black',
      'space_black',
      'radioactive_aurora',
      'space_black',
      'neon_twilight'
    ];
    return list[(stage - 1) % list.length];
  }

  getCuratedWeather(stage: number): string {
    const list = [
      'none',
      'spurs',
      'ice_shards',
      'acid_rain',
      'solar_flare',
      'ash',
      'ice_shards',
      'solar_flare',
      'embers',
      'none',
      'spurs',
      'embers'
    ];
    return list[(stage - 1) % list.length];
  }
}
