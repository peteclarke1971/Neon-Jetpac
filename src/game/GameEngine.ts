import { Player } from './Player';
import { Rocket } from './Rocket';
import { Item } from './Item';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';
import { Particle } from './Particle';
import { audio } from './Audio';
import { input } from './Input';
import { Starfield } from './Starfield';
import { GAME_WIDTH, GAME_HEIGHT, PLATFORMS_LAYOUT, ROCKET_BASE_X, ROCKET_BASE_Y, ENEMY_TYPES, NEON_COLORS } from './Constants';

export class GameEngine {
  ctx: CanvasRenderingContext2D;
  player: Player;
  rocket: Rocket;
  items: Item[] = [];
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  starfield: Starfield;
  
  score = 0;
  lives = 3;
  stage = 1;
  state: 'START' | 'PLAYING' | 'GAMEOVER' | 'LAUNCHING' | 'NEXT_STAGE' = 'START';
  
  enemyTimer = 0;
  frameCount = 0;

  gameMode: 'STANDARD' | 'CLASSIC' = 'STANDARD';
  classicLoop = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.player = new Player();
    this.rocket = new Rocket();
    this.starfield = new Starfield(GAME_WIDTH, GAME_HEIGHT, 150);
    this.initStage();
    this.state = 'START';
  }

  getClassicEnemyType() {
    const cycle = (this.stage - 1) % 8; // 8 enemy families, they cycle every 8 levels
    const classicTypes = [
      { name: 'classic_asteroid', speed: 1.5, score: 25, color: NEON_COLORS.ORANGE },
      { name: 'classic_fuzzball', speed: 2, score: 30, color: NEON_COLORS.MAGENTA },
      { name: 'classic_bubble', speed: 1.5, score: 40, color: NEON_COLORS.CYAN },
      { name: 'classic_fighter', speed: 3, score: 50, color: NEON_COLORS.RED },
      { name: 'classic_saucer', speed: 2.5, score: 60, color: NEON_COLORS.GREEN },
      { name: 'classic_cross', speed: 2.5, score: 70, color: NEON_COLORS.YELLOW },
      { name: 'classic_dart', speed: 4, score: 80, color: '#ffffff' },
      { name: 'classic_blob', speed: 2, score: 100, color: NEON_COLORS.MAGENTA }
    ];
    let t = classicTypes[cycle];
    
    // speed multiplier for loops or later stages
    const multi = 1 + (Math.floor((this.stage - 1) / 8) * 0.1) + (this.classicLoop * 0.2);
    return { ...t, speed: t.speed * multi };
  }

  initStage() {
    this.items = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    
    this.player.dead = false;
    this.player.pos.set(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    this.player.vel.set(0, 0);
    this.player.carryingItem = null;
    this.player.waveTimer = 120;

    if (this.gameMode === 'CLASSIC') {
      this.rocket.type = (Math.floor((this.stage - 1) / 4) % 4) + 1;
      this.rocket.fuelLevel = 0;
      if ((this.stage - 1) % 4 === 0) {
        this.rocket.partsAssembled = 1;
        this.spawnItem('part', 2);
      } else {
        this.rocket.partsAssembled = 3;
        this.spawnItem('fuel');
      }
    } else {
      this.rocket.type = 1; // Standard is always 1
      if ((this.stage - 1) % 4 === 0) {
        this.rocket.partsAssembled = 1;
        this.rocket.fuelLevel = 0;
        this.spawnItem('part', 2);
      } else {
        this.rocket.partsAssembled = 3;
        this.rocket.fuelLevel = 0;
        this.spawnItem('fuel');
      }
    }
    
    this.rocket.launching = false;
    this.rocket.launchY = ROCKET_BASE_Y;
    this.state = 'PLAYING';
  }

  nextStage() {
    this.stage++;
    if (this.gameMode === 'CLASSIC' && this.stage > 16) {
      this.stage = 1;
      this.classicLoop++;
    }
    this.initStage();
  }

  spawnItem(type: 'part' | 'fuel' | 'valuable', partId?: number) {
    this.items.push(new Item(type, partId));
  }

  die() {
    if (this.player.dead) return;
    this.player.dead = true;
    audio.playExplosion();
    
    // drop carried item
    if (this.player.carryingItem) {
      this.player.carryingItem.carried = false;
      this.player.carryingItem.dropped = true;
      this.player.carryingItem = null;
    }

    for (let i=0; i<30; i++) {
      this.particles.push(new Particle(this.player.pos.x, this.player.pos.y, NEON_COLORS.CYAN, 2));
    }
    
    setTimeout(() => {
      if (!input.infiniteLives) {
        this.lives--;
      }
      if (this.lives <= 0) {
        this.state = 'GAMEOVER';
        audio.playGameOver();
      } else {
        // respawn slightly above center
        this.player.dead = false;
        this.player.pos.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.player.vel.set(0, 0);
      }
    }, 2000);
  }

  checkCollisions() {
    // Player vs Item
    if (!this.player.dead && !this.rocket.launching) {
      for (const item of this.items) {
        if (!item.collected && !item.carried && !item.fallingToRocket) {
          if (Math.abs(item.pos.x - this.player.pos.x) < 20 && Math.abs(item.pos.y - this.player.pos.y) < 20) {
            // pickup
            if (item.type === 'valuable') {
              item.collected = true;
              this.score += 250;
              audio.playPowerup();
              const colors = [NEON_COLORS.CYAN, NEON_COLORS.MAGENTA, NEON_COLORS.YELLOW, NEON_COLORS.GREEN];
              for (let i=0; i<20; i++) {
                const rc = colors[Math.floor(Math.random() * colors.length)];
                this.particles.push(new Particle(item.pos.x + 12, item.pos.y + 12, rc, 2));
              }
              this.particles.push(new Particle(item.pos.x + 12, item.pos.y, '#ffffff', 1, '$'));
            } else if (!this.player.carryingItem) {
              item.carried = true;
              item.dropped = false;
              this.player.carryingItem = item;
              audio.playPickup();
            }
          }
        }
      }

      // Check drop zone for rocket
      if (this.player.carryingItem) {
        const item = this.player.carryingItem;
        if (Math.abs(this.player.pos.x - (ROCKET_BASE_X + 5)) < 20) {
          item.carried = false;
          item.fallingToRocket = true;
          this.player.carryingItem = null;
          audio.playDrop();
        }
      }
    }

    // Items falling to rocket
    for (const item of this.items) {
      if (item.fallingToRocket) {
        if (item.pos.y >= ROCKET_BASE_Y - 45) {
          item.collected = true;
          item.fallingToRocket = false;
          audio.playPowerup();
          
          if (item.type === 'part') {
            this.rocket.partsAssembled++;
            this.score += 100;
            if (this.rocket.partsAssembled === 2) {
              setTimeout(() => this.spawnItem('part', 3), 1000);
            } else if (this.rocket.partsAssembled === 3) {
              setTimeout(() => this.spawnItem('fuel'), 1000);
            }
          } else if (item.type === 'fuel') {
            this.rocket.fuelLevel++;
            this.score += 50;
            if (this.rocket.fuelLevel < 6) {
              setTimeout(() => this.spawnItem('fuel'), 500);
            } else {
              // Fuel full, get ready to launch!
            }
          }
        }
      }
    }

    // Getting in the rocket
    if (this.rocket.isComplete() && this.rocket.isFueled() && !this.rocket.launching && !this.player.dead) {
      if (Math.abs(this.player.pos.x - (ROCKET_BASE_X + 5)) < 15 && Math.abs(this.player.pos.y - (ROCKET_BASE_Y - 20)) < 30) {
        // Player enters rocket
        this.player.dead = true; // hide player
        this.rocket.launching = true;
        this.state = 'LAUNCHING';
        audio.playLaunch();
      }
    }

    // Bullets vs Enemies
    for (const bullet of this.bullets) {
      for (const enemy of this.enemies) {
        if (!enemy.dead && bullet.life !== -100) {
          if (Math.abs(bullet.pos.x - enemy.pos.x) < 20 && Math.abs(bullet.pos.y - enemy.pos.y) < 20) {
            enemy.dead = true;
            bullet.life = -100; // mark for deletion
            this.score += enemy.type.score;
            audio.playExplosion();
            for (let i=0; i<15; i++) {
              this.particles.push(new Particle(enemy.pos.x, enemy.pos.y, enemy.type.color, 1.5));
            }
          }
        }
      }
    }

    // Player vs Enemies
    if (!this.player.dead && !this.rocket.launching) {
      for (const enemy of this.enemies) {
        if (!enemy.dead) {
          if (Math.abs(this.player.pos.x - enemy.pos.x) < 20 && Math.abs(this.player.pos.y - enemy.pos.y) < 20) {
            this.die();
          }
        }
      }
    }
  }

  update() {
    this.frameCount++;
    
    if (input.skipLevel && this.state !== 'START' && this.state !== 'GAMEOVER') {
      input.skipLevel = false;
      this.nextStage();
      this.state = 'PLAYING';
      return;
    }

    if (this.state === 'START') return;

    if (this.state === 'GAMEOVER') {
      this.particles.forEach(p => p.update());
      this.particles = this.particles.filter(p => p.life > 0);
      return;
    }

    if (this.state === 'LAUNCHING') {
      this.rocket.launchY -= 4; // takeoff speed
      this.particles.push(new Particle(ROCKET_BASE_X + 15, this.rocket.launchY, NEON_COLORS.ORANGE, 2));
      this.particles.push(new Particle(ROCKET_BASE_X + 15, this.rocket.launchY, NEON_COLORS.RED, 1.5));
      this.particles.push(new Particle(ROCKET_BASE_X + 15, this.rocket.launchY, NEON_COLORS.YELLOW, 1));
      
      this.particles.forEach(p => p.update());
      this.particles = this.particles.filter(p => p.life > 0);
      
      if (this.rocket.launchY < -100) {
        this.nextStage();
      }
      return;
    }

    this.player.update(this.particles, this.bullets);
    
    if (this.player.carryingItem) {
      this.player.carryingItem.pos.x = this.player.pos.x;
      this.player.carryingItem.pos.y = this.player.pos.y - 20;
    }

    this.items.forEach(i => i.update());
    this.items = this.items.filter(i => !i.collected && (i.type !== 'valuable' || i.life > 0));

    // Occasional valuable spawn
    if (this.gameMode === 'CLASSIC' && Math.random() < 0.002) {
      if (this.items.filter(i => i.type === 'valuable').length < 2) {
        this.spawnItem('valuable', Math.floor(Math.random() * 4));
      }
    }
    
    // spawn enemies
    this.enemyTimer++;
    const spawnRate = Math.max(40, 150 - (this.stage * 10)); // gets faster
    if (this.enemyTimer > spawnRate && this.enemies.filter(e => !e.dead).length < 6 + this.stage) {
      this.enemyTimer = 0;
      if (this.gameMode === 'CLASSIC') {
        this.enemies.push(new Enemy(this.getClassicEnemyType()));
      } else {
        this.enemies.push(new Enemy(this.stage - 1));
      }
    }

    this.enemies.forEach(e => e.update(this.player, PLATFORMS_LAYOUT));
    this.enemies = this.enemies.filter(e => !e.dead);
    
    this.bullets.forEach(b => b.update());
    this.bullets = this.bullets.filter(b => b.life > 0);

    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.checkCollisions();
  }

  draw() {
    const ctx = this.ctx;
    
    // Deep space background
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Glowing Nebula blob
    const cx = GAME_WIDTH / 2 + Math.sin(this.frameCount * 0.005) * 100;
    const cy = GAME_HEIGHT / 2 + Math.cos(this.frameCount * 0.003) * 50;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 600);
    const themeHue = (this.stage * 40) % 360;
    gradient.addColorStop(0, `hsla(${themeHue}, 100%, 20%, 0.15)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.starfield.draw(ctx, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1.0;

    // Draw platforms with AAA thickness and depth
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const p of PLATFORMS_LAYOUT) {
      // Platform dark fill core
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.rect(p[0], p[1], p[2], p[3] + 5);
      ctx.fill();

      // Inner grid
      ctx.beginPath();
      for(let x = 10; x < p[2]; x+=15) {
          ctx.moveTo(p[0] + x, p[1] + 2);
          ctx.lineTo(p[0] + x, p[1] + p[3] + 3);
      }
      ctx.strokeStyle = NEON_COLORS.PLATFORM;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Top glowing rim
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 15;
      ctx.shadowColor = NEON_COLORS.PLATFORM;
      ctx.strokeStyle = NEON_COLORS.PLATFORM;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + p[2], p[1]);
      ctx.stroke();
      
      // Top white hot core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom rim
      ctx.shadowBlur = 5;
      ctx.shadowColor = NEON_COLORS.PLATFORM;
      ctx.strokeStyle = NEON_COLORS.PLATFORM;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] + p[3] + 5);
      ctx.lineTo(p[0] + p[2], p[1] + p[3] + 5);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();

    this.rocket.draw(ctx);
    
    this.items.forEach(i => i.draw(ctx));
    // Enemies drawn slightly below bullets for viz hierarchy
    this.enemies.forEach(e => e.draw(ctx));
    
    if (this.state !== 'LAUNCHING') {
      this.player.draw(ctx);
    }
    
    // Bullets and particles on top
    this.bullets.forEach(b => b.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
    
    // UI HUD
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = NEON_COLORS.CYAN;
    ctx.shadowBlur = 8;
    ctx.shadowColor = NEON_COLORS.CYAN;
    
    if (this.gameMode === 'CLASSIC') {
      ctx.textAlign = 'left';
      ctx.fillText(`CLASSIC L${this.stage.toString().padStart(2, '0')}`, 20, 35);
      
      const rTypeNum = ['I', 'II', 'III', 'IV'][this.rocket.type - 1];
      ctx.textAlign = 'center';
      
      let statusStr = '';
      if (this.rocket.isComplete()) {
        statusStr = `ROCKET ${rTypeNum} BUILT FUEL ${this.rocket.fuelLevel}/6`;
      } else {
        statusStr = `ROCKET ${rTypeNum} BUILD ${this.rocket.partsAssembled}/3 FUEL 0/6`;
      }
      ctx.fillText(statusStr, GAME_WIDTH / 2, 35);
      
      ctx.textAlign = 'right';
      ctx.fillText(`SCORE ${this.score.toString().padStart(6, '0')}`, GAME_WIDTH - 20, 35);

      // Lives below score
      ctx.fillText(`LIVES ${this.lives}`, GAME_WIDTH - 20, 65);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 20, 35);
      ctx.textAlign = 'center';
      ctx.fillText(`LIVES: ${this.lives}`, GAME_WIDTH/2, 35);
      ctx.textAlign = 'right';
      ctx.fillText(`STAGE: ${this.stage}`, GAME_WIDTH - 20, 35);
    }
    ctx.shadowBlur = 0;
  }
}
