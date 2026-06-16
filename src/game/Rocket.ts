import { Vector } from './Vector';
import { ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS } from './Constants';

export class Rocket {
  partsAssembled = 1; // 1: base, 2: mid, 3: top
  fuelLevel = 0; // max 6
  width = 30;
  height = 80;
  launching = false;
  grabbed?: boolean;
  launchY = 0;
  type = 1; // 1,2,3,4
  baseX = ROCKET_BASE_X;
  baseY = ROCKET_BASE_Y;

  isComplete() {
    return this.partsAssembled >= 3;
  }

  isFueled() {
    return this.fuelLevel >= 6;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const isFueled = this.isFueled();
    let mainColor = isFueled ? NEON_COLORS.MAGENTA : NEON_COLORS.ROCKET;
    if (this.grabbed && Date.now() % 200 > 100) {
       mainColor = NEON_COLORS.RED;
    }
    const coreColor = '#050510'; // Dark fill to block everything behind it
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const basex = this.baseX;
    const basey = this.launching ? this.launchY : this.baseY;

    // Helper for thick stroke + fill drawing
    const drawFilledPoly = (points: number[][], strokeColor: string, lineWidth: number, isGhost = false) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for(let i=1; i<points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
      
      if (isGhost) {
         ctx.lineWidth = 1;
         ctx.strokeStyle = strokeColor;
         ctx.globalAlpha = 0.3 + 0.1 * Math.sin(Date.now()*0.005);
         ctx.shadowBlur = 5;
         ctx.shadowColor = strokeColor;
         ctx.stroke();
         
         ctx.save();
         ctx.clip();
         ctx.beginPath();
         for(let y=-30; y<50; y+=10) {
            ctx.moveTo(-100, y - (Date.now()*0.02)%10);
            ctx.lineTo(200, y+50 - (Date.now()*0.02)%10);
         }
         ctx.globalAlpha = 0.1;
         ctx.stroke();
         ctx.restore();
         
         ctx.globalAlpha = 1.0;
         return;
      }
      
      ctx.fillStyle = coreColor;
      ctx.fill();
      
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = this.launching ? 25 : 15;
      ctx.shadowColor = strokeColor;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      // Inner bright wireframe highlight
      ctx.lineWidth = lineWidth / 3;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Delicate surface rivet panels overlay
      if (!isGhost) {
         ctx.save();
         ctx.clip();
         ctx.strokeStyle = strokeColor;
         ctx.lineWidth = 0.5;
         ctx.globalAlpha = 0.25;
         ctx.setLineDash([2, 5]);
         ctx.beginPath();
         for (let px = basex - 30; px < basex + 70; px += 10) {
            ctx.moveTo(px, basey - 120);
            ctx.lineTo(px, basey + 20);
         }
         ctx.stroke();
         ctx.restore();
      }
    };

    if (this.type === 1) {
      // Base (Part 1)
      drawFilledPoly([[basex - 5, basey], [basex + 35, basey], [basex + 30, basey - 15], [basex, basey - 15]], mainColor, 4, this.partsAssembled < 1);
      drawFilledPoly([[basex, basey - 5], [basex - 15, basey + 10], [basex + 5, basey]], mainColor, 3, this.partsAssembled < 1);
      drawFilledPoly([[basex + 30, basey - 5], [basex + 45, basey + 10], [basex + 25, basey]], mainColor, 3, this.partsAssembled < 1);
      if (this.partsAssembled >= 1) {
         drawFilledPoly([[basex + 10, basey], [basex + 20, basey], [basex + 22, basey + 6], [basex + 8, basey + 6]], NEON_COLORS.CYAN, 2);
      }
      // Mid (Part 2)
      drawFilledPoly([[basex + 2, basey - 55], [basex + 28, basey - 55], [basex + 28, basey - 15], [basex + 2, basey - 15]], mainColor, 4, this.partsAssembled < 2);
      if (this.partsAssembled >= 2 && this.fuelLevel > 0) this.drawFuel(ctx, [[basex + 2, basey - 55], [basex + 28, basey - 55], [basex + 28, basey - 15], [basex + 2, basey - 15]]);
      
      // Top (Part 3)
      drawFilledPoly([[basex + 2, basey - 55], [basex + 15, basey - 85], [basex + 28, basey - 55]], mainColor, 4, this.partsAssembled < 3);
    } 
    else if (this.type === 2) {
      // Chunkier, Industrial (Wider)
      drawFilledPoly([[basex - 10, basey], [basex + 40, basey], [basex + 35, basey - 20], [basex - 5, basey - 20]], mainColor, 4, this.partsAssembled < 1);
      drawFilledPoly([[basex - 5, basey - 10], [basex - 25, basey + 10], [basex + 5, basey]], mainColor, 3, this.partsAssembled < 1);
      drawFilledPoly([[basex + 35, basey - 10], [basex + 55, basey + 10], [basex + 25, basey]], mainColor, 3, this.partsAssembled < 1);
      if (this.partsAssembled >= 1) {
         drawFilledPoly([[basex + 5, basey], [basex + 12, basey], [basex + 12, basey + 6], [basex + 5, basey + 6]], NEON_COLORS.ORANGE, 2);
         drawFilledPoly([[basex + 18, basey], [basex + 25, basey], [basex + 25, basey + 6], [basex + 18, basey + 6]], NEON_COLORS.ORANGE, 2);
      }
      drawFilledPoly([[basex, basey - 50], [basex + 30, basey - 50], [basex + 35, basey - 20], [basex - 5, basey - 20]], mainColor, 4, this.partsAssembled < 2);
      if (this.partsAssembled >= 2 && this.fuelLevel > 0) this.drawFuel(ctx, [[basex, basey - 50], [basex + 30, basey - 50], [basex + 35, basey - 20], [basex - 5, basey - 20]]);
      drawFilledPoly([[basex, basey - 50], [basex + 15, basey - 75], [basex + 30, basey - 50]], mainColor, 4, this.partsAssembled < 3);
    }
    else if (this.type === 3) {
      // Sleeker, Taller
      drawFilledPoly([[basex, basey], [basex + 30, basey], [basex + 25, basey - 15], [basex + 5, basey - 15]], mainColor, 4, this.partsAssembled < 1);
      drawFilledPoly([[basex, basey - 15], [basex - 10, basey + 5], [basex + 5, basey]], mainColor, 3, this.partsAssembled < 1);
      drawFilledPoly([[basex + 30, basey - 15], [basex + 40, basey + 5], [basex + 25, basey]], mainColor, 3, this.partsAssembled < 1);
      if (this.partsAssembled >= 1) {
         drawFilledPoly([[basex + 10, basey], [basex + 20, basey], [basex + 15, basey + 10]], NEON_COLORS.CYAN, 2);
      }
      drawFilledPoly([[basex + 5, basey - 65], [basex + 25, basey - 65], [basex + 25, basey - 15], [basex + 5, basey - 15]], mainColor, 4, this.partsAssembled < 2);
      if (this.partsAssembled >= 2 && this.fuelLevel > 0) this.drawFuel(ctx, [[basex + 5, basey - 65], [basex + 25, basey - 65], [basex + 25, basey - 15], [basex + 5, basey - 15]]);
      drawFilledPoly([[basex + 5, basey - 65], [basex + 15, basey - 105], [basex + 25, basey - 65]], mainColor, 4, this.partsAssembled < 3);
    }
    else {
      // Premium Final
      drawFilledPoly([[basex - 5, basey], [basex + 35, basey], [basex + 30, basey - 20], [basex, basey - 20]], mainColor, 4, this.partsAssembled < 1);
      drawFilledPoly([[basex, basey - 15], [basex - 20, basey + 15], [basex + 15, basey - 5]], mainColor, 3, this.partsAssembled < 1);
      drawFilledPoly([[basex + 30, basey - 15], [basex + 50, basey + 15], [basex + 15, basey - 5]], mainColor, 3, this.partsAssembled < 1);
      if (this.partsAssembled >= 1) {
         drawFilledPoly([[basex + 5, basey], [basex + 25, basey], [basex + 30, basey + 8], [basex, basey + 8]], NEON_COLORS.RED, 2);
      }
      drawFilledPoly([[basex - 2, basey - 60], [basex + 32, basey - 60], [basex + 30, basey - 20], [basex, basey - 20]], mainColor, 4, this.partsAssembled < 2);
      if (this.partsAssembled >= 2 && this.fuelLevel > 0) this.drawFuel(ctx, [[basex - 2, basey - 60], [basex + 32, basey - 60], [basex + 30, basey - 20], [basex, basey - 20]]);
      drawFilledPoly([[basex - 2, basey - 60], [basex + 15, basey - 95], [basex + 32, basey - 60]], mainColor, 4, this.partsAssembled < 3);
      if (this.partsAssembled >= 3) {
         drawFilledPoly([[basex + 15, basey - 95], [basex + 15, basey - 105], [basex + 25, basey - 80]], mainColor, 2);
      }
    }
    
    // Assembled tip beacon indicator
    if (this.partsAssembled >= 3) {
      let tipX = basex + 15;
      let tipY = basey - 85;
      if (this.type === 2) tipY = basey - 75;
      if (this.type === 3) tipY = basey - 105;
      if (this.type === 4) tipY = basey - 105;
      
      const beaconColor = isFueled ? '#10b981' : '#f43f5e'; // Green when ready, red otherwise
      ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? beaconColor : '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = beaconColor;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grab outline warning!
    if (this.grabbed) {
       ctx.beginPath();
       ctx.rect(basex - 25, basey - 110, 80, 130);
       ctx.strokeStyle = NEON_COLORS.RED;
       ctx.lineWidth = 2;
       ctx.shadowBlur = 20;
       ctx.shadowColor = NEON_COLORS.RED;
       ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
       ctx.stroke();
       ctx.globalAlpha = 1.0;
       
       ctx.beginPath();
       ctx.moveTo(basex-20, basey - 100); ctx.lineTo(basex+15, basey-50);
       ctx.moveTo(basex+50, basey - 100); ctx.lineTo(basex+15, basey-50);
       ctx.strokeStyle = '#ffffff';
       ctx.lineWidth = 4;
       ctx.shadowBlur = 0;
       ctx.stroke();
    }
    
    ctx.restore();
  }

  drawFuel(ctx: CanvasRenderingContext2D, points: number[][]) {
    const clampedFuel = Math.min(this.fuelLevel, 6);
    if (clampedFuel <= 0) return;
    
    // find bounding box of points
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const p of points) {
       if (p[0] < minX) minX = p[0];
       if (p[0] > maxX) maxX = p[0];
       if (p[1] < minY) minY = p[1];
       if (p[1] > maxY) maxY = p[1];
    }
    
    const maxH = maxY - minY;
    const fh = (clampedFuel / 6) * maxH;
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for(let i=1; i<points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    
    // Clip to the exact geometry shape to ensure fuel perfectly fills
    ctx.clip();
    
    ctx.fillStyle = NEON_COLORS.MAGENTA;
    ctx.shadowBlur = 20;
    ctx.shadowColor = NEON_COLORS.MAGENTA;
    
    // Bubbling / active fuel visual
    const timeOff = Date.now() * 0.005;
    const bubble = Math.sin(timeOff) * 2;
    
    ctx.fillRect(minX - 5, maxY - fh + bubble, (maxX - minX) + 10, fh - bubble + 10);
    
    // Intensity lines over fuel
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(minX + ((maxX-minX)/4), maxY - fh + bubble, (maxX-minX)/4, fh - bubble + 10);
    
    // True bubbling luxury fluid particle physics inside the rocket body
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
       const bx = minX + 5 + ((i * 17) % (maxX - minX - 10));
       const bSeed = (Date.now() * 0.0018 + i * 1.5) % 1.0;
       const by = maxY - (bSeed * fh);
       ctx.beginPath();
       ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
       ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    
    ctx.restore();
  }
}
