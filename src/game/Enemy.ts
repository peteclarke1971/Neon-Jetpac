import { Vector } from './Vector';
import { GAME_WIDTH, GAME_HEIGHT, ENEMY_TYPES, NEON_COLORS } from './Constants';

export class Enemy {
  pos: Vector;
  vel: Vector;
  type: any;
  width = 24;
  height = 24;
  t = 0; // time offset for sine waves
  dead = false;
  dirX = 1;
  trail: {x: number, y: number}[] = [];

  constructor(typeDef: any) {
    if (typeof typeDef === 'number') {
      this.type = ENEMY_TYPES[typeDef % ENEMY_TYPES.length];
    } else {
      this.type = typeDef;
    }
    
    this.dirX = Math.random() > 0.5 ? 1 : -1;
    let startX = this.dirX === 1 ? -40 : GAME_WIDTH + 40;
    let startY = (Math.random() * (GAME_HEIGHT - 100)) + 20;
    
    this.pos = new Vector(startX, startY);
    this.vel = new Vector(this.type.speed * this.dirX, 0);
    this.t = Math.random() * 1000;
  }

  update(player: any, platforms: number[][]) {
    this.t += 0.05;
    
    this.trail.push({x: this.pos.x, y: this.pos.y});
    if (this.trail.length > 8) {
      this.trail.shift();
    }
    
    // Default collision flags
    let checkPlatforms = false;
    let bouncePlatforms = false;

    if (this.type.name === 'meteor' || this.type.name === 'classic_asteroid' || this.type.name === 'classic_dart') {
      this.pos.add(this.vel);
      checkPlatforms = true;
    } else if (this.type.name === 'classic_fuzzball' || this.type.name === 'classic_cross') {
      if (this.vel.y === 0) {
        // init diagonal
        this.vel.y = this.type.speed * (Math.random() > 0.5 ? 1 : -1);
        this.vel.x = this.type.speed * this.dirX;
      }
      this.pos.add(this.vel);
      bouncePlatforms = true;
    } else if (this.type.name === 'classic_bubble') {
      this.vel.y = Math.sin(this.t) * 1.5;
      this.pos.add(this.vel);
      bouncePlatforms = true; // gentle bounce
    } else if (this.type.name === 'classic_fighter') {
      if (this.t < 2) {
        // hover briefly, align to player height
        let targetY = player.pos.y;
        if (this.pos.y < targetY) this.pos.y += 1;
        if (this.pos.y > targetY) this.pos.y -= 1;
      } else {
        // attack
        this.pos.add(this.vel);
        checkPlatforms = true;
      }
    } else if (this.type.name === 'saucer' || this.type.name === 'classic_saucer') {
      this.vel.y = Math.sin(this.t) * 2;
      this.pos.add(this.vel);
    } else if (this.type.name === 'spinner') {
      this.vel.y = Math.cos(this.t * 2) * 3;
      this.pos.add(this.vel);
    } else if (this.type.name === 'hunter') {
      this.vel.y = Math.sin(this.t) * 1.5 + Math.cos(this.t * 0.5);
      this.pos.add(this.vel);
    } else if (this.type.name === 'classic_blob') {
      // Swarm toward player
      this.pos.add(this.vel);
      if (this.pos.y < player.pos.y) this.pos.y += 0.5;
      if (this.pos.y > player.pos.y) this.pos.y -= 0.5;
      bouncePlatforms = true;
    }

    // screen wrap horizontally
    if (this.vel.x > 0 && this.pos.x > GAME_WIDTH + 50) this.pos.x = -50;
    if (this.vel.x < 0 && this.pos.x < -50) this.pos.x = GAME_WIDTH + 50;

    // bounce vertical bounds
    if (this.pos.y < 0 || this.pos.y > GAME_HEIGHT - 30) {
      if (this.type.name === 'classic_dart' || this.type.name === 'classic_asteroid' || this.type.name === 'classic_fighter') {
        this.dead = true;
      } else {
        this.vel.y *= -1;
        this.pos.y = Math.min(Math.max(this.pos.y, 0), GAME_HEIGHT - 30);
      }
    }

    // Platform collisions
    if (checkPlatforms || bouncePlatforms) {
      for (const p of platforms) {
        if (
          this.pos.x + this.width > p[0] &&
          this.pos.x < p[0] + p[2] &&
          this.pos.y + this.height > p[1] &&
          this.pos.y < p[1] + p[3]
        ) {
          if (checkPlatforms) {
            this.dead = true; // Explode on platform
          } else if (bouncePlatforms) {
            // simple bounce
            if (this.pos.y + this.height / 2 < p[1] || this.pos.y + this.height / 2 > p[1] + p[3]) {
              this.vel.y *= -1; // flip Y
            } else {
              this.vel.x *= -1; // flip X
            }
          }
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    
    ctx.save();
    
    // Draw motion trail
    if (this.trail.length > 0) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x + this.width/2, this.trail[0].y + this.height/2);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x + this.width/2, this.trail[i].y + this.height/2);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.type.color;
      ctx.globalAlpha = 0.3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    ctx.shadowBlur = 15;
    ctx.shadowColor = this.type.color;
    ctx.strokeStyle = this.type.color;
    ctx.fillStyle = '#050510'; // Block out bg
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    ctx.translate(this.pos.x + this.width/2, this.pos.y + this.height/2);
    
    const facing = this.vel.x < 0 ? -1 : 1;
    ctx.scale(facing, 1);
    
    if (this.type.name === 'spinner') {
      ctx.rotate(this.t * 5);
    }
    
    ctx.beginPath();
    
    if (this.type.name === 'meteor' || this.type.name === 'classic_asteroid') {
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.moveTo(-12, -6); ctx.lineTo(12, 6);
      ctx.moveTo(-6, 12); ctx.lineTo(6, -12);
    } else if (this.type.name === 'saucer' || this.type.name === 'classic_saucer') {
      ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -8, 8, Math.PI, 0);
      ctx.fill();
    } else if (this.type.name === 'spinner') {
      ctx.rect(-10, -10, 20, 20);
      ctx.fill();
      ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
      ctx.moveTo(0, -14); ctx.lineTo(0, 14);
    } else if (this.type.name === 'hunter') {
      ctx.moveTo(14, 0);
      ctx.lineTo(-14, 10);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, -10);
      ctx.closePath();
      ctx.fill();
    } else if (this.type.name === 'classic_fuzzball') {
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        let a = (Math.PI / 4) * i;
        ctx.moveTo(Math.cos(a)*10, Math.sin(a)*10);
        ctx.lineTo(Math.cos(a)*16, Math.sin(a)*16);
      }
    } else if (this.type.name === 'classic_bubble') {
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -4, 4, 0, Math.PI); // highlight arc inside
    } else if (this.type.name === 'classic_fighter') {
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, 12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, -12);
      ctx.closePath();
      ctx.fill();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-20, 0); // exhaust
    } else if (this.type.name === 'classic_cross') {
      ctx.rotate(this.t * 5); // spin
      ctx.moveTo(-15, -15); ctx.lineTo(15, 15);
      ctx.moveTo(-15, 15); ctx.lineTo(15, -15);
    } else if (this.type.name === 'classic_dart') {
      ctx.moveTo(20, 0);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type.name === 'classic_blob') {
      let r = 10 + Math.sin(this.t * 5) * 3;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
      ctx.moveTo(0, -r); ctx.lineTo(0, r);
    }
    
    ctx.stroke();
    
    // Core highlight
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}
