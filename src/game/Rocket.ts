import { Vector } from './Vector';
import { ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS } from './Constants';

export class Rocket {
  partsAssembled = 1; // 1: base, 2: mid, 3: top
  fuelLevel = 0; // max 6
  width = 30;
  height = 80;
  launching = false;
  launchY = 0;
  type = 1; // 1,2,3,4

  isComplete() {
    return this.partsAssembled >= 3;
  }

  isFueled() {
    return this.fuelLevel >= 6;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const isFueled = this.isFueled();
    const mainColor = isFueled ? NEON_COLORS.MAGENTA : NEON_COLORS.ROCKET;
    const coreColor = '#050510'; // Dark fill to block everything behind it
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const basex = ROCKET_BASE_X;
    const basey = this.launching ? this.launchY : ROCKET_BASE_Y;

    // Helper for thick stroke + fill drawing
    const drawFilledPoly = (points: number[][], strokeColor: string, lineWidth: number) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for(let i=1; i<points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
      
      ctx.fillStyle = coreColor;
      ctx.fill();
      
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = 15;
      ctx.shadowColor = strokeColor;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      // Inner bright wireframe highlight
      ctx.lineWidth = lineWidth / 3;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    };

    if (this.type === 1) {
      // Base (Part 1)
      if (this.partsAssembled >= 1) {
        drawFilledPoly([[basex - 5, basey], [basex + 35, basey], [basex + 30, basey - 15], [basex, basey - 15]], mainColor, 4);
        drawFilledPoly([[basex, basey - 5], [basex - 15, basey + 10], [basex + 5, basey]], mainColor, 3);
        drawFilledPoly([[basex + 30, basey - 5], [basex + 45, basey + 10], [basex + 25, basey]], mainColor, 3);
        drawFilledPoly([[basex + 10, basey], [basex + 20, basey], [basex + 22, basey + 6], [basex + 8, basey + 6]], NEON_COLORS.CYAN, 2);
      }
      // Mid (Part 2)
      if (this.partsAssembled >= 2) {
        drawFilledPoly([[basex + 2, basey - 55], [basex + 28, basey - 55], [basex + 28, basey - 15], [basex + 2, basey - 15]], mainColor, 4);
        if (this.fuelLevel > 0) this.drawFuel(ctx, basex, basey, 6, 17, 18, 36);
      }
      // Top (Part 3)
      if (this.partsAssembled >= 3) {
        drawFilledPoly([[basex + 2, basey - 55], [basex + 15, basey - 85], [basex + 28, basey - 55]], mainColor, 4);
      }
    } 
    else if (this.type === 2) {
      // Chunkier, Industrial (Wider)
      if (this.partsAssembled >= 1) {
        drawFilledPoly([[basex - 10, basey], [basex + 40, basey], [basex + 35, basey - 20], [basex - 5, basey - 20]], mainColor, 4); // Wider base
        drawFilledPoly([[basex - 5, basey - 10], [basex - 25, basey + 10], [basex + 5, basey]], mainColor, 3); // Large fin L
        drawFilledPoly([[basex + 35, basey - 10], [basex + 55, basey + 10], [basex + 25, basey]], mainColor, 3); // Large fin R
        drawFilledPoly([[basex + 5, basey], [basex + 12, basey], [basex + 12, basey + 6], [basex + 5, basey + 6]], NEON_COLORS.ORANGE, 2); // Double engine L
        drawFilledPoly([[basex + 18, basey], [basex + 25, basey], [basex + 25, basey + 6], [basex + 18, basey + 6]], NEON_COLORS.ORANGE, 2); // Double engine R
      }
      if (this.partsAssembled >= 2) {
        drawFilledPoly([[basex, basey - 50], [basex + 30, basey - 50], [basex + 35, basey - 20], [basex - 5, basey - 20]], mainColor, 4);
        if (this.fuelLevel > 0) this.drawFuel(ctx, basex, basey, 4, 18, 22, 28);
      }
      if (this.partsAssembled >= 3) {
        drawFilledPoly([[basex, basey - 50], [basex + 15, basey - 75], [basex + 30, basey - 50]], mainColor, 4); // blunt nose
      }
    }
    else if (this.type === 3) {
      // Sleeker, Taller
      if (this.partsAssembled >= 1) {
        drawFilledPoly([[basex, basey], [basex + 30, basey], [basex + 25, basey - 15], [basex + 5, basey - 15]], mainColor, 4);
        drawFilledPoly([[basex, basey - 15], [basex - 10, basey + 5], [basex + 5, basey]], mainColor, 3); // sleek fin L
        drawFilledPoly([[basex + 30, basey - 15], [basex + 40, basey + 5], [basex + 25, basey]], mainColor, 3); // sleek fin R
        drawFilledPoly([[basex + 10, basey], [basex + 20, basey], [basex + 15, basey + 10]], NEON_COLORS.CYAN, 2); // Sharp exhaust
      }
      if (this.partsAssembled >= 2) {
        drawFilledPoly([[basex + 5, basey - 65], [basex + 25, basey - 65], [basex + 25, basey - 15], [basex + 5, basey - 15]], mainColor, 4); // Taller mid
        if (this.fuelLevel > 0) this.drawFuel(ctx, basex, basey, 8, 17, 14, 46);
      }
      if (this.partsAssembled >= 3) {
        drawFilledPoly([[basex + 5, basey - 65], [basex + 15, basey - 105], [basex + 25, basey - 65]], mainColor, 4); // Needle point
      }
    }
    else {
      // Premium Final
      if (this.partsAssembled >= 1) {
        drawFilledPoly([[basex - 5, basey], [basex + 35, basey], [basex + 30, basey - 20], [basex, basey - 20]], mainColor, 4);
        drawFilledPoly([[basex, basey - 15], [basex - 20, basey + 15], [basex + 15, basey - 5]], mainColor, 3); // Wing curve L
        drawFilledPoly([[basex + 30, basey - 15], [basex + 50, basey + 15], [basex + 15, basey - 5]], mainColor, 3); // Wing curve R
        drawFilledPoly([[basex + 5, basey], [basex + 25, basey], [basex + 30, basey + 8], [basex, basey + 8]], NEON_COLORS.RED, 2);
      }
      if (this.partsAssembled >= 2) {
        drawFilledPoly([[basex - 2, basey - 60], [basex + 32, basey - 60], [basex + 30, basey - 20], [basex, basey - 20]], mainColor, 4);
        if (this.fuelLevel > 0) this.drawFuel(ctx, basex, basey, 4, 22, 22, 36);
      }
      if (this.partsAssembled >= 3) {
        // Advanced cockpit / finned top
        drawFilledPoly([[basex - 2, basey - 60], [basex + 15, basey - 95], [basex + 32, basey - 60]], mainColor, 4);
        drawFilledPoly([[basex + 15, basey - 95], [basex + 15, basey - 105], [basex + 25, basey - 80]], mainColor, 2); // top fin
      }
    }
    
    ctx.restore();
  }

  drawFuel(ctx: CanvasRenderingContext2D, basex: number, basey: number, x: number, yBase: number, w: number, maxH: number) {
    ctx.fillStyle = NEON_COLORS.MAGENTA;
    ctx.shadowBlur = 20;
    ctx.shadowColor = NEON_COLORS.MAGENTA;
    const fh = (this.fuelLevel / 6) * maxH;
    
    // Bubbling / active fuel visual
    const timeOff = Date.now() * 0.005;
    const bubble = Math.sin(timeOff) * 2;
    
    ctx.beginPath();
    ctx.rect(basex + x, basey - yBase - fh + bubble, w, fh - bubble);
    ctx.fill();
    
    // Intensity lines over fuel
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(basex + x + (w/4), basey - yBase - fh + bubble, w/4, fh - bubble);
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}
