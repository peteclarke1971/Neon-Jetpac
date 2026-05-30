import { Vector } from './Vector';

export class Particle {
  pos: Vector;
  vel: Vector;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  decay: number;
  type: 'spark' | 'smoke' | 'text' | 'thrust' = 'spark';
  text?: string;

  constructor(x: number, y: number, color: string, speedModifier: number = 1, text?: string, isThrust: boolean = false) {
    this.pos = new Vector(x, y);
    
    if (text) {
      this.type = 'text';
      this.text = text;
      this.vel = new Vector(0, -1);
      this.maxLife = 50;
      this.life = this.maxLife;
      this.color = color;
      this.size = 20; // font size
      this.decay = 1;
    } else if (isThrust) {
      this.type = 'thrust';
      this.vel = new Vector((Math.random() - 0.5) * 2, Math.random() * 5 + 3);
      this.maxLife = Math.random() * 15 + 10;
      this.life = this.maxLife;
      this.color = color;
      this.size = Math.random() * 4 + 2;
      this.decay = Math.random() * 0.8 + 0.8;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.0) * speedModifier; // faster
      this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.maxLife = Math.random() * 20 + 20;
      this.life = this.maxLife;
      this.color = color;
      this.size = Math.random() * 4 + 2;
      this.decay = Math.random() * 0.8 + 0.5;
      this.type = Math.random() > 0.3 ? 'spark' : 'smoke';
    }
  }

  update() {
    if (this.type === 'text') {
      this.pos.add(this.vel);
      this.life -= this.decay;
      return;
    }

    if (this.type === 'thrust') {
      this.pos.add(this.vel);
      this.vel.x *= 0.95;
      this.size *= 0.92;
      this.life -= this.decay;
      return;
    }

    this.pos.add(this.vel);
    this.vel.mult(0.92); // drag
    
    // sparks fall, smoke rises slightly
    if (this.type === 'spark') {
      this.vel.y += 0.15; // gravity
    } else {
      this.vel.y -= 0.05; // lift
      this.size += 0.1; // expand
    }
    
    this.life -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    
    if (this.type === 'text') {
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px "JetBrains Mono", monospace`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.textAlign = 'center';
      ctx.fillText(this.text!, this.pos.x, this.pos.y);
      ctx.textAlign = 'left';
    } else if (this.type === 'spark') {
      // Line spark
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.pos.x - this.vel.x * 2, this.pos.y - this.vel.y * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.stroke();
      
      // Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.size / 2;
      ctx.shadowBlur = 0;
      ctx.stroke();
    } else if (this.type === 'thrust') {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      // diamond like spark or circle
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Smoke puff
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
