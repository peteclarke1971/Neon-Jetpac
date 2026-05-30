import { Vector } from './Vector';
import { GAME_WIDTH, NEON_COLORS } from './Constants';

export class Bullet {
  pos: Vector;
  vel: Vector;
  life = 33;
  width = 50;
  height = 6;
  t = 0;

  constructor(x: number, y: number, facing: number) {
    this.pos = new Vector(x, y);
    this.vel = new Vector(facing * 16, 0); // Much faster for AAA feel
  }

  update() {
    this.pos.add(this.vel);
    
    // wrapping bullets looks cool
    if (this.pos.x > GAME_WIDTH) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = GAME_WIDTH;
    
    this.life--;
    this.t += 1.5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const trailOffset = this.vel.x > 0 ? -this.width : this.width;
    
    ctx.lineCap = 'round';

    const colors = [NEON_COLORS.CYAN, NEON_COLORS.MAGENTA, NEON_COLORS.YELLOW, NEON_COLORS.GREEN, NEON_COLORS.RED, NEON_COLORS.ORANGE];
    const cycledColor = colors[Math.floor(this.t) % colors.length];

    // Outer glow aura
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = cycledColor;
    ctx.strokeStyle = cycledColor;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + trailOffset, this.pos.y);
    ctx.stroke();

    // Inner bright core
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + trailOffset, this.pos.y);
    ctx.stroke();
    
    ctx.restore();
  }
}
