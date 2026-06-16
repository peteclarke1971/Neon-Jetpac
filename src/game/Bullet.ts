import { Vector } from './Vector';
import { GAME_WIDTH, NEON_COLORS } from './Constants';

export class Bullet {
  pos: Vector;
  vel: Vector;
  life = 33;
  width = 85; // Initial default extended to 85 as requested
  height = 6;
  t = 0;
  color: string | undefined;
  enemyBullet: boolean;
  ownerPlayerId = 1;

  // Fully configurable laser options
  particleType: 'line' | 'beam' | 'oval' | 'star' | 'spark' = 'line';
  colorCycle: 'none' | 'rainbow' | 'pulse' | 'neon-pulse' = 'none';
  speed = 16;
  glowInDark = true;

  constructor(
    x: number, 
    y: number, 
    facing: number, 
    speedOrConfig: number | any = 16, 
    color?: string, 
    enemyBullet: boolean = false,
    ownerPlayerId: number = 1
  ) {
    this.pos = new Vector(x, y);
    this.enemyBullet = enemyBullet;
    this.ownerPlayerId = ownerPlayerId;

    if (typeof speedOrConfig === 'object' && speedOrConfig !== null) {
      const cfg = speedOrConfig;
      this.speed = cfg.speed ?? 16;
      this.width = cfg.width ?? 85; // extended standard length as requested
      this.height = cfg.size ?? 6;
      this.life = cfg.travelLength ?? 33;
      this.particleType = cfg.particleType ?? 'line';
      this.color = cfg.color ?? color;
      this.colorCycle = cfg.colorCycle ?? 'none';
      this.glowInDark = cfg.glowInDark ?? true;
      this.vel = new Vector(facing * this.speed, 0);
    } else {
      // Classic backwards compatibility constructor
      this.speed = typeof speedOrConfig === 'number' ? speedOrConfig : 16;
      this.width = 85; // extended default length
      this.height = 6;
      this.life = 33;
      this.color = color;
      this.vel = new Vector(facing * this.speed, 0);
    }

    // Offset position backward by one frame of velocity so that when the immediate first
    // update is run on the spawning tick, the bullet lands EXACTLY at the gunTipX starting visual coordinate.
    this.pos.x -= this.vel.x;
  }

  update() {
    this.pos.add(this.vel);
    
    // wrapping bullets looks cool
    if (this.pos.x > GAME_WIDTH) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = GAME_WIDTH;
    
    this.life--;
    this.t += 1.5;
  }

  overlapsWith(targetX: number, targetY: number, targetW: number, targetH: number, tolX: number = 0, tolY: number = 0): boolean {
    const dir = this.vel.x > 0 ? 1 : -1;
    const minBulletX = Math.min(this.pos.x, this.pos.x - dir * this.width);
    const maxBulletX = Math.max(this.pos.x, this.pos.x - dir * this.width);

    const minTargX = targetX - tolX;
    const maxTargX = targetX + targetW + tolX;
    const minTargY = targetY - tolY;
    const maxTargY = targetY + targetH + tolY;

    const xOverlap = minBulletX <= maxTargX && maxBulletX >= minTargX;
    
    // Check full vertical bounding height of the bullet against target
    const bulletHalfH = Math.max(3, this.height / 2);
    const minBulletY = this.pos.y - bulletHalfH;
    const maxBulletY = this.pos.y + bulletHalfH;
    const yOverlap = minBulletY <= maxTargY && maxBulletY >= minTargY;

    return xOverlap && yOverlap;
  }

  overlapsWithCircle(cx: number, cy: number, r: number): boolean {
    const dir = this.vel.x > 0 ? 1 : -1;
    const minBulletX = Math.min(this.pos.x, this.pos.x - dir * this.width);
    const maxBulletX = Math.max(this.pos.x, this.pos.x - dir * this.width);

    const bulletHalfH = Math.max(3, this.height / 2);
    if (this.pos.y + bulletHalfH < cy - r || this.pos.y - bulletHalfH > cy + r) return false;
    return minBulletX <= cx + r && maxBulletX >= cx - r;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const isEnemy = this.enemyBullet;
    ctx.lineCap = 'round';

    // Color cycle selection
    let bulletColor = this.color || (this.ownerPlayerId === 2 ? '#10b981' : NEON_COLORS.CYAN);
    if (!isEnemy) {
      if (this.colorCycle as string === 'rainbow') {
        bulletColor = `hsl(${(this.t * 15) % 360}, 100%, 65%)`;
      } else if (this.colorCycle as string === 'pulse') {
        const pulseVal = 0.4 + Math.sin(this.t * 0.25) * 0.6;
        ctx.globalAlpha = Math.max(0.15, pulseVal);
      } else if (this.colorCycle as string === 'strobe') {
        // High frequency alpha flash
        ctx.globalAlpha = Math.floor(this.t * 0.45) % 2 === 0 ? 0.15 : 1.0;
      } else if (this.colorCycle as string === 'neon-pulse') {
        const cycleIdx = Math.floor(this.t * 0.1) % 2;
        bulletColor = cycleIdx === 0 ? (this.color || (this.ownerPlayerId === 2 ? '#10b981' : NEON_COLORS.CYAN)) : '#ec4899'; // pink neon pulse
      }
    }

    const dir = this.vel.x > 0 ? 1 : -1;
    const trailOffset = -dir * this.width;

    if (isEnemy) {
      // Simple glowing line for enemies to preserve focus
      ctx.lineWidth = 6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = bulletColor;
      const grad = ctx.createLinearGradient(this.pos.x, this.pos.y, this.pos.x + trailOffset, this.pos.y);
      grad.addColorStop(0, bulletColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.pos.x + trailOffset, this.pos.y);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);
      ctx.lineTo(this.pos.x + trailOffset * 0.45, this.pos.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    switch (this.particleType) {
      case 'beam': {
        // Thick rectangular energy beam
        ctx.shadowBlur = this.glowInDark ? 16 : 0;
        ctx.shadowColor = bulletColor;
        
        const beamY = this.pos.y - this.height / 2;
        const beamW = Math.abs(trailOffset);
        const beamX = dir > 0 ? this.pos.x - beamW : this.pos.x;

        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(beamX, beamY, beamW, this.height, this.height / 2);
        } else {
          ctx.rect(beamX, beamY, beamW, this.height);
        }
        ctx.fill();

        // Inner beam white core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const coreH = Math.max(1, this.height * 0.4);
        const coreY = this.pos.y - coreH / 2;
        const coreW = beamW * 0.75;
        const coreX = dir > 0 ? this.pos.x - coreW - (beamW * 0.04) : this.pos.x + (beamW * 0.04);
        if (ctx.roundRect) {
          ctx.roundRect(coreX, coreY, coreW, coreH, coreH / 2);
        } else {
          ctx.rect(coreX, coreY, coreW, coreH);
        }
        ctx.fill();
        break;
      }

      case 'oval': {
        // Space torpedo style oval/capsule
        ctx.shadowBlur = this.glowInDark ? 14 : 0;
        ctx.shadowColor = bulletColor;
        ctx.fillStyle = bulletColor;
        
        const capsuleW = this.width * 0.6;
        const capsuleH = this.height * 1.5;
        const capX = dir > 0 ? this.pos.x - capsuleW : this.pos.x;
        const capY = this.pos.y - capsuleH / 2;

        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(this.pos.x - (dir * capsuleW/2), this.pos.y, capsuleW / 2, capsuleH / 2, 0, 0, Math.PI * 2);
        } else {
          ctx.rect(capX, capY, capsuleW, capsuleH);
        }
        ctx.fill();

        // White hot inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(this.pos.x - (dir * capsuleW * 0.35), this.pos.y, capsuleW * 0.2, capsuleH * 0.35, 0, 0, Math.PI * 2);
        } else {
          ctx.rect(this.pos.x - dir * capsuleW * 0.5, this.pos.y - capsuleH * 0.15, capsuleW * 0.25, capsuleH * 0.3);
        }
        ctx.fill();
        break;
      }

      case 'star': {
        // Retro star orbs
        ctx.shadowBlur = this.glowInDark ? 15 : 0;
        ctx.shadowColor = bulletColor;
        ctx.fillStyle = bulletColor;
        
        const pulse = 0.85 + Math.sin(this.t * 0.4) * 0.15;
        const radius = (this.height + 4) * pulse;
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const x1 = this.pos.x + Math.cos(angle) * radius;
          const y1 = this.pos.y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          const angleInner = angle + Math.PI / 5;
          const x2 = this.pos.x + Math.cos(angleInner) * (radius * 0.45);
          const y2 = this.pos.y + Math.sin(angleInner) * (radius * 0.45);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();

        // Retro sparkles trailing behind
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        const sparks = 3;
        for (let j = 1; j <= sparks; j++) {
          const spSize = radius * (1 - j * 0.25) * 0.5;
          const spX = this.pos.x - dir * (this.width * 0.32 * j);
          const spY = this.pos.y + Math.sin(this.t * 0.9 + j) * 5;
          ctx.beginPath();
          ctx.arc(spX, spY, Math.max(1, spSize), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'spark': {
        // Spear arrowhead with high density electrical sparks
        ctx.shadowBlur = this.glowInDark ? 15 : 0;
        ctx.shadowColor = bulletColor;
        ctx.fillStyle = bulletColor;

        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x - dir * this.width * 0.4, this.pos.y - this.height * 1.3);
        ctx.lineTo(this.pos.x - dir * this.width * 0.28, this.pos.y);
        ctx.lineTo(this.pos.x - dir * this.width * 0.4, this.pos.y + this.height * 1.3);
        ctx.closePath();
        ctx.fill();

        // Glowing core arrowhead
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x - dir * this.width * 0.18, this.pos.y - this.height * 0.45);
        ctx.lineTo(this.pos.x - dir * this.width * 0.14, this.pos.y);
        ctx.lineTo(this.pos.x - dir * this.width * 0.18, this.pos.y + this.height * 0.45);
        ctx.closePath();
        ctx.fill();

        // Spark trail
        ctx.strokeStyle = bulletColor;
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          const sparkX = this.pos.x - dir * (this.width * (0.35 + k * 0.18));
          const sparkLength = 9;
          const spreadY = (k - 1.5) * 6;
          ctx.beginPath();
          ctx.moveTo(sparkX, this.pos.y + spreadY);
          ctx.lineTo(sparkX - dir * sparkLength, this.pos.y + spreadY + (Math.random() - 0.5) * 5);
          ctx.stroke();
        }
        break;
      }

      case 'line':
      default: {
        // Premium default neon glowing line (visually extended to 85)
        ctx.lineWidth = this.height;
        ctx.shadowBlur = this.glowInDark ? 11 : 0;
        ctx.shadowColor = bulletColor;
        
        const grad = ctx.createLinearGradient(this.pos.x, this.pos.y, this.pos.x + trailOffset, this.pos.y);
        grad.addColorStop(0, bulletColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x + trailOffset, this.pos.y);
        ctx.stroke();

        // Inner glowing white core
        ctx.lineWidth = Math.max(1.5, this.height * 0.28);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        const coreOffset = trailOffset * 0.42;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x + coreOffset, this.pos.y);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}
