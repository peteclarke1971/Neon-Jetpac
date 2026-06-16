import { Vector } from './Vector';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS } from './Constants';
import { PlatformDef } from './StageProfiles';

export class Item {
  pos: Vector;
  vel: Vector;
  type: 'part' | 'fuel' | 'valuable' | 'powerup';
  partId?: number; // 2 or 3
  valuableType?: number; // 0, 1, 2...
  powerupType?: 'tri_shot' | 'shield' | 'gravity_clamp' | 'rocket_magnet' | 'rift_bomb';
  width = 24;
  height = 24;
  carried = false;
  dropped = false;
  fallingToRocket = false;
  collected = false;
  t = 0; // for hover animation
  life = 0; // for valuable timeout

  constructor(type: 'part' | 'fuel' | 'valuable' | 'powerup', param?: number | string) {
    this.type = type;
    if (type === 'part') this.partId = param as number;
    if (type === 'valuable') {
      this.valuableType = param as number;
      this.life = 1000;
    }
    if (type === 'powerup') {
      this.powerupType = param as any;
      this.life = 1200; // Powerups also despawn
    }
    this.pos = new Vector(Math.random() * (GAME_WIDTH - 60) + 30, -30);
    this.vel = new Vector(0, 1.5);
    this.t = Math.random() * 100;
  }

  update(platforms: PlatformDef[], rocketBase?: { x: number, y: number }, rocketIsComplete: boolean = false) {
    this.t += 0.1;
    if (this.type === 'valuable' || this.type === 'powerup') this.life--;
    
    if (this.carried || this.collected) return;
    
    if (this.fallingToRocket) {
      this.vel.y = 4;
      this.pos.add(this.vel);
      return;
    }

    // Rocket magnet effect: only grab fuel if all parts are collected/built (rocketIsComplete === true)
    const canMagnetize = this.type === 'part' || (this.type === 'fuel' && rocketIsComplete);
    if (canMagnetize) {
       if ((window as any).__magnetActive) {
          const targetX = rocketBase?.x ?? 550; // ROCKET_BASE_X
          const targetY = rocketBase?.y ?? (GAME_HEIGHT - 20); // ROCKET_BASE_Y
          
          if (!this.carried && !this.fallingToRocket) {
            const dx = targetX - this.pos.x;
            const dy = targetY - this.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 400) {
               this.vel.x += (dx/dist) * 0.2;
               this.vel.y += (dy/dist) * 0.2;
               // Add a visual tether if we want
            }
          }
       }
    }

    this.pos.add(this.vel);

    if (this.pos.x > GAME_WIDTH) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = GAME_WIDTH;

    // platform collision
    let onPlatform = false;
    for (const p of platforms) {
      if (
        this.vel.y > 0 && 
        this.pos.x + this.width > p[0] && 
        this.pos.x < p[0] + p[2] && 
        this.pos.y + this.height >= p[1] && 
        this.pos.y + this.height <= p[1] + 10
      ) {
        this.pos.y = p[1] - this.height;
        this.vel.y = 0;
        onPlatform = true;
      }
    }

    if (!onPlatform && this.pos.y < GAME_HEIGHT - 20) {
      this.vel.y = 1.5; // always fall unless on platform
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.collected) return;

    ctx.save();
    
    const hoverY = (this.carried || this.fallingToRocket) ? 0 : Math.sin(this.t) * 4;
    const px = this.pos.x;
    const py = this.pos.y + hoverY;

    ctx.fillStyle = '#050510'; // Block out background for AAA vector look
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    if (this.type === 'part') {
      ctx.shadowBlur = Math.sin(this.t * 2) * 5 + 15;
      ctx.shadowColor = NEON_COLORS.ROCKET;
      ctx.strokeStyle = NEON_COLORS.ROCKET;
      
      if (this.partId === 2) {
        // mid
        ctx.beginPath();
        ctx.rect(px, py, 26, 35);
        ctx.fill(); ctx.stroke();
      } else if (this.partId === 3) {
        // top
        ctx.beginPath();
        ctx.moveTo(px, py + 30);
        ctx.lineTo(px + 13, py);
        ctx.lineTo(px + 26, py + 30);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    } else if (this.type === 'fuel') {
      ctx.shadowBlur = Math.sin(this.t * 2) * 5 + 15;
      ctx.shadowColor = NEON_COLORS.MAGENTA;
      ctx.strokeStyle = NEON_COLORS.MAGENTA;
      
      // Canister body
      ctx.beginPath();
      ctx.rect(px + 2, py + 6, 20, 24);
      ctx.fill(); ctx.stroke();
      
      // Nozzle
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 6);
      ctx.lineTo(px + 8, py);
      ctx.lineTo(px + 16, py);
      ctx.lineTo(px + 16, py + 6);
      ctx.fill(); ctx.stroke();
      
      // 'F' inner detail
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('F', px + 12, py + 24);
      ctx.textAlign = 'left'; // reset
    } else if (this.type === 'valuable') {
      if (this.life < 100) ctx.globalAlpha = Math.max(0, this.life / 100);
      
      const sparkle = Math.sin(this.t * 2) * 5 + 15;
      ctx.shadowBlur = sparkle;
      
      const valType = (this.valuableType || 0) % 3;
      
      if (valType === 0) {
        // Diamond
        ctx.shadowColor = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = NEON_COLORS.CYAN;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 4);
        ctx.lineTo(px + 22, py + 12);
        ctx.lineTo(px + 12, py + 24);
        ctx.lineTo(px + 2, py + 12);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (valType === 1) {
        // Gold Bar
        ctx.shadowColor = NEON_COLORS.YELLOW;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = NEON_COLORS.YELLOW;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 8);
        ctx.lineTo(px + 18, py + 8);
        ctx.lineTo(px + 22, py + 14);
        ctx.lineTo(px + 2, py + 14);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        // Ruby
        ctx.shadowColor = NEON_COLORS.RED;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = NEON_COLORS.RED;
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 4);
        ctx.lineTo(px + 18, py + 4);
        ctx.lineTo(px + 22, py + 10);
        ctx.lineTo(px + 12, py + 22);
        ctx.lineTo(px + 2, py + 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }

      // Sparkles
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      for (let i = 0; i < 2; i++) {
        const sx = px + 12 + Math.cos(this.t + i * Math.PI) * 12;
        const sy = py + 12 + Math.sin(this.t * 1.5 + i * Math.PI) * 12;
        const sSize = Math.max(0, Math.sin(this.t * 3 + i) * 6);
        ctx.beginPath();
        ctx.moveTo(sx - sSize, sy); ctx.lineTo(sx + sSize, sy);
        ctx.moveTo(sx, sy - sSize); ctx.lineTo(sx, sy + sSize);
        ctx.stroke();
      }
    } else if (this.type === 'powerup') {
      if (this.life < 100) ctx.globalAlpha = Math.max(0, this.life / 100);
      
      ctx.translate(px + 12, py + 12);
      ctx.rotate(this.t * 2);

      let color = '#ffffff';
      if (this.powerupType === 'tri_shot') color = NEON_COLORS.CYAN;
      else if (this.powerupType === 'shield') color = NEON_COLORS.MAGENTA;
      else if (this.powerupType === 'gravity_clamp') color = '#33ffaa';
      else if (this.powerupType === 'rocket_magnet') color = NEON_COLORS.YELLOW;
      else if (this.powerupType === 'rift_bomb') color = NEON_COLORS.RED;

      ctx.shadowBlur = Math.sin(this.t * 4) * 10 + 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Inner shape
      ctx.beginPath();
      if (this.powerupType === 'tri_shot') {
        ctx.moveTo(-6, -6); ctx.lineTo(6, 0); ctx.lineTo(-6, 6);
      } else if (this.powerupType === 'shield') {
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
      } else if (this.powerupType === 'gravity_clamp') {
        ctx.rect(-4, -4, 8, 8);
      } else if (this.powerupType === 'rocket_magnet') {
        ctx.arc(0, -2, 4, Math.PI, 0);
        ctx.lineTo(4, 6); ctx.lineTo(-4, 6);
      } else if (this.powerupType === 'rift_bomb') {
        ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0);
      }
      ctx.fill(); ctx.stroke();
      
      ctx.rotate(-this.t * 2);
      ctx.translate(-(px + 12), -(py + 12));
    }
    
    // Core white rim
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.restore();
  }
}
