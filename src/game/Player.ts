import { Vector } from './Vector';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, PLATFORMS_LAYOUT, ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS } from './Constants';
import { audio } from './Audio';
import { input } from './Input';
import { Particle } from './Particle';
import { Bullet } from './Bullet';

export class Player {
  pos: Vector;
  vel: Vector;
  width = 24;
  height = 36;
  facing = 1; // 1 for right, -1 for left
  isGrounded = false;
  hovering = false;
  carryingItem: any = null;
  lastShot = 0;
  dead = false;
  walkAnim = 0;
  waveTimer = 0;
  
  constructor() {
    this.pos = new Vector(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    this.vel = new Vector(0, 0);
  }

  update(particles: Particle[], bullets: Bullet[]) {
    if (this.dead) return;

    this.isGrounded = false;
    this.hovering = false;

    // Movement
    const accel = 0.5;
    const maxSpeed = 3.5;
    
    if (input.isLeft()) {
      this.vel.x -= accel;
      this.facing = -1;
    } else if (input.isRight()) {
      this.vel.x += accel;
      this.facing = 1;
    } else {
      this.vel.x *= 0.8; // friction
    }

    if (input.isUp()) {
      this.vel.y -= 0.5;
      this.hovering = true;
      if (Math.random() < 0.8) {
        // Find nozzle position based on player facing direction
        // Jetpack is at x=-14 to -6 (center -10) relative to player center.
        const nozzleX = this.pos.x + this.width/2 + (this.facing === 1 ? -10 : 10);
        const nozzleY = this.pos.y + this.height/2 + 10;
        
        // Spawn thrust particle
        particles.push(new Particle(nozzleX + (Math.random() - 0.5) * 4, nozzleY, NEON_COLORS.CYAN, 1, undefined, true));
        
        // Occasional bright white core thrust
        if (Math.random() < 0.4) {
          particles.push(new Particle(nozzleX + (Math.random() - 0.5) * 2, nozzleY + 2, '#ffffff', 1, undefined, true));
        }
      }
      audio.startThrust();
    } else {
      audio.stopThrust();
    }

    // Limit speeds
    if (this.vel.x > maxSpeed) this.vel.x = maxSpeed;
    if (this.vel.x < -maxSpeed) this.vel.x = -maxSpeed;
    if (this.vel.y > 7) this.vel.y = 7;
    if (this.vel.y < -5) this.vel.y = -5;

    // Apply gravity
    this.vel.y += GRAVITY;

    // Update position
    this.pos.add(this.vel);

    // Screen wrap X
    if (this.pos.x > GAME_WIDTH) this.pos.x = -this.width;
    if (this.pos.x < -this.width) this.pos.x = GAME_WIDTH;

    // Screen boundaries Y
    if (this.pos.y < 0) {
      this.pos.y = 0;
      this.vel.y = 0;
    }

    // Platform collisions
    for (const p of PLATFORMS_LAYOUT) {
      if (
        this.vel.y > 0 && 
        this.pos.x + this.width - 4 > p[0] && 
        this.pos.x + 4 < p[0] + p[2] && 
        this.pos.y + this.height >= p[1] && 
        this.pos.y + this.height <= p[1] + 12 // fall tolerance
      ) {
        this.pos.y = p[1] - this.height;
        this.vel.y = 0;
        this.isGrounded = true;
      }
    }
    
    // Walk animation logic
    if (this.isGrounded && Math.abs(this.vel.x) > 0.1) {
      this.walkAnim += Math.abs(this.vel.x) * 0.15;
    } else {
      // Return to neutral stance when stopped
      this.walkAnim = 0;
    }
    
    if (this.waveTimer > 0) {
      this.waveTimer--;
    }

    // Shooting
    if (input.isFire() && Date.now() - this.lastShot > 150) {
      this.lastShot = Date.now();
      audio.playShoot();
      
      // Calculate gun tip position
      const gunTipX = this.facing === 1 ? this.pos.x + 26 : this.pos.x - 2;
      const gunTipY = this.pos.y + 20;

      // Bullet length is 50, trailing behind its x pos. Propel start pos ahead so the tail begins at gun tip.
      const bulletFrontX = gunTipX + (this.facing * 50);
      
      bullets.push(new Bullet(bulletFrontX, gunTipY, this.facing));
    }
    
    // Carrying item logic mapped in GameEngine (where items are)
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;

    ctx.save();
    
    // Translate to center of player to manage flipping
    ctx.translate(this.pos.x + this.width/2, this.pos.y + this.height/2);
    ctx.scale(this.facing, 1);

    // Jetpack Flame
    if (this.hovering) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = NEON_COLORS.CYAN;
      ctx.fillStyle = NEON_COLORS.CYAN;
      ctx.beginPath();
      // Center of backpack is -10. Bottom is 10.
      ctx.moveTo(-14, 10);
      ctx.lineTo(-10, 20 + Math.random() * 12); // flickering flame
      ctx.lineTo(-6, 10);
      ctx.fill();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Base style for body parts
    ctx.fillStyle = '#050510'; // Block out background elements to prevent transparency clash
    ctx.strokeStyle = NEON_COLORS.CYAN;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = NEON_COLORS.CYAN;

    // Backpack
    ctx.beginPath();
    ctx.rect(-14, -6, 8, 16);
    ctx.fill(); ctx.stroke();

    // Body (Chunkier torso)
    ctx.beginPath();
    ctx.moveTo(-6, -4);  // Top back
    ctx.lineTo(8, -4);   // Top front
    ctx.lineTo(10, 10);  // Bottom front
    ctx.lineTo(-6, 10);  // Bottom back
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(2, -10, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    // Glowing Visor
    ctx.beginPath();
    ctx.moveTo(2, -10);
    ctx.lineTo(10, -10);
    ctx.strokeStyle = '#ffffff'; // Super bright hot center
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON_COLORS.CYAN;
    ctx.stroke();

    // Reset lines for legs
    ctx.strokeStyle = NEON_COLORS.CYAN;
    ctx.lineWidth = 4;
    ctx.shadowColor = NEON_COLORS.CYAN;
    ctx.shadowBlur = 10;

    // Legs with walk cycle
    const legSwing = Math.sin(this.walkAnim) * 8;
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(-3, 10);
    ctx.lineTo(-3 - legSwing, 18);
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(5 + legSwing, 18);
    ctx.stroke();

    // Arm (waving or pointing)
    ctx.beginPath();
    ctx.lineWidth = 3;
    if (this.waveTimer > 0) {
      // Waving
      const waveAngle = Math.sin(this.waveTimer * 0.3) * 0.8 - 0.4;
      ctx.moveTo(2, -2);
      ctx.lineTo(2 + Math.sin(waveAngle) * 10, -2 - Math.cos(waveAngle) * 10);
    } else {
      // Pointing gun
      ctx.moveTo(2, -2);
      ctx.lineTo(8, -2);
      ctx.lineTo(14, 2); // gun frame
    }
    ctx.stroke();

    ctx.restore();
  }
}
