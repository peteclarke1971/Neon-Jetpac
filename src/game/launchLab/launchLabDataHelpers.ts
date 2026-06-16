import { JetpacStageProfileV2, EditablePlatformDef, StageHazardDef, StageZoneDef, StageObjectDef, StageHazardKind, StageZoneKind, StageObjectKind, JetpacPlatformKind, StagePowerupDef, StageKeyDef, StageGateDef, StageSwitchDef, StageEnemyPlacementDef, StagePowerupKind, StageKeyKind, StageGateKind, StageSwitchKind, StageRescueDef, StageEscortDef, StageReactorSwitchDef, StageArtifactDef, StageObjectiveZoneDef, StageObjectiveRules } from '../LaunchLabTypes';
import { StageProfile, PlatformDef } from '../StageProfiles';
import { GAME_WIDTH, GAME_HEIGHT, ROCKET_BASE_X, ROCKET_BASE_Y } from '../Constants';

export function normalizeRescueEntity(raw: any): StageRescueDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || "astronaut";
  const id = raw.id || `rescue-${kind}-${Math.floor(Math.random() * 100000)}`;
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const name = raw.name || `Asset-${id.split('-').pop()}`;
  const carried = raw.carried !== undefined ? raw.carried : false;
  const required = raw.required !== undefined ? raw.required : true;

  const props = { ...(raw.props || {}) };
  if (props.canWalk === undefined) props.canWalk = false;
  if (props.panicAnim === undefined) props.panicAnim = true;
  if (props.value === undefined) props.value = 500;

  return { id, x, y, enabled, kind, name, carried, required, props };
}

export function normalizeEscortEntity(raw: any): StageEscortDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || "repairDrone";
  const id = raw.id || `escort-${kind}-${Math.floor(Math.random() * 100000)}`;
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const destinationZoneId = raw.destinationZoneId || "";

  const props = { ...(raw.props || {}) };
  if (props.health === undefined) props.health = 3;
  if (props.speed === undefined) props.speed = 0.7;
  if (props.followPlayer === undefined) props.followPlayer = true;
  if (props.vulnerableToHazards === undefined) props.vulnerableToHazards = true;
  if (props.vulnerableToEnemies === undefined) props.vulnerableToEnemies = true;
  if (props.canBeCarried === undefined) props.canBeCarried = false;

  return { id, x, y, enabled, kind, destinationZoneId, props };
}

export function normalizeReactorSwitch(raw: any): StageReactorSwitchDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || `reactor-switch-${Math.floor(Math.random() * 100000)}`;
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const w = Number(raw.w) || 28;
  const h = Number(raw.h) || 18;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const orderIndex = raw.orderIndex !== undefined ? Number(raw.orderIndex) : undefined;
  const activated = raw.activated !== undefined ? raw.activated : false;

  const props = { ...(raw.props || {}) };
  if (props.requiresPlayerTouch === undefined) props.requiresPlayerTouch = true;
  if (props.requiresItemDrop === undefined) props.requiresItemDrop = false;
  if (props.oneShot === undefined) props.oneShot = true;
  if (props.resetIfWrongOrder === undefined) props.resetIfWrongOrder = false;
  if (props.color === undefined) props.color = "#00ffcc";

  return { id, x, y, w, h, enabled, orderIndex, activated, props };
}

export function normalizeArtifact(raw: any): StageArtifactDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || "crystal";
  const id = raw.id || `artifact-${kind}-${Math.floor(Math.random() * 100000)}`;
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const required = raw.required !== undefined ? raw.required : true;
  const value = raw.value !== undefined ? Number(raw.value) : 250;

  const props = { ...(raw.props || {}) };
  if (props.floats === undefined) props.floats = true;
  if (props.affectedByWind === undefined) props.affectedByWind = true;
  if (props.affectedByGravity === undefined) props.affectedByGravity = true;
  if (props.hiddenUntilSwitch === undefined) props.hiddenUntilSwitch = "";

  return { id, x, y, enabled, kind, required, value, props };
}

export function normalizeObjectiveZone(raw: any): StageObjectiveZoneDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind || "rescueDropoff";
  const id = raw.id || `objective-zone-${kind}-${Math.floor(Math.random() * 100000)}`;
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const w = Number(raw.w) || 60;
  const h = Number(raw.h) || 60;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const label = raw.label || `${kind.replace(/([A-Z])/g, ' $1').toUpperCase()}`;

  const props = { ...(raw.props || {}) };
  if (props.visible === undefined) props.visible = true;
  if (props.color === undefined) {
    if (kind === "rescueDropoff") props.color = "#22c55e";
    else if (kind === "escortDestination") props.color = "#06b6d4";
    else if (kind === "artifactDropoff") props.color = "#eab308";
    else if (kind === "reactorCore") props.color = "#f97316";
    else if (kind === "launchUnlock") props.color = "#a855f7";
    else props.color = "#ffffff";
  }

  return { id, x, y, w, h, enabled, kind, label, props };
}

export function normalizeObjectiveRules(raw: any, profile: any): StageObjectiveRules {
  const mode = raw?.mode || (profile?.objective === 'boss' || profile?.bossId ? 'boss' : 'launch');
  const requireRocketBuild = raw?.requireRocketBuild !== undefined ? raw?.requireRocketBuild : (profile?.requiresBuild !== undefined ? profile.requiresBuild : true);
  const requireFuel = raw?.requireFuel !== undefined ? raw?.requireFuel : (profile?.fuelRequired !== undefined && profile.fuelRequired > 0);
  const fuelRequired = raw?.fuelRequired !== undefined ? raw?.fuelRequired : (profile?.fuelRequired !== undefined ? profile.fuelRequired : 4);

  const rescue = {
    requiredRescues: raw?.rescue?.requiredRescues !== undefined ? Number(raw.rescue.requiredRescues) : 1,
    rescuedToRocket: raw?.rescue?.rescuedToRocket !== undefined ? raw?.rescue?.rescuedToRocket : true,
    allowCarryingOneAtATime: raw?.rescue?.allowCarryingOneAtATime !== undefined ? raw?.rescue?.allowCarryingOneAtATime : true,
    rescueTargetZoneId: raw?.rescue?.rescueTargetZoneId || '',
  };

  const escort = {
    escortId: raw?.escort?.escortId || '',
    destinationZoneId: raw?.escort?.destinationZoneId || '',
    mustSurvive: raw?.escort?.mustSurvive !== undefined ? raw?.escort?.mustSurvive : true,
    failOnEscortDeath: raw?.escort?.failOnEscortDeath !== undefined ? raw?.escort?.failOnEscortDeath : true,
    escortSpeed: raw?.escort?.escortSpeed !== undefined ? Number(raw?.escort?.escortSpeed) : 0.7,
    escortFollowDistance: raw?.escort?.escortFollowDistance !== undefined ? Number(raw?.escort?.escortFollowDistance) : 150,
    escortCanBeCarried: raw?.escort?.escortCanBeCarried !== undefined ? raw?.escort?.escortCanBeCarried : false,
  };

  const reactor = {
    requiredSwitches: raw?.reactor?.requiredSwitches !== undefined ? Number(raw.reactor.requiredSwitches) : 1,
    requireSequence: raw?.reactor?.requireSequence !== undefined ? raw?.reactor?.requireSequence : false,
    sequenceIds: Array.isArray(raw?.reactor?.sequenceIds) ? raw?.reactor?.sequenceIds : [],
    resetOnWrongOrder: raw?.reactor?.resetOnWrongOrder !== undefined ? raw?.reactor?.resetOnWrongOrder : false,
  };

  const artifact = {
    requiredArtifacts: raw?.artifact?.requiredArtifacts !== undefined ? Number(raw.artifact.requiredArtifacts) : 1,
    totalArtifacts: raw?.artifact?.totalArtifacts !== undefined ? Number(raw.artifact.totalArtifacts) : 5,
    artifactsCanBeCarried: raw?.artifact?.artifactsCanBeCarried !== undefined ? raw?.artifact?.artifactsCanBeCarried : false,
    artifactTargetZoneId: raw?.artifact?.artifactTargetZoneId || '',
  };

  const survival = {
    surviveFrames: raw?.survival?.surviveFrames !== undefined ? Number(raw.survival.surviveFrames) : (profile?.completion?.surviveFrames || 1800), // 30s
    launchAfterSurvival: raw?.survival?.launchAfterSurvival !== undefined ? raw?.survival?.launchAfterSurvival : true,
    spawnIntensityMultiplier: raw?.survival?.spawnIntensityMultiplier !== undefined ? Number(raw?.survival?.spawnIntensityMultiplier) : 1.2,
    showCountdown: raw?.survival?.showCountdown !== undefined ? raw?.survival?.showCountdown : true,
  };

  const rush = {
    timeLimitFrames: raw?.rush?.timeLimitFrames !== undefined ? Number(raw.rush.timeLimitFrames) : (profile?.completion?.rushFrames || 1800), // 30s
    failOnTimeout: raw?.rush?.failOnTimeout !== undefined ? raw?.rush?.failOnTimeout : (mode === 'rush'),
    bonusForTimeRemaining: raw?.rush?.bonusForTimeRemaining !== undefined ? raw?.rush?.bonusForTimeRemaining : true,
    warningFrames: raw?.rush?.warningFrames !== undefined ? Number(raw.rush.warningFrames) : 360, // 6s warning
  };

  return {
    mode,
    requireRocketBuild,
    requireFuel,
    fuelRequired,
    rescue,
    escort,
    reactor,
    artifact,
    survival,
    rush,
    launchUnlockedByObjectives: raw?.launchUnlockedByObjectives !== undefined ? raw?.launchUnlockedByObjectives : true,
    allowLaunchBeforeOptionalObjectives: raw?.allowLaunchBeforeOptionalObjectives !== undefined ? raw?.allowLaunchBeforeOptionalObjectives : false,
    showObjectiveChecklist: raw?.showObjectiveChecklist !== undefined ? raw?.showObjectiveChecklist : true,
  };
}

export function isJetpacStageProfileV2(profile: any): profile is JetpacStageProfileV2 {
  return profile && (profile.schemaVersion === 2 || 'playerStart' in profile || 'rocketBase' in profile);
}

export function platformTupleToEditable(platform: PlatformDef, index: number): EditablePlatformDef {
  return {
    id: `platform-${index}-${Math.floor(Math.random() * 10000)}`,
    x: platform[0],
    y: platform[1],
    w: platform[2],
    h: platform[3],
    kind: (platform.kind as JetpacPlatformKind) || 'normal',
  };
}

export function editablePlatformToTuple(platform: EditablePlatformDef): PlatformDef {
  const tuple: PlatformDef = [
    platform.x,
    platform.y,
    platform.w,
    platform.h,
  ];
  if (platform.kind && platform.kind !== 'normal') {
    tuple.kind = platform.kind;
  }
  return tuple;
}

export function normalizePlatformLayout(layout: PlatformDef[]): EditablePlatformDef[] {
  if (!layout) return [];
  return layout.map((p, i) => platformTupleToEditable(p, i));
}

export function serializePlatformLayout(platforms: EditablePlatformDef[]): PlatformDef[] {
  if (!platforms) return [];
  return platforms.map(p => editablePlatformToTuple(p));
}

export function deepCloneStageProfile(profile: any): any {
  return JSON.parse(JSON.stringify(profile));
}

export function normalizeHazard(h: any): StageHazardDef | null {
  if (!h || typeof h !== 'object') return null;
  const kind = h.kind as StageHazardKind;
  const x = Number(h.x) || 0;
  const y = Number(h.y) || 0;
  const w = Number(h.w) || 100;
  const h_sz = Number(h.h) || 30;
  const id = h.id || `hazard-${kind}-${Math.floor(Math.random() * 100000)}`;
  const enabled = h.enabled !== undefined ? h.enabled : true;

  const props = { ...(h.props || {}) };
  if (kind === 'water') {
    if (props.damageDelay === undefined) props.damageDelay = 120;
    if (props.escapeWindow === undefined) props.escapeWindow = 120;
    if (props.sinkSpeed === undefined) props.sinkSpeed = 0.7;
    if (props.instantKill === undefined) props.instantKill = false;
  } else if (kind === 'lava') {
    if (props.damageDelay === undefined) props.damageDelay = 20;
    if (props.instantKill === undefined) props.instantKill = false;
  } else if (kind === 'spikes') {
    if (props.orientation === undefined) props.orientation = "up";
    if (props.instantKill === undefined) props.instantKill = true;
  } else if (kind === 'electric') {
    if (props.activeFrames === undefined) props.activeFrames = 90;
    if (props.inactiveFrames === undefined) props.inactiveFrames = 70;
    if (props.phaseOffset === undefined) props.phaseOffset = 0;
    if (props.instantKill === undefined) props.instantKill = false;
  }

  return {
    id,
    kind,
    x,
    y,
    w,
    h: h_sz,
    enabled,
    props
  };
}

export function normalizeZone(z: any): StageZoneDef | null {
  if (!z || typeof z !== 'object') return null;
  const kind = z.kind as StageZoneKind;
  const x = Number(z.x) || 0;
  const y = Number(z.y) || 0;
  const w = Number(z.w) || 100;
  const h = Number(z.h) || 100;
  const id = z.id || `zone-${kind}-${Math.floor(Math.random() * 100000)}`;
  const enabled = z.enabled !== undefined ? z.enabled : true;

  const props = { ...(z.props || {}) };
  if (kind === 'wind') {
    if (props.forceX === undefined) props.forceX = 0;
    if (props.forceY === undefined) props.forceY = -0.12;
    if (props.affectsPlayer === undefined) props.affectsPlayer = true;
    if (props.affectsItems === undefined) props.affectsItems = true;
    if (props.affectsEnemies === undefined) props.affectsEnemies = false;
    if (props.visible === undefined) props.visible = true;
  } else if (kind === 'gravity') {
    if (props.gravityMultiplier === undefined) props.gravityMultiplier = 0.35;
    if (props.affectsPlayer === undefined) props.affectsPlayer = true;
    if (props.affectsItems === undefined) props.affectsItems = true;
    if (props.affectsEnemies === undefined) props.affectsEnemies = true;
    if (props.visible === undefined) props.visible = true;
  }

  return {
    id,
    kind,
    x,
    y,
    w,
    h,
    enabled,
    props
  };
}

export function normalizeStageObject(o: any): StageObjectDef | null {
  if (!o || typeof o !== 'object') return null;
  const kind = o.kind as StageObjectKind;
  const x = Number(o.x) || 0;
  const y = Number(o.y) || 0;
  const w = Number(o.w) || 40;
  const h = Number(o.h) || 40;
  const id = o.id || `obj-${kind}-${Math.floor(Math.random() * 100000)}`;
  const enabled = o.enabled !== undefined ? o.enabled : true;

  const props = { ...(o.props || {}) };
  if (kind === 'fan') {
    if (props.direction === undefined) props.direction = "up";
    if (props.strength === undefined) props.strength = 0.22;
    if (props.affectsPlayer === undefined) props.affectsPlayer = true;
    if (props.affectsItems === undefined) props.affectsItems = true;
    if (props.affectsEnemies === undefined) props.affectsEnemies = false;
  } else if (kind === 'teleporter') {
    if (props.pairId === undefined) props.pairId = "";
    if (props.cooldownFrames === undefined) props.cooldownFrames = 60;
  } else if (kind === 'movingPlatform') {
    if (props.pathX1 === undefined) props.pathX1 = x;
    if (props.pathY1 === undefined) props.pathY1 = y;
    if (props.pathX2 === undefined) props.pathX2 = x + 160;
    if (props.pathY2 === undefined) props.pathY2 = y;
    if (props.speed === undefined) props.speed = 1.5;
    if (props.pauseAtEnds === undefined) props.pauseAtEnds = 20;
    if (props.carryPlayer === undefined) props.carryPlayer = true;
    if (props.platformKind === undefined) props.platformKind = "normal";
  }

  return {
    id,
    kind,
    x,
    y,
    w,
    h,
    enabled,
    props
  };
}

export function normalizePowerup(raw: any): StagePowerupDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || `powerup-${raw.kind || 'gravityBoots'}-${Math.floor(Math.random() * 100000)}`;
  const kind = (raw.kind as StagePowerupKind) || 'gravityBoots';
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const respawn = raw.respawn !== undefined ? raw.respawn : false;
  const durationFrames = raw.durationFrames !== undefined ? raw.durationFrames : null;

  const props = { ...(raw.props || {}) };
  if (props.permanent === undefined) props.permanent = true;
  if (props.requirePickup === undefined) props.requirePickup = true;
  if (props.glowColor === undefined) {
    if (kind === 'gravityBoots') props.glowColor = '#ff00ff';
    else if (kind === 'heatShield') props.glowColor = '#f97316';
    else if (kind === 'aquaHelmet') props.glowColor = '#3b82f6';
    else if (kind === 'rubberSuit') props.glowColor = '#22c55e';
    else if (kind === 'magnetBoots') props.glowColor = '#a855f7';
  }

  return { id, kind, x, y, enabled, respawn, durationFrames, props };
}

export function normalizeKey(raw: any): StageKeyDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || `key-${raw.kind || 'redKey'}-${Math.floor(Math.random() * 100000)}`;
  const kind = (raw.kind as StageKeyKind) || 'redKey';
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const opensGateIds = Array.isArray(raw.opensGateIds) ? raw.opensGateIds : [];
  const consumedOnUse = raw.consumedOnUse !== undefined ? raw.consumedOnUse : true;

  return { id, kind, x, y, enabled, opensGateIds, consumedOnUse };
}

export function normalizeGate(raw: any): StageGateDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || `gate-${raw.kind || 'locked'}-${Math.floor(Math.random() * 100000)}`;
  const kind = (raw.kind as StageGateKind) || 'locked';
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const w = Number(raw.w) || 40;
  const h = Number(raw.h) || 40;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const initiallyOpen = raw.initiallyOpen !== undefined ? raw.initiallyOpen : false;
  const requiredKeyKind = raw.requiredKeyKind || undefined;
  const requiredPowerupKind = raw.requiredPowerupKind || undefined;
  const linkedSwitchIds = Array.isArray(raw.linkedSwitchIds) ? raw.linkedSwitchIds : [];
  const openDurationFrames = raw.openDurationFrames || undefined;
  const closesAgain = raw.closesAgain !== undefined ? raw.closesAgain : true;

  const props = { ...(raw.props || {}) };
  if (props.color === undefined) {
    if (kind === 'locked') props.color = '#ef4444';
    else if (kind === 'switch') props.color = '#3b82f6';
    else if (kind === 'powerup') props.color = '#10b981';
    else props.color = '#f59e0b';
  }
  if (props.orientation === undefined) props.orientation = 'vertical';
  if (props.blocksPlayer === undefined) props.blocksPlayer = true;
  if (props.blocksItems === undefined) props.blocksItems = true;
  if (props.blocksEnemies === undefined) props.blocksEnemies = false;

  return { id, kind, x, y, w, h, enabled, initiallyOpen, requiredKeyKind, requiredPowerupKind, linkedSwitchIds, openDurationFrames, closesAgain, props };
}

export function normalizeSwitch(raw: any): StageSwitchDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || `switch-${raw.kind || 'toggle'}-${Math.floor(Math.random() * 100000)}`;
  const kind = (raw.kind as StageSwitchKind) || 'toggle';
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const w = Number(raw.w) || 30;
  const h = Number(raw.h) || 12;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const targetGateIds = Array.isArray(raw.targetGateIds) ? raw.targetGateIds : [];
  const targetObjectIds = Array.isArray(raw.targetObjectIds) ? raw.targetObjectIds : [];
  const cooldownFrames = raw.cooldownFrames !== undefined ? raw.cooldownFrames : 30;
  const durationFrames = raw.durationFrames !== undefined ? raw.durationFrames : undefined;

  const props = { ...(raw.props || {}) };
  if (props.canBeTriggeredByPlayer === undefined) props.canBeTriggeredByPlayer = true;
  if (props.canBeTriggeredByItems === undefined) props.canBeTriggeredByItems = false;
  if (props.canBeTriggeredByEnemies === undefined) props.canBeTriggeredByEnemies = false;
  if (props.color === undefined) props.color = '#10b981';

  return { id, kind, x, y, w, h, enabled, targetGateIds, targetObjectIds, cooldownFrames, durationFrames, props };
}

export function normalizeEnemyPlacement(raw: any): StageEnemyPlacementDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type || 'meteor';
  const x = Number(raw.x) || 0;
  const y = Number(raw.y) || 0;
  const id = raw.id || `placed-enemy-${type}-${Math.floor(Math.random() * 100000)}`;
  const enabled = raw.enabled !== undefined ? raw.enabled : true;
  const props = { ...(raw.props || {}) };

  return { id, type, x, y, enabled, props };
}

export function normalizeStageProfile(profile: StageProfile | JetpacStageProfileV2): JetpacStageProfileV2 {
  const clone = deepCloneStageProfile(profile);
  
  const playerStart = clone.playerStart || { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 };
  const rocketBase = clone.rocketBase || { x: ROCKET_BASE_X, y: ROCKET_BASE_Y };

  const isBoss = clone.objective === 'boss' || !!clone.bossId;
  const completionMode = clone.completion?.mode || (isBoss ? 'boss' : clone.objective === 'survive' ? 'survive' : clone.objective === 'rush' ? 'rush' : 'launch');
  
  const hazards = Array.isArray(clone.hazards) ? clone.hazards.map(normalizeHazard).filter(Boolean) as StageHazardDef[] : [];
  const zones = Array.isArray(clone.zones) ? clone.zones.map(normalizeZone).filter(Boolean) as StageZoneDef[] : [];
  const objects = Array.isArray(clone.objects) ? clone.objects.map(normalizeStageObject).filter(Boolean) as StageObjectDef[] : [];
  
  const powerups = Array.isArray(clone.powerups) ? clone.powerups.map(normalizePowerup).filter(Boolean) as StagePowerupDef[] : [];
  const keys = Array.isArray(clone.keys) ? clone.keys.map(normalizeKey).filter(Boolean) as StageKeyDef[] : [];
  const gates = Array.isArray(clone.gates) ? clone.gates.map(normalizeGate).filter(Boolean) as StageGateDef[] : [];
  const switches = Array.isArray(clone.switches) ? clone.switches.map(normalizeSwitch).filter(Boolean) as StageSwitchDef[] : [];
  const enemyPlacements = Array.isArray(clone.enemyPlacements) ? clone.enemyPlacements.map(normalizeEnemyPlacement).filter(Boolean) as StageEnemyPlacementDef[] : [];

  const rescueEntities = Array.isArray(clone.rescueEntities) ? clone.rescueEntities.map(normalizeRescueEntity).filter(Boolean) as StageRescueDef[] : [];
  const escortEntities = Array.isArray(clone.escortEntities) ? clone.escortEntities.map(normalizeEscortEntity).filter(Boolean) as StageEscortDef[] : [];
  const reactorSwitches = Array.isArray(clone.reactorSwitches) ? clone.reactorSwitches.map(normalizeReactorSwitch).filter(Boolean) as StageReactorSwitchDef[] : [];
  const artifacts = Array.isArray(clone.artifacts) ? clone.artifacts.map(normalizeArtifact).filter(Boolean) as StageArtifactDef[] : [];
  const objectiveZones = Array.isArray(clone.objectiveZones) ? clone.objectiveZones.map(normalizeObjectiveZone).filter(Boolean) as StageObjectiveZoneDef[] : [];

  const objectiveRules = normalizeObjectiveRules(clone.objectiveRules, clone);

  return {
    ...clone,
    schemaVersion: 2,
    playerStart,
    player2Start: (clone as any).player2Start || undefined,
    rocketBase,
    itemSpawnZones: clone.itemSpawnZones || [],
    enemySpawnZones: clone.enemySpawnZones || [],
    hazards,
    zones,
    objects,
    powerups,
    keys,
    gates,
    switches,
    enemyPlacements,
    rescueEntities,
    escortEntities,
    reactorSwitches,
    artifacts,
    objectiveZones,
    objectiveRules,
    completion: {
      mode: completionMode,
      surviveFrames: clone.completion?.surviveFrames || 1800, // 30s default
      rushFrames: clone.completion?.rushFrames || 1800,
    },
    editorMeta: clone.editorMeta || {
      notes: '',
      difficulty: 1,
      tags: [],
      source: 'built-in',
    },
    enemySet: clone.enemySet || ['meteor'],
    powerupSet: clone.powerupSet || ['shield', 'tri_shot', 'rocket_magnet', 'rift_bomb'],
    powerupDropChance: clone.powerupDropChance !== undefined ? clone.powerupDropChance : 0.05,
    spawnRateMultiplier: clone.spawnRateMultiplier || 1.0,
    enemySpeedMultiplier: clone.enemySpeedMultiplier || 1.0,
    itemDropMultiplier: clone.itemDropMultiplier || 1.0,
  };
}
