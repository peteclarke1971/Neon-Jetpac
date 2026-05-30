export class Starfield {
  stars: { x: number; y: number; size: number; color: string; twinkleSpeed: number; t: number; layer: number }[] = [];

  constructor(width: number, height: number, count: number) {
    const spaceColors = ['#ffffff', '#a8d5ff', '#ffb5a8', '#f5f5f5', '#00ffff', '#ff00ff'];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        color: spaceColors[Math.floor(Math.random() * spaceColors.length)],
        twinkleSpeed: Math.random() * 0.05 + 0.01,
        t: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 3) + 1 // 1, 2, or 3
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // We add a tiny bit of scroll over time if we just increment based on global time or pass it in
    // Since we don't have GameEngine frameCount here directly, we'll just track an internal offset.
    this.scrollX = (this.scrollX || 0) + 0.5;
    
    for (const star of this.stars) {
      star.t += star.twinkleSpeed;
      const alpha = (Math.sin(star.t) + 1) / 2; // 0.0 to 1.0 opacity
      
      ctx.globalAlpha = alpha * 0.8 + 0.2; 
      ctx.fillStyle = star.color;
      
      let sx = star.x - (this.scrollX * (star.layer * 0.2));
      sx = ((sx % width) + width) % width; // wrap around correctly
      let sy = star.y;

      ctx.beginPath();
      // tiny little sparkles
      if (star.size > 1.2 && alpha > 0.7) {
         ctx.shadowBlur = Math.random() * 5 + 3;
         ctx.shadowColor = star.color;
         // Draw cross flare for brightest stars
         if (alpha > 0.9 && star.layer === 3) {
            ctx.fillRect(sx, sy, 2, 2);
            ctx.fillRect(sx - 2, sy + 0.5, 6, 1);
            ctx.fillRect(sx + 0.5, sy - 2, 1, 6);
         } else {
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            ctx.fill();
         }
      } else {
         ctx.shadowBlur = 0;
         ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
         ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
  scrollX: number = 0;
}
