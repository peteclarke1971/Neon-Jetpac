import { Vector } from './Vector';
import { Player } from './Player';
import { Item } from './Item';
import { Enemy } from './Enemy';
import { Particle } from './Particle';
import { Bullet } from './Bullet';
import { audio } from './Audio';
import { GAME_WIDTH, GAME_HEIGHT, NEON_COLORS } from './Constants';
import { PlatformDef } from './StageProfiles';
import { 
  JetpacStageProfileV2, 
  StageHazardDef, 
  StageZoneDef, 
  StageObjectDef, 
  JetpacPlatformKind 
} from './LaunchLabTypes';

export interface RuntimeCrumblingState {
  platformIndex: number;
  platformId: string;
  state: 'solid' | 'crumbling' | 'broken';
  timer: number;
}

export interface RuntimeMovingPlatform {
  id: string;
  objectDef: StageObjectDef;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  t: number;
  direction: 1 | -1;
  pauseTimer: number;
}

export class StageElementsManager {
  hazards: StageHazardDef[] = [];
  zones: StageZoneDef[] = [];
  objects: StageObjectDef[] = [];
  basePlatforms: PlatformDef[] = [];

  runtimeCrumbling: RuntimeCrumblingState[] = [];
  runtimeMovingPlatforms: RuntimeMovingPlatform[] = [];
  teleporterCooldowns: Record<string, number> = {};
  
  // Player specific state tracking
  waterTimer = 0;
  lavaTimer = 0;
  flashTimer = 0;
  teleportAnimationTimer = 0;
  
  // Frame counter for cycling electric hazards
  frameCount = 0;

  constructor() {}

  init(profile: JetpacStageProfileV2) {
    this.basePlatforms = profile.platformLayout || [];
    this.hazards = profile.hazards || [];
    this.zones = profile.zones || [];
    this.objects = profile.objects || [];
    this.runtimeCrumbling = [];
    this.runtimeMovingPlatforms = [];
    this.teleporterCooldowns = {};
    this.waterTimer = 0;
    this.lavaTimer = 0;
    this.frameCount = 0;

    // Find crumbling platforms from profile.platformLayout
    const platforms = profile.platformLayout || [];
    platforms.forEach((p, index) => {
      if (p.kind === 'crumbling') {
        this.runtimeCrumbling.push({
          platformIndex: index,
          platformId: `crumbling-${index}`,
          state: 'solid',
          timer: 0
        });
      }
    });

    // Spawn moving platform objects
    this.objects.forEach(obj => {
      if (obj.kind === 'movingPlatform' && obj.enabled) {
        const x1 = obj.props?.pathX1 ?? obj.x;
        const y1 = obj.props?.pathY1 ?? obj.y;
        this.runtimeMovingPlatforms.push({
          id: obj.id,
          objectDef: obj,
          x: x1,
          y: y1,
          prevX: x1,
          prevY: y1,
          t: 0,
          direction: 1,
          pauseTimer: 0
        });
      }
    });
  }

  update(player: Player, particles: Particle[], engine: any) {
    this.frameCount++;

    // 1. Update crumbling platforms
    this.runtimeCrumbling.forEach(c => {
      const breakDelay = 90;
      const respawnDelay = 240;

      if (c.state === 'solid') {
        const playersList = engine.players || [player];
        const isStanding = playersList.some((p: any) => !p.dead && !p.isOut && p.isGrounded && p.groundPlatformIndex === c.platformIndex);
        if (isStanding) {
          c.state = 'crumbling';
          c.timer = breakDelay;
        }
      } else if (c.state === 'crumbling') {
        c.timer--;
        // Spawn subtle breaking dust particles
        if (Math.random() < 0.25) {
          const plat = this.basePlatforms[c.platformIndex];
          if (plat) {
            const rx = plat[0] + Math.random() * plat[2];
            particles.push(new Particle(rx, plat[1], '#f97316', 1, undefined, true));
          }
        }
        if (c.timer <= 0) {
          c.state = 'broken';
          c.timer = respawnDelay;
          audio.stopThrust(); // use as break sounds or stop sound safely
          
          // Crumbling splash effects
          const plat = this.basePlatforms[c.platformIndex];
          if (plat) {
            for (let i = 0; i < 20; i++) {
              const rx = plat[0] + Math.random() * plat[2];
              particles.push(new Particle(rx, plat[1] + Math.random() * plat[3], '#ea580c', 2, undefined, true));
            }
          }
        }
      } else if (c.state === 'broken') {
        c.timer--;
        if (c.timer <= 0) {
          c.state = 'solid';
          c.timer = 0;
          // Respawning chime particle
          const plat = this.basePlatforms[c.platformIndex];
          if (plat) {
            for (let i = 0; i < 15; i++) {
              const rx = plat[0] + Math.random() * plat[2];
              particles.push(new Particle(rx, plat[1], '#06b6d4', 1.5, undefined, true));
            }
          }
        }
      }
    });

    // 2. Update moving platforms
    this.runtimeMovingPlatforms.forEach(mp => {
      mp.prevX = mp.x;
      mp.prevY = mp.y;

      const p1 = { x: mp.objectDef.props?.pathX1 ?? mp.objectDef.x, y: mp.objectDef.props?.pathY1 ?? mp.objectDef.y };
      const p2 = { x: mp.objectDef.props?.pathX2 ?? (mp.objectDef.x + 160), y: mp.objectDef.props?.pathY2 ?? mp.objectDef.y };
      const speed = mp.objectDef.props?.speed ?? 1.5;
      const pauseMax = mp.objectDef.props?.pauseAtEnds ?? 20;

      if (mp.pauseTimer > 0) {
        mp.pauseTimer--;
      } else {
        // Simple interpolation or delta movement
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const stepSize = speed / distance;
          mp.t += stepSize * mp.direction;

          if (mp.t >= 1) {
            mp.t = 1;
            mp.direction = -1;
            mp.pauseTimer = pauseMax;
          } else if (mp.t <= 0) {
            mp.t = 0;
            mp.direction = 1;
            mp.pauseTimer = pauseMax;
          }

          // Compute new position
          mp.x = p1.x + dx * mp.t;
          mp.y = p1.y + dy * mp.t;
        } else {
          mp.x = p1.x;
          mp.y = p1.y;
        }
      }
    });

    // 3. Update teleporter cooldown timers
    Object.keys(this.teleporterCooldowns).forEach(key => {
      if (this.teleporterCooldowns[key] > 0) {
        this.teleporterCooldowns[key]--;
      }
    });
  }

  getCollisionPlatforms(baseLayout: PlatformDef[]): PlatformDef[] {
    const list: PlatformDef[] = [];

    // Filter out standard crumbling platforms that are currently broken
    baseLayout.forEach((plat, idx) => {
      const runtimeState = this.runtimeCrumbling.find(rc => rc.platformIndex === idx);
      if (runtimeState && runtimeState.state === 'broken') {
        // Skip
        return;
      }
      list.push(plat);
    });

    // Append moving platforms as dynamic layouts
    this.runtimeMovingPlatforms.forEach((mp, idx) => {
      const plat: PlatformDef = [
        Math.floor(mp.x),
        Math.floor(mp.y),
        mp.objectDef.w,
        mp.objectDef.h
      ];
      // Store special platform kind on tuple safely
      plat.kind = mp.objectDef.props?.platformKind || 'normal';
      
      // Let's attach our unique index marker so the player knows which moving platform they are standing on
      (plat as any)._mpId = mp.id;
      list.push(plat);
    });

    return list;
  }

  applyEnvironmentalForces(player: Player, items: Item[], enemies: Enemy[], particles: Particle[], engine: any) {
    if (player.dead) return;

    let forceX = 0;
    let forceY = 0;
    let gravityMultiplier = engine?.activeProfile?.gravityMultiplier ?? engine?.activeProfile?.environmentGravity ?? 1.0;
    let submerged = false;
    let sinkSpeed = 0.7;

    // Check zones (wind / gravity)
    this.zones.forEach(z => {
      if (!z.enabled) return;
      
      // Check player intersection
      if (
        player.pos.x + player.width > z.x &&
        player.pos.x < z.x + z.w &&
        player.pos.y + player.height > z.y &&
        player.pos.y < z.y + z.h
      ) {
        if (z.kind === 'wind' && z.props?.affectsPlayer) {
          forceX += z.props.forceX ?? 0;
          forceY += z.props.forceY ?? -0.12;
        } else if (z.kind === 'gravity' && z.props?.affectsPlayer) {
          gravityMultiplier *= z.props.gravityMultiplier ?? 0.35;
        }
      }

      // Check items intersections
      items.forEach(item => {
        if (!item.pos) return;
        if (
          item.pos.x + 16 > z.x &&
          item.pos.x - 16 < z.x + z.w &&
          item.pos.y + 16 > z.y &&
          item.pos.y - 12 < z.y + z.h
        ) {
          if (z.kind === 'wind' && z.props?.affectsItems) {
            item.vel.x += z.props.forceX ?? 0;
            item.vel.y += z.props.forceY ?? -0.12;
          } else if (z.kind === 'gravity' && z.props?.affectsItems) {
            // Apply lightweight gravity zone onto loose items
            item.vel.y += 0.05 * ((z.props.gravityMultiplier ?? 0.35) - 1.0);
          }
        }
      });

      // Check enemies intersections
      enemies.forEach(enemy => {
        if (
          enemy.pos.x + enemy.width > z.x &&
          enemy.pos.x < z.x + z.w &&
          enemy.pos.y + enemy.height > z.y &&
          enemy.pos.y < z.y + z.h
        ) {
          if (z.kind === 'wind' && z.props?.affectsEnemies) {
            enemy.vel.x += z.props.forceX ?? 0;
            enemy.vel.y += z.props.forceY ?? -0.12;
          } else if (z.kind === 'gravity' && z.props?.affectsEnemies) {
            enemy.vel.y += 0.06 * ((z.props.gravityMultiplier ?? 0.35) - 1.0);
          }
        }
      });
    });

    // Check fan objects forces
    this.objects.forEach(obj => {
      if (obj.kind === 'fan' && obj.enabled) {
        // Default fan blow cone is 220px in its facing direction
        const dir = obj.props?.direction || 'up';
        const strength = obj.props?.strength || 0.22;
        const range = 240;
        let fx = 0, fy = 0;
        let fArea = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };

        if (dir === 'up') {
          fArea = { x: obj.x - 10, y: obj.y - range, w: obj.w + 20, h: range };
          fy = -strength;
        } else if (dir === 'down') {
          fArea = { x: obj.x - 10, y: obj.y + obj.h, w: obj.w + 20, h: range };
          fy = strength;
        } else if (dir === 'left') {
          fArea = { x: obj.x - range, y: obj.y - 10, w: range, h: obj.h + 20 };
          fx = -strength;
        } else if (dir === 'right') {
          fArea = { x: obj.x + obj.w, y: obj.y - 10, w: range, h: obj.h + 20 };
          fx = strength;
        }

        // Apply to player
        if (
          obj.props?.affectsPlayer !== false &&
          player.pos.x + player.width > fArea.x &&
          player.pos.x < fArea.x + fArea.w &&
          player.pos.y + player.height > fArea.y &&
          player.pos.y < fArea.y + fArea.h
        ) {
          forceX += fx;
          forceY += fy;
          
          // Fan steam blowing sparks
          if (Math.random() < 0.2) {
             particles.push(new Particle(
               player.pos.x + Math.random() * player.width,
               player.pos.y + player.height,
               '#22d3ee', 1, undefined, true
             ));
          }
        }

        // Apply to items
        if (obj.props?.affectsItems !== false) {
          items.forEach(item => {
            if (
              item.pos.x + 16 > fArea.x &&
              item.pos.x - 16 < fArea.x + fArea.w &&
              item.pos.y + 16 > fArea.y &&
              item.pos.y - 12 < fArea.y + fArea.h
            ) {
              item.vel.x += fx * 0.8;
              item.vel.y += fy * 0.8;
            }
          });
        }
      }
    });

    // Check moving platform direct translation delta
    let movingPlatformDelta: { x: number; y: number } | null = null;
    if (player.isGrounded && player.groundPlatformIndex !== -1) {
      // Find the collision platform based on the layout list we built
      const combinedPlats = this.getCollisionPlatforms(engine.platforms);
      const activePlat = combinedPlats[player.groundPlatformIndex];
      if (activePlat && (activePlat as any)._mpId) {
        const mp = this.runtimeMovingPlatforms.find(m => m.id === (activePlat as any)._mpId);
        if (mp) {
          movingPlatformDelta = {
            x: mp.x - mp.prevX,
            y: mp.y - mp.prevY
          };
        }
      }
    }

    // Check water hazards
    this.hazards.forEach(h => {
      if (!h.enabled) return;

      if (h.kind === 'water') {
        if (
          player.pos.x + player.width - 4 > h.x &&
          player.pos.x + 4 < h.x + h.w &&
          player.pos.y + player.height > h.y &&
          player.pos.y < h.y + h.h
        ) {
          submerged = true;
          sinkSpeed = h.props?.sinkSpeed ?? 0.7;

          // Water splash particles occasionally
          if (Math.random() < 0.08) {
             particles.push(new Particle(player.pos.x + Math.random() * player.width, player.pos.y + player.height / 2, '#38bdf8', 1));
          }
        }

        // Items interact with water: float/sink lighter
        items.forEach(item => {
          if (
            item.pos.x + 16 > h.x &&
            item.pos.x - 16 < h.x + h.w &&
            item.pos.y + 16 > h.y &&
            item.pos.y - 12 < h.y + h.h
          ) {
            // Apply fluid resistance & floating buoyancy
            item.vel.y = Math.max(item.vel.y - 0.12, 0.4);
            item.vel.x *= 0.92;
          }
        });
      }
    });

    // Build env variables and trigger update onto player
    const envContext = {
      forceX,
      forceY,
      gravityMultiplier,
      movingPlatformDelta,
      submerged,
      sinkSpeed
    };

    // Submerged death timers checks (Drowning)
    if (submerged && !player.equipment.aquaHelmet) {
      this.waterTimer++;
      const escape = 120; // 2 seconds leeway
      if (this.waterTimer > escape) {
        // Spawn drowning bubbles
        for (let idx = 0; idx < 15; idx++) {
           particles.push(new Particle(player.pos.x + 12, player.pos.y - 10, '#0284c7', 2));
        }
        engine.die();
        this.waterTimer = 0;
        return;
      }
    } else {
      this.waterTimer = Math.max(0, this.waterTimer - 2);
    }

    // Check Lava hazards
    let inLava = false;
    let lavaDamageDelay = 20;
    this.hazards.forEach(h => {
      if (!h.enabled) return;

      if (h.kind === 'lava') {
        if (
          player.pos.x + player.width - 4 > h.x &&
          player.pos.x + 4 < h.x + h.w &&
          player.pos.y + player.height > h.y &&
          player.pos.y < h.y + h.h
        ) {
          if (!player.equipment.heatShield) {
             inLava = true;
             lavaDamageDelay = h.props?.damageDelay ?? 20;
          }

          // Spark flames representing molten contact or deflecting heat shield sparks
          const color = player.equipment.heatShield ? '#3b82f6' : '#f97316';
          particles.push(new Particle(player.pos.x + Math.random()*player.width, player.pos.y + player.height, color, 2, undefined, true));
        }

        // Items dissolved in lava
        items.forEach((item, ii) => {
          if (
            item.pos.x + 16 > h.x &&
            item.pos.x - 16 < h.x + h.w &&
            item.pos.y + 16 > h.y &&
            item.pos.y - 12 < h.y + h.h
          ) {
            // Melt items!
            for (let k = 0; k < 12; k++) {
              particles.push(new Particle(item.pos.x, item.pos.y, '#f97316', 2, undefined, true));
            }
            items.splice(ii, 1);
            audio.stopThrust(); // temporary sound trigger
          }
        });
      }
    });

    if (inLava) {
      this.lavaTimer++;
      if (this.lavaTimer >= lavaDamageDelay) {
        // Neon fire death sequence
        for (let i = 0; i < 30; i++) {
          particles.push(new Particle(player.pos.x + player.width/2 + (Math.random() - 0.5)*30, player.pos.y + player.height/2 + (Math.random() - 0.5)*40, '#ef4444', 2.5, undefined, true));
        }
        engine.die();
        this.lavaTimer = 0;
        return;
      }
    } else {
      this.lavaTimer = 0;
    }

    // Check Spikes hazards (Instant Kill)
    let hitSpikes = false;
    this.hazards.forEach(h => {
      if (!h.enabled) return;

      if (h.kind === 'spikes') {
        const spikeHeadWiggle = 6;
        if (
          player.pos.x + player.width - 3 > h.x + spikeHeadWiggle &&
          player.pos.x + 3 < h.x + h.w - spikeHeadWiggle &&
          player.pos.y + player.height > h.y &&
          player.pos.y < h.y + h.h
        ) {
          hitSpikes = true;
        }
      }
    });

    if (hitSpikes) {
      for (let i = 0; i < 20; i++) {
        particles.push(new Particle(player.pos.x + 12, player.pos.y + 18, '#ffffff', 2, undefined, true));
        particles.push(new Particle(player.pos.x + 12, player.pos.y + 18, '#ef4444', 1.5, undefined, true));
      }
      engine.die();
      return;
    }

    // Check Electric hazard strips
    let shocked = false;
    this.hazards.forEach(h => {
      if (!h.enabled) return;

      if (h.kind === 'electric') {
        // Cycle active and inactive states
        const activeMax = h.props?.activeFrames ?? 90;
        const inactiveMax = h.props?.inactiveFrames ?? 70;
        const phase = h.props?.phaseOffset ?? 0;
        const cycleLength = activeMax + inactiveMax;
        const currentProgress = (this.frameCount + phase) % cycleLength;
        const isActive = currentProgress < activeMax;

        if (isActive) {
          // Bounding box checking
          if (
            player.pos.x + player.width - 2 > h.x &&
            player.pos.x + 2 < h.x + h.w &&
            player.pos.y + player.height > h.y &&
            player.pos.y < h.y + h.h
          ) {
            if (!player.equipment.rubberSuit) {
               shocked = true;
            } else {
               // insulation yellow particles
               if (Math.random() < 0.25) {
                  particles.push(new Particle(player.pos.x + Math.random() * player.width, player.pos.y + Math.random() * player.height, '#eab308', 1.5, undefined, true));
               }
            }
          }
        }
      }
    });

    if (shocked) {
      for (let i = 0; i < 20; i++) {
        particles.push(new Particle(player.pos.x + 12, player.pos.y + 18, '#22d3ee', 2.0));
        particles.push(new Particle(player.pos.x + 12, player.pos.y + 18, '#ffffff', 1.5));
      }
      engine.die();
      return;
    }

    // Check teleporters objects warp Net
    this.objects.forEach(obj => {
      if (obj.kind === 'teleporter' && obj.enabled) {
        const cooldown = this.teleporterCooldowns[obj.id] || 0;
        if (cooldown === 0) {
          // Intersecting player center point
          const playerCenterX = player.pos.x + player.width / 2;
          const playerCenterY = player.pos.y + player.height / 2;
          
          if (
            playerCenterX > obj.x &&
            playerCenterX < obj.x + obj.w &&
            playerCenterY > obj.y &&
            playerCenterY < obj.y + obj.h
          ) {
            // Locate target pair object matches pairId or targetId
            const pairId = obj.props?.pairId || obj.props?.targetId;
            const targetPair = this.objects.find(other => other.id === pairId && other.kind === 'teleporter');
            
            if (targetPair) {
              // Warp sequence!
              const warpOutX = playerCenterX;
              const warpOutY = playerCenterY;
              const warpInX = targetPair.x + targetPair.w / 2;
              const warpInY = targetPair.y + targetPair.h / 2;

              // Outgoing sparkles
              for (let i = 0; i < 15; i++) {
                particles.push(new Particle(warpOutX, warpOutY, '#ff00ff', 2.0));
                particles.push(new Particle(warpInX, warpInY, '#00ffff', 2.0));
              }

              // Position player center inside target teleporter
              player.pos.x = warpInX - player.width / 2;
              player.pos.y = warpInY - player.height / 2;
              player.vel.set(0, 0); // stabilise drift

              // Apply cooling locks
              const lockFrames = obj.props?.cooldownFrames || 60;
              this.teleporterCooldowns[obj.id] = lockFrames;
              this.teleporterCooldowns[targetPair.id] = lockFrames;

              audio.playShoot(); // Warping pop chime
            }
          }
        }
      }
    });

    // Finally apply updates in physics
    player.update(particles, engine.bullets, this.getCollisionPlatforms(engine.platforms), envContext);
  }

  draw(ctx: CanvasRenderingContext2D, theme: any) {
    // 1. Draw wind & gravity zones
    this.zones.forEach(z => {
      if (!z.enabled || !z.props?.visible) return;

      ctx.save();
      if (z.kind === 'wind') {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        
        // Repeated subtle flow vectors arrows inside wind zone
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
        const forceY = z.props?.forceY ?? -0.12;
        const isUp = forceY < 0;
        
        ctx.beginPath();
        const spacingX = 40;
        const spacingY = 40;
        const cycleOffset = (this.frameCount * 0.8) % spacingY;

        for (let rx = z.x + 15; rx < z.x + z.w; rx += spacingX) {
          for (let ry = z.y + 15; ry < z.y + z.h; ry += spacingY) {
            let dy = ry - (isUp ? cycleOffset : -cycleOffset);
            if (dy < z.y) dy += z.h;
            if (dy > z.y + z.h) dy -= z.h;

            ctx.moveTo(rx, dy);
            ctx.lineTo(rx - 4, dy + (isUp ? 4 : -4));
            ctx.lineTo(rx + 4, dy + (isUp ? 4 : -4));
          }
        }
        ctx.fill();
      } else if (z.kind === 'gravity') {
        const mult = z.props?.gravityMultiplier ?? 0.35;
        const isLowG = mult < 1;
        ctx.fillStyle = isLowG ? 'rgba(168, 85, 247, 0.07)' : 'rgba(34, 197, 94, 0.07)';
        ctx.strokeStyle = isLowG ? 'rgba(168, 85, 247, 0.35)' : 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 1;

        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        // Draw gravity indicator glyph loops
        ctx.fillStyle = isLowG ? '#c084fc' : '#4ade80';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(isLowG ? '↓ LOW G ↓' : '↑ HEAVY G ↑', z.x + z.w/2, z.y + 18);
      }
      ctx.restore();
    });

    // 2. Draw hazards (Water, Lava, Spikes, Electric)
    this.hazards.forEach(h => {
      if (!h.enabled) return;

      ctx.save();
      if (h.kind === 'water') {
        // Fluid dark blue with animated wave surface
        ctx.fillStyle = 'rgba(2, 132, 199, 0.45)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;

        // Wave path
        ctx.beginPath();
        ctx.moveTo(h.x, h.y + Math.sin(this.frameCount * 0.08) * 3);
        const waveSegments = 6;
        for (let i = 1; i <= waveSegments; i++) {
          const sx = h.x + (h.w / waveSegments) * i;
          const sy = h.y + Math.sin((this.frameCount * 0.08) + i * 1.5) * 4;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(h.x + h.w, h.y + h.h);
        ctx.lineTo(h.x, h.y + h.h);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(h.x, h.y + Math.sin(this.frameCount * 0.08) * 3);
        for (let i = 1; i <= waveSegments; i++) {
          const sx = h.x + (h.w / waveSegments) * i;
          const sy = h.y + Math.sin((this.frameCount * 0.08) + i * 1.5) * 4;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Draw bubbling particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < h.w / 25; i++) {
          const bx = h.x + (i * 25 + (this.frameCount * 0.1) % 25);
          const by = h.y + h.h - ((this.frameCount * 0.4 + i*10) % h.h);
          ctx.beginPath();
          ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (h.kind === 'lava') {
        // Red Hot Molten Neon rectangle
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeRect(h.x, h.y, h.w, h.h);

        // Heat shimmer flame points
        ctx.fillStyle = '#ef4444';
        for (let i = 0; i < h.w/15; i++) {
          const lx = h.x + i*15 + Math.random()*2;
          const lh = 5 + Math.sin(this.frameCount*0.1 + i) * 3;
          ctx.beginPath();
          ctx.moveTo(lx, h.y);
          ctx.lineTo(lx + 6, h.y - lh);
          ctx.lineTo(lx + 12, h.y);
          ctx.closePath();
          ctx.fill();
        }

      } else if (h.kind === 'spikes') {
        const dir = h.props?.orientation || 'up';
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        const spikeSize = 12;
        ctx.beginPath();
        
        if (dir === 'up') {
          for (let sx = h.x; sx < h.x + h.w; sx += spikeSize) {
            ctx.moveTo(sx, h.y + h.h);
            ctx.lineTo(sx + spikeSize / 2, h.y);
            ctx.lineTo(sx + spikeSize, h.y + h.h);
          }
        } else if (dir === 'down') {
          for (let sx = h.x; sx < h.x + h.w; sx += spikeSize) {
            ctx.moveTo(sx, h.y);
            ctx.lineTo(sx + spikeSize / 2, h.y + h.h);
            ctx.lineTo(sx + spikeSize, h.y);
          }
        } else if (dir === 'left') {
          for (let sy = h.y; sy < h.y + h.h; sy += spikeSize) {
            ctx.moveTo(h.x + h.w, sy);
            ctx.lineTo(h.x, sy + spikeSize / 2);
            ctx.lineTo(h.x + h.w, sy + spikeSize);
          }
        } else if (dir === 'right') {
          for (let sy = h.y; sy < h.y + h.h; sy += spikeSize) {
            ctx.moveTo(h.x, sy);
            ctx.lineTo(h.x + h.w, sy + spikeSize / 2);
            ctx.lineTo(h.x, sy + spikeSize);
          }
        }
        ctx.fill();
        ctx.stroke();

      } else if (h.kind === 'electric') {
        const activeMax = h.props?.activeFrames ?? 90;
        const inactiveMax = h.props?.inactiveFrames ?? 70;
        const phase = h.props?.phaseOffset ?? 0;
        const cycleLength = activeMax + inactiveMax;
        const currentProgress = (this.frameCount + phase) % cycleLength;
        const isActive = currentProgress < activeMax;
        
        if (isActive) {
          // Glow and sparking vectors curves
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#00ffff';
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(h.x, h.y + h.h/2);
          
          // Jagged electric spark logic
          const splits = Math.floor(h.w / 20);
          for (let idx = 1; idx <= splits; idx++) {
            const rx = h.x + (h.w / splits) * idx;
            const ry = h.y + h.h/2 + (Math.random() - 0.5) * h.h * 0.8;
            ctx.lineTo(rx, ry);
          }
          ctx.stroke();
        } else {
          // Dim blue safety background check
          ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(h.x, h.y, h.w, h.h);
        }
      }
      ctx.restore();
    });

    // 3. Draw fan objects, teleporter centers and moving platform paths
    this.objects.forEach(obj => {
      if (!obj.enabled) return;

      ctx.save();
      if (obj.kind === 'fan') {
        // Draw fan box turbine
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = NEON_COLORS.CYAN;
        ctx.lineWidth = 2.5;
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

        // Draw turbine center core lines
        ctx.beginPath();
        ctx.arc(obj.x + obj.w/2, obj.y + obj.h/2, 10, 0, Math.PI*2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.stroke();

        // Rotating blades
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        const spin = this.frameCount * 0.18;
        for (let i = 0; i < 4; i++) {
          const angle = spin + (Math.PI / 2) * i;
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.w/2, obj.y + obj.h/2);
          ctx.lineTo(
            obj.x + obj.w/2 + Math.cos(angle) * (obj.w/2 - 4),
            obj.y + obj.h/2 + Math.sin(angle) * (obj.h/2 - 4)
          );
          ctx.stroke();
        }

        // Draw directional indicators arrows
        const dir = obj.props?.direction || 'up';
        ctx.fillStyle = NEON_COLORS.CYAN;
        ctx.beginPath();
        const cx = obj.x + obj.w/2;
        const cy = obj.y + obj.h/2;
        if (dir === 'up') {
          ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
        } else if (dir === 'down') {
          ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
        } else if (dir === 'left') {
          ctx.moveTo(cx - 6, cy); ctx.lineTo(cx, cy - 3); ctx.lineTo(cx, cy + 3);
        } else if (dir === 'right') {
          ctx.moveTo(cx + 6, cy); ctx.lineTo(cx, cy - 3); ctx.lineTo(cx, cy + 3);
        }
        ctx.fill();

      } else if (obj.kind === 'teleporter') {
        const cooldown = this.teleporterCooldowns[obj.id] || 0;
        const pairId = obj.props?.pairId || '';
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = cooldown > 0 ? '#fb7185' : '#d946ef';

        // Draw gateway pads frame
        ctx.strokeStyle = cooldown > 0 ? '#ef4444' : '#d946ef';
        ctx.lineWidth = cooldown > 0 ? 1.5 : 2.5;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

        // Inner vortex aura
        const vortexR = 12 + Math.sin(this.frameCount * 0.1) * 3;
        ctx.beginPath();
        ctx.arc(obj.x + obj.w/2, obj.y + obj.h/2, vortexR, 0, Math.PI*2);
        ctx.fillStyle = cooldown > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 70, 239, 0.2)';
        ctx.fill();
        ctx.stroke();

      }
      ctx.restore();
    });

    // 4. Draw moving platforms and crumbling indicators
    this.runtimeMovingPlatforms.forEach(mp => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = NEON_COLORS.CYAN;

      // Platform body render
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = NEON_COLORS.CYAN;
      ctx.lineWidth = 2.5;

      ctx.fillRect(mp.x, mp.y, mp.objectDef.w, mp.objectDef.h);
      ctx.strokeRect(mp.x, mp.y, mp.objectDef.w, mp.objectDef.h);

      // Draw inside circuitry lines for sci-fi feel
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mp.x + 8, mp.y + mp.objectDef.h/2);
      ctx.lineTo(mp.x + mp.objectDef.w - 8, mp.y + mp.objectDef.h/2);
      ctx.stroke();

      ctx.restore();
    });

    // 5. Draw crumbling/flickering platforms over layout indices
    this.runtimeCrumbling.forEach(c => {
      const plat = this.basePlatforms[c.platformIndex];
      if (!plat) return;

      if (c.state === 'crumbling') {
        ctx.save();
        // Shake crumbling platforms!
        const shakeX = (Math.random() - 0.5) * 3;
        const shakeY = (Math.random() - 0.5) * 2;
        
        // Render orange burning cracks
        ctx.fillStyle = 'rgba(22, 12, 5, 0.9)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.fillRect(plat[0] + shakeX, plat[1] + shakeY, plat[2], plat[3]);
        ctx.strokeRect(plat[0] + shakeX, plat[1] + shakeY, plat[2], plat[3]);

        // Draw cracked lines in orange
        ctx.strokeStyle = '#fb923c';
        ctx.beginPath();
        ctx.moveTo(plat[0] + 5, plat[1] + plat[3]/2);
        ctx.lineTo(plat[0] + plat[2] - 5, plat[1] + plat[3]/2);
        ctx.stroke();

        ctx.restore();
      }
    });

    // Draw custom platforms highlights (conveyors, ice)
    this.basePlatforms.forEach((plat: PlatformDef) => {
      if (plat.kind === 'ice') {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = 'rgba(186, 230, 253, 0.15)';
        ctx.fillRect(plat[0], plat[1], plat[2], plat[3]);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat[0], plat[1], plat[2], plat[3]);

        // Frost details
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let ix = plat[0] + 10; ix < plat[0] + plat[2]; ix += 20) {
          ctx.moveTo(ix, plat[1] + 1);
          ctx.lineTo(ix - 4, plat[1] + 6);
        }
        ctx.stroke();
        ctx.restore();

      } else if (plat.kind === 'conveyorLeft' || plat.kind === 'conveyorRight') {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.fillRect(plat[0], plat[1], plat[2], plat[3]);
        ctx.strokeRect(plat[0], plat[1], plat[2], plat[3]);

        // Drawing sliding arrows
        ctx.fillStyle = '#eab308';
        const isLeft = plat.kind === 'conveyorLeft';
        const spacing = 20;
        const arrowOffset = (this.frameCount * 0.7) % spacing;

        ctx.beginPath();
        for (let ax = plat[0] + 5; ax < plat[0] + plat[2]; ax += spacing) {
          const rx = ax + (isLeft ? -arrowOffset : arrowOffset);
          if (rx > plat[0] && rx < plat[0] + plat[2] - 6) {
            ctx.moveTo(rx, plat[1] + 2);
            ctx.lineTo(rx + (isLeft ? -4 : 4), plat[1] + plat[3]/2);
            ctx.lineTo(rx, plat[1] + plat[3] - 2);
          }
        }
        ctx.fill();
        ctx.restore();
      }
    });
  }
}
