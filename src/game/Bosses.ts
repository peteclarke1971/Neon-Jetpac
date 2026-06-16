import { Vector } from './Vector';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS, ROCKET_BASE_X, ROCKET_BASE_Y } from './Constants';
import { Particle } from './Particle';
import { Bullet } from './Bullet';
import { Item } from './Item';
import { Player } from './Player';
import { Rocket } from './Rocket';
import { audio } from './Audio';
import { Enemy } from './Enemy';

export interface Boss {
  type: string;
  hp: number;
  maxHp: number;
  dead: boolean;
  update(engine: any): void;
  draw(ctx: CanvasRenderingContext2D): void;
  checkHit(bullet: Bullet, engine: any): boolean;
  getHUDText(): { name: string, phase: string, isCoreOpen: boolean };
  onRiftBomb?(engine: any): void;
}

interface Tendril {
  id: number;
  tip: Vector;
  targetRef: Item | null;
  state: 'seeking' | 'attached' | 'pulling' | 'broken' | 'retracting';
  hp: number;
  maxHp: number;
  timer: number;
}

export class FuelLeechBoss implements Boss {
  type = 'boss_leech';
  pos: Vector;
  hp = 800;
  maxHp = 800;
  dead = false;
  
  phase: 1 | 2 | 3 = 1;
  t = 0;
  
  state: 'intro' | 'active' | 'dying' = 'intro';
  stateTimer = 0;

  coreOpenTimer = 0;
  feedPulseTimer = 0;
  hitFlashTimer = 0;
  
  tendrils: Tendril[] = [];
  nextTendrilId = 1;

  sporeTimer = 0;
  stolenFuelCount = 0;
  releasedFuelCount = 0;

  constructor() {
    this.pos = new Vector(GAME_WIDTH / 2, -100);
  }

  update(engine: any) {
    this.t += 0.05;
    this.stateTimer++;

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.feedPulseTimer > 0) this.feedPulseTimer--;

    // Intro zoom in
    if (this.state === 'intro') {
       this.pos.y += (90 - this.pos.y) * 0.05;
       if (this.stateTimer > 120) {
          this.state = 'active';
          this.stateTimer = 0;
       }
       return;
    }

    if (this.state === 'dying') {
       if (this.stateTimer > 100) {
          this.dead = true;
          engine.score += 5000;
          audio.playExplosion();
          for(let i=0; i<100; i++) engine.particles.push(new Particle(this.pos.x, this.pos.y, NEON_COLORS.MAGENTA, Math.random()*6+2));
          for(let i=0; i<50; i++) engine.particles.push(new Particle(this.pos.x, this.pos.y, NEON_COLORS.CYAN, Math.random()*6+2));
       } else if (this.stateTimer % 10 === 0) {
          engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*80, this.pos.y + (Math.random()-0.5)*80, '#ffffff', 3));
       }
       return;
    }

    // Active State Updates
    this.pos.y = 90 + Math.sin(this.t) * 15;

    // Phase checks
    if (this.hp < this.maxHp * 0.25) this.phase = 3;
    else if (this.hp < this.maxHp * 0.6) this.phase = 2;

    const maxTendrils = this.phase === 1 ? 1 : 2;
    const clamped = (window as any).__gravityClampActive;

    // Tendril logic
    this.tendrils.forEach(t => {
      t.timer++;

      if (t.state === 'seeking') {
        if (!t.targetRef || t.targetRef.collected || t.targetRef.carried) {
           t.state = 'retracting';
           t.targetRef = null;
        } else {
           const targetX = t.targetRef.pos.x + t.targetRef.width/2;
           const targetY = t.targetRef.pos.y + t.targetRef.height/2;
           const dx = targetX - t.tip.x;
           const dy = targetY - t.tip.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           const speed = (this.phase === 3 ? 6.5 : (this.phase === 2 ? 5 : 3.5)) * (clamped ? 0.6 : 1);
           
           if (dist < speed * 2) {
             t.state = 'attached';
             t.tip.x = targetX;
             t.tip.y = targetY;
             t.timer = 0; // reset for attached pause
           } else {
             t.tip.x += (dx/dist) * speed;
             t.tip.y += (dy/dist) * speed;
           }
        }
      } else if (t.state === 'attached') {
         // brief attach pause before pulling
         if (t.timer > 12) {
            t.state = 'pulling';
            t.targetRef!.carried = true;
            if (engine.player.carryingItem === t.targetRef) {
               engine.player.carryingItem = null;
            }
         }
      } else if (t.state === 'pulling') {
         if (!t.targetRef) {
            t.state = 'retracting';
         } else {
            const pullSpeed = (this.phase === 3 ? 3.5 : (this.phase === 2 ? 2.5 : 1.5)) * (clamped ? 0.6 : 1);
            t.tip.y -= pullSpeed;
            // fuel follows the tip
            t.targetRef.pos.x = t.tip.x - t.targetRef.width/2;
            t.targetRef.pos.y = t.tip.y - t.targetRef.height/2;
            t.targetRef.vel.y = 0;
            t.targetRef.vel.x = 0;
            
            // Consumed
            if (t.tip.y < this.pos.y + 30) {
               t.targetRef.collected = true; // remove cleanly
               t.targetRef = null;
               t.state = 'retracting';
               
               this.feedPulseTimer = 30;
               this.hp = Math.min(this.maxHp, this.hp + 8);
               this.stolenFuelCount++;
               audio.playExplosion();
               for(let i=0; i<15; i++) engine.particles.push(new Particle(this.pos.x, this.pos.y + 20, NEON_COLORS.MAGENTA, 3));
               
               engine.particles.push(new Particle(this.pos.x, this.pos.y, '#ff00aa', 0, 'FUEL STOLEN')); // temporary float text hack
            }
         }
      } else if (t.state === 'retracting') {
         const dx = this.pos.x - t.tip.x;
         const dy = this.pos.y - t.tip.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         if (dist < 15) {
           t.state = 'broken';
         } else {
           t.tip.x += (dx/dist) * 9;
           t.tip.y += (dy/dist) * 9;
         }
      } else if (t.state === 'broken') {
         if (t.targetRef) {
           t.targetRef.carried = false;
           t.targetRef.dropped = true;
           t.targetRef.vel.y = 1; // gentle drop
           
           this.releasedFuelCount++;
           for(let i=0; i<10; i++) engine.particles.push(new Particle(t.tip.x, t.tip.y, '#ffffff', 2));
           engine.particles.push(new Particle(t.tip.x, t.tip.y, NEON_COLORS.CYAN, 0, 'FUEL RELEASED!')); 
           t.targetRef = null;
         }
      }
    });

    // Cleanup broken tendrils
    const oldLen = this.tendrils.length;
    this.tendrils = this.tendrils.filter(t => t.state !== 'broken');
    if (this.tendrils.length < oldLen) {
       // A tendril broke!
       this.coreOpenTimer += (this.phase === 3 ? 180 : (this.phase === 2 ? 120 : 150));
       // Cap open time
       if (this.coreOpenTimer > 300) this.coreOpenTimer = 300;
    }

    // Spawn new tendril
    if (this.tendrils.length < maxTendrils && this.coreOpenTimer <= 0) {
       const fuels: Item[] = engine.items.filter((i: Item) => i.type === 'fuel' && !i.carried && !i.collected);
       if (fuels.length > 0) {
         // Sort by not targeted
         const untargeted = fuels.filter(f => !this.tendrils.some(t => t.targetRef === f));
         if (untargeted.length > 0) {
            this.tendrils.push({
               id: this.nextTendrilId++,
               tip: new Vector(this.pos.x, this.pos.y),
               targetRef: untargeted[0],
               state: 'seeking',
               hp: this.phase === 3 ? 1 : 2, // 1 to 2 hits
               maxHp: this.phase === 3 ? 1 : 2,
               timer: 0
            });
         }
       } else if (engine.frameCount % 90 === 0) {
         // Guarantee fuel exists so fight doesn't stall
         engine.spawnItem('fuel');
       }
    }

    // Core state
    if (this.coreOpenTimer > 0) {
       this.coreOpenTimer--;
    }
    
    // Spores
    // If clamped, progress timer slower
    this.sporeTimer += clamped ? 0.6 : 1;
    let sporeRate = 240; // ~4 secs
    if (this.phase === 2) sporeRate = 180;
    if (this.phase === 3) sporeRate = 120; // More chaotic

    if (this.sporeTimer > sporeRate) {
       this.sporeTimer = 0;
       
       const maxActiveSpores = this.phase === 1 ? 4 : (this.phase === 2 ? 6 : 8);
       const activeSpores = engine.enemies.filter((e:Enemy) => e.type.name === 'spore').length;
       
       if (activeSpores < maxActiveSpores) {
          // shoot spore down/diagonal
          const vx = (Math.random() - 0.5) * 3;
          engine.enemies.push(new Enemy('spore', this.pos.x, this.pos.y + 30, vx, 2.5));
       }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === 'intro' && this.stateTimer < 60) {
       // Intro text
       ctx.fillStyle = NEON_COLORS.MAGENTA;
       ctx.font = 'bold 22px "Press Start 2P", monospace';
       ctx.textAlign = 'center';
       ctx.fillText("FUEL LEECH DETECTED", GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
       ctx.fillStyle = NEON_COLORS.CYAN;
       ctx.font = '14px "Press Start 2P", monospace';
       ctx.fillText("IT WANTS THE FUEL", GAME_WIDTH/2, GAME_HEIGHT/2 + 20);
    }

    ctx.save();
    
    // Draw Tendrils
    this.tendrils.forEach(t => {
       ctx.beginPath();
       
       // Bezier curve magic
       const rootX = this.pos.x;
       const rootY = this.pos.y + 20;
       const tipX = t.tip.x;
       const tipY = t.tip.y;
       
       const cx1 = rootX + Math.sin(this.t * 3 + t.id) * 40;
       const cy1 = rootY + 60;
       const cx2 = tipX + Math.sin(this.t * 4 + t.id) * 30;
       const cy2 = tipY - 50;

       ctx.moveTo(rootX, rootY);
       ctx.bezierCurveTo(cx1, cy1, cx2, cy2, tipX, tipY);
       
       let tColor = NEON_COLORS.CYAN;
       if (t.state === 'attached' || t.state === 'pulling') tColor = NEON_COLORS.MAGENTA;
       if (t.state === 'retracting') tColor = 'rgba(255, 0, 255, 0.4)';
       
       ctx.strokeStyle = tColor;
       ctx.lineWidth = 6;
       ctx.shadowBlur = 15;
       ctx.shadowColor = tColor;
       ctx.stroke();

       // Inner highlight line
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2;
       ctx.shadowBlur = 0;
       ctx.stroke();

       // Pulses / Nodes moving down tendril
       if (t.state === 'pulling' || t.state === 'seeking') {
          const u = (this.t * (t.state === 'pulling' ? -2 : 2)) % 1; 
          // Animate a point along the bezier (approximate by drawing node at tip for now to save complex math)
          ctx.beginPath();
          ctx.arc(tipX, tipY, 8 + Math.sin(this.t * 10)*2, 0, Math.PI*2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
       }
       
       // Draw fuel highlight and tether if grabbing
       if ((t.state === 'attached' || t.state === 'pulling') && t.targetRef) {
          ctx.beginPath();
          ctx.rect(t.targetRef.pos.x - 4, t.targetRef.pos.y - 4, t.targetRef.width + 8, t.targetRef.height + 8);
          ctx.strokeStyle = NEON_COLORS.MAGENTA;
          ctx.lineWidth = 2;
          ctx.stroke();
       }
    });

    // Draw Boss Body
    ctx.translate(this.pos.x, this.pos.y);
    
    // Unstable flicker in phase 3
    if (this.phase === 3 && Math.random() < 0.1) {
       ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
    }

    ctx.shadowBlur = 25;
    ctx.shadowColor = this.feedPulseTimer > 0 ? NEON_COLORS.MAGENTA : NEON_COLORS.CYAN;

    const bodyPulse = Math.sin(this.t * 4) * 4;
    const bodyWidth = 60 + bodyPulse + (this.feedPulseTimer > 0 ? 10 : 0);
    const bodyHeight = 40 + bodyPulse;

    // Dome / Outer body
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.hitFlashTimer > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(0, 255, 255, 0.15)';
    if (this.feedPulseTimer > 0) ctx.fillStyle = 'rgba(255, 0, 150, 0.3)';
    ctx.fill();
    ctx.strokeStyle = this.phase === 3 ? NEON_COLORS.MAGENTA : NEON_COLORS.CYAN;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner energy rings
    for(let i=1; i<=2; i++) {
       ctx.beginPath();
       ctx.ellipse(0, 0, bodyWidth - i*15, bodyHeight - i*10, 0, 0, Math.PI*2);
       ctx.strokeStyle = `rgba(255, 255, 255, ${0.4/i})`;
       ctx.lineWidth = 1;
       ctx.stroke();
    }

    // Central Core
    const coreActive = this.coreOpenTimer > 0;
    const coreColor = coreActive ? '#ffffff' : (this.phase === 3 ? NEON_COLORS.MAGENTA : '#aa00aa');
    ctx.beginPath();
    ctx.arc(0, 0, coreActive ? 18 + Math.sin(this.t * 20)*4 : 12, 0, Math.PI*2);
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = coreActive ? 30 : 10;
    ctx.fill();
    
    // Core detail
    if (coreActive) {
       ctx.beginPath();
       ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath();
       ctx.fillStyle = NEON_COLORS.CYAN;
       ctx.fill();
    }
    
    ctx.restore();
  }

  checkHit(bullet: Bullet, engine: any) {
    if (this.state !== 'active') return false;
    let hit = false;

    // Check Core
    const dx = bullet.pos.x - this.pos.x;
    const dy = bullet.pos.y - this.pos.y;
    // circular hit area around core (r=35)
    if (dx*dx + dy*dy < 1225) {
       hit = true;
       if (this.coreOpenTimer > 0) {
          // Core is open, take real damage
          this.hp -= 15;
          engine.score += 50;
          for(let i=0; i<4; i++) engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ffffff', 2));
          
          if (this.hp <= 0 && (this.state as string) !== 'dying') {
             this.state = 'dying';
             this.stateTimer = 0;
             engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2, NEON_COLORS.CYAN, 0, 'FUEL STREAM RESTORED'));
             // Snap all tendrils
             this.tendrils.forEach(t => {
                if (t.targetRef) {
                   t.targetRef.carried = false;
                   t.targetRef.dropped = true;
                   t.targetRef.vel.y = 1;
                }
             });
             this.tendrils = [];
          }
       } else {
          // Boss body hit, no dmg just flash
          this.hitFlashTimer = 5;
          if (Math.random() < 0.1) {
             engine.particles.push(new Particle(this.pos.x, this.pos.y - 40, '#aaaaaa', 0, 'CORE SEALED'));
          }
       }
       return true;
    }

    // Check Tendrils
    // Use distance from point to line segment for generous collision
    this.tendrils.forEach(t => {
       if (hit) return; // already hit something
       if (t.state === 'seeking' || t.state === 'attached' || t.state === 'pulling') {
          const l2 = ((t.tip.x - this.pos.x)**2) + ((t.tip.y - this.pos.y - 20)**2);
          if (l2 === 0) return;
          const tx = ((bullet.pos.x - this.pos.x) * (t.tip.x - this.pos.x) + (bullet.pos.y - (this.pos.y+20)) * (t.tip.y - (this.pos.y+20))) / l2;
          const txClamped = Math.max(0, Math.min(1, tx));
          const projX = this.pos.x + txClamped * (t.tip.x - this.pos.x);
          const projY = this.pos.y + 20 + txClamped * (t.tip.y - (this.pos.y+20));
          const distSq = (bullet.pos.x - projX)**2 + (bullet.pos.y - projY)**2;
          
          // 18 px radius
          if (distSq < 324) {
             hit = true;
             t.hp -= 1;
             for(let i=0; i<3; i++) engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, NEON_COLORS.CYAN, 1.5));
             audio.playExplosion();
             if (t.hp <= 0) {
                if (t.state === 'pulling') engine.score += 500;
                else engine.score += 250;
                t.state = 'broken';
             }
          }
       }
    });

    return hit;
  }

  getHUDText() {
    let phaseText = 'FEEDING TENDRIL';
    if (this.phase === 2) phaseText = 'DOUBLE SIPHON';
    if (this.phase === 3) phaseText = 'CORE PANIC';
    
    if (this.coreOpenTimer > 0) phaseText = 'CORE EXPOSED';
    else if (this.feedPulseTimer > 0) phaseText = 'FUEL STOLEN';
    
    if (this.state === 'dying') phaseText = 'LEECH DESTROYED';
    
    return { name: 'FUEL LEECH', phase: phaseText, isCoreOpen: this.coreOpenTimer > 0 };
  }

  onRiftBomb(engine: any) {
     if (this.state !== 'active') return;
     // break all tendrils
     this.tendrils.forEach(t => {
        t.hp = 0;
        t.state = 'broken';
     });
     // open core briefly
     this.coreOpenTimer = Math.max(this.coreOpenTimer, 120);
     this.hitFlashTimer = 15;
     
     // partial damage if already open
     if (this.coreOpenTimer > 0) {
        this.hp -= 30; // some blast damage to the core
        if (this.hp <= 0) {
           this.state = 'dying';
           this.stateTimer = 0;
           engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2, NEON_COLORS.CYAN, 0, 'FUEL STREAM RESTORED'));
           this.tendrils = [];
        }
     }
  }
}

// RocketEater implementation comes next



interface RocketEaterWeakPoint {
  id: string;
  role: "upper_jaw" | "lower_jaw" | "left_eye" | "right_eye" | "throat_core";
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  active: boolean;
  destroyed: boolean;
  pulseOffset: number;
}

export class RocketEaterBoss implements Boss {
  type = 'boss_eater';
  hp = 8000;
  maxHp = 8000;
  dead = false;

  pos: Vector;
  phase: 1 | 2 | 3 = 1;
  t = 0;

  state: 'intro' | 'watching' | 'warning' | 'lunging' | 'grabbing' | 'recoiling' | 'core_open' | 'dying' = 'intro';
  stateTimer = 0;

  introTimer = 0;
  attackTimer = 0;
  warningTimer = 0;
  lungeTimer = 0;
  grabTimer = 0;
  coreOpenTimer = 0;
  hitFlashTimer = 0;
  deathTimer = 0;

  weakPoints: RocketEaterWeakPoint[] = [];

  grabProgress = 0;
  rocketDrainTimer = 0;
  rocketWasGrabbed = false;
  
  targetY = 0;

  constructor() {
    this.pos = new Vector(GAME_WIDTH + 80, GAME_HEIGHT * 0.35);
    this.initWeakPoints();
  }

  initWeakPoints() {
    this.weakPoints = [
      { id: 'uj', role: 'upper_jaw', offsetX: -80, offsetY: -50, x: 0, y: 0, radius: 25, hp: 12, maxHp: 12, active: false, destroyed: false, pulseOffset: 0 },
      { id: 'lj', role: 'lower_jaw', offsetX: -80, offsetY: 50, x: 0, y: 0, radius: 25, hp: 12, maxHp: 12, active: false, destroyed: false, pulseOffset: Math.PI },
      { id: 'le', role: 'left_eye', offsetX: 0, offsetY: -70, x: 0, y: 0, radius: 20, hp: 8, maxHp: 8, active: false, destroyed: false, pulseOffset: Math.PI/2 },
      { id: 're', role: 'right_eye', offsetX: 0, offsetY: 70, x: 0, y: 0, radius: 20, hp: 8, maxHp: 8, active: false, destroyed: false, pulseOffset: -Math.PI/2 },
      { id: 'c', role: 'throat_core', offsetX: 10, offsetY: 0, x: 0, y: 0, radius: 40, hp: 1, maxHp: 1, active: false, destroyed: false, pulseOffset: 0 },
    ];
  }

  activateJaws() {
    this.weakPoints.forEach(w => {
       if (w.role === 'upper_jaw' || w.role === 'lower_jaw') {
          w.active = true;
          w.hp = this.phase === 3 ? 12 : (this.phase === 2 ? 10 : 8);
          w.maxHp = w.hp;
          w.destroyed = false;
       }
       if ((w.role === 'left_eye' || w.role === 'right_eye') && this.phase >= 2) {
          w.active = true;
          w.hp = 8;
          w.maxHp = w.hp;
          w.destroyed = false;
       }
    });
  }

  updateWeakPointsPositions() {
    // Add clamping visuals to the offsets
    let jawOffset = 0;
    if (this.state === 'warning' || this.state === 'lunging' || this.state === 'core_open') {
       jawOffset = 20; // open wide
    } else if (this.state === 'grabbing') {
       jawOffset = Math.sin(this.t * 20) * 10 - 20; // clamp shut / chew
    }

    this.weakPoints.forEach(w => {
       w.x = this.pos.x + w.offsetX;
       if (w.role === 'upper_jaw') w.y = this.pos.y + w.offsetY - jawOffset;
       else if (w.role === 'lower_jaw') w.y = this.pos.y + w.offsetY + jawOffset;
       else w.y = this.pos.y + w.offsetY;
    });
  }

  update(engine: any) {
    this.t += 0.05;
    this.stateTimer++;
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Make sure rocket and weakpoints are initialized
    if (!engine.rocket) return; // Wait for rocket
    if (!this.weakPoints || this.weakPoints.length !== 5 || !this.weakPoints[0].role) this.initWeakPoints();

    // Phase checks
    if (this.hp < this.maxHp * 0.35) this.phase = 3;
    else if (this.hp < this.maxHp * 0.70) this.phase = 2;

    const clamped = (window as any).__gravityClampActive;
    const timeScale = clamped ? 0.6 : 1;

    // Movement bases
    const targetBaseX = GAME_WIDTH + 80;
    const targetBaseY = engine.rocket.launchY - 30; // Aim at rocket height

    this.updateWeakPointsPositions();

    if (this.state === 'intro') {
       this.introTimer += timeScale;
       this.pos.y += (targetBaseY - this.pos.y) * 0.05;
       if (this.introTimer > 120) {
          this.state = 'watching';
          this.stateTimer = 0;
          this.attackTimer = 0;
       }
       return;
    }

    if (this.state === 'dying') {
       if (this.deathTimer === 0) {
          if (engine.rocket) {
             (engine.rocket as any).grabbed = false;
             engine.rocket.launchY = ROCKET_BASE_Y;
          }
       }
       this.deathTimer += 1;
       if (this.deathTimer % 10 === 0) {
          const w = this.weakPoints[Math.floor(Math.random()*this.weakPoints.length)];
          engine.particles.push(new Particle(w.x, w.y, NEON_COLORS.RED, 4, undefined, false, 'ring'));
          for(let i=0; i<10; i++) engine.particles.push(new Particle(w.x, w.y, NEON_COLORS.MAGENTA, Math.random()*5+2, undefined, false, 'shard'));
          audio.playExplosion();
       }
       
       this.pos.x += 2; // Pull back into rift

       if (this.deathTimer > 150) {
          this.dead = true;
          engine.score += 8000;
          engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2, NEON_COLORS.CYAN, 0, 'ROCKET EATER DESTROYED'));
          engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2 + 30, NEON_COLORS.CYAN, 0, 'LAUNCH NOW'));
          for(let i=0; i<200; i++) engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*200, this.pos.y + (Math.random()-0.5)*200, NEON_COLORS.MAGENTA, Math.random()*6+2));
          audio.playExplosion();
       }
       return;
    }

    // Active state logic
    if (this.state === 'watching') {
       this.attackTimer += timeScale;
       this.targetY = targetBaseY;
       
       this.pos.x += (targetBaseX - this.pos.x) * 0.05;
       this.pos.y += (this.targetY - this.pos.y) * 0.02;

       // Occasionally shoot
       if (Math.random() < 0.01 + this.phase*0.005) {
          const maxProj = this.phase === 3 ? 7 : (this.phase === 2 ? 5 : 3);
          const currentProj = engine.enemies.filter((e:any) => e.type.name === 'spore').length;
          if (currentProj < maxProj) {
             const vx = -2 - Math.random() * 2;
             const vy = (Math.random() - 0.5) * 2;
             engine.enemies.push(new Enemy('spore', this.weakPoints[4].x, this.weakPoints[4].y, vx, vy));
          }
       }

       const watchLimit = this.phase === 3 ? 90 : (this.phase === 2 ? 120 : 150);
       if (this.attackTimer > watchLimit) {
          this.state = 'warning';
          this.warningTimer = 0;
          engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2 - 50, NEON_COLORS.RED, 0, 'DEFEND THE ROCKET'));
          audio.playPowerup(); // Temp warning sound
       }

    } else if (this.state === 'warning') {
       this.warningTimer += timeScale;
       this.pos.y += (engine.rocket.launchY - 30 - this.pos.y) * 0.1;
       
       if (this.warningTimer > 70) {
          this.state = 'lunging';
          this.lungeTimer = 0;
          this.activateJaws();
       }

    } else if (this.state === 'lunging') {
       // Fast dash toward rocket
       this.lungeTimer += timeScale;
       this.pos.x -= 8 * timeScale;
       
       // Check jaw destruction to interrupt
       const activeJaws = this.weakPoints.filter(w => (w.role === 'upper_jaw' || w.role === 'lower_jaw') && w.active && !w.destroyed);
       if (activeJaws.length === 0) {
          // Player interrupted lunge
          this.state = 'recoiling';
          engine.score += 1500;
          engine.particles.push(new Particle(ROCKET_BASE_X, ROCKET_BASE_Y - 50, NEON_COLORS.CYAN, 0, 'ROCKET SAVED!'));
       } else if (this.pos.x < ROCKET_BASE_X + 80) {
          // Reached rocket!
          this.state = 'grabbing';
          this.grabTimer = 0;
          this.rocketDrainTimer = 0;
          this.rocketWasGrabbed = true;
          audio.playExplosion();
       }

    } else if (this.state === 'grabbing') {
       this.grabTimer += timeScale;
       this.rocketDrainTimer += timeScale;
       
       // Lock onto rocket, clamping it
       this.pos.x = ROCKET_BASE_X + 70;
       
       // Shake rocket
       engine.rocket.launchY = ROCKET_BASE_Y + Math.sin(this.t * 30)*3;
       
       // Stop launch 
       (engine.rocket as any).grabbed = true;

       // Drain fuel slowly
       if (this.rocketDrainTimer > 75) {
          this.rocketDrainTimer = 0;
          if (engine.rocket.fuelLevel > 0) {
             engine.rocket.fuelLevel--;
             engine.particles.push(new Particle(ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS.RED, 0, 'FUEL DRAIN'));
             // Very important: spawn a new fuel so the player isn't soft-locked
             if (engine.rocket.fuelLevel < 6) {
                 engine.spawnItem('fuel');
             }
          } else {
             engine.particles.push(new Particle(ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS.ORANGE, 0, 'LAUNCH BLOCKED'));
          }
       }

       // Check jaw destruction
       const activeJaws = this.weakPoints.filter(w => (w.role === 'upper_jaw' || w.role === 'lower_jaw') && w.active && !w.destroyed);
       
       const grabLimit = this.phase === 3 ? 240 : (this.phase === 2 ? 210 : 150);
       
       if (activeJaws.length === 0 || this.grabTimer > grabLimit) {
          this.state = 'recoiling';
          engine.rocket.launchY = ROCKET_BASE_Y; // Reset shake
          (engine.rocket as any).grabbed = false;
          
          if (activeJaws.length === 0) {
             engine.score += 1000;
             engine.particles.push(new Particle(ROCKET_BASE_X, ROCKET_BASE_Y - 50, NEON_COLORS.CYAN, 0, 'ROCKET RELEASED'));
             // Will open core
             this.rocketWasGrabbed = false;
          } else {
             // Just finished grabbing, returning
             this.rocketWasGrabbed = true;
          }
       }

    } else if (this.state === 'recoiling') {
       this.pos.x += 5 * timeScale;
       this.weakPoints.forEach(w => w.active = false);

       if (this.pos.x > targetBaseX) {
          if (!this.rocketWasGrabbed) {
             // Player forced a release -> Open core
             this.state = 'core_open';
             this.coreOpenTimer = 0;
             this.weakPoints.find(w => w.role === 'throat_core')!.active = true;
          } else {
             this.state = 'watching';
             this.attackTimer = 0;
          }
       }

    } else if (this.state === 'core_open') {
       this.coreOpenTimer += timeScale;
       // Try to align directly with player for a shot, or stay put
       this.pos.x += (targetBaseX - 30 - this.pos.x) * 0.05;
       
       const coreLimit = this.phase === 3 ? 150 : (this.phase === 2 ? 108 : 120);
       
       if (this.coreOpenTimer > coreLimit) {
          this.state = 'watching';
          this.attackTimer = 0;
          this.weakPoints.find(w => w.role === 'throat_core')!.active = false;
       }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.weakPoints || this.weakPoints.length !== 5 || !this.weakPoints[0].role) this.initWeakPoints();

    if (this.state === 'intro' && this.introTimer < 60) {
       ctx.fillStyle = NEON_COLORS.RED;
       ctx.font = 'bold 22px "Press Start 2P", monospace';
       ctx.textAlign = 'center';
       ctx.fillText("ROCKET EATER INBOUND", GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
    }

    ctx.save();
    
    // Draw wormhole rings behind boss
    ctx.translate(GAME_WIDTH, this.pos.y);
    for(let i=1; i<=3; i++) {
       ctx.beginPath();
       const angle = this.t * i * 0.5;
       ctx.ellipse(0, 0, 40 + i*20 + Math.sin(this.t * 3)*5, 100 + i*40, angle, 0, Math.PI*2);
       ctx.strokeStyle = `rgba(255, 0, 255, ${0.5/i})`;
       ctx.lineWidth = 3;
       if (this.state === 'dying') {
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random()})`;
       }
       ctx.shadowBlur = 15;
       ctx.shadowColor = NEON_COLORS.MAGENTA;
       ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    
    // Unstable flicker in phase 3
    let bx = this.pos.x;
    let by = this.pos.y;
    if ((this.phase === 3 || this.state === 'dying') && Math.random() < 0.2) {
       bx += (Math.random()-0.5)*10;
       by += (Math.random()-0.5)*10;
    }
    
    // Telegraph Warning Beam
    if (this.state === 'warning') {
       ctx.beginPath();
       ctx.moveTo(bx - 30, by);
       ctx.lineTo(ROCKET_BASE_X, ROCKET_BASE_Y - 30);
       ctx.strokeStyle = NEON_COLORS.RED;
       ctx.lineWidth = 2 + Math.random()*2;
       ctx.shadowBlur = 10;
       ctx.shadowColor = NEON_COLORS.RED;
       ctx.stroke();
       
       // Reticle on rocket
       ctx.beginPath();
       ctx.arc(ROCKET_BASE_X + 25, ROCKET_BASE_Y - 10, 30 + Math.sin(this.t*20)*5, 0, Math.PI*2);
       ctx.strokeStyle = NEON_COLORS.RED;
       ctx.setLineDash([5, 5]);
       ctx.stroke();
       ctx.setLineDash([]);
    }
    
    // Grab/Clamp lines
    if (this.state === 'grabbing') {
       ctx.beginPath();
       ctx.moveTo(this.weakPoints[0].x, this.weakPoints[0].y); // Upper jaw
       ctx.lineTo(ROCKET_BASE_X + 25, ROCKET_BASE_Y - 60);
       ctx.moveTo(this.weakPoints[1].x, this.weakPoints[1].y); // Lower jaw
       ctx.lineTo(ROCKET_BASE_X + 25, ROCKET_BASE_Y + 30);
       ctx.strokeStyle = NEON_COLORS.ORANGE;
       ctx.lineWidth = 4;
       ctx.stroke();
    }

    ctx.translate(bx, by);
    ctx.shadowBlur = 20;
    ctx.shadowColor = NEON_COLORS.RED;

    // Body segments (Complex vector panels instead of simple polygon)
    ctx.beginPath();
    ctx.moveTo(20, -60);
    ctx.lineTo(80, -70);
    ctx.lineTo(150, -40);
    ctx.lineTo(130, 0);
    ctx.lineTo(150, 40);
    ctx.lineTo(80, 70);
    ctx.lineTo(20, 60);
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#050010';
    ctx.fill();
    ctx.strokeStyle = NEON_COLORS.RED;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Internal circuitry lines on body
    ctx.beginPath();
    ctx.moveTo(40, -40); ctx.lineTo(100, -20); ctx.lineTo(100, 20); ctx.lineTo(40, 40);
    ctx.moveTo(60, -20); ctx.lineTo(80, 0); ctx.lineTo(60, 20);
    ctx.strokeStyle = '#550000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Throat core background / Void
    const jawOpen = (this.state === 'warning' || this.state === 'lunging' || this.state === 'core_open' || this.state === 'dying');
    
    ctx.beginPath();
    ctx.ellipse(0, 0, jawOpen ? 40 : 20, jawOpen ? 70 : 30, 0, 0, Math.PI*2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = NEON_COLORS.MAGENTA;
    ctx.stroke();
    
    // Dimensional rift rings in throat
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        const rSize = jawOpen ? 15*i : 5*i;
        ctx.ellipse(i*5, 0, rSize * 0.5, rSize, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.4/i})`;
        ctx.stroke();
    }

    // Core
    if (this.state === 'core_open' || this.state === 'dying') {
       ctx.beginPath();
       ctx.arc(this.weakPoints[4].offsetX, this.weakPoints[4].offsetY, this.weakPoints[4].radius + Math.sin(this.t*10)*5, 0, Math.PI*2);
       ctx.fillStyle = '#ffffff';
       ctx.shadowColor = '#ffffff';
       ctx.fill();
       
       for(let i=1; i<=2; i++) {
          ctx.beginPath();
          ctx.arc(this.weakPoints[4].offsetX, this.weakPoints[4].offsetY, this.weakPoints[4].radius + i*15 + Math.sin(this.t*10)*5, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.8/i})`;
          ctx.lineWidth = 2;
          ctx.stroke();
       }
    }

    ctx.restore();
    // Draw Weak Points
    ctx.save();
    this.weakPoints.forEach(w => {
       if (w.active && !w.destroyed && w.role !== 'throat_core') {
          ctx.beginPath();
          ctx.arc(w.x, w.y, w.radius + Math.sin(this.t * 5 + w.pulseOffset)*3, 0, Math.PI*2);
          
          let wColor = NEON_COLORS.YELLOW;
          if (w.role === 'left_eye' || w.role === 'right_eye') wColor = NEON_COLORS.CYAN;
          
          ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
          ctx.shadowBlur = 15;
          ctx.shadowColor = wColor;
          ctx.fill();
          
          ctx.beginPath(); // Inner active point
          ctx.arc(w.x, w.y, w.radius * 0.5, 0, Math.PI*2);
          ctx.fillStyle = wColor;
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
       } else if (w.role !== 'throat_core') {
          // Closed/inactive weak points
          ctx.beginPath();
          ctx.arc(w.x, w.y, w.radius * 0.3, 0, Math.PI*2);
          ctx.fillStyle = '#330000';
          ctx.shadowBlur = 0;
          ctx.fill();
       }
    });
    ctx.restore();

    ctx.save();
    ctx.translate(bx, by);

    // Dynamic Jaw Offsets
    let jawOffset = 0;
    if (jawOpen) {
       jawOffset = 20; 
    } else if (this.state === 'grabbing') {
       jawOffset = Math.sin(this.t * 20) * 10 - 20; 
    }
    
    ctx.shadowBlur = 20;
    ctx.shadowColor = NEON_COLORS.RED;
    const bodyColor = '#050010';
    
    // Top Jaw arc
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(-20, -50 - jawOffset, this.weakPoints[0].offsetX, this.weakPoints[0].offsetY - jawOffset);
    ctx.lineTo(this.weakPoints[0].offsetX + 40, this.weakPoints[0].offsetY - jawOffset - 20);
    ctx.lineTo(20, -60);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = NEON_COLORS.RED;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Jaw circuitry
    ctx.beginPath();
    ctx.moveTo(this.weakPoints[0].offsetX + 10, this.weakPoints[0].offsetY - jawOffset - 5);
    ctx.lineTo(this.weakPoints[0].offsetX + 30, this.weakPoints[0].offsetY - jawOffset - 15);
    ctx.strokeStyle = '#aa0000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Top Teeth (neon spikes)
    ctx.beginPath();
    for(let i=0; i<3; i++) {
       const tx = -60 + i*30;
       const ty = -30 - jawOffset;
       ctx.moveTo(tx, ty);
       ctx.lineTo(tx + 15, ty + 25); // Tooth pointing down & in
       ctx.lineTo(tx + 25, ty);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = NEON_COLORS.ORANGE;
    ctx.fill();

    // Bottom Jaw arc
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(-20, 50 + jawOffset, this.weakPoints[1].offsetX, this.weakPoints[1].offsetY + jawOffset);
    ctx.lineTo(this.weakPoints[1].offsetX + 40, this.weakPoints[1].offsetY + jawOffset + 20);
    ctx.lineTo(20, 60);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = NEON_COLORS.RED;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Low Jaw circuitry
    ctx.beginPath();
    ctx.moveTo(this.weakPoints[1].offsetX + 10, this.weakPoints[1].offsetY + jawOffset + 5);
    ctx.lineTo(this.weakPoints[1].offsetX + 30, this.weakPoints[1].offsetY + jawOffset + 15);
    ctx.strokeStyle = '#aa0000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bottom Teeth (neon spikes)
    ctx.beginPath();
    for(let i=0; i<3; i++) {
       const tx = -60 + i*30;
       const ty = 30 + jawOffset;
       ctx.moveTo(tx, ty);
       ctx.lineTo(tx + 15, ty - 25); // Tooth pointing up & in
       ctx.lineTo(tx + 25, ty);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = NEON_COLORS.ORANGE;
    ctx.fill();

    ctx.restore();
  }

  checkHit(bullet: Bullet, engine: any) {
    if (this.state === 'dying' || this.state === 'intro') return false;

    let hit = false;
    
    // Check weak points
    for (const w of this.weakPoints) {
       if (w.active && !w.destroyed) {
          const dx = bullet.pos.x - w.x;
          const dy = bullet.pos.y - w.y;
          if (dx*dx + dy*dy < w.radius * w.radius * 1.5) {
             hit = true;
             
             if (w.role === 'throat_core') {
                // Damage boss
                this.hp -= 35; // good damage per bullet
                engine.score += 250;
                for(let i=0; i<4; i++) engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ffffff', 2));
                
                if (this.hp <= 0 && (this.state as string) !== 'dying') {
                   this.state = 'dying';
                   this.deathTimer = 0;
                }
             } else {
                // Damage jaw or eye
                w.hp -= 1;
                engine.score += 100;
                for(let i=0; i<3; i++) engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, NEON_COLORS.YELLOW, 2));
                
                if (w.hp <= 0) {
                   w.destroyed = true;
                   w.active = false;
                   engine.score += 750;
                   audio.playExplosion();
                   for(let i=0; i<15; i++) engine.particles.push(new Particle(w.x, w.y, NEON_COLORS.ORANGE, 3));
                }
             }
             break; // only hit one thing
          }
       } else if (!w.destroyed && w.role !== 'throat_core') {
          // Hit an inactive weak point
          const dx = bullet.pos.x - w.x;
          const dy = bullet.pos.y - w.y;
          if (dx*dx + dy*dy < w.radius * w.radius) {
             hit = true;
             // Spark but no damage
             engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#aaaaaa', 1));
             break;
          }
       }
    }

    if (!hit) {
       // Check general body hit just for hit flash, no damage unless core is open?
       // Let's just make the main body ignore bullets or flash
       const dx = bullet.pos.x - this.pos.x;
       const dy = bullet.pos.y - this.pos.y;
       if (dx*dx + dy*dy < 10000 && bullet.pos.x > this.pos.x - 50) {
          hit = true;
          this.hitFlashTimer = 5;
          engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#880000', 1));
       }
    }

    return hit;
  }

  getHUDText() {
    let phaseText = 'MAW AT THE EDGE';
    if (this.phase === 2) phaseText = 'DEFEND THE ROCKET';
    if (this.phase === 3) phaseText = 'MAW CORE EXPOSED';
    
    if (this.state === 'grabbing') phaseText = 'ROCKET GRABBED';
    else if (this.state === 'core_open') phaseText = 'MAW CORE EXPOSED';
    else if (this.state === 'dying') phaseText = 'ROCKET EATER DESTROYED';

    return { name: 'ROCKET EATER', phase: phaseText, isCoreOpen: this.state === 'core_open' };
  }

  onRiftBomb(engine: any) {
     if (this.state === 'dying' || this.state === 'intro') return;
     
     if (this.state === 'grabbing' || this.state === 'lunging') {
        // Destroy active jaw parts
        this.weakPoints.forEach(w => {
           if ((w.role === 'upper_jaw' || w.role === 'lower_jaw') && w.active && !w.destroyed) {
              w.hp = 0;
              w.destroyed = true;
              w.active = false;
              for(let i=0; i<10; i++) engine.particles.push(new Particle(w.x, w.y, NEON_COLORS.ORANGE, 3));
           }
        });
        
        // Let update loop handle the recoiling due to 0 active jaws
     } else if (this.state === 'core_open') {
        this.hp -= 200; // Large chunk of damage
        this.hitFlashTimer = 15;
        if (this.hp <= 0 && (this.state as string) !== 'dying') {
           this.state = 'dying';
           this.deathTimer = 0;
        }
     }
  }
}

// Coordinate math helper for laser collision matching
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1)**2 + (y2 - y1)**2;
  if (l2 === 0) return Math.sqrt((px - x1)**2 + (py - y1)**2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1)))**2 + (py - (y1 + t * (y2 - y1)))**2);
}

export class RainbowUnicornBoss implements Boss {
  type = 'boss_unicorn';
  hp = 240;
  maxHp = 240;
  dead = false;

  pos: Vector;
  vel: Vector;
  phase: 1 | 2 | 3 = 1;
  t = 0;

  state: 'intro' | 'active' | 'dying' = 'intro';
  stateTimer = 0;
  introTimer = 0;
  deathTimer = 0;

  // Attack variables
  attackState: 'hover' | 'charging_laser' | 'laser' | 'prismatic_gallop' = 'hover';
  attackTimer = 0;
  vulnerableTimer = 0;
  hitFlashTimer = 0;

  // Bouncing rainbow bombs
  bombs: { x: number; y: number; vx: number; vy: number; bounces: number; timer: number }[] = [];

  // Projectile laser tracking
  laserAngle = 0;
  laserSweepDir = 1;

  constructor() {
    this.pos = new Vector(GAME_WIDTH / 2, -100);
    this.vel = new Vector(0, 0);
  }

  update(engine: any) {
    this.t += 0.05;
    this.stateTimer++;

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.vulnerableTimer > 0) this.vulnerableTimer--;

    const clamped = (window as any).__gravityClampActive;
    const timeScale = clamped ? 0.6 : 1;

    // Intro zooming
    if (this.state === 'intro') {
       this.introTimer += timeScale;
       this.pos.y += (120 - this.pos.y) * 0.05;
       if (this.introTimer > 120) {
          this.state = 'active';
          this.stateTimer = 0;
          this.attackState = 'hover';
          this.attackTimer = 0;
       }
       return;
    }

    // Dying sequence
    if (this.state === 'dying') {
       this.deathTimer++;
       if (this.deathTimer > 150) {
          this.dead = true;
          engine.score += 10000;
          engine.bossDefeatedState = true;
          audio.playExplosion();
          for(let i=0; i<150; i++) {
             engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*120, this.pos.y + (Math.random()-0.5)*120, NEON_COLORS.CYAN, Math.random()*5+2));
             engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*120, this.pos.y + (Math.random()-0.5)*120, NEON_COLORS.MAGENTA, Math.random()*5+2));
             engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*120, this.pos.y + (Math.random()-0.5)*120, NEON_COLORS.YELLOW, Math.random()*5+2));
          }
          // Spawn 6 fuel cans around the unicorn's location as it explodes, scattered
          for (let f = 0; f < 6; f++) {
             const fuelItem = new Item('fuel');
             fuelItem.pos.set(this.pos.x + (Math.random() - 0.5) * 200, this.pos.y + (Math.random() - 0.5) * 60);
             fuelItem.vel.set((Math.random() - 0.5) * 1.5, 1.5);
             engine.items.push(fuelItem);
          }
       } else if (this.deathTimer % 10 === 0) {
          engine.particles.push(new Particle(this.pos.x + (Math.random()-0.5)*80, this.pos.y + (Math.random()-0.5)*80, '#ffffff', 3, undefined, false, 'ring'));
          audio.playExplosion();
       }
       return;
    }

    // HP phase checks
    if (this.hp < this.maxHp * 0.35) this.phase = 3;
    else if (this.hp < this.maxHp * 0.70) this.phase = 2;

    // Update active bouncing rainbow bombs
    this.bombs.forEach((b, index) => {
       b.vy += 0.15; // gravity
       b.x += b.vx;
       b.y += b.vy;
       
       // Handle bouncing along platforms
       let onPlatform = false;
       for (const p of engine.platforms) {
          const pLeft = p[0];
          const pRight = p[0] + p[2];
          const pTop = p[1];
          const pBottom = p[1] + p[3];
          if (b.x >= pLeft && b.x <= pRight && b.y >= pTop && b.y <= pTop + 10 && b.vy > 0) {
             b.y = pTop;
             b.vy = -b.vy * 0.7; // bounce coefficient
             b.bounces++;
             onPlatform = true;
             audio.playExplosion(); // small bounce sound
             for(let i=0; i<5; i++) engine.particles.push(new Particle(b.x, b.y, NEON_COLORS.MAGENTA, 1.5));
             break;
          }
       }

       // Screen wrapping for bombs
       if (b.x > GAME_WIDTH) b.x = 0;
       if (b.x < 0) b.x = GAME_WIDTH;

       // Exploding the bomb after bounces or lifetime timer
       b.timer++;
       if (b.bounces >= 3 || b.timer > 180) {
          // Explode!
          audio.playExplosion();
          for(let i=0; i<15; i++) {
             engine.particles.push(new Particle(b.x, b.y, NEON_COLORS.MAGENTA, Math.random()*3+1));
             engine.particles.push(new Particle(b.x, b.y, NEON_COLORS.CYAN, Math.random()*3+1));
             engine.particles.push(new Particle(b.x, b.y, NEON_COLORS.YELLOW, Math.random()*3+1));
          }
          // Damage player check if in explosion radius
          const pD = Math.sqrt((engine.player.pos.x + 12 - b.x)**2 + (engine.player.pos.y + 18 - b.y)**2);
          if (pD < 40 && !engine.player.dead) {
             engine.die();
          }
          this.bombs.splice(index, 1);
       } else {
          // Continuous damage check for projectile direct hit
          const pD = Math.sqrt((engine.player.pos.x + 12 - b.x)**2 + (engine.player.pos.y + 18 - b.y)**2);
          if (pD < 18 && !engine.player.dead) {
             engine.die();
             this.bombs.splice(index, 1);
          }
       }
    });

    // Sine wave float movement
    if (this.attackState !== 'prismatic_gallop') {
       const targetY = 120 + Math.sin(this.t) * 20;
       this.pos.y += (targetY - this.pos.y) * 0.05;

       let swingRange = this.phase === 3 ? 120 : (this.phase === 2 ? 80 : 50);
       const targetX = GAME_WIDTH / 2 + Math.sin(this.t * 0.5) * swingRange;
       this.pos.x += (targetX - this.pos.x) * 0.05;
    }

    // STATE MACHINE
    this.attackTimer += timeScale;

    if (this.attackState === 'hover') {
       // Just floating, randomly dropping single bombs or moving
       const attackInterval = this.phase === 3 ? 90 : (this.phase === 2 ? 130 : 180);
       
       if (this.attackTimer > attackInterval) {
          this.attackTimer = 0;
          // Choose next attack: Gallop or Laser
          if (Math.random() < 0.4 + this.phase * 0.1) {
             this.attackState = 'prismatic_gallop';
             // Setup starting edge
             this.pos.x = Math.random() > 0.5 ? -100 : GAME_WIDTH + 100;
             this.pos.y = GAME_HEIGHT * 0.3 + Math.random() * GAME_HEIGHT * 0.3;
             this.vel.x = this.pos.x < 0 ? (this.phase === 3 ? 8 : (this.phase === 2 ? 6.5 : 5)) : -(this.phase === 3 ? 8 : (this.phase === 2 ? 6.5 : 5));
             audio.playPowerup(); // gallop indicator
          } else {
             this.attackState = 'charging_laser';
             // Aim laser at player
             const dx = engine.player.pos.x + 12 - this.pos.x;
             const dy = engine.player.pos.y + 18 - this.pos.y;
             this.laserAngle = Math.atan2(dy, dx);
             this.laserSweepDir = Math.random() > 0.5 ? 1 : -1;
             audio.startThrust(); // short charge hum
          }
       } else {
          // Drop random bomb
          const bombOdds = this.phase === 3 ? 0.025 : (this.phase === 2 ? 0.015 : 0.007);
          if (Math.random() < bombOdds && this.bombs.length < 8) {
             this.dropBomb(engine);
          }
       }

    } else if (this.attackState === 'charging_laser') {
       if (this.attackTimer > 50) {
          this.attackState = 'laser';
          this.attackTimer = 0;
       }

    } else if (this.attackState === 'laser') {
       // Sweep laser diagonal
       const sweepSpeed = this.phase === 3 ? 0.012 : (this.phase === 2 ? 0.008 : 0.004);
       this.laserAngle += this.laserSweepDir * sweepSpeed;

       // Damage player if laser intersects player bounds
       const beamRange = 1000;
       const lx2 = this.pos.x + Math.cos(this.laserAngle) * beamRange;
       const ly2 = this.pos.y + Math.sin(this.laserAngle) * beamRange;

       if (!engine.player.dead) {
          const hitPlayer = distToSegment(
             engine.player.pos.x + 12, engine.player.pos.y + 18,
             this.pos.x, this.pos.y,
             lx2, ly2
          );
          if (hitPlayer < 18) {
             engine.die();
          }
       }

       const activeDuration = this.phase === 3 ? 120 : (this.phase === 2 ? 100 : 80);
       if (this.attackTimer > activeDuration) {
          this.attackState = 'hover';
          this.attackTimer = 0;
          this.vulnerableTimer = 120; // 2 seconds vulnerable window!
          audio.stopThrust();
       }

    } else if (this.attackState === 'prismatic_gallop') {
       this.pos.x += this.vel.x * timeScale;
       
       // Spark trail
       if (Math.random() < 0.5) {
          const colors = [NEON_COLORS.CYAN, NEON_COLORS.MAGENTA, NEON_COLORS.YELLOW];
          engine.particles.push(new Particle(this.pos.x, this.pos.y + 10 + (Math.random() - 0.5) * 20, colors[Math.floor(Math.random()*colors.length)], 2, undefined, true));
       }

       // Collide with player
       const dx = engine.player.pos.x + 12 - this.pos.x;
       const dy = engine.player.pos.y + 18 - this.pos.y;
       if (Math.sqrt(dx*dx + dy*dy) < 45 && !engine.player.dead) {
          engine.die();
       }

       // Bounds checking
       const outOfLeft = this.vel.x < 0 && this.pos.x < -140;
       const outOfRight = this.vel.x > 0 && this.pos.x > GAME_WIDTH + 140;
       if (outOfLeft || outOfRight) {
          this.attackState = 'hover';
          this.attackTimer = 0;
          this.pos.x = GAME_WIDTH / 2;
          this.pos.y = -100; // float back in
          this.vulnerableTimer = 90; // vulnerable after gallop overcommits
       }
    }
  }

  dropBomb(engine: any) {
    const vx = (Math.random() - 0.5) * 4;
    const vy = -1 - Math.random() * 2;
    this.bombs.push({
       x: this.pos.x + (this.vel.x > 0 ? -40 : 40),
       y: this.pos.y + 20,
       vx,
       vy,
       bounces: 0,
       timer: 0
    });
    audio.playExplosion();
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === 'intro' && this.stateTimer < 60) {
       ctx.fillStyle = NEON_COLORS.MAGENTA;
       ctx.font = 'bold 20px "Press Start 2P", monospace';
       ctx.textAlign = 'center';
       ctx.fillText("RAINBOW NEON UNICORN", GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
       ctx.fillStyle = NEON_COLORS.CYAN;
       ctx.font = '12px "Press Start 2P", monospace';
       ctx.fillText("SHOOT ITS HORN WHEN EXPOSED", GAME_WIDTH/2, GAME_HEIGHT/2 + 20);
    }

    // Draw active bouncing bombs
    ctx.save();
    this.bombs.forEach(b => {
       ctx.beginPath();
       ctx.arc(b.x, b.y, 8, 0, Math.PI*2);
       const colors = [NEON_COLORS.MAGENTA, NEON_COLORS.CYAN, NEON_COLORS.YELLOW];
       const bColor = colors[Math.floor(performance.now() / 100) % colors.length];
       ctx.fillStyle = bColor;
       ctx.shadowBlur = 10;
       ctx.shadowColor = bColor;
       ctx.fill();
       ctx.strokeStyle = '#fff';
       ctx.lineWidth = 1.5;
       ctx.stroke();
    });
    ctx.restore();

    ctx.save();
    
    // Draw charging line / Laser Warning line
    if (this.attackState === 'charging_laser') {
       const angle = this.laserAngle;
       const lx2 = this.pos.x + Math.cos(angle) * 1000;
       const ly2 = this.pos.y + Math.sin(angle) * 1000;

       ctx.beginPath();
       ctx.moveTo(this.pos.x, this.pos.y);
       ctx.lineTo(lx2, ly2);
       ctx.strokeStyle = `rgba(255, 0, 150, ${0.4 + Math.sin(this.t * 30) * 0.2})`;
       ctx.lineWidth = 2;
       ctx.stroke();

       // Nose glow charging rings
       for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(this.pos.x + Math.cos(angle)*30, this.pos.y + Math.sin(angle)*30, 20 - i*5 + Math.sin(this.t*15)*3, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.8/i})`;
          ctx.lineWidth = 2;
          ctx.stroke();
       }
    }

    // Draw the Laser Beam
    if (this.attackState === 'laser') {
       const lx2 = this.pos.x + Math.cos(this.laserAngle) * 1000;
       const ly2 = this.pos.y + Math.sin(this.laserAngle) * 1000;

       // Rainbow Laser: Outer glow red/magenta, middle green/cyan, core white
       ctx.save();
       ctx.lineCap = 'round';
       
       // Layer 1: magenta massive blurry glow
       ctx.beginPath();
       ctx.moveTo(this.pos.x, this.pos.y);
       ctx.lineTo(lx2, ly2);
       ctx.strokeStyle = NEON_COLORS.MAGENTA;
       ctx.lineWidth = 15;
       ctx.shadowBlur = 20;
       ctx.shadowColor = NEON_COLORS.MAGENTA;
       ctx.stroke();

       // Layer 2: cyan beam
       ctx.beginPath();
       ctx.moveTo(this.pos.x, this.pos.y);
       ctx.lineTo(lx2, ly2);
       ctx.strokeStyle = NEON_COLORS.CYAN;
       ctx.lineWidth = 8;
       ctx.stroke();

       // Layer 3: yellow core
       ctx.beginPath();
       ctx.moveTo(this.pos.x, this.pos.y);
       ctx.lineTo(lx2, ly2);
       ctx.strokeStyle = NEON_COLORS.YELLOW;
       ctx.lineWidth = 4;
       ctx.stroke();

       // Layer 4: white center
       ctx.beginPath();
       ctx.moveTo(this.pos.x, this.pos.y);
       ctx.lineTo(lx2, ly2);
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 2;
       ctx.stroke();

       ctx.restore();
    }

    // Translate to Unicorn center
    let bx = this.pos.x;
    let by = this.pos.y;
    if ((this.phase === 3 || this.state === 'dying') && Math.random() < 0.15) {
       bx += (Math.random()-0.5)*8;
       by += (Math.random()-0.5)*8;
    }
    ctx.translate(bx, by);

    // Is vulnerable or hit flashing
    const isVuln = this.vulnerableTimer > 0;
    const bodyColor = this.hitFlashTimer > 0 ? '#ffffff' : 'rgba(5, 0, 15, 0.9)';
    const outlineColor = isVuln ? '#ffffff' : NEON_COLORS.MAGENTA;
    const hornColor = isVuln ? (Math.floor(performance.now()/50)%2 === 0 ? '#ffffff' : NEON_COLORS.YELLOW) : '#6366f1';

    // Mane pulsing colors
    const maneCycleColors = [NEON_COLORS.RED, NEON_COLORS.ORANGE, NEON_COLORS.YELLOW, NEON_COLORS.GREEN, NEON_COLORS.CYAN, NEON_COLORS.MAGENTA];
    const activeManeColor = maneCycleColors[Math.floor(performance.now()/80) % maneCycleColors.length];

    ctx.shadowBlur = 20;
    ctx.shadowColor = outlineColor;

    // Drawing Unicorn
    // 1. Mane / Tail (Back)
    ctx.beginPath();
    // Neck Back/Mane
    ctx.ellipse(-15, -15, 20, 30, 0.3, 0, Math.PI*2);
    ctx.fillStyle = activeManeColor;
    ctx.shadowColor = activeManeColor;
    ctx.fill();

    // Tail flow
    ctx.beginPath();
    ctx.ellipse(-45, 10, 15, 20, -0.4 + Math.sin(this.t*3)*0.2, 0, Math.PI*2);
    ctx.fillStyle = activeManeColor;
    ctx.fill();

    // 2. Body
    ctx.shadowColor = outlineColor;
    ctx.beginPath();
    // main barrel
    ctx.ellipse(-10, 10, 35, 22, 0, 0, Math.PI*2);
    // neck attachment
    ctx.ellipse(15, -8, 20, 24, -0.4, 0, Math.PI*2);
    // head snout
    ctx.ellipse(30, -22, 18, 12, -0.2, 0, Math.PI*2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Eye
    ctx.beginPath();
    ctx.arc(24, -25, 3, 0, Math.PI*2);
    ctx.fillStyle = isVuln ? '#ff0000' : NEON_COLORS.CYAN;
    ctx.fill();

    // Hooves/Legs
    ctx.save();
    const hopScale = (this.attackState === 'prismatic_gallop') ? Math.sin(this.t * 8) * 10 : 0;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 3.5;
    // Front leg 1
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.lineTo(15 + hopScale, 45);
    ctx.stroke();
    // Back leg 1
    ctx.beginPath();
    ctx.moveTo(-20, 20);
    ctx.lineTo(-25 - hopScale, 45);
    ctx.stroke();
    ctx.restore();

    // 4. THE HORN (Vulnerable target!)
    ctx.beginPath();
    ctx.moveTo(32, -30);
    // Horn points up-left
    ctx.lineTo(48, -55);
    ctx.lineTo(24, -34);
    ctx.closePath();
    ctx.fillStyle = hornColor;
    ctx.shadowColor = hornColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw shield overlay if NOT vulnerable
    if (!isVuln && this.hitFlashTimer > 0) {
       ctx.beginPath();
       ctx.arc(0, 0, 65, 0, Math.PI*2);
       ctx.strokeStyle = `rgba(255, 0, 255, ${0.4 + Math.sin(this.t * 20) * 0.3})`;
       ctx.lineWidth = 3;
       ctx.stroke();
    }

    ctx.restore();
  }

  checkHit(bullet: Bullet, engine: any) {
    if (this.state !== 'active') return false;

    // Check hit on weakpoint: HORN
    const hornX = this.pos.x + 38;
    const hornY = this.pos.y - 42;
    const dx = bullet.pos.x - hornX;
    const dy = bullet.pos.y - hornY;

    if (dx*dx + dy*dy < 1200) { // circular generous hitbox for horn tip (radius ~35)
       if (this.vulnerableTimer > 0) {
          // Weak point is open! Boss takes real damage
          this.hp -= 15;
          engine.score += 200;
          this.hitFlashTimer = 6;
          for(let i=0; i<6; i++) {
             engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ffffff', 2, undefined, false, 'shard'));
             engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, NEON_COLORS.YELLOW, 1.5));
          }
          audio.playExplosion();

          // Check defeat
          if (this.hp <= 0) {
             this.state = 'dying';
             this.deathTimer = 0;
             engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2, NEON_COLORS.CYAN, 0, 'UNICORN DESPAWNED'));
             this.bombs = [];
          }
       } else {
          // Sealed/Immune body hit feedback
          this.hitFlashTimer = 5;
          audio.playExplosion();
          for(let i=0; i<3; i++) {
             engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#aaaaaa', 1.5));
          }
          if (Math.random() < 0.15) {
             engine.particles.push(new Particle(this.pos.x, this.pos.y - 65, '#ff00ff', 0, 'HORN SHIELDED'));
          }
       }
       return true;
    }

    // Default general body overlap check to block bullets
    const bodyDX = bullet.pos.x - this.pos.x;
    const bodyDY = bullet.pos.y - this.pos.y;
    if (bodyDX*bodyDX + bodyDY*bodyDY < 3600) { // radius ~60
       this.hitFlashTimer = 5;
       audio.playExplosion();
       for(let i=0; i<3; i++) {
          engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ff00aa', 1));
       }
       return true;
    }

    return false;
  }

  getHUDText() {
    let phaseText = 'GLITTER HARMONY';
    if (this.phase === 2) phaseText = 'SPARKLE STAMPEDE';
    if (this.phase === 3) phaseText = 'RAINBOW COMA';

    if (this.vulnerableTimer > 0) phaseText = 'HORN EXPOSED!';
    else if (this.attackState === 'laser') phaseText = 'PRISMATIC LASER';
    else if (this.attackState === 'prismatic_gallop') phaseText = 'RAINBOW GALLOP';

    if (this.state === 'dying') phaseText = 'UNICORN EXTINCT';

    return { name: 'RAINBOW COLOURED UNICORN', phase: phaseText, isCoreOpen: this.vulnerableTimer > 0 };
  }

  onRiftBomb(engine: any) {
    if (this.state !== 'active') return;
    this.bombs = []; // clean active bullets
    this.vulnerableTimer = 220; // major vulnerable stun duration!
    this.attackState = 'hover';
    this.attackTimer = 0;
    this.hp -= 45; // significant heavy bomb damage!
    this.hitFlashTimer = 15;
    if (this.hp <= 0) {
       this.state = 'dying';
       this.deathTimer = 0;
    }
  }
}

export class AcidKiwiBoss implements Boss {
  type = 'boss_kiwi';
  hp = 300;
  maxHp = 300;
  dead = false;

  pos: Vector;
  vel: Vector;
  phase: 1 | 2 | 3 = 1;
  t = 0;

  state: 'intro' | 'active' | 'dying' = 'intro';
  stateTimer = 0;
  introTimer = 0;
  deathTimer = 0;

  // Attack/Movement State
  kiwiState: 'hopping' | 'landing_pause' | 'readying_leap' | 'leap_high' | 'dive_bomb' | 'stunned' = 'hopping';
  attackTimer = 0;
  hitFlashTimer = 0;
  vulnerableTimer = 0;
  
  // Acid Blobs
  acidBlobs: { x: number; y: number; vx: number; vy: number; groundTimer: number; active: boolean }[] = [];
  activeShockwaves: { x: number; vx: number; dir: -1 | 1 }[] = [];
  
  jumpTargetX = 0;
  facing = -1; // -1 for left, 1 for right
  turnDelayTimer = 0;

  constructor() {
    this.pos = new Vector(GAME_WIDTH / 2, GAME_HEIGHT - 80);
    this.vel = new Vector(0, 0);
  }

  update(engine: any) {
    this.t += 0.05;
    this.stateTimer++;

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;
    if (this.vulnerableTimer > 0) this.vulnerableTimer--;

    const clamped = (window as any).__gravityClampActive;
    const timeScale = clamped ? 0.6 : 1;

    // Intro zooming down
    if (this.state === 'intro') {
       this.introTimer += timeScale;
       this.pos.y = -50 + (GAME_HEIGHT - 80 - (-50)) * (this.introTimer / 120);
       if (this.introTimer >= 120) {
          this.state = 'active';
          this.stateTimer = 0;
          this.kiwiState = 'hopping';
          this.attackTimer = 0;
          this.pos.y = GAME_HEIGHT - 80;
       }
       return;
    }

    // Dying sequence
    if (this.state === 'dying') {
       this.deathTimer++;
       this.pos.x += Math.sin(this.deathTimer * 5) * 3;
       if (this.deathTimer > 150) {
          this.dead = true;
          engine.score += 12000;
          engine.bossDefeatedState = true;
          audio.playExplosion();
          for(let i=0; i<150; i++) {
             engine.particles.push(new Particle(this.pos.x, this.pos.y, '#a3e635', Math.random()*5+2)); // acid green
             engine.particles.push(new Particle(this.pos.x, this.pos.y, '#f59e0b', Math.random()*5+2)); // brown
             engine.particles.push(new Particle(this.pos.x, this.pos.y, '#ffffff', Math.random()*5+2)); // white
          }
          // Spawn 6 fuel cans around the kiwi's location as it explodes, scattered
          for (let f = 0; f < 6; f++) {
             const fuelItem = new Item('fuel');
             fuelItem.pos.set(this.pos.x + (Math.random() - 0.5) * 200, this.pos.y + (Math.random() - 0.5) * 60);
             fuelItem.vel.set((Math.random() - 0.5) * 1.5, 1.5);
             engine.items.push(fuelItem);
          }
       } else if (this.deathTimer % 12 === 0) {
          engine.particles.push(new Particle(this.pos.x, this.pos.y, '#a3e635', 4, undefined, false, 'ring'));
          audio.playExplosion();
       }
       return;
    }

    // Phase checks
    if (this.hp < this.maxHp * 0.35) this.phase = 3;
    else if (this.hp < this.maxHp * 0.70) this.phase = 2;

    // Update acid blobs (puddles)
    this.acidBlobs.forEach((ab, index) => {
       if (ab.active) {
          // Falling state
          ab.x += ab.vx;
          ab.y += ab.vy;
          ab.vy += 0.12; // gravity

          // Collision with floor and platforms
          let hitFloor = false;
          // check platforms
          for (const p of engine.platforms) {
             const pLeft = p[0];
             const pRight = p[0] + p[2];
             const pTop = p[1];
             if (ab.x >= pLeft && ab.x <= pRight && ab.y >= pTop && ab.y <= pTop + 10 && ab.vy > 0) {
                ab.y = pTop;
                ab.active = false; // turn into puddle
                ab.vx = 0;
                ab.vy = 0;
                hitFloor = true;
                break;
             }
          }

          if (!hitFloor && ab.y >= GAME_HEIGHT - 20) {
             ab.y = GAME_HEIGHT - 20;
             ab.active = false;
             ab.vx = 0;
             ab.vy = 0;
          }

          // Damage player on contact
          const dx = engine.player.pos.x + 12 - ab.x;
          const dy = engine.player.pos.y + 18 - ab.y;
          if (dx*dx + dy*dy < 256 && !engine.player.dead) { // 16px radius
             engine.die();
             this.acidBlobs.splice(index, 1);
          }
       } else {
          // Puddle state
          ab.groundTimer += timeScale;
          
          // Damage player standing in puddle
          const dx = engine.player.pos.x + 12 - ab.x;
          const dy = engine.player.pos.y + 36 - ab.y; // foot level
          if (Math.abs(dx) < 22 && dy >= -5 && dy < 15 && !engine.player.dead) {
             engine.die();
          }

          const maxPuddleTimer = this.phase === 3 ? 240 : (this.phase === 2 ? 180 : 120);
          if (ab.groundTimer > maxPuddleTimer) {
             this.acidBlobs.splice(index, 1);
          }
       }
    });

    // Update active shockwaves traveling across floor
    const groundLevel = GAME_HEIGHT - 20;
    this.activeShockwaves.forEach((sw) => {
       sw.x += sw.vx * timeScale;
       
       // Spawn actual dust/flame particles in real-time as it sweeps the room
       if (engine.frameCount % 2 === 0) {
          const p = new Particle(sw.x, groundLevel - 5, '#ef4444', 2.5);
          p.vel.set((Math.random() - 0.5) * 2, -1 - Math.random() * 2);
          engine.particles.push(p);
       }

       // Hit player checks
       if (!engine.player.dead && Math.abs(engine.player.pos.y + 36 - groundLevel) < 22) {
          const px = engine.player.pos.x + 12;
          if (Math.abs(px - sw.x) < 24) {
             engine.die(); // hit by moving shockwave sweep!
          }
       }
    });
    this.activeShockwaves = this.activeShockwaves.filter(sw => sw.x >= 0 && sw.x <= GAME_WIDTH);

    // STATE MACHINE
    this.attackTimer += timeScale;

    // Orientation: face the player horizontal with turning delay
    if (this.kiwiState !== 'stunned' && this.kiwiState !== 'dive_bomb' && this.kiwiState !== 'leap_high') {
       const desiredFacing = (engine.player.pos.x + 12 < this.pos.x) ? -1 : 1;
       if (desiredFacing !== this.facing) {
          this.turnDelayTimer += timeScale;
          const turnTimeRequired = this.phase === 3 ? 25 : (this.phase === 2 ? 35 : 55); // slower turn in earlier phases
          if (this.turnDelayTimer >= turnTimeRequired) {
             this.facing = desiredFacing;
             this.turnDelayTimer = 0;
          }
       } else {
          this.turnDelayTimer = 0;
       }
    }

    if (this.kiwiState === 'hopping') {
       // Hop left/right or follow player
       this.vel.y += 0.25; // gravity
       this.pos.x += this.vel.x * timeScale;
       this.pos.y += this.vel.y * timeScale;

       // Screen wrapping for kiwi
       if (this.pos.x > GAME_WIDTH + 40) this.pos.x = -40;
       if (this.pos.x < -40) this.pos.x = GAME_WIDTH + 40;

       // Land on platforms or floor
       let landed = false;
       for (const p of engine.platforms) {
          const pLeft = p[0];
          const pRight = p[0] + p[2];
          const pTop = p[1];
          // Scaled offset for 1.5x kiwi size
          if (this.pos.x >= pLeft - 30 && this.pos.x <= pRight + 30 && this.pos.y >= pTop - 65 && this.pos.y <= pTop - 35 && this.vel.y > 0) {
             this.pos.y = pTop - 55;
             this.vel.set(0, 0);
             landed = true;
             break;
          }
       }

       if (!landed && this.pos.y >= GAME_HEIGHT - 80) {
          this.pos.y = GAME_HEIGHT - 80;
          this.vel.set(0, 0);
          landed = true;
       }

       if (landed) {
          this.kiwiState = 'landing_pause';
          this.attackTimer = 0;
          audio.playExplosion(); // thud slam

          // Create floor shockwave
          if (this.phase >= 2 || Math.random() < 0.5) {
             this.spawnShockwave(engine);
          }
       }

    } else if (this.kiwiState === 'landing_pause') {
       const pauseDuration = this.phase === 3 ? 20 : (this.phase === 2 ? 35 : 55);
       if (this.attackTimer > pauseDuration) {
          this.attackTimer = 0;
          // Choose whether to leap high (for dive) or standard hop
          const launchDiveChance = this.phase === 3 ? 0.45 : (this.phase === 2 ? 0.35 : 0.0);
          if (Math.random() < launchDiveChance) {
             this.kiwiState = 'readying_leap';
          } else {
             this.kiwiState = 'hopping';
             // Jump in direction of player
             const dir = (engine.player.pos.x + 12 < this.pos.x) ? -1 : 1;
             this.vel.x = dir * (this.phase === 3 ? 4.5 : (this.phase === 2 ? 3.5 : 2.5));
             
             // If player is higher up on platforms, make a high leap to ascend
             const playerAbove = engine.player.pos.y + 18 < this.pos.y;
             if (playerAbove) {
                this.vel.y = -10 - Math.random() * 5; // high climb jump
             } else {
                this.vel.y = -6 - Math.random() * 3;
             }
             
             // Splat acid some times
             if (Math.random() < 0.4 + this.phase * 0.15) {
                this.spitAcid(engine);
             }
          }
       }

    } else if (this.kiwiState === 'readying_leap') {
       // Squash animation preparatory wiggle
       if (this.attackTimer > 30) {
          this.kiwiState = 'leap_high';
          this.attackTimer = 0;
          this.vel.y = -18; // huge exit leap vertical speed
          audio.playPowerup();
       }

    } else if (this.kiwiState === 'leap_high') {
       this.pos.y += this.vel.y * timeScale;
       if (this.pos.y < -120) {
          // Off screen! Move horizontally to align above player
          this.kiwiState = 'dive_bomb';
          this.attackTimer = 0;
          this.jumpTargetX = engine.player.pos.x + 12;
       }

    } else if (this.kiwiState === 'dive_bomb') {
       // Follow player horizontally slightly, then dive down fast!
       this.pos.x += (this.jumpTargetX - this.pos.x) * 0.1;
       
       if (this.attackTimer > 50) {
          // DIVE!
          this.pos.y += 18 * timeScale; // warp speed dive vertical
          
          // Collide with player
          const dx = engine.player.pos.x + 12 - this.pos.x;
          const dy = engine.player.pos.y + 18 - this.pos.y;
          if (Math.sqrt(dx*dx + dy*dy) < 90 && !engine.player.dead) {
             engine.die();
          }

          // Reach level ground or platform
          if (this.pos.y >= GAME_HEIGHT - 80) {
             this.pos.y = GAME_HEIGHT - 80;
             this.kiwiState = 'stunned';
             this.attackTimer = 0;
             this.vulnerableTimer = this.phase === 3 ? 120 : (this.phase === 2 ? 150 : 180); // exposed stunning stun
             audio.playExplosion(); // epic crash
             
             // Giant splash acid spikes left & right
             this.spawnGiantAcidSplash(engine);
          }
       }

    } else if (this.kiwiState === 'stunned') {
       // Exposure vulnerable state! Faceplanted, rump rear up
       if (this.vulnerableTimer <= 0) {
          this.kiwiState = 'hopping';
          this.attackTimer = 0;
          this.pos.y = GAME_HEIGHT - 80;
       }
    }
  }

  spitAcid(engine: any) {
    const splashCount = this.phase === 3 ? 3 : (this.phase === 2 ? 2 : 1);
    for(let i=0; i<splashCount; i++) {
       const vx = -this.facing * (1.5 + Math.random() * 2) + (i - (splashCount-1)/2)*0.8;
       const vy = -3 - Math.random() * 2;
       this.acidBlobs.push({
          x: this.pos.x,
          y: this.pos.y + 15, // Adjusted for 1.5x height
          vx,
          vy,
          groundTimer: 0,
          active: true
       });
    }
    audio.playShoot(); // spit audio cue
  }

  spawnShockwave(engine: any) {
    const shockLeftX = this.pos.x - 45;
    const shockRightX = this.pos.x + 45;
    const groundLevel = this.pos.y + 50; // Adjusted for 1.5x height

    // Shockwave particle clusters traveling left & right
    for (let i = 0; i < 6; i++) {
       const pLeft = new Particle(shockLeftX, groundLevel, '#ef4444', 2.5);
       pLeft.vel.x = -4 - Math.random() * 2;
       pLeft.vel.y = 0;
       engine.particles.push(pLeft);

       const pRight = new Particle(shockRightX, groundLevel, '#ef4444', 2.5);
       pRight.vel.x = 4 + Math.random() * 2;
       pRight.vel.y = 0;
       engine.particles.push(pRight);
    }
    
    // Register traveling waves
    this.activeShockwaves.push({ x: shockLeftX, vx: -5, dir: -1 });
    this.activeShockwaves.push({ x: shockRightX, vx: 5, dir: 1 });
  }

  spawnGiantAcidSplash(engine: any) {
    for(let i=0; i<8; i++) {
       const vx = (Math.random() - 0.5) * 8;
       const vy = -2 - Math.random() * 5;
       this.acidBlobs.push({
          x: this.pos.x,
          y: this.pos.y + 30, // Adjusted for 1.5x height
          vx,
          vy,
          groundTimer: 0,
          active: true
       });
    }
    // Shake screen!
    engine.screenPulse = 20;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === 'intro' && this.stateTimer < 60) {
       ctx.fillStyle = '#a3e635'; // acid yellow-green
       ctx.font = 'bold 20px "Press Start 2P", monospace';
       ctx.textAlign = 'center';
       ctx.fillText("GIANT ACID KIWI BIRD", GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
       ctx.fillStyle = NEON_COLORS.CYAN;
       ctx.font = '12px "Press Start 2P", monospace';
       ctx.fillText("FLANK AND SHOOT ITS REAR COIL", GAME_WIDTH/2, GAME_HEIGHT/2 + 20);
    }

    // Draw active acid blobs/puddles
    ctx.save();
    this.acidBlobs.forEach(ab => {
       ctx.beginPath();
       if (ab.active) {
          ctx.arc(ab.x, ab.y, 6, 0, Math.PI*2);
          ctx.fillStyle = '#a3e635';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#a3e635';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
       } else {
          const bouncePulse = Math.sin(this.t * 10 + ab.x) * 2;
          ctx.ellipse(ab.x, ab.y, 16 + bouncePulse, 4 + bouncePulse*0.2, 0, 0, Math.PI, true);
          ctx.fillStyle = 'rgba(163, 230, 53, 0.7)';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#a3e635';
          ctx.fill();
          ctx.strokeStyle = '#a3e635';
          ctx.lineWidth = 1.5;
          ctx.stroke();
       }
    });
    ctx.restore();

    // Draw Dive-bomb target reticle
    if (this.kiwiState === 'dive_bomb' && this.attackTimer < 50) {
       ctx.save();
       ctx.beginPath();
       ctx.arc(this.pos.x, GAME_HEIGHT - 35, 35 - (this.attackTimer*0.5), 0, Math.PI*2);
       ctx.strokeStyle = '#ef4444';
       ctx.lineWidth = 3;
       ctx.shadowBlur = 15;
       ctx.shadowColor = '#ef4444';
       ctx.stroke();
       
       ctx.beginPath();
       ctx.moveTo(this.pos.x - 45, GAME_HEIGHT - 35);
       ctx.lineTo(this.pos.x + 45, GAME_HEIGHT - 35);
       ctx.moveTo(this.pos.x, GAME_HEIGHT - 80);
       ctx.lineTo(this.pos.x, GAME_HEIGHT + 10);
       ctx.strokeStyle = '#ef4444';
       ctx.lineWidth = 1;
       ctx.stroke();
       ctx.restore();
    }

    // Translation setup
    ctx.save();
    let bx = this.pos.x;
    let by = this.pos.y;
    if ((this.phase === 3 || this.state === 'dying') && Math.random() < 0.15) {
       bx += (Math.random()-0.5)*8;
       by += (Math.random()-0.5)*8;
    }
    ctx.translate(bx, by);

    // Squash & Stretch - Scaled up 50% (base 1.5)
    let scaleX = 1.5;
    let scaleY = 1.5;
    if (this.kiwiState === 'readying_leap') {
       scaleX = 1.5 * 1.25;
       scaleY = 1.5 * 0.75;
    } else if (this.kiwiState === 'leap_high' || (this.kiwiState === 'dive_bomb' && this.attackTimer >= 50)) {
       scaleX = 1.5 * 0.8;
       scaleY = 1.5 * 1.25;
    } else if (this.kiwiState === 'stunned') {
       scaleX = 1.5 * 1.2;
       scaleY = 1.5 * 0.7;
       ctx.rotate(this.facing === 1 ? -0.4 : 0.4);
    }
    ctx.scale(scaleX, scaleY);

    const isVuln = this.vulnerableTimer > 0;
    const bodyColor = this.hitFlashTimer > 0 ? '#ffffff' : 'rgba(92, 59, 29, 0.95)'; // fuzzy kiwi brown
    const outlineColor = isVuln ? '#a3e635' : NEON_COLORS.GREEN;

    ctx.shadowBlur = 20;
    ctx.shadowColor = outlineColor;

    // Drawing Kiwi
    // 1. Core Round Body (fuzzy styling)
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI*2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Fuzzy spiky outline accent lines
    ctx.save();
    ctx.beginPath();
    for(let a=0; a<Math.PI*2; a += Math.PI/10) {
       const rx = Math.cos(a) * 38;
       const ry = Math.sin(a) * 38;
       ctx.moveTo(rx, ry);
       ctx.lineTo(rx * 1.08, ry * 1.08);
    }
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. Beak (huge orange neon pointer)
    ctx.save();
    ctx.scale(this.facing, 1);
    ctx.beginPath();
    ctx.moveTo(15, -10);
    ctx.lineTo(55, 10);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fillStyle = '#f97316'; // glowing safety orange
    ctx.shadowColor = '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Long eye
    ctx.beginPath();
    ctx.ellipse(8, -12, 5, 2, 0.1, 0, Math.PI*2);
    ctx.fillStyle = isVuln ? '#ef4444' : '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(isVuln ? 10 : 8, -12, 1.5, 0, Math.PI*2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    // 3. GLOWING TAIL CORE / WEAK SPOT (Vulnerable rear target!)
    ctx.save();
    ctx.scale(-this.facing, 1); // Flip horizontally from head
    
    const weakSpotColor = isVuln ? '#a3e635' : 'rgba(64, 44, 22, 0.8)';
    ctx.beginPath();
    ctx.arc(38, 12, isVuln ? 10 + Math.sin(this.t * 15) * 3 : 7, 0, Math.PI*2);
    ctx.fillStyle = weakSpotColor;
    ctx.shadowColor = isVuln ? '#a3e635' : 'rgba(0,0,0,0)';
    ctx.shadowBlur = isVuln ? 15 : 0;
    ctx.fill();
    ctx.strokeStyle = isVuln ? '#fff' : outlineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner coil target rings
    if (isVuln) {
       ctx.beginPath();
       ctx.arc(38, 12, 4, 0, Math.PI*2);
       ctx.fillStyle = '#ffffff';
       ctx.fill();
    }
    ctx.restore();

    // 4. Legs/Feet
    ctx.beginPath();
    ctx.moveTo(-15, 30);
    ctx.lineTo(-20, 44);
    ctx.moveTo(10, 30);
    ctx.lineTo(15, 44);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (!isVuln && this.hitFlashTimer > 0) {
       ctx.beginPath();
       ctx.arc(30 * this.facing, -5, 40, -Math.PI/2, Math.PI/2, this.facing < 0);
       ctx.strokeStyle = `rgba(163, 230, 53, ${0.4 + Math.sin(this.t * 20) * 0.3})`;
       ctx.lineWidth = 3.5;
       ctx.stroke();
    }

    ctx.restore();
  }

  checkHit(bullet: Bullet, engine: any) {
    if (this.state !== 'active') return false;

    // Check hit on weakpoint: GLOWING TAIL CORE (on rear edge) - Scaled 50% larger
    const tailX = this.pos.x - (57 * this.facing); // 38 * 1.5 = 57
    const tailY = this.pos.y + 18; // 12 * 1.5 = 18

    const dx = bullet.pos.x - tailX;
    const dy = bullet.pos.y - tailY;

    if (dx*dx + dy*dy < 2500) { // generous radius ~50
       const damage = this.vulnerableTimer > 0 ? 15 : 10;
       this.hp -= damage;
       engine.score += 250;
       this.hitFlashTimer = 6;
       for(let i=0; i<6; i++) {
          engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ffffff', 2, undefined, false, 'shard'));
          engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#a3e635', 1.5));
       }
       audio.playExplosion();

       if (this.vulnerableTimer <= 0 && Math.random() < 0.25) {
          engine.particles.push(new Particle(this.pos.x, this.pos.y - 90, '#a3e635', 0, 'FLANK HIT!'));
       }

       if (this.hp <= 0) {
          this.state = 'dying';
          this.deathTimer = 0;
          engine.particles.push(new Particle(GAME_WIDTH/2, GAME_HEIGHT/2, '#a3e635', 0, 'KIWI DESPAWNED'));
          this.acidBlobs = [];
       }
       return true;
    }

    // Default body blocking - Scaled 50% larger
    const bodyDX = bullet.pos.x - this.pos.x;
    const bodyDY = bullet.pos.y - this.pos.y;
    if (bodyDX*bodyDX + bodyDY*bodyDY < 5184) { // radius ~72 (48 * 1.5)
       this.hitFlashTimer = 5;
       audio.playExplosion();
       for(let i=0; i<3; i++) {
          engine.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ef4444', 1));
       }
       return true;
    }

    return false;
  }

  getHUDText() {
    let phaseText = 'BOUNCY FUZZBALL';
    if (this.phase === 2) phaseText = 'ACID FLURRY';
    if (this.phase === 3) phaseText = 'TOXIC MELTDOWN';

    if (this.vulnerableTimer > 0) phaseText = 'TAIL CORE EXPOSED!';
    else if (this.kiwiState === 'dive_bomb') phaseText = 'DIVE SQUASH TARGET!';
    else if (this.kiwiState === 'stunned') phaseText = 'STUNNED!';

    if (this.state === 'dying') phaseText = 'KIWI DESTROYED';

    return { name: 'GIANT ACID KIWI BIRD', phase: phaseText, isCoreOpen: this.vulnerableTimer > 0 };
  }

  onRiftBomb(engine: any) {
    if (this.state !== 'active') return;
    this.acidBlobs = []; // clean hazards
    this.vulnerableTimer = 260; // long stunned exposed state
    this.kiwiState = 'stunned';
    this.attackTimer = 0;
    this.hp -= 60; // hefty damage
    this.hitFlashTimer = 15;
    if (this.hp <= 0) {
       this.state = 'dying';
       this.deathTimer = 0;
    }
  }
}

