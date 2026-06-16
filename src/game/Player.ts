import { Vector } from './Vector';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY, ROCKET_BASE_X, ROCKET_BASE_Y, NEON_COLORS } from './Constants';
import { audio } from './Audio';
import { input } from './Input';
import { Particle } from './Particle';
import { Bullet } from './Bullet';
import { PlatformDef } from './StageProfiles';

export class Player {
  pos: Vector;
  vel: Vector;
  width = 24;
  height = 36;
  facing = 1; // 1 for right, -1 for left
  isGrounded = false;
  hovering = false;
  carryingItem: any = null;
  carryingRescue: any = null;
  carryingArtifact: any = null;
  lastShot = 0;
  dead = false;
  invulnerableTimer = 0;
  walkAnim = 0;
  waveTimer = 0;
  groundPlatformIndex = -1;
  groundPlatformKind?: string = 'normal';
  squashY = 1.0;
  tiltAngle = 0;

  // Multiplayer variables
  playerId: 1 | 2 = 1;
  label = 'P1';
  shield = 100;
  maxShield = 100;
  idleFrames = 0;
  lives = 3;
  score = 0;
  isOut = false;
  laserConfig: any = null;
  hasJetpack = true;
  jumpConfig: any = null;
  jumpsRemaining = 0;
  coyoteTimer = 0;
  lastUpPressed = false;

  equipment = {
    gravityBoots: false,
    heatShield: false,
    aquaHelmet: false,
    rubberSuit: false,
    magnetBoots: false
  };
  keysCollected: string[] = [];
  onCeiling = false;
  ceilingPlatformIndex = -1;
  
  constructor() {
    this.pos = new Vector(GAME_WIDTH / 2, GAME_HEIGHT - 50);
    this.vel = new Vector(0, 0);
  }

  getGunTip(): { x: number; y: number } {
    const isFiringPose = Date.now() - this.lastShot < 150;
    if (isFiringPose) {
      // visual gun tip is at X: 26, Y: -9.5 relative to character center (this.pos.x + 12, this.pos.y + 16)
      const gunTipX = this.pos.x + 12 + this.facing * 26;
      const gunTipY = this.pos.y + 6.5;
      return { x: gunTipX, y: gunTipY };
    } else {
      // visual gun tip is at X: 14, Y: 2 relative to character center (this.pos.x + 12, this.pos.y + 16)
      const gunTipX = this.pos.x + 12 + this.facing * 14;
      const gunTipY = this.pos.y + 18;
      return { x: gunTipX, y: gunTipY };
    }
  }

  resetAll() {
    this.equipment = {
      gravityBoots: false,
      heatShield: false,
      aquaHelmet: false,
      rubberSuit: false,
      magnetBoots: false
    };
    this.keysCollected = [];
    this.onCeiling = false;
    this.ceilingPlatformIndex = -1;
    this.isGrounded = false;
    this.hovering = false;
    this.dead = false;
    this.carryingItem = null;
    this.carryingRescue = null;
    this.carryingArtifact = null;
    this.shield = 100;
    this.vel.set(0, 0);
    this.idleFrames = 0;
    this.jumpsRemaining = 0;
    this.coyoteTimer = 0;
    this.lastUpPressed = false;
  }

  update(particles: Particle[], bullets: Bullet[], platforms: PlatformDef[], env?: {
    forceX?: number;
    forceY?: number;
    gravityMultiplier?: number;
    frictionMultiplier?: number;
    conveyorX?: number;
    bounceVelocity?: number | null;
    movingPlatformDelta?: { x: number; y: number } | null;
    submerged?: boolean;
    sinkSpeed?: number;
  }) {
    const wasGrounded = this.isGrounded;
    if (this.dead) return;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer--;
    }

    const pInput = input.getPlayerInput(this.playerId);

    // Ceiling-sticking controls (Gravity Boots)
    if (this.onCeiling) {
      if (pInput.up || pInput.down) {
        this.onCeiling = false;
        this.ceilingPlatformIndex = -1;
        this.vel.y = pInput.up ? -1.0 : 1.0;
        this.hovering = pInput.up;
      } else {
        const cp = platforms[this.ceilingPlatformIndex];
        const cpHeight = cp && cp[3] !== undefined ? cp[3] : 15;
        if (!cp || this.pos.x + this.width - 4 <= cp[0] || this.pos.x + 4 >= cp[0] + cp[2]) {
          this.onCeiling = false;
          this.ceilingPlatformIndex = -1;
        } else {
          this.pos.y = cp[1] + cpHeight;
          this.vel.y = 0;
        }
      }
    }

    // Movement
    let finalSpeed = 3.5;
    let finalInertia = 0.85;
    let finalAirControl = 0.25;
    
    const activeJumpConfig = this.jumpConfig;
    if (!this.hasJetpack && activeJumpConfig) {
      finalSpeed = activeJumpConfig.speed;
      finalInertia = activeJumpConfig.inertia;
      finalAirControl = activeJumpConfig.airControl;
    }

    const accel = 0.5 * (env?.submerged ? 0.35 : 1.0) * (this.isGrounded ? 1.0 : finalAirControl);
    const maxSpeed = finalSpeed * (env?.submerged ? 0.50 : 1.0);
    
    if (this.isGrounded) {
      this.jumpsRemaining = (activeJumpConfig?.doubleJump !== false) ? 2 : 1;
      this.coyoteTimer = (activeJumpConfig?.coyoteTime !== false) ? 8 : 0;
    } else {
      if (this.coyoteTimer > 0) this.coyoteTimer--;
    }

    if (pInput.left) {
      this.vel.x -= accel;
      this.facing = -1;
    } else if (pInput.right) {
      this.vel.x += accel;
      this.facing = 1;
    } else {
      let friction = this.isGrounded ? finalInertia : 0.98;
      if (this.isGrounded && this.groundPlatformKind === 'ice') {
        friction = this.equipment.magnetBoots ? 0.85 : 0.975; // 0.85 is much better traction!
      } else if (env?.frictionMultiplier !== undefined) {
        friction *= env.frictionMultiplier;
      }
      this.vel.x *= friction; // friction
    }

    // Capture "just pressed" state for Up button to allow discrete jump triggers
    const upJustPressed = pInput.up && !this.lastUpPressed;
    this.hovering = false;

    if (this.hasJetpack) {
      // JETPACK ABILITIES ACTIVE
      if (pInput.up) {
        const jetThrust = 0.5 * (env?.submerged ? 0.35 : 1.0);
        this.vel.y -= jetThrust;
        this.hovering = true;
        if (Math.random() < 0.8) {
          // Find nozzle position based on player facing direction
          const nozzleX = this.pos.x + this.width/2 + (this.facing === 1 ? -10 : 10);
          const nozzleY = this.pos.y + this.height/2 + 10;
          
          // Spawn thrust particle - bubbles if submerged, spark otherwise
          const thrustColor = env?.submerged ? '#7dd3fc' : (this.playerId === 2 ? '#eab308' : NEON_COLORS.CYAN);
          particles.push(new Particle(nozzleX + (Math.random() - 0.5) * 4, nozzleY, thrustColor, 1, undefined, !env?.submerged));
          
          // Occasional bright white core thrust
          if (Math.random() < 0.4) {
            particles.push(new Particle(nozzleX + (Math.random() - 0.5) * 2, nozzleY + 2, '#ffffff', 1, undefined, !env?.submerged));
          }
        }
      }
    } else {
      // PLATFORMER JUMP MECHANICS ACTIVE
      let jumped = false;
      
      // Calculate wall contacts for Wall Jump
      let nearLeftWall = false;
      let nearRightWall = false;
      
      if (activeJumpConfig?.wallJump !== false && !this.isGrounded) {
         if (platforms && Array.isArray(platforms)) {
            for (const plat of platforms) {
               const platH = plat[3] !== undefined ? plat[3] : 15;
               const yOverlap = (this.pos.y + this.height > plat[1]) && (this.pos.y < plat[1] + platH);
               if (yOverlap) {
                  // Adjacent to left boundary of platform
                  if (Math.abs((this.pos.x + this.width) - plat[0]) < 8) {
                     nearLeftWall = true;
                  }
                  // Adjacent to right boundary of platform
                  if (Math.abs(this.pos.x - (plat[0] + plat[2])) < 8) {
                     nearRightWall = true;
                  }
               }
            }
         }
      }

      if (upJustPressed) {
         const jumpImpulse = activeJumpConfig ? activeJumpConfig.height : 6.2;
         
         if (this.isGrounded || this.coyoteTimer > 0) {
            this.vel.y = -jumpImpulse;
            this.jumpsRemaining--;
            this.coyoteTimer = 0;
            jumped = true;
            this.isGrounded = false;
            // Play physical jump sound
            if (audio.playJump) audio.playJump();
            else audio.playPickup();
         } 
         else if (nearLeftWall) {
            this.vel.y = -jumpImpulse;
            this.vel.x = -maxSpeed * 0.9;
            jumped = true;
            if (audio.playJump) audio.playJump();
            else audio.playPickup();
         }
         else if (nearRightWall) {
            this.vel.y = -jumpImpulse;
            this.vel.x = maxSpeed * 0.9;
            jumped = true;
            if (audio.playJump) audio.playJump();
            else audio.playPickup();
         }
         else if (this.jumpsRemaining > 0 && (activeJumpConfig?.doubleJump !== false)) {
            this.vel.y = -jumpImpulse * 0.95;
            this.jumpsRemaining--;
            jumped = true;
            if (audio.playJump) audio.playJump();
            else audio.playPickup();
            
            // Spawn circular double-jump rings
            for (let idx = 0; idx < 12; idx++) {
               const angle = (idx / 12) * Math.PI * 2;
               const pt = new Particle(this.pos.x + this.width/2, this.pos.y + this.height, '#38bdf8', 1.2);
               pt.vel.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.0 + 0.5);
               particles.push(pt);
            }
         }
      }

      // Variable jump height cut
      if (!pInput.up && this.vel.y < -1.5 && (activeJumpConfig?.variableJump !== false)) {
         this.vel.y *= 0.5;
      }

      // Wall sliding deceleration
      if ((nearLeftWall || nearRightWall) && this.vel.y > 0) {
         this.vel.y *= 0.75;
      }
    }
    
    this.lastUpPressed = pInput.up;

    // Apply conveyor force directly to position if grounded on conveyor
    if (this.isGrounded) {
       let conveyorSpeed = 1.25;
       if (this.equipment.magnetBoots) {
         conveyorSpeed *= 0.3; // 70% reduction in push
       }
       if (this.groundPlatformKind === 'conveyorLeft') {
          this.pos.x -= conveyorSpeed;
       } else if (this.groundPlatformKind === 'conveyorRight') {
          this.pos.x += conveyorSpeed;
       }
    }

    // Direct moving platform carry-along
    if (env?.movingPlatformDelta) {
      this.pos.x += env.movingPlatformDelta.x;
      this.pos.y += env.movingPlatformDelta.y;
    }

    // Apply external forces (fans/wind)
    if (env?.forceX !== undefined) {
      const reduction = this.equipment.magnetBoots ? 0.25 : 1.0;
      this.vel.x += env.forceX * reduction;
    }
    if (env?.forceY !== undefined) {
      const reduction = this.equipment.magnetBoots ? 0.25 : 1.0;
      this.vel.y += env.forceY * reduction;
    }

    // Limit speeds
    if (this.vel.x > maxSpeed) this.vel.x = maxSpeed;
    if (this.vel.x < -maxSpeed) this.vel.x = -maxSpeed;
    
    // Dynamic vertical limits based on max jump height or standard jetpack flight
    const limitUpY = this.hasJetpack ? -5 : -(activeJumpConfig?.height || 6.2);
    if (this.vel.y < limitUpY) this.vel.y = limitUpY;
    if (this.vel.y > 8) this.vel.y = 8;

    // Apply gravity
    if (!this.onCeiling) {
      const gravityMult = env?.gravityMultiplier !== undefined ? env.gravityMultiplier : 1.0;
      const jumpWeight = (!this.hasJetpack && activeJumpConfig) ? activeJumpConfig.weight : 1.0;
      let computedGravity = GRAVITY * gravityMult * jumpWeight;
      if ((window as any).__gravityClampActive) {
         computedGravity = computedGravity * 0.2;
      }
      this.vel.y += computedGravity;
    }

    // Sinking logic inside water
    if (env?.submerged) {
       this.vel.y += 0.05;
       const limit = env.sinkSpeed !== undefined ? env.sinkSpeed : 0.7;
       if (this.vel.y > limit) {
          this.vel.y = limit;
       }
    }

    // Update position
    this.pos.add(this.vel);

    // Screen wrap X
    if (this.pos.x > GAME_WIDTH) this.pos.x = -this.width;
    if (this.pos.x < -this.width) this.pos.x = GAME_WIDTH;

    // Screen boundaries Y
    if (this.pos.y < 0) {
      this.pos.y = 0;
      this.vel.y = 0;
    }

    this.isGrounded = false;
    this.groundPlatformIndex = -1;
    this.groundPlatformKind = undefined;

    // Ceilings (Gravity Boots underside attachment)
    if (this.equipment.gravityBoots && this.vel.y <= 0 && !this.onCeiling) {
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const pHeight = p[3] !== undefined ? p[3] : 15;
        if (
          this.pos.x + this.width - 4 > p[0] &&
          this.pos.x + 4 < p[0] + p[2] &&
          this.pos.y >= p[1] + pHeight - 12 && // underside tolerance
          this.pos.y <= p[1] + pHeight + 4
        ) {
          this.onCeiling = true;
          this.ceilingPlatformIndex = i;
          this.pos.y = p[1] + pHeight;
          this.vel.y = 0;
          break;
        }
      }
    }

    // Platform collisions
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (
        this.vel.y > 0 && 
        this.pos.x + this.width - 4 > p[0] && 
        this.pos.x + 4 < p[0] + p[2] && 
        this.pos.y + this.height >= p[1] && 
        this.pos.y + this.height <= p[1] + 12 // fall tolerance
      ) {
        if (p.kind === 'bounce') {
          // Bounce up high!
          const bouncePower = pInput.up ? -9.0 : -7.5;
          this.vel.y = bouncePower;
          this.pos.y = p[1] - this.height - 4; // micro offset to prevent infinite stick
          this.isGrounded = false;
          
          // Bounce particles
          for (let k = 0; k < 15; k++) {
            particles.push(new Particle(this.pos.x + this.width/2 + (Math.random() - 0.5) * 16, p[1], '#ff00ff', 1.5, undefined, true));
          }
        } else {
          this.pos.y = p[1] - this.height;
          this.vel.y = 0;
          this.isGrounded = true;
          this.groundPlatformIndex = i;
          this.groundPlatformKind = p.kind || 'normal';
        }
      }
    }
    
    // Walk animation logic
    if (this.isGrounded && Math.abs(this.vel.x) > 0.1) {
      this.walkAnim += Math.abs(this.vel.x) * 0.15;
    } else {
      this.walkAnim = 0;
    }
    
    // Increment or reset idle frames depending on grounded motion
    if (this.isGrounded && Math.abs(this.vel.x) < 0.1 && !this.hovering) {
      this.idleFrames++;
    } else {
      this.idleFrames = 0;
    }

    if (this.waveTimer > 0) {
      this.waveTimer--;
    }

    // Shooting
    const laserCooldown = this.laserConfig?.cooldown ?? 150;
    const isAutoFire = this.playerId === 1 ? (window as any).__p1AutoFire : (window as any).__p2AutoFire;
    if ((pInput.fire || isAutoFire) && Date.now() - this.lastShot > laserCooldown) {
      this.lastShot = Date.now();
      audio.playShoot();
      
      // Calculate gun tip position
      const tip = this.getGunTip();
      const gunTipX = tip.x;
      const gunTipY = tip.y;

      // Bullet length for placing front start pos ahead so the tail begins at gun tip
      const bulletWidth = this.laserConfig?.width ?? 85;
      const bulletFrontX = gunTipX + (this.facing * bulletWidth);
      
      const bColor = this.laserConfig?.color || (this.playerId === 2 ? '#22c55e' : undefined);
      const bullet = new Bullet(bulletFrontX, gunTipY, this.facing, this.laserConfig || 16, bColor);
      (bullet as any).ownerPlayerId = this.playerId;
      bullets.push(bullet);
      
      if ((window as any).__triShotActive) {
         const bullet2 = new Bullet(bulletFrontX, gunTipY - 10, this.facing, this.laserConfig || 16, bColor);
         (bullet2 as any).ownerPlayerId = this.playerId;
         bullets.push(bullet2);

         const bullet3 = new Bullet(bulletFrontX, gunTipY + 10, this.facing, this.laserConfig || 16, bColor);
         (bullet3 as any).ownerPlayerId = this.playerId;
         bullets.push(bullet3);
      }
    }

    // Decay squash factor back to 1.0 slowly
    this.squashY += (1.0 - this.squashY) * 0.16;

    // Detect ground transition collisions
    if (this.isGrounded && !wasGrounded) {
       this.squashY = 0.72; // Squash flat on land
       const dustColor = this.playerId === 2 ? '#22c55e' : NEON_COLORS.CYAN;
       for (let k = 0; k < 6; k++) {
         particles.push(new Particle(this.pos.x + this.width/2 + (Math.random() - 0.5) * 14, this.pos.y + this.height, Math.random() < 0.4 ? '#ffffff' : dustColor, 1.0, undefined, true));
       }
    } else if (!this.isGrounded && wasGrounded) {
       this.squashY = 1.25; // Stretch out vertically on lift-off
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;

    // Grab correct theme color palette
    const isP2 = this.playerId === 2;
    const themeGlow = isP2 ? '#10b981' : NEON_COLORS.CYAN;

    // Draw gorgeous invulnerability shield bubble and handle flashing frames
    if (this.invulnerableTimer > 0) {
       ctx.save();
       ctx.strokeStyle = themeGlow;
       ctx.lineWidth = 2;
       ctx.shadowBlur = 15;
       ctx.shadowColor = themeGlow;
       ctx.beginPath();
       ctx.arc(this.pos.x + this.width / 2, this.pos.y + this.height / 2, 28, 0, Math.PI * 2);
       ctx.stroke();
       
       // Flashing core aura
       ctx.fillStyle = isP2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 255, 255, 0.1)';
       ctx.fill();
       ctx.restore();

       // Flashing overlay
       if (Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
          // Temporarily draw as partially transparent/ghostly
          ctx.save();
          ctx.globalAlpha = 0.4;
          this.drawActual(ctx);
          ctx.restore();
          return;
       }
    }

    this.drawActual(ctx);
  }

  drawActual(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Position player centered
    ctx.translate(this.pos.x + this.width / 2, this.pos.y + this.height / 2);

    // Apply subtle idle breathing bob
    if (this.idleFrames > 0) {
      const breathingBob = Math.sin(this.idleFrames * 0.08) * 1.5;
      ctx.translate(0, breathingBob);
    }

    // Apply inertia-based tilt leaning
    const targetTilt = this.vel.x * 0.035;
    this.tiltAngle = this.tiltAngle + (targetTilt - this.tiltAngle) * 0.15;
    ctx.rotate(this.tiltAngle);

    // Scaling with squash and stretch conservation of volume
    const sX = this.facing * (2.0 - this.squashY);
    ctx.scale(sX, this.squashY);

    const isGhost = false;
    this.drawBody(ctx, isGhost);

    ctx.restore();

    // Tether for carried item
    if (this.carryingItem) {
       ctx.save();
       ctx.beginPath();
       ctx.moveTo(this.pos.x + this.width/2, this.pos.y + this.height/2);
       ctx.lineTo(this.carryingItem.pos.x + 12, this.carryingItem.pos.y + 12);
       // dynamic tether glow
       const t = Date.now() * 0.01;
       const pGlow = this.playerId === 2 ? `hsla(${120 + t * 5 % 120}, 100%, 65%, 0.8)` : `hsla(${t * 5 % 360}, 100%, 70%, 0.8)`;
       ctx.strokeStyle = pGlow;
       ctx.shadowBlur = 10;
       ctx.shadowColor = ctx.strokeStyle;
       ctx.lineWidth = 2;
       ctx.stroke();
       ctx.restore();
    }
  }

  drawBody(ctx: CanvasRenderingContext2D, isGhost: boolean) {
    const isP2 = this.playerId === 2;
    const isClamp = (window as any).__gravityClampActive;
    
    ctx.save();

    const idleTime = this.idleFrames;
    let isFootTapping = false;
    let isStretching = false;
    let isBobbing = false;
    let isIdleWaving = false;

    if (idleTime > 120) {
      const phase = Math.floor((idleTime - 120) / 180) % 4;
      if (phase === 0) {
        isFootTapping = true;
      } else if (phase === 1) {
        isStretching = true;
      } else if (phase === 2) {
        isBobbing = true;
      } else if (phase === 3) {
        isIdleWaving = true;
      }
    }

    if (isBobbing) {
      const bobOffset = Math.sin(idleTime * 0.08) * 0.12; 
      ctx.rotate(bobOffset);
    }
    
    // Set colors based on player ID and powerups
    let jetColor = isClamp ? NEON_COLORS.GREEN : NEON_COLORS.CYAN;
    if (isP2) {
      jetColor = isClamp ? NEON_COLORS.GREEN : '#eab308'; // Lime / Gold
    }
    
    const bodyGlowColor = isP2 ? '#10b981' : NEON_COLORS.CYAN;
    const baseLineColor = isP2 ? '#22c55e' : NEON_COLORS.CYAN;
    const coreColor = isP2 ? '#a7f3d0' : '#aaffff';
    const visorColor = isP2 ? '#fef08a' : '#ffffff';

    // Jetpack Flame
    if (this.hovering) {
      ctx.shadowBlur = isGhost ? 5 : 20;
      ctx.shadowColor = jetColor;
      ctx.fillStyle = jetColor;
      ctx.beginPath();
      // Center of backpack is -10. Bottom is 10.
      ctx.moveTo(-14, 10);
      const flameLen = 20 + Math.random() * 15 + Math.abs(this.vel.y) * 2;
      ctx.lineTo(-10, flameLen); // flickering flame
      ctx.lineTo(-6, 10);
      ctx.fill();
      
      // core hot flame
      if (!isGhost) {
         ctx.shadowBlur = 0;
         ctx.fillStyle = '#ffffff';
         ctx.beginPath();
         ctx.moveTo(-12, 10);
         ctx.lineTo(-10, flameLen - 5);
         ctx.lineTo(-8, 10);
         ctx.fill();
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Base style for body parts
    ctx.fillStyle = '#050510'; // Block out background elements to prevent transparency clash
    ctx.strokeStyle = baseLineColor;
    ctx.lineWidth = 2; // thinner lines to restore volume
    ctx.shadowBlur = isGhost ? 0 : 4; // reduced blur to stop blooming the inner color out
    ctx.shadowColor = bodyGlowColor;

    // Backpack
    if (this.hasJetpack) {
      if (isP2) {
        // Silhouette alternative: Twin cylinders!
        ctx.beginPath();
        ctx.rect(-14, -6, 4, 16);
        ctx.rect(-9, -6, 4, 16);
        if(!isGhost) ctx.fill(); 
        ctx.stroke();

        // Twin core dots
        if (!isGhost) {
          ctx.fillStyle = coreColor;
          ctx.beginPath();
          ctx.arc(-12, 2, 1.5, 0, Math.PI*2);
          ctx.arc(-7, 2, 1.5, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        // Classic single backpack
        ctx.beginPath();
        ctx.rect(-14, -6, 8, 16);
        if(!isGhost) ctx.fill(); 
        ctx.stroke();
        
        // Backpack hot core
        if (!isGhost) {
           ctx.fillStyle = coreColor;
           ctx.beginPath();
           ctx.arc(-10, 2, 2, 0, Math.PI*2);
           ctx.fill();
        }
      }
    }

    ctx.fillStyle = '#050510'; // Restore base style for body parts

    // Body (Chunkier torso)
    ctx.beginPath();
    ctx.moveTo(-6, -4);  // Top back
    ctx.lineTo(8, -4);   // Top front
    ctx.lineTo(10, 10);  // Bottom front
    ctx.lineTo(-6, 10);  // Bottom back
    ctx.closePath();
    if(!isGhost) ctx.fill(); 
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(2, -10, 8, 0, Math.PI * 2);
    if(!isGhost) ctx.fill(); 
    ctx.stroke();

    // Player 2 sleek antenna / fin on top of head
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
    let visorLen = this.facing * this.vel.x > 0 ? 12 : 10;
    // Visor blink effect
    const blinkIdx = this.idleFrames % 240;
    const isBlinking = this.idleFrames > 0 && blinkIdx > 220 && blinkIdx < 232;
    
    if (isBlinking) {
      // draw thin closed eye lines instead of full glow visor
      ctx.moveTo(2, -10);
      ctx.lineTo(10, -10);
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.moveTo(2, -10);
      ctx.lineTo(visorLen, -10);
      ctx.strokeStyle = visorColor; // Super bright hot center
      ctx.lineWidth = 4;
      ctx.shadowBlur = isGhost ? 0 : 15;
      ctx.shadowColor = bodyGlowColor;
      ctx.stroke();
    }

    // Reset lines for legs
    ctx.strokeStyle = baseLineColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = bodyGlowColor;
    ctx.shadowBlur = isGhost ? 0 : 4;

    // Legs walk or dangle dynamically depending on grounded physics
    let legSwing = 0;
    if (this.isGrounded) {
       legSwing = Math.sin(this.walkAnim) * 8;
    } else {
       // zero-g astronaut dangles softly
       legSwing = Math.sin(Date.now() * 0.008) * 3.5;
    }
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(-3, 10);
    ctx.lineTo(-3 - legSwing, 18);
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(5, 10);
    if (isFootTapping) {
      const tapHeight = Math.abs(Math.sin(idleTime * 0.25)) * 4;
      ctx.lineTo(5 + legSwing, 18 - tapHeight);
    } else {
      ctx.lineTo(5 + legSwing, 18);
    }
    ctx.stroke();

    // Arm (waving or pointing)
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    if (this.waveTimer > 0) {
      // Waving
      const waveAngle = Math.sin(this.waveTimer * 0.3) * 0.8 - 0.4;
      ctx.moveTo(2, -2);
      ctx.lineTo(2 + Math.sin(waveAngle) * 10, -2 - Math.cos(waveAngle) * 10);
      ctx.stroke();
    } else if (Date.now() - this.lastShot < 150) {
      // Firing pose: arm straightens out and angles up slightly pointing ahead
      ctx.moveTo(2, -2);
      ctx.lineTo(12, -4.5); // straightened-out arm
      ctx.stroke();

      // Draw a retro sci-fi rifle / blaster silhouette around the hand
      ctx.beginPath();
      ctx.fillStyle = coreColor;
      ctx.moveTo(9, -5.5);
      ctx.lineTo(21, -8.5); // angled pointing ahead
      ctx.lineTo(20, -3.5);
      ctx.lineTo(8, -1.0);
      ctx.closePath();
      if(!isGhost) ctx.fill();
      ctx.stroke();
      
      // Barrel detail ending exactly at visual gunTip coordinate (26, -9.5)
      ctx.beginPath();
      ctx.moveTo(19, -8.0);
      ctx.lineTo(26, -9.5);
      ctx.stroke();
    } else {
      if (isStretching) {
        ctx.moveTo(2, -2);
        ctx.lineTo(10, -14);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.fillStyle = visorColor;
        ctx.arc(6, -10, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (isIdleWaving) {
        ctx.moveTo(2, -2);
        const handX = 8 + Math.sin(idleTime * 0.2) * 3;
        const handY = -12;
        ctx.lineTo(handX, handY);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.fillStyle = coreColor;
        ctx.arc(handX, handY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Forearm reaching forward and holding a tiny, compact compact blaster
        let handX = 8;
        let handY = -1;
        const shoulderX = 2;
        const shoulderY = -2;

        const isRunningGround = this.isGrounded && Math.abs(this.vel.x) > 0.15;
        if (isRunningGround) {
          // Back arm swings in opposite phase
          ctx.save();
          ctx.strokeStyle = baseLineColor;
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = isGhost ? 0 : 2;
          ctx.beginPath();
          const backShoulderX = -1;
          const backShoulderY = -2;
          const backArmSwing = Math.sin(this.walkAnim + Math.PI);
          const backHandX = backShoulderX + backArmSwing * 5;
          const backHandY = backShoulderY + 3 + Math.abs(Math.sin(this.walkAnim + Math.PI)) * 3;
          ctx.moveTo(backShoulderX, backShoulderY);
          ctx.lineTo(backHandX, backHandY);
          ctx.stroke();
          ctx.restore();

          // Front arm swings
          const armSwing = Math.sin(this.walkAnim);
          handX = shoulderX + armSwing * 5;
          handY = shoulderY + 3 + Math.abs(Math.sin(this.walkAnim)) * 3;
        }

        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.moveTo(shoulderX, shoulderY); // Shoulder
        ctx.lineTo(handX, handY);  // Hand/Wrist location
        ctx.stroke();

        // Tiny futuristic pistol following the hand
        ctx.strokeStyle = baseLineColor;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(handX + 5, handY); // Sleek barrel pointing forward
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(handX - 1, handY + 3); // Tiny hand grip pointing down
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#050510';
        ctx.arc(handX, handY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Equipment Visuals Overlay
    if (!isGhost) {
      // 1. Aqua Helmet (blue glass dome around head)
      if (this.equipment.aquaHelmet) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(2, -10, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#3b82f6';
        ctx.stroke();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fill();
        ctx.restore();
      }

      // 2. Heat Shield (pulsing fire-orange screen)
      if (this.equipment.heatShield) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 2, 24, 0, Math.PI * 2);
        const t = Date.now() * 0.005;
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4 + Math.sin(t) * 2]);
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#f97316';
        ctx.stroke();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
        ctx.fill();
        ctx.restore();
      }

      // 3. Rubber Suit (cyan/green spark aura around torso)
      if (this.equipment.rubberSuit) {
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#22c55e';
        // Draw green outline hints
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(8, -4);
        ctx.lineTo(10, 10);
        ctx.lineTo(-6, 10);
        ctx.closePath();
        ctx.stroke();
        
        // Spawn small green sparks relative
        if (Math.random() < 0.15) {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 20, 2, 2);
        }
        ctx.restore();
      }

      // 4. Gravity Boots & Magnet Boots (Soles highlights)
      if (this.equipment.gravityBoots || this.equipment.magnetBoots) {
        ctx.save();
        const bootColor = this.equipment.gravityBoots ? '#ff00ff' : '#a855f7';
        ctx.strokeStyle = bootColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bootColor;
        
        const swing = Math.sin(this.walkAnim) * 8;
        // Back sole
        ctx.beginPath();
        ctx.moveTo(-5 - swing, 18);
        ctx.lineTo(-1 - swing, 18);
        ctx.stroke();
        // Front sole
        ctx.beginPath();
        ctx.moveTo(3 + swing, 18);
        ctx.lineTo(7 + swing, 18);
        ctx.stroke();

        // Magnet sparks at soles
        if (this.equipment.magnetBoots && Math.random() < 0.25) {
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(-3 - swing + (Math.random() - 0.5) * 6, 19, 2, 2);
          ctx.fillRect(5 + swing + (Math.random() - 0.5) * 6, 19, 2, 2);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
