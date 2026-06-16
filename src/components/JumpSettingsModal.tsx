import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../game/Audio';

export interface JumpConfig {
  height: number;           // Vertical jump speed/impulse (e.g. 3.5 - 10.0, default: 6.2)
  speed: number;            // Horizontal running speed (e.g. 2.0 - 6.0, default: 3.5)
  airControl: number;       // Air control steering factor (0.0 to 1.0, default: 0.25)
  inertia: number;          // Traction/Friction modifier (0.50 to 0.99, default: 0.85)
  weight: number;           // Gravity multiplier (0.3 to 2.5, default: 1.0)
  doubleJump: boolean;      // Double jump enabled (boolean, default: true)
  wallJump: boolean;        // Wall jump off walls (boolean, default: true)
  variableJump: boolean;    // Hold button longer for higher jump (boolean, default: true)
  coyoteTime: boolean;      // Brief grace period for running off ledges (boolean, default: true)
}

// Full interactive physics sandbox replicating exact key handles, gravity, horizontal slide, wall sliding/jumping, the variable jump cuts, and squash-n-stretch landing
function JumpLabPreviewCanvas({ config, playerId }: { config: JumpConfig; playerId: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    // Local controller key states
    const keys = {
      left: false,
      right: false,
      up: false
    };

    let triggerJump = false;
    let triggerJumpCut = false;

    // Player physical attributes
    const playerWidth = 16;
    const playerHeight = 24;

    const player = {
      x: 320,
      y: 80,
      vx: 0,
      vy: 0,
      isGrounded: false,
      doubleJumpCount: 0,
      coyoteTimer: 0,
      facing: 1,
      walkAnim: 0,
      squashY: 1.0,
      lastGrounded: false
    };

    const width = canvas.width;
    const height = canvas.height;
    const floorY = 150;

    // Level Testing Platforms [x, y, w, h]
    const platforms = [
      { x: 50, y: 110, w: 140, h: 8 },
      { x: 260, y: 75, w: 160, h: 8 },
      { x: 490, y: 110, w: 140, h: 8 }
    ];

    // Simple dust particle system for aesthetic juice
    interface Dust {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
    }
    let dustParticles: Dust[] = [];

    const spawnLandingDust = (px: number, py: number) => {
      for (let i = 0; i < 6; i++) {
        dustParticles.push({
          x: px + playerWidth / 2,
          y: py + playerHeight,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 1.5,
          alpha: 1.0,
          size: 1.5 + Math.random() * 2
        });
      }
    };

    // Frame Tick loop
    const tick = (now: number) => {
      const prevY = player.y;

      // Applied physics constants in alignment with engine
      const baseGravity = 0.24;
      const gravity = baseGravity * config.weight;
      const terminalVel = 8.5;

      // Integrate Gravity motion
      player.vy += gravity;
      if (player.vy > terminalVel) {
        player.vy = terminalVel;
      }

      // Check current wall slides
      const leftBoundary = 12;
      const rightBoundary = width - 12 - playerWidth;
      let onWall = 0; // -1: left, 1: right

      if (player.x <= leftBoundary) {
        player.x = leftBoundary;
        player.vx = 0;
        onWall = -1;
      }
      if (player.x >= rightBoundary) {
        player.x = rightBoundary;
        player.vx = 0;
        onWall = 1;
      }

      // If slide down on wall and wall jump enabled, slide slowly showing contact friction
      if (onWall !== 0 && !player.isGrounded && player.vy > 0 && config.wallJump) {
        player.vy = Math.min(player.vy, 0.9);
      }

      // Horizontal Motion acceleration model
      const speedCap = config.speed;
      const grip = 1 - config.inertia;

      if (player.isGrounded) {
        if (keys.left) {
          player.vx = player.vx + (-speedCap - player.vx) * (grip * 0.7 + 0.15);
          player.facing = -1;
          player.walkAnim += Math.abs(player.vx) * 0.12;
        } else if (keys.right) {
          player.vx = player.vx + (speedCap - player.vx) * (grip * 0.7 + 0.15);
          player.facing = 1;
          player.walkAnim += Math.abs(player.vx) * 0.12;
        } else {
          player.vx *= config.inertia; // Traction slide damping
        }
      } else {
        // Air steer dynamics
        const steer = config.airControl;
        if (keys.left) {
          player.vx = player.vx + (-speedCap - player.vx) * (steer * 0.22 + 0.05);
          player.facing = -1;
          player.walkAnim += Math.abs(player.vx) * 0.06;
        } else if (keys.right) {
          player.vx = player.vx + (speedCap - player.vx) * (steer * 0.22 + 0.05);
          player.facing = 1;
          player.walkAnim += Math.abs(player.vx) * 0.06;
        } else {
          player.vx *= 0.98; // soft air drag
        }
      }

      // Update positions
      player.x += player.vx;
      player.y += player.vy;

      // Boundaries solid constraints
      if (player.x < leftBoundary) player.x = leftBoundary;
      if (player.x > rightBoundary) player.x = rightBoundary;

      // Platform Landing detections
      let isLanded = false;
      if (player.vy >= 0) {
        // Floor crash
        if (player.y + playerHeight >= floorY) {
          player.y = floorY - playerHeight;
          player.vy = 0;
          isLanded = true;
        } else {
          // Check testing platform segments
          for (const plat of platforms) {
            const feetPrevY = prevY + playerHeight;
            const feetCurrY = player.y + playerHeight;
            const horizontalOk = player.x + playerWidth - 2 >= plat.x && player.x + 2 <= plat.x + plat.w;
            if (feetPrevY <= plat.y && feetCurrY >= plat.y && horizontalOk) {
              player.y = plat.y - playerHeight;
              player.vy = 0;
              isLanded = true;
              break;
            }
          }
        }
      }

      player.lastGrounded = player.isGrounded;
      player.isGrounded = isLanded;

      // Coyote time triggers
      if (isLanded) {
        player.doubleJumpCount = 0;
        player.coyoteTimer = config.coyoteTime ? 6 : 0;
        
        // Land sound juice & squash effect on transitioning ground
        if (!player.lastGrounded) {
          player.squashY = 0.72; // bounce squash
          spawnLandingDust(player.x, player.y);
          audio.playDrop();
        }
      } else {
        if (player.coyoteTimer > 0) {
          player.coyoteTimer--;
        }
      }

      // Smooth squash restore back to normal volume
      player.squashY += (1.0 - player.squashY) * 0.15;

      // Process Jump Triggers
      const jumpImpulse = -config.height;

      if (triggerJump) {
        triggerJump = false;
        
        // 1. Standard ledge or ground jump
        if (player.isGrounded || player.coyoteTimer > 0) {
          player.vy = jumpImpulse;
          player.isGrounded = false;
          player.coyoteTimer = 0;
          player.squashY = 1.35; // stretch peak jump
          audio.playJump();
        }
        // 2. Wall jump kinetics
        else if (config.wallJump && onWall !== 0 && !player.isGrounded) {
          player.vy = jumpImpulse;
          player.vx = -onWall * config.speed * 1.35; // bounce away
          player.facing = -onWall;
          player.squashY = 1.3;
          audio.playJump();
        }
        // 3. Double Jump loop
        else if (config.doubleJump && player.doubleJumpCount < 1) {
          player.vy = jumpImpulse * 0.95; // slightly lower impulse in mid-air
          player.doubleJumpCount++;
          player.squashY = 1.4; // super flips stretch!
          audio.playJump();
        }
      }

      // Early Variable Jump physics cutoff (damp velocity as key goes up early)
      if (triggerJumpCut) {
        triggerJumpCut = false;
        if (config.variableJump && player.vy < -1) {
          player.vy *= 0.5;
        }
      }

      // Drawing Phase
      ctx.fillStyle = '#01050a';
      ctx.fillRect(0, 0, width, height);

      // Lab matrix blue grids
      ctx.strokeStyle = playerId === 2 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      const bgGrid = 20;
      for (let x = 0; x < width; x += bgGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += bgGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Solid test range boundaries left & right
      ctx.fillStyle = '#020d18';
      ctx.fillRect(0, 0, 10, height);
      ctx.fillRect(width - 10, 0, 10, height);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(10, height);
      ctx.moveTo(width - 10, 0); ctx.lineTo(width - 10, height);
      ctx.stroke();

      // Floor
      ctx.fillStyle = '#010306';
      ctx.fillRect(0, floorY, width, height - floorY);
      ctx.strokeStyle = playerId === 2 ? '#22c55e' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();

      // Draw Testing Platforms
      platforms.forEach(plat => {
        ctx.fillStyle = '#03080f';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        ctx.save();
        ctx.strokeStyle = playerId === 2 ? '#10b981' : '#22d3ee';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y);
        ctx.lineTo(plat.x + plat.w, plat.y);
        ctx.stroke();
        ctx.restore();
      });

      // Update and draw dust particles
      for (let d = dustParticles.length - 1; d >= 0; d--) {
        const dp = dustParticles[d];
        dp.x += dp.vx;
        dp.y += dp.vy;
        dp.alpha -= 0.04;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${dp.alpha})`;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
        ctx.fill();

        if (dp.alpha <= 0) {
          dustParticles.splice(d, 1);
        }
      }

      // Draw Player Character
      const pxDraw = player.x;
      const pyDraw = player.y;

      ctx.save();
      // Center translation
      ctx.translate(pxDraw + playerWidth / 2, pyDraw + playerHeight / 2);

      // Leaning based on horizontal velocity
      const targetTilt = player.vx * 0.08;
      ctx.rotate(targetTilt);

      // Squash and stretch scale conservation
      const scaleX = player.facing * (2.0 - player.squashY);
      ctx.scale(scaleX, player.squashY);

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

      // Draw Torso Torus
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

      // Glowing Visor
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(10, -10);
      ctx.strokeStyle = visorColor;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Legs walking swing oscillation
      ctx.strokeStyle = baseLineColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;

      let legSwing = 0;
      if (player.isGrounded) {
        legSwing = Math.sin(player.walkAnim) * 7.5;
      } else {
        // floaty dangle legs in jump mid-air
        legSwing = Math.sin(now * 0.008) * 3.5;
      }

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

      // Dual Arm Running/Air Stability Motion
      const isRunningGround = player.isGrounded && Math.abs(player.vx) > 0.15;
      const isJumping = !player.isGrounded;

      if (isRunningGround) {
        // Back arm running swing (slightly dimmed/thinner for depth)
        ctx.save();
        ctx.strokeStyle = baseLineColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        const backShoulderX = -1;
        const backShoulderY = -2;
        const backArmSwing = Math.sin(player.walkAnim + Math.PI);
        const backHandX = backShoulderX + backArmSwing * 5;
        const backHandY = backShoulderY + 3 + Math.abs(Math.sin(player.walkAnim + Math.PI)) * 3;
        ctx.moveTo(backShoulderX, backShoulderY);
        ctx.lineTo(backHandX, backHandY);
        ctx.stroke();
        ctx.restore();

        // Front arm running swing
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        const armSwing = Math.sin(player.walkAnim);
        const frontHandX = 2 + armSwing * 5;
        const frontHandY = -2 + 3 + Math.abs(Math.sin(player.walkAnim)) * 3;
        ctx.moveTo(2, -2);
        ctx.lineTo(frontHandX, frontHandY);
        ctx.stroke();
      } else if (isJumping) {
        // Floating and flailing in the air for realistic balance flailing
        // Back arm flails in space wind
        ctx.save();
        ctx.strokeStyle = baseLineColor;
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        const flailOffsetBack = Math.cos(now * 0.015) * 3;
        ctx.moveTo(-1, -2);
        ctx.lineTo(-6, -4 + flailOffsetBack);
        ctx.stroke();
        ctx.restore();

        // Front arm reaches out for balance
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        const flailOffsetFront = Math.sin(now * 0.015) * 3;
        ctx.moveTo(2, -2);
        ctx.lineTo(9, -2 + flailOffsetFront);
        ctx.stroke();
      } else {
        // Relaxed idle hand
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.moveTo(2, -2);
        ctx.lineTo(8, 2);
        ctx.stroke();
      }

      // Helmet Dome bubble
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(2, -10, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(tick);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      let prevent = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
        prevent = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
        prevent = true;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'Spacebar') {
        if (!keys.up) {
          triggerJump = true;
        }
        keys.up = true;
        prevent = true;
      }
      if (prevent) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'Spacebar') {
        keys.up = false;
        triggerJumpCut = true;
      }
    };

    const container = containerRef.current;
    if (isFocused && container) {
      container.addEventListener('keydown', handleKeyDown);
      container.addEventListener('keyup', handleKeyUp);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
        container.removeEventListener('keyup', handleKeyUp);
      }
    };
  }, [config, playerId, isFocused]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
      }}
      className="w-full relative select-none outline-none group"
    >
      <canvas
        ref={canvasRef}
        width={710}
        height={180}
        style={{ imageRendering: 'pixelated' }}
        className={`w-full h-44 rounded border transition-all duration-300 block bg-[#01050a] ${
          isFocused 
            ? 'border-cyan-400 ring-2 ring-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
            : 'border-cyan-950/80 hover:border-cyan-700/60 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]'
        }`}
      />

      {/* Focus Prompt overlay when blurred */}
      {!isFocused && (
        <div 
          onClick={() => {
            containerRef.current?.focus();
            setIsFocused(true);
            audio.playPickup();
          }}
          className="absolute inset-0 bg-black/75 backdrop-blur-[0.5px] rounded border border-dashed border-cyan-500/20 flex flex-col justify-center items-center cursor-pointer hover:bg-black/60 group-hover:border-cyan-400/40 transition-all gap-1.5"
        >
          <span className="text-sm font-bold text-cyan-400 tracking-widest group-hover:scale-105 transition-transform font-mono uppercase">
            🕹️ Click to test jump mechanics
          </span>
          <span className="text-[9px] text-gray-500 font-mono tracking-wide max-w-sm text-center">
            USE (W, A, D) OR ARROW KEYS TO MOVE & JUMP. SLIDERS BELOW INSTANTLY MAP YOUR LAB PHYSICS!
          </span>
        </div>
      )}

      {/* Active control pill */}
      {isFocused && (
        <div className="absolute top-2.5 right-3 bg-cyan-950/80 border border-cyan-400/30 text-[9px] text-cyan-300 font-mono font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          ACTIVE KEYBOARD CONTROL FOCUS
        </div>
      )}
    </div>
  );
}

interface JumpSettingsModalProps {
  p1Config: JumpConfig;
  p2Config: JumpConfig;
  onChangeP1: (cfg: JumpConfig) => void;
  onChangeP2: (cfg: JumpConfig) => void;
  onClose: () => void;
}

export const DEFAULT_P1_JUMP: JumpConfig = {
  height: 6.2,
  speed: 3.5,
  airControl: 0.25,
  inertia: 0.85,
  weight: 1.0,
  doubleJump: true,
  wallJump: true,
  variableJump: true,
  coyoteTime: true,
};

export const DEFAULT_P2_JUMP: JumpConfig = {
  height: 6.2,
  speed: 3.5,
  airControl: 0.25,
  inertia: 0.85,
  weight: 1.0,
  doubleJump: true,
  wallJump: true,
  variableJump: true,
  coyoteTime: true,
};

export default function JumpSettingsModal({
  p1Config,
  p2Config,
  onChangeP1,
  onChangeP2,
  onClose
}: JumpSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'p1' | 'p2'>('p1');

  // Working state variables
  const [p1, setP1] = useState<JumpConfig>({ ...DEFAULT_P1_JUMP, ...p1Config });
  const [p2, setP2] = useState<JumpConfig>({ ...DEFAULT_P2_JUMP, ...p2Config });

  const activeConfig = activeTab === 'p1' ? p1 : p2;
  const updateActive = (updated: Partial<JumpConfig>) => {
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
    if (activeTab === 'p1') {
      setP1({ ...DEFAULT_P1_JUMP });
    } else {
      setP2({ ...DEFAULT_P2_JUMP });
    }
    audio.playDrop();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#030d14]/95 border-2 border-cyan-500/80 rounded-lg shadow-[0_0_35px_rgba(6,182,212,0.3)] text-white overflow-hidden flex flex-col font-mono">
        
        {/* Cyber Header */}
        <div className="px-6 py-4 border-b border-cyan-500/30 bg-cyan-950/20 flex justify-between items-center relative">
          <div>
            <h2 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              👟 PLATFORMER JUMP LAB
            </h2>
            <p className="text-[10px] text-pink-400/80 tracking-wide mt-0.5">
              NON-FLIGHT SURFACE JUMP KINETICS ENGINE V4.0
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-cyan-400 hover:text-white border border-cyan-950/50 hover:border-cyan-500 px-3 py-1 text-sm bg-black/40 transition-all rounded cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-cyan-950">
          <button 
            type="button"
            onClick={() => { setActiveTab('p1'); audio.playPickup(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all font-bold tracking-wider cursor-pointer ${
              activeTab === 'p1' 
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-black/20'
            }`}
          >
            🔵 PLAYER 1 (BLUE) JUMP
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('p2'); audio.playPickup(); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all font-bold tracking-wider cursor-pointer ${
              activeTab === 'p2' 
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-black/20'
            }`}
          >
            🟢 PLAYER 2 (GREEN) JUMP
          </button>
        </div>

        {/* Customizer Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[65vh] overflow-y-auto">
          
          {/* Informational Subtitle */}
          <div className="text-xs text-cyan-500/80 bg-cyan-950/20 p-3 border border-cyan-950/50 rounded leading-relaxed">
            💡 **PLATFORMER RULES:** These micro-calibrated physics parameters will apply **ONLY** when a player is spawned or plays **WITHOUT** wearing their Jetpack! The game will automatically lock vertical flight, allowing inputs to trigger precision platforming jumps.
          </div>

          {/* Interactive Playground Testing Area */}
          <div className="flex flex-col gap-2 relative">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex justify-between items-center px-1">
              <span>🦾 DYNAMIC KINETICS WORKSPACE</span>
              <span className="text-emerald-400 animate-pulse">● PHYSICS SIMULATOR READY</span>
            </div>
            
            <JumpLabPreviewCanvas 
              config={activeConfig} 
              playerId={activeTab === 'p1' ? 1 : 2} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Column 1: Core Physics Scalars */}
            <div className="flex flex-col gap-4">
              
              {/* Height / Impulse Force */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">1. Jump Launch Force</span>
                  <span className="text-cyan-400">{activeConfig.height.toFixed(1)} px/frm</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="10.0"
                  step="0.2"
                  value={activeConfig.height}
                  onChange={(e) => updateActive({ height: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>LOW HOP (4.0)</span>
                  <span>STANDARD (6.2)</span>
                  <span>HIGH SPACE FLIP (10.0)</span>
                </div>
              </div>

              {/* Running Speed */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">2. Ground Running Speed</span>
                  <span className="text-cyan-400">{activeConfig.speed.toFixed(1)} px/frm</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.1"
                  value={activeConfig.speed}
                  onChange={(e) => updateActive({ speed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>HEAVY SLOW (2.0)</span>
                  <span>STANDARD (3.5)</span>
                  <span>HYPER DASH (6.0)</span>
                </div>
              </div>

              {/* Weight (Gravity Scale) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">3. Player Body Mass (Gravity)</span>
                  <span className="text-cyan-400">{activeConfig.weight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.1"
                  value={activeConfig.weight}
                  onChange={(e) => updateActive({ weight: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>FLOATY MOON (0.3x)</span>
                  <span>EARTH (1.0x)</span>
                  <span>HEAVY JUPITER (2.5x)</span>
                </div>
              </div>

              {/* Friction / Inertia */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">4. Ground Momentum / Slide</span>
                  <span className="text-cyan-400">{((1 - activeConfig.inertia) * 100).toFixed(0)}% Grip</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.98"
                  step="0.02"
                  value={activeConfig.inertia}
                  onChange={(e) => updateActive({ inertia: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>SKEETING ICE (98% Slide)</span>
                  <span>BALANCED (85%)</span>
                  <span>INSTANT GRIP (50%)</span>
                </div>
              </div>

              {/* Air Control Steering */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-orange-400">5. Air Steering Control</span>
                  <span className="text-cyan-400">{(activeConfig.airControl * 100).toFixed(0)}% steer</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={activeConfig.airControl}
                  onChange={(e) => updateActive({ airControl: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-black/60 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-500">
                  <span>UNSTEERABLE MOMENTUM (0%)</span>
                  <span>DEFAULT (25%)</span>
                  <span>HYPER FLIGHT STEER (100%)</span>
                </div>
              </div>

            </div>

            {/* Column 2: Advanced Abilities & Mechanics */}
            <div className="flex flex-col gap-3.5">
              
              <div className="text-[10px] text-pink-400 font-bold tracking-widest uppercase border-b border-pink-950 pb-1 mb-1">
                ⚙️ ACTIVE ENHANCED BEHAVIORS
              </div>

              {/* Double Jump */}
              <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase">Double Jump (Mid-Air)</div>
                  <div className="text-[9px] text-gray-500 uppercase mt-0.5">Allows initiating a second flip in mid-air</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateActive({ doubleJump: !activeConfig.doubleJump })}
                  className={`text-xs px-3 py-1 font-bold border transition-all rounded cursor-pointer ${
                    activeConfig.doubleJump 
                      ? 'border-green-500 bg-green-950/30 text-green-400' 
                      : 'border-gray-700 bg-black/40 text-gray-500'
                  }`}
                >
                  {activeConfig.doubleJump ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Wall Jump */}
              <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase font-mono">Wall Jumping</div>
                  <div className="text-[9px] text-gray-500 uppercase mt-0.5">Push up or space key while touching wall to rebound</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateActive({ wallJump: !activeConfig.wallJump })}
                  className={`text-xs px-3 py-1 font-bold border transition-all rounded cursor-pointer ${
                    activeConfig.wallJump 
                      ? 'border-green-500 bg-green-950/30 text-green-400' 
                      : 'border-gray-700 bg-black/40 text-gray-500'
                  }`}
                >
                  {activeConfig.wallJump ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Variable Jump Height */}
              <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase">Variable Jump Cut</div>
                  <div className="text-[9px] text-gray-500 uppercase mt-0.5">Release up/thrust early to abort upward motion</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateActive({ variableJump: !activeConfig.variableJump })}
                  className={`text-xs px-3 py-1 font-bold border transition-all rounded cursor-pointer ${
                    activeConfig.variableJump 
                      ? 'border-green-500 bg-green-950/30 text-green-400' 
                      : 'border-gray-700 bg-black/40 text-gray-500'
                  }`}
                >
                  {activeConfig.variableJump ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Coyote Ledge Jump */}
              <div className="flex items-center justify-between border border-cyan-950/60 bg-black/20 p-2.5 rounded">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase">Coyote Ledge Grace</div>
                  <div className="text-[9px] text-gray-500 uppercase mt-0.5">Allows jump triggers briefly helper after running off</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateActive({ coyoteTime: !activeConfig.coyoteTime })}
                  className={`text-xs px-3 py-1 font-bold border transition-all rounded cursor-pointer ${
                    activeConfig.coyoteTime 
                      ? 'border-green-500 bg-green-950/30 text-green-400' 
                      : 'border-gray-700 bg-black/40 text-gray-500'
                  }`}
                >
                  {activeConfig.coyoteTime ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-cyan-950 bg-black/60 flex justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-red-900 bg-red-950/10 hover:border-red-500 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-all rounded cursor-pointer"
          >
            Reset Active Profile
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
              Synergize Physics
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
