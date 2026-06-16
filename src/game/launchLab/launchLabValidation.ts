import { JetpacStageProfileV2, ValidationResult, SpawnZoneDef } from '../LaunchLabTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '../Constants';

export function validateJetpacStage(profile: JetpacStageProfileV2): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  // Structure checks
  if (!profile.name || profile.name.trim() === '') {
    errors.push('Stage name is required');
  }
  if (!profile.subtitle || profile.subtitle.trim() === '') {
    errors.push('Stage subtitle is required');
  }
  if (!profile.objective) {
    errors.push('Stage objective is required');
  }

  // Objective validation
  if (profile.objective === 'boss') {
    if (!profile.bossId) {
      errors.push('Boss objectives must specify a bossId');
    }
  } else {
    if (profile.bossId) {
      warnings.push('Stage has bossId specified but objective is not "boss"');
    }
  }

  if ((profile.objective === 'build' || profile.objective === 'fuel') && (!profile.fuelRequired || profile.fuelRequired <= 0)) {
    errors.push('Selected objective requires a fuel count greater than 0');
  }

  // Expansion Objectives V2 Verification (Zero Soft-Locks Guarantee)
  const objMode: any = profile.objectiveRules?.mode || profile.objective;
  const rules = profile.objectiveRules;
  const zonesList = profile.objectiveZones || [];

  if (objMode === 'rescue') {
    const rescues = profile.rescueEntities || [];
    if (rescues.length === 0) {
      errors.push('Rescue stage objective requires at least one Rescue Entity (astronaut)');
    }
    const hasRescueDropoff = zonesList.some(z => z.kind === 'rescueDropoff');
    if (!hasRescueDropoff) {
      errors.push('Rescue stage objective requires at least one objective zone of kind "rescueDropoff" for delivery');
    }
  }

  if (objMode === 'escort') {
    const escorts = profile.escortEntities || [];
    if (escorts.length === 0) {
      errors.push('Escort stage objective requires at least one Escort Entity (repair drone)');
    }
    const hasEscortDestination = zonesList.some(z => z.kind === 'escortDestination');
    if (!hasEscortDestination) {
      errors.push('Escort stage objective requires at least one objective zone of kind "escortDestination"');
    }
  }

  if (objMode === 'reactor') {
    const reactorSw = profile.reactorSwitches || [];
    if (reactorSw.length === 0) {
      errors.push('Reactor switch objective requires at least one Reactor Switch panel');
    }
  }

  if (objMode === 'artifact') {
    const artifacts = profile.artifacts || [];
    if (artifacts.length === 0) {
      errors.push('Artifact collection objective requires at least one Collectible Artifact');
    }
    const hasArtifactDropoff = zonesList.some(z => z.kind === 'artifactDropoff');
    if (!hasArtifactDropoff) {
      errors.push('Artifact collection objective requires at least one objective zone of kind "artifactDropoff"');
    }
  }

  if (objMode === 'survival') {
    const duration = rules?.survival?.surviveFrames || 0;
    if (duration <= 0) {
      errors.push('Survival objectives must specify a valid survival duration timing limit greater than 0');
    }
  }

  if (objMode === 'rush') {
    const timeLimit = rules?.rush?.timeLimitFrames || 0;
    if (timeLimit <= 0) {
      errors.push('Speed rush objectives must specify a timeLimitFrames boundary greater than 0');
    }
  }

  // Platforms Layout
  const platforms = profile.platformLayout || [];
  if (platforms.length === 0) {
    errors.push('The stage must have at least one floor or platform');
  }

  platforms.forEach((p, index) => {
    if (p[0] === undefined || p[1] === undefined || p[2] === undefined || p[3] === undefined) {
      errors.push(`Platform ${index + 1} has corrupted or undefined coordinates`);
      return;
    }
    if (isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2]) || isNaN(p[3])) {
      errors.push(`Platform ${index + 1} contains NaN values`);
      return;
    }
    
    // Bounds check
    if (p[0] < 0 || p[0] >= GAME_WIDTH || p[1] < 0 || p[1] >= GAME_HEIGHT) {
      warnings.push(`Platform ${index + 1} is partially or entirely outside play screen bounds`);
    }

    if (p[2] < 10) {
      warnings.push(`Platform ${index + 1} is extremely thin (${p[2]}px)`);
    }
    if (p[3] < 5) {
      warnings.push(`Platform ${index + 1} has extremely small height (${p[3]}px)`);
    }
  });

  // Player Start check
  const playerStart = profile.playerStart;
  if (!playerStart) {
    errors.push('Player start position is undefined');
  } else {
    if (isNaN(playerStart.x) || isNaN(playerStart.y)) {
      errors.push('Player start coordinates have NaN values');
    }
    if (playerStart.x < 10 || playerStart.x > GAME_WIDTH - 10) {
      warnings.push('Player starts dangerously close to the screen edge');
    }
    if (playerStart.y < 30 || playerStart.y > GAME_HEIGHT - 10) {
      errors.push('Player start y-coordinate is outside playable bounds');
    }

    // Check collision with platforms
    let isInsidePlatform = false;
    platforms.forEach(p => {
      // Player is approx 20 width, 40 height. Check bounding box
      const pLeft = p[0];
      const pRight = p[0] + p[2];
      const pTop = p[1];
      const pBottom = p[1] + p[3];
      if (playerStart.x + 10 >= pLeft && playerStart.x - 10 <= pRight &&
          playerStart.y + 40 >= pTop && playerStart.y <= pBottom) {
        isInsidePlatform = true;
      }
    });

    if (isInsidePlatform) {
      errors.push('Player starts inside a platform hitbox');
    }

    // Checking if there is a floor underneath Player Start, otherwise airborne
    let hasFloorUnderStart = false;
    platforms.forEach(p => {
      if (playerStart.x >= p[0] && playerStart.x <= p[0] + p[2] && p[1] >= playerStart.y) {
        hasFloorUnderStart = true;
      }
    });
    if (!hasFloorUnderStart) {
      warnings.push('Player starts with no platform below them; they will drop immediately on spawn');
    }
  }

  // Player 2 Start check (optional)
  const player2Start = (profile as any).player2Start;
  if (player2Start) {
    if (isNaN(player2Start.x) || isNaN(player2Start.y)) {
      errors.push('Player 2 start coordinates have NaN values');
    }
    if (player2Start.x < 10 || player2Start.x > GAME_WIDTH - 10) {
      warnings.push('Player 2 starts dangerously close to the screen edge');
    }
    if (player2Start.y < 30 || player2Start.y > GAME_HEIGHT - 10) {
      errors.push('Player 2 start y-coordinate is outside playable bounds');
    }

    // Check collision with platforms for P2
    let p2InsidePlatform = false;
    platforms.forEach(p => {
      const pLeft = p[0];
      const pRight = p[0] + p[2];
      const pTop = p[1];
      const pBottom = p[1] + p[3];
      if (player2Start.x + 10 >= pLeft && player2Start.x - 10 <= pRight &&
          player2Start.y + 40 >= pTop && player2Start.y <= pBottom) {
        p2InsidePlatform = true;
      }
    });

    if (p2InsidePlatform) {
      errors.push('Player 2 starts inside a platform hitbox');
    }

    let p2HasFloor = false;
    platforms.forEach(p => {
      if (player2Start.x >= p[0] && player2Start.x <= p[0] + p[2] && p[1] >= player2Start.y) {
        p2HasFloor = true;
      }
    });
    if (!p2HasFloor) {
      warnings.push('Player 2 starts with no platform below them; they will drop immediately on spawn');
    }
  }

  // Rocket Base check
  const rocketBase = profile.rocketBase;
  if (!rocketBase) {
    errors.push('Rocket base position is undefined');
  } else {
    if (isNaN(rocketBase.x) || isNaN(rocketBase.y)) {
      errors.push('Rocket base coordinates have NaN values');
    }
    if (rocketBase.x < 10 || rocketBase.x > GAME_WIDTH - 50) {
      errors.push('Rocket base must be within the horizontal margins of the stage');
    }
    if (rocketBase.y < 50 || rocketBase.y > GAME_HEIGHT) {
      errors.push('Rocket base y-coordinate is outside normal margins');
    }

    // Check if near platform to land on
    let onPlatform = false;
    platforms.forEach(p => {
      // Check if rocket base matches top of a platform
      const topOfPlatform = p[1];
      if (Math.abs(rocketBase.y - topOfPlatform) < 10 && rocketBase.x >= p[0] - 20 && rocketBase.x <= p[0] + p[2] + 20) {
        onPlatform = true;
      }
    });
    if (!onPlatform) {
      warnings.push('Rocket base is not resting on any platform; it might hover or slip in mid-air');
    }

    // Check vertical clearance for rocket length
    if (rocketBase.y < 150) {
      errors.push('Rocket base has insufficient vertical room to spawn standard rocket hulls (base y too high)');
    }
    
    // Check if rocket overlaps player start
    if (playerStart && Math.abs(rocketBase.x + 15 - playerStart.x) < 30 && Math.abs(rocketBase.y - 40 - playerStart.y) < 50) {
      warnings.push('Player start is too close to the Rocket spawning footprint');
    }
  }

  // Enemy set checks
  const enemySet = profile.enemySet || [];
  if (profile.objective !== 'boss' && enemySet.length === 0) {
    warnings.push('No enemies configured for this stage; gameplay will be empty');
  }
  if (enemySet.length > 5) {
    warnings.push('Stage has more than 5 enemy types; spawn rates could be extremely chaotic');
  }

  // Spawn Zones check
  const itemZones = profile.itemSpawnZones || [];
  const enemyZones = profile.enemySpawnZones || [];
  
  itemZones.forEach((z, index) => {
    if (z.w <= 0 || z.h <= 0) {
      errors.push(`Item spawn zone ${index + 1} has invalid dimensions`);
    }
  });

  enemyZones.forEach((z, index) => {
    if (z.w <= 0 || z.h <= 0) {
      errors.push(`Enemy spawn zone ${index + 1} has invalid dimensions`);
    }
  });

  if (itemZones.length === 0) {
    info.push('No custom item spawn zones configured; items will drop down randomly across the top edge');
  }
  if (enemyZones.length === 0) {
    info.push('No custom enemy spawn zones configured; enemies will spawn normally from left/right margins');
  }

  // 1. Hazards Validation
  const hazards = profile.hazards || [];
  hazards.forEach((h, index) => {
    if (!h.kind || !['water', 'lava', 'spikes', 'electric'].includes(h.kind)) {
      errors.push(`Hazard ${index + 1} has an invalid kind`);
      return;
    }
    if (h.w <= 0 || h.h <= 0) {
      errors.push(`Hazard "${h.kind}" (${index + 1}) has an invalid size`);
    }
    if (h.x < 0 || h.x >= GAME_WIDTH || h.y < 0 || h.y >= GAME_HEIGHT) {
      warnings.push(`Hazard "${h.kind}" is partially or entirely outside play screen bounds`);
    }
    if ((h.kind === 'water' || h.kind === 'lava') && (h.w * h.h > 120000)) {
      warnings.push(`Hazard "${h.kind}" cover area is extremely large; it may overpower the gameplay`);
    }

    // Overlaps checks
    if (playerStart) {
      if (playerStart.x >= h.x && playerStart.x <= h.x + h.w && playerStart.y + 20 >= h.y && playerStart.y <= h.y + h.h) {
        errors.push(`Player starts inside hazard "${h.kind}" - player will die instantly on spawn`);
      }
    }
    if (rocketBase) {
      if (rocketBase.x >= h.x - 20 && rocketBase.x <= h.x + h.w + 20 && rocketBase.y >= h.y && rocketBase.y <= h.y + h.h) {
        warnings.push(`Rocket base overlaps or is extremely close to hazard "${h.kind}"`);
      }
    }
  });

  // 2. Zones Validation
  const zones = profile.zones || [];
  zones.forEach((z, index) => {
    if (!z.kind || !['wind', 'gravity', 'slow', 'radiation'].includes(z.kind)) {
      errors.push(`Zone ${index + 1} has an invalid kind`);
      return;
    }
    if (z.w <= 0 || z.h <= 0) {
      errors.push(`Zone "${z.kind}" (${index + 1}) has an invalid size`);
    }
    if (z.kind === 'wind') {
      const fX = z.props?.forceX ?? 0;
      const fY = z.props?.forceY ?? -0.12;
      if (Math.abs(fX) > 1.5 || Math.abs(fY) > 1.5) {
        warnings.push(`Wind Zone ${index + 1} has extreme forces (${fX}, ${fY}); player control might break`);
      }
    }
    if (z.kind === 'gravity') {
      const mult = z.props?.gravityMultiplier ?? 0.35;
      if (mult <= 0.05 || mult > 4.0) {
        warnings.push(`Gravity Zone ${index + 1} has an extreme multiplier (${mult}x)`);
      }
    }
  });

  // 3. Stage Objects Validation
  const objects = profile.objects || [];
  objects.forEach((obj, index) => {
    if (!obj.kind || !['fan', 'teleporter', 'movingPlatform'].includes(obj.kind)) {
      errors.push(`Object ${index + 1} has an invalid kind`);
      return;
    }

    if (obj.kind === 'fan') {
      const strength = obj.props?.strength ?? 0.22;
      if (strength > 1.2) {
        warnings.push(`Fan ${index + 1} has extremely high strength (${strength})`);
      }
      if (playerStart && Math.abs(obj.x - playerStart.x) < 40 && Math.abs(obj.y - playerStart.y) < 40) {
        warnings.push(`Fan ${index + 1} overlaps player start, which may cause uncontrolled initial drifts`);
      }
    }

    if (obj.kind === 'teleporter') {
      const pairId = obj.props?.pairId || obj.props?.targetId;
      if (!pairId) {
        warnings.push(`Teleporter ${index + 1} is missing a pairing configuration (pairId/targetId)`);
      } else {
        const found = objects.find(other => other.id === pairId && other.kind === 'teleporter');
        if (!found) {
          errors.push(`Teleporter ${index + 1} contains a stale pair link "${pairId}" (target not found)`);
        } else if (found.id === obj.id) {
          errors.push(`Teleporter ${index + 1} cannot pair with itself`);
        }
      }
    }

    if (obj.kind === 'movingPlatform') {
      const p1x = obj.props?.pathX1 ?? obj.x;
      const p1y = obj.props?.pathY1 ?? obj.y;
      const p2x = obj.props?.pathX2 ?? obj.x + 160;
      const p2y = obj.props?.pathY2 ?? obj.y;
      const pathDistX = Math.abs(p2x - p1x);
      const pathDistY = Math.abs(p2y - p1y);
      
      if (pathDistX + pathDistY === 0) {
        warnings.push(`Moving Platform ${index + 1} has stationary endpoints (zero travel path)`);
      }
      const speed = obj.props?.speed ?? 1.5;
      if (speed <= 0 || speed > 10.0) {
        errors.push(`Moving Platform ${index + 1} has an invalid or extreme speed setting (${speed})`);
      }
    }
  });

  // 4. Custom Platform Kinds validation
  platforms.forEach((p, index) => {
    const kind = p.kind || 'normal';
    if (kind === 'crumbling') {
      // Check if it is the only solid floor
      let otherSolidWidth = 0;
      platforms.forEach((oth, oi) => {
        if (oi !== index && oth.kind !== 'crumbling') {
          otherSolidWidth += oth[2];
        }
      });
      if (otherSolidWidth < 60) {
        warnings.push(`Crumbling platform is used as the only solid floor; stage might become impossible once it breaks`);
      }
    } else if (kind === 'bounce') {
      if (p[1] < 120) {
        warnings.push(`Bounce platform ${index + 1} is near the ceiling. Player may get smacked off-screen`);
      }
    }
  });

  // 5. Power-ups Validation
  const powerups = profile.powerups || [];
  powerups.forEach((pu, index) => {
    if (!pu.kind || !['gravityBoots', 'heatShield', 'aquaHelmet', 'rubberSuit', 'magnetBoots', 'jetpack'].includes(pu.kind)) {
      errors.push(`Power-up ${index + 1} has an invalid kind "${pu.kind}"`);
      return;
    }
    if (pu.x < 0 || pu.x > GAME_WIDTH || pu.y < 0 || pu.y > GAME_HEIGHT) {
      warnings.push(`Power-up "${pu.kind}" (${index + 1}) is outside screen bounds`);
    }
  });

  // 6. Keys Validation
  const keys = profile.keys || [];
  keys.forEach((key, index) => {
    if (!key.kind || !['redKey', 'blueKey', 'greenKey', 'goldKey', 'silverKey'].includes(key.kind)) {
      errors.push(`Key ${index + 1} has an invalid kind "${key.kind}"`);
      return;
    }
    if (key.x < 0 || key.x > GAME_WIDTH || key.y < 0 || key.y > GAME_HEIGHT) {
      warnings.push(`Key "${key.kind}" (${index + 1}) is outside screen bounds`);
    }
    if (!key.opensGateIds || key.opensGateIds.length === 0) {
      warnings.push(`Key "${key.kind}" is not linked to unlock any gates`);
    }
  });

  // 7. Gates Validation
  const gates = profile.gates || [];
  gates.forEach((gate, index) => {
    if (!gate.kind || !['locked', 'switch', 'timed', 'powerup', 'oneWay'].includes(gate.kind)) {
      errors.push(`Gate ${index + 1} has an invalid kind "${gate.kind}"`);
      return;
    }
    if (gate.w <= 0 || gate.h <= 0) {
      errors.push(`Gate ${index + 1} has an invalid dimension`);
    }
    if (gate.kind === 'locked' && !gate.requiredKeyKind) {
      errors.push(`Locked Gate "${gate.id}" specifies no requiredKeyKind`);
    }
  });

  // 8. Switches Validation
  const switches = profile.switches || [];
  switches.forEach((sw, index) => {
    if (!sw.kind || !['toggle', 'momentary', 'pressure', 'oneShot'].includes(sw.kind)) {
      errors.push(`Switch ${index + 1} has an invalid kind "${sw.kind}"`);
      return;
    }
    if ((!sw.targetGateIds || sw.targetGateIds.length === 0) && (!sw.targetObjectIds || sw.targetObjectIds.length === 0)) {
      warnings.push(`Switch "${sw.id}" (${index + 1}) is not linked to any gate or environmental object`);
    }
  });

  // 9. Enemy Placements Validation
  const placements = profile.enemyPlacements || [];
  placements.forEach((ep, index) => {
    if (!ep.type || ep.type.trim() === '') {
      errors.push(`Enemy placement ${index + 1} has an undefined type`);
    }
  });

  // 10. Cosmic Backdrop Atmospheric Validation
  const bs = profile.backdropSettings;
  if (!bs) {
    info.push('No custom backdrop designer settings are selected for this stage; default theme constants will load.');
  } else {
    // Darkness vs Light Radius
    if (bs.darknessEnabled) {
      if ((bs.playerLightRadius ?? 160) < 100) {
        warnings.push(`Atmosphere: Flashlight radius is extremely small (${bs.playerLightRadius}px) on a high-darkness stage. This may cause severe navigation difficulty for players.`);
      }
      if ((bs.darknessLevel ?? 0.8) > 0.92) {
        warnings.push(`Atmosphere: Darkness level is set extremely high (${(bs.darknessLevel * 100).toFixed(0)}%). Visual elements might be fully obscured beyond immediate flashlight range.`);
      }
    }

    // Weather Opacity & Density Check
    if (profile.weatherEffect && profile.weatherEffect !== 'none') {
      const density = bs.weatherDensityMultiplier ?? 1.0;
      const opacity = bs.weatherOpacity ?? 0.8;
      if (density > 1.8) {
        warnings.push(`Atmosphere: Weather particle density is set very high (${density.toFixed(1)}x). This may clutter collision areas and reduce readability.`);
      }
      if (opacity > 0.9) {
        warnings.push(`Atmosphere: Weather opacity is extremely high (${(opacity * 100).toFixed(0)}%). Weather streams may distract from enemy projectiles.`);
      }
    }

    // Nebula Opacity Check
    if ((bs.nebulaOpacity ?? 0.4) > 0.8) {
      warnings.push(`Atmosphere: Nebula cloud opacity is very high (${(bs.nebulaOpacity * 100).toFixed(0)}%). Nebular backgrounds might bleed into the foreground canvas.`);
    }

    // Structure and Terrain Opacity
    if (bs.structureType && bs.structureType !== 'none' && (bs.structureOpacity ?? 0.8) > 0.9) {
      warnings.push(`Atmosphere: Silhouette background structure opacity is very high (${(bs.structureOpacity * 100).toFixed(0)}%). This will conflict with active gameplay element silhouettes.`);
    }
    if (bs.terrainType && bs.terrainType !== 'none' && (bs.terrainOpacity ?? 0.9) > 0.9) {
      warnings.push(`Atmosphere: Landscape background terrain opacity is very high (${(bs.terrainOpacity * 100).toFixed(0)}%). It might be confused with actual collidable solid platforms.`);
    }

    // Trippy vs Star Density
    if ((bs.trippyIntensity ?? 0) > 0.7 && (bs.starDensity ?? 150) > 250) {
      warnings.push(`Atmosphere: High psychedelic trippy intensity (${(bs.trippyIntensity * 100).toFixed(0)}%) combined with dense stars (${bs.starDensity}) can cause severe visual fatigue.`);
    }

    // Overall Backdrop Readability Rating
    let busyScore = 0;
    if (profile.weatherEffect && profile.weatherEffect !== 'none') busyScore += 2;
    if (bs.nebulaDensity > 3) busyScore += 1;
    if (bs.starDensity > 220) busyScore += 1;
    if (bs.structureType && bs.structureType !== 'none') busyScore += 1.5;
    if (bs.terrainType && bs.terrainType !== 'none') busyScore += 1.5;
    if (bs.asteroidBeltEnabled) busyScore += 1;
    if (bs.trippyIntensity > 0.4) busyScore += 2;

    let visibilityFactor = 1.0;
    if (bs.darknessEnabled) visibilityFactor -= 0.5 * (bs.darknessLevel ?? 0.8);
    if (bs.readabilityVeil && bs.readabilityVeil > 0.25) visibilityFactor += 0.3;

    if (busyScore >= 8) {
      warnings.push(`Readability Level indicates: HEAVY FX / BUSY (${busyScore.toFixed(0)} rating). Consider enabling Foreground Contrast Assist or adding a Readability Veil in advanced settings to safeguard gameplay.`);
    } else if (visibilityFactor < 0.6) {
      warnings.push(`Readability Level indicates: TOO DARK. Dark overlay level is high. Guarantee you have enough glow items so players don't get lost.`);
    }
  }

  // Status computation
  let status: 'clean' | 'warnings' | 'errors' = 'clean';
  if (errors.length > 0) {
    status = 'errors';
  } else if (warnings.length > 0) {
    status = 'warnings';
  }

  return {
    status,
    errors,
    warnings,
    info
  };
}
