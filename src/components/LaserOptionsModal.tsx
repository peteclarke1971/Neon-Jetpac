import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../game/Audio';

interface LaserConfig {
  particleType: 'line' | 'beam' | 'oval' | 'star' | 'spark';
  size: number;
  width: number;
  color: string;
  colorCycle: 'none' | 'rainbow' | 'pulse' | 'strobe';
  travelLength: number;
  speed: number;
  glowInDark: boolean;
  cooldown: number;
}

// Full fidelity, actual animated canvas matching the game weapon graphics, muzzle flare, and spark impacts
function LaserPreviewCanvas({ config, playerId }: { config: LaserConfig; playerId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastShotTime = 0;

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      maxLife: number;
      color: string;
    }
    const sparks: Spark[] = [];

    interface PreviewBullet {
      x: number;
      y: number;
      t: number;
      life: number;
    }
    const bullets: PreviewBullet[] = [];

    const width = canvas.width;
    const height = canvas.height;

    const tick = (now: number) => {
      // Clear background
      ctx.fillStyle = '#02050b';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle electronic lab backdrop grid
      ctx.strokeStyle = playerId === 2 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 20;

      // Scrolling grid effect
      const scrollOffset = (now * 0.02) % gridSize;

      for (let x = -gridSize; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - scrollOffset, 0);
        ctx.lineTo(x - scrollOffset, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw lab floor platform structure
      ctx.fillStyle = '#010307';
      ctx.fillRect(0, 115, width, height - 115);
      
      // Neon floor boundary line
      ctx.strokeStyle = playerId === 2 ? '#10b981' : '#00ffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, 115);
      ctx.lineTo(width, 115);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow for optimization

      // Periodically trigger shots matching weapon cooldown settings
      const interval = config.cooldown; 
      if (now - lastShotTime > interval) {
        lastShotTime = now;
        bullets.push({
          x: 74,
          y: 72.5,
          t: 0,
          life: config.travelLength,
        });
      }

      // Render and update active laser bullets
      const targetColor = config.color;

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.t += 1.5;

        let activeColor = targetColor;
        if (config.colorCycle === 'rainbow') {
          activeColor = `hsl(${(b.t * 15) % 360}, 100%, 65%)`;
        }

        ctx.save();
        if (config.colorCycle === 'pulse') {
          const pulseVal = 0.4 + Math.sin(b.t * 0.25) * 0.6;
          ctx.globalAlpha = Math.max(0.15, pulseVal);
        } else if (config.colorCycle === 'strobe') {
          ctx.globalAlpha = Math.floor(b.t * 0.45) % 2 === 0 ? 0.2 : 1.0;
        }

        const bWidth = config.width;
        const bHeight = config.size;
        ctx.lineCap = 'round';
        const trailOffset = -bWidth;

        switch (config.particleType) {
          case 'beam': {
            ctx.shadowBlur = config.glowInDark ? 16 : 0;
            ctx.shadowColor = activeColor;
            
            const beamY = b.y - bHeight / 2;
            const beamW = bWidth;
            const beamX = b.x - beamW;

            ctx.fillStyle = activeColor;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(beamX, beamY, beamW, bHeight, bHeight / 2);
            } else {
              ctx.rect(beamX, beamY, beamW, bHeight);
            }
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            const coreH = Math.max(1, bHeight * 0.4);
            const coreY = b.y - coreH / 2;
            const coreW = beamW * 0.75;
            const coreX = b.x - coreW - (beamW * 0.04);
            if (ctx.roundRect) {
              ctx.roundRect(coreX, coreY, coreW, coreH, coreH / 2);
            } else {
              ctx.rect(coreX, coreY, coreW, coreH);
            }
            ctx.fill();
            break;
          }
          case 'oval': {
            ctx.shadowBlur = config.glowInDark ? 14 : 0;
            ctx.shadowColor = activeColor;
            ctx.fillStyle = activeColor;

            const capsuleW = bWidth * 0.6;
            const capsuleH = bHeight * 1.5;

            ctx.beginPath();
            if (ctx.ellipse) {
              ctx.ellipse(b.x - capsuleW / 2, b.y, capsuleW / 2, capsuleH / 2, 0, 0, Math.PI * 2);
            } else {
              ctx.rect(b.x - capsuleW, b.y - capsuleH / 2, capsuleW, capsuleH);
            }
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.ellipse) {
              ctx.ellipse(b.x - capsuleW * 0.35, b.y, capsuleW * 0.2, capsuleH * 0.35, 0, 0, Math.PI * 2);
            } else {
              ctx.rect(b.x - capsuleW * 0.5, b.y - capsuleH * 0.15, capsuleW * 0.25, capsuleH * 0.3);
            }
            ctx.fill();
            break;
          }
          case 'star': {
            ctx.shadowBlur = config.glowInDark ? 15 : 0;
            ctx.shadowColor = activeColor;
            ctx.fillStyle = activeColor;

            const pulse = 0.85 + Math.sin(b.t * 0.4) * 0.15;
            const radius = (bHeight + 4) * pulse;

            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              const angle = (s * Math.PI * 2) / 5 - Math.PI / 2;
              const x1 = b.x + Math.cos(angle) * radius;
              const y1 = b.y + Math.sin(angle) * radius;
              if (s === 0) ctx.moveTo(x1, y1);
              else ctx.lineTo(x1, y1);
              const angleInner = angle + Math.PI / 5;
              const x2 = b.x + Math.cos(angleInner) * (radius * 0.45);
              const y2 = b.y + Math.sin(angleInner) * (radius * 0.45);
              ctx.lineTo(x2, y2);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            const starsSparks = 3;
            for (let j = 1; j <= starsSparks; j++) {
              const spSize = radius * (1 - j * 0.25) * 0.4;
              const spX = b.x - (bWidth * 0.3 * j);
              const spY = b.y + Math.sin(b.t * 0.9 + j) * 4;
              ctx.beginPath();
              ctx.arc(spX, spY, Math.max(1, spSize), 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
          case 'spark': {
            ctx.shadowBlur = config.glowInDark ? 15 : 0;
            ctx.shadowColor = activeColor;
            ctx.fillStyle = activeColor;

            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - bWidth * 0.4, b.y - bHeight * 1.3);
            ctx.lineTo(b.x - bWidth * 0.28, b.y);
            ctx.lineTo(b.x - bWidth * 0.4, b.y + bHeight * 1.3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x - bWidth * 0.18, b.y - bHeight * 0.45);
            ctx.lineTo(b.x - bWidth * 0.14, b.y);
            ctx.lineTo(b.x - bWidth * 0.18, b.y + bHeight * 0.45);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = activeColor;
            ctx.lineWidth = 1.5;
            for (let k = 0; k < 4; k++) {
              const sparkX = b.x - (bWidth * (0.32 + k * 0.18));
              const sparkLen = 8;
              const spreadY = (k - 1.5) * 5;
              ctx.beginPath();
              ctx.moveTo(sparkX, b.y + spreadY);
              ctx.lineTo(sparkX - sparkLen, b.y + spreadY + (Math.random() - 0.5) * 4);
              ctx.stroke();
            }
            break;
          }
          case 'line':
          default: {
            ctx.lineWidth = bHeight;
            ctx.shadowBlur = config.glowInDark ? 11 : 0;
            ctx.shadowColor = activeColor;

            const grad = ctx.createLinearGradient(b.x, b.y, b.x + trailOffset, b.y);
            grad.addColorStop(0, activeColor);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.strokeStyle = grad;

            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + trailOffset, b.y);
            ctx.stroke();

            ctx.lineWidth = Math.max(1.5, bHeight * 0.28);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            const coreOffset = trailOffset * 0.42;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + coreOffset, b.y);
            ctx.stroke();
            break;
          }
        }

        ctx.restore();

        // Update coordinate
        b.x += config.speed;
        b.life--;

        // Collision with lab walls or range boundary exhausted
        const didHitWall = b.x >= width - 15;
        if (didHitWall || b.life <= 0) {
          if (didHitWall) {
            const impactX = width - 10;
            const impactY = b.y;
            // Spawn sparks
            for (let s = 0; s < 8; s++) {
              sparks.push({
                x: impactX,
                y: impactY,
                vx: -Math.random() * 4 - 1.5,
                vy: (Math.random() - 0.5) * 6,
                maxLife: 20 + Math.random() * 15,
                color: activeColor,
              });
            }
          }
          bullets.splice(i, 1);
        }
      }

      // Update and draw sparkles
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.16; // gravity drift inside lab simulation
        sp.maxLife--;

        ctx.fillStyle = sp.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (sp.maxLife <= 0 || sp.y > height) {
          sparks.splice(i, 1);
        }
      }
      ctx.shadowBlur = 0; // reset

      // Draw Player Vector character facing right at px=40, py=90 offset
      const px = 40;
      const py = 88;
      const pCenterX = px + 8;
      const pCenterY = py + 12;

      ctx.save();
      ctx.translate(pCenterX, pCenterY);

      // Soft idle bobbing
      const breathingBob = Math.sin(now * 0.005) * 1.2;
      ctx.translate(0, breathingBob);

      const isP2 = playerId === 2;
      const bodyGlowColor = isP2 ? '#10b981' : '#00ffff';
      const baseLineColor = isP2 ? '#22c55e' : '#00ffff';
      const coreColor = isP2 ? '#a7f3d0' : '#aaffff';
      const visorColor = isP2 ? '#fef08a' : '#ffffff';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#050510';
      ctx.strokeStyle = baseLineColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = bodyGlowColor;

      // Draw Backpack
      if (isP2) {
        ctx.beginPath();
        ctx.rect(-14, -6, 4, 16);
        ctx.rect(-9, -6, 4, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(-12, 2, 1.5, 0, Math.PI * 2);
        ctx.arc(-7, 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.rect(-14, -6, 8, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(-10, 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#050510';

      // Draw Torso
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(8, -4);
      ctx.lineTo(10, 10);
      ctx.lineTo(-6, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Head
      ctx.beginPath();
      ctx.arc(2, -10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isP2) {
        ctx.beginPath();
        ctx.moveTo(2, -18);
        ctx.lineTo(6, -22);
        ctx.lineTo(6, -18);
        ctx.fillStyle = baseLineColor;
        ctx.fill();
        ctx.stroke();
      }

      // Draw Visor glowing
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(11, -10);
      ctx.strokeStyle = visorColor;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Legs
      ctx.strokeStyle = baseLineColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(-3, 10);
      ctx.lineTo(-3, 18);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, 10);
      ctx.lineTo(5, 18);
      ctx.stroke();

      // Rifle Gun Arm
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.moveTo(2, -2);
      ctx.lineTo(12, -4.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = coreColor;
      ctx.moveTo(9, -5.5);
      ctx.lineTo(21, -8.5);
      ctx.lineTo(20, -3.5);
      ctx.lineTo(8, -1.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(19, -8.0);
      ctx.lineTo(26, -9.5);
      ctx.stroke();

      // Firing Muzzle flare glow
      if (now - lastShotTime < 60) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = targetColor;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(26, -9.5, 5 + Math.sin(now * 0.1) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Helmet Glass Dome
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(2, -10, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [config, playerId]);

  return (
    <canvas
      ref={canvasRef}
      width={710}
      height={150}
      style={{ imageRendering: 'pixelated' }}
      className="w-full h-36 rounded border border-pink-500/30 bg-[#02050b] block shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"
    />
  );
}

interface LaserOptionsModalProps {
  p1Config: LaserConfig;
  p2Config: LaserConfig;
  onChangeP1: (cfg: LaserConfig) => void;
  onChangeP2: (cfg: LaserConfig) => void;
  onClose: () => void;
}

// Visual preset neon colors
const NEON_PRESETS = [
  { name: 'Cyan Spark', value: '#00ffff' },
  { name: 'Emerald Spark', value: '#00ff00' },
  { name: 'Magenta Force', value: '#ff00ff' },
  { name: 'Acid Yellow', value: '#ffff00' },
  { name: 'Tesla Blue', value: '#3b82f6' },
  { name: 'Sunburst Orange', value: '#f97316' },
  { name: 'Crimson Fury', value: '#ef4444' },
  { name: 'Quantum Purple', value: '#a855f7' },
  { name: 'Pure WhiteOut', value: '#ffffff' }
];

const DEFAULT_P1_LASER: LaserConfig = {
  particleType: 'line',
  size: 6,
  width: 85,
  color: '#00ffff',
  colorCycle: 'none',
  travelLength: 33,
  speed: 16,
  glowInDark: true,
  cooldown: 150
};

const DEFAULT_P2_LASER: LaserConfig = {
  particleType: 'line',
  size: 6,
  width: 85,
  color: '#00ff00',
  colorCycle: 'none',
  travelLength: 33,
  speed: 16,
  glowInDark: true,
  cooldown: 150
};

export default function LaserOptionsModal({
  p1Config,
  p2Config,
  onChangeP1,
  onChangeP2,
  onClose
}: LaserOptionsModalProps) {
  const [activeTab, setActiveTab] = useState<'p1' | 'p2'>('p1');

  // Working state variables
  const [p1, setP1] = useState<LaserConfig>({ ...p1Config });
  const [p2, setP2] = useState<LaserConfig>({ ...p2Config });

  const activeConfig = activeTab === 'p1' ? p1 : p2;
  const updateActive = (updated: Partial<LaserConfig>) => {
    if (activeTab === 'p1') {
      const next = { ...p1, ...updated };
      setP1(next);
    } else {
      const next = { ...p2, ...updated };
      setP2(next);
    }
    audio.playPickup();
  };

  const handleSave = () => {
    onChangeP1(p1);
    onChangeP2(p2);
    audio.playPowerup();
    onClose();
  };

  const handleReset = () => {
    setP1({ ...DEFAULT_P1_LASER });
    setP2({ ...DEFAULT_P2_LASER });
    audio.playDrop();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#030d14]/95 border-2 border-pink-500/80 rounded-lg shadow-[0_0_35px_rgba(244,63,94,0.3)] text-white overflow-hidden flex flex-col font-mono">
        
        {/* Cyber Header */}
        <div className="px-6 py-4 border-b border-pink-500/30 bg-pink-950/20 flex justify-between items-center relative">
          <div>
            <h2 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
              ⚡ LASER WEAPON LAB
            </h2>
            <p className="text-[10px] text-cyan-400/80 tracking-wide mt-0.5">
              PHOTON EMITTER WAVEFORM CALIBRATOR V2.4
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-pink-500 hover:text-white border border-pink-950/50 hover:border-pink-500 px-3 py-1 text-sm bg-black/40 transition-all rounded"
          >
            ESC
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-pink-950">
          <button 
            type="button"
            onClick={() => { setActiveTab('p1'); audio.playPickup(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all font-bold tracking-wider ${
              activeTab === 'p1' 
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-black/20'
            }`}
          >
            🔵 PLAYER 1 CONFIG
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('p2'); audio.playPickup(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all font-bold tracking-wider ${
              activeTab === 'p2' 
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-black/20'
            }`}
          >
            🟢 PLAYER 2 CONFIG
          </button>
        </div>

        {/* Customizer Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[65vh] overflow-y-auto">
          
          {/* Laser Real-Time Preview Area: Real high-fidelity animated weapon test bench */}
          <div className="flex flex-col gap-2 relative">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex justify-between items-center px-1">
              <span>📡 ACTIVE WEAPON TEST BENCH (REAL-TIME CALIDRATING)</span>
              <span className="text-pink-500 animate-pulse">● SIGNAL FLOW ONLINE</span>
            </div>
            <LaserPreviewCanvas 
              config={activeConfig} 
              playerId={activeTab === 'p1' ? 1 : 2} 
            />
            <div className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wide text-center">
              Type: <span className="text-cyan-400 font-bold">{activeConfig.particleType}</span> • Speed: <span className="text-cyan-400 font-bold">{activeConfig.speed} px/f</span> • Width: <span className="text-cyan-400 font-bold">{activeConfig.width}px</span> • Cooldown cycle: <span className="text-cyan-400 font-bold">{activeConfig.cooldown}ms</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Column 1: Core Emitter Properties */}
            <div className="flex flex-col gap-4">
              
              {/* Particle Type option */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-orange-400 font-bold uppercase">1. Particle Type (Geometry)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['line', 'beam', 'oval', 'star', 'spark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateActive({ particleType: t })}
                      className={`py-1.5 px-1 text-[10px] border font-bold uppercase transition-all rounded text-center ${
                        activeConfig.particleType === t
                          ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                          : 'border-cyan-950/80 bg-black/40 text-gray-400 hover:border-cyan-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Laser Core Color presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-orange-400 font-bold uppercase">2. Chroma Base (Color)</label>
                <div className="flex flex-wrap gap-2">
                  {NEON_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateActive({ color: p.value })}
                      title={p.name}
                      className="w-6 h-6 border transition-all rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: p.value,
                        borderColor: activeConfig.color === p.value ? '#ffffff' : 'transparent',
                        boxShadow: activeConfig.color === p.value ? `0 0 12px ${p.value}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Cooldown Range / Speed Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">3. Cooldown / Fire Rate</span>
                  <span className="text-cyan-400">{activeConfig.cooldown} ms</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="300"
                  step="10"
                  value={activeConfig.cooldown}
                  onChange={(e) => updateActive({ cooldown: parseInt(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>FAST MACHINE FIRE (80ms)</span>
                  <span>NORMAL (150ms)</span>
                  <span>HEAVY BOLT (300ms)</span>
                </div>
              </div>

              {/* Glow toggle */}
              <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded">
                <div>
                  <div className="text-xs font-bold text-orange-400 uppercase">Glow Charge Matrix</div>
                  <div className="text-[9px] text-gray-500 uppercase mt-0.5">Applies drop-shadow glow filter wrapper</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateActive({ glowInDark: !activeConfig.glowInDark })}
                  className={`text-xs px-3 py-1 font-bold border transition-all rounded ${
                    activeConfig.glowInDark 
                      ? 'border-green-500 bg-green-950/30 text-green-400' 
                      : 'border-gray-700 bg-black/40 text-gray-500'
                  }`}
                >
                  {activeConfig.glowInDark ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

            </div>

            {/* Column 2: Dimensions & Range Scalars */}
            <div className="flex flex-col gap-4">

              {/* Particle core width slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">4. Visual Particle Length</span>
                  <span className="text-cyan-400">{activeConfig.width} px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="160"
                  value={activeConfig.width}
                  onChange={(e) => updateActive({ width: parseInt(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>SHORT (30px)</span>
                  <span>DEFAULT (85px)</span>
                  <span>HYPER STREAK (160px)</span>
                </div>
              </div>

              {/* Particle core height / size slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">5. Core Diameter (Thickness)</span>
                  <span className="text-cyan-400">{activeConfig.size} px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={activeConfig.size}
                  onChange={(e) => updateActive({ size: parseInt(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>FINE (2px)</span>
                  <span>STANDARD (6px)</span>
                  <span>MEGA RIBBON (14px)</span>
                </div>
              </div>

              {/* Travel duration (Life frame count slider) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">6. Range Duration</span>
                  <span className="text-cyan-400">{activeConfig.travelLength} frames</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  value={activeConfig.travelLength}
                  onChange={(e) => updateActive({ travelLength: parseInt(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>CQB SHORT (15)</span>
                  <span>MID FIELD (33)</span>
                  <span>GLOBAL EXPANSION (100)</span>
                </div>
              </div>

              {/* Speed / velocity slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">7. Ejection Speed (Velocity)</span>
                  <span className="text-cyan-400">{activeConfig.speed} px/frm</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="28"
                  value={activeConfig.speed}
                  onChange={(e) => updateActive({ speed: parseInt(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>SLOW DRIFT (8)</span>
                  <span>PHOTON FORCE (16)</span>
                  <span>SUBLIGHT IMPULSE (28)</span>
                </div>
              </div>

              {/* Color cycle modes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-orange-400 font-bold uppercase">8. Color Cycle Matrix</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['none', 'rainbow', 'pulse', 'strobe'] as const).map((cy) => (
                    <button
                      key={cy}
                      type="button"
                      onClick={() => updateActive({ colorCycle: cy })}
                      className={`py-1 text-[9px] border font-bold uppercase transition-all rounded text-center ${
                        activeConfig.colorCycle === cy
                          ? 'border-pink-500 bg-pink-950/40 text-pink-300'
                          : 'border-cyan-950/80 bg-black/40 text-gray-500 hover:border-cyan-800'
                      }`}
                    >
                      {cy}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-pink-950 bg-black/60 flex justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-red-900 bg-red-950/10 hover:border-red-500 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-all rounded cursor-pointer"
          >
            Reset Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 bg-black/30 hover:border-gray-500 text-gray-400 hover:text-gray-300 text-xs font-bold uppercase tracking-widest transition-all rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 border border-cyan-400 bg-cyan-950/20 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_15px_#00ffff] text-cyan-300 text-xs font-bold uppercase tracking-widest transition-all rounded cursor-pointer"
            >
              Calibrate & Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
