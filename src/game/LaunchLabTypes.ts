import { StageProfile, PlatformDef, StageObjective, VisualTheme, EnemyType, EncounterPattern } from './StageProfiles';

export interface SpawnZoneDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'item' | 'enemy' | 'powerup' | 'boss' | 'any';
  enabled: boolean;
}

export interface JetpacStageProfileV2 extends StageProfile {
  schemaVersion?: 2;

  playerStart?: {
    x: number;
    y: number;
    jetpack?: boolean;
  };

  player2Start?: {
    x: number;
    y: number;
    jetpack?: boolean;
  };

  rocketBase?: {
    x: number;
    y: number;
  };

  itemSpawnZones?: SpawnZoneDef[];

  enemySpawnZones?: SpawnZoneDef[];

  completion?: {
    mode: 'launch' | 'boss' | 'survive' | 'rush';
    surviveFrames?: number;
    rushFrames?: number;
  };

  editorMeta?: {
    notes?: string;
    difficulty?: number;
    tags?: string[];
    source?: string;
  };

  objects?: StageObjectDef[];
  zones?: StageZoneDef[];
  hazards?: StageHazardDef[];
  powerups?: StagePowerupDef[];
  keys?: StageKeyDef[];
  gates?: StageGateDef[];
  switches?: StageSwitchDef[];
  enemyPlacements?: StageEnemyPlacementDef[];
  scripts?: any[];

  objectiveRules?: StageObjectiveRules;
  rescueEntities?: StageRescueDef[];
  escortEntities?: StageEscortDef[];
  reactorSwitches?: StageReactorSwitchDef[];
  artifacts?: StageArtifactDef[];
  objectiveZones?: StageObjectiveZoneDef[];
}

export type JetpacObjectiveMode =
  | "launch"
  | "boss"
  | "rescue"
  | "escort"
  | "reactor"
  | "artifact"
  | "survival"
  | "rush"
  | "hybrid";

export interface StageObjectiveRules {
  mode: JetpacObjectiveMode;

  requireRocketBuild?: boolean;
  requireFuel?: boolean;
  fuelRequired?: number;

  rescue?: RescueObjectiveRules;
  escort?: EscortObjectiveRules;
  reactor?: ReactorObjectiveRules;
  artifact?: ArtifactObjectiveRules;
  survival?: SurvivalObjectiveRules;
  rush?: RushObjectiveRules;

  launchUnlockedByObjectives?: boolean;
  allowLaunchBeforeOptionalObjectives?: boolean;
  showObjectiveChecklist?: boolean;
}

export interface RescueObjectiveRules {
  requiredRescues: number;
  rescuedToRocket?: boolean;
  rescueTargetZoneId?: string;
  allowCarryingOneAtATime?: boolean;
  rescueEntities?: StageRescueDef[];
}

export interface EscortObjectiveRules {
  escortId?: string;
  destinationZoneId?: string;
  mustSurvive: boolean;
  failOnEscortDeath: boolean;
  escortSpeed?: number;
  escortFollowDistance?: number;
  escortCanBeCarried?: boolean;
}

export interface ReactorObjectiveRules {
  requiredSwitches: number;
  requireSequence?: boolean;
  sequenceIds?: string[];
  resetOnWrongOrder?: boolean;
  reactorSwitches?: StageReactorSwitchDef[];
}

export interface ArtifactObjectiveRules {
  requiredArtifacts: number;
  totalArtifacts?: number;
  artifacts?: StageArtifactDef[];
  artifactsCanBeCarried?: boolean;
  artifactTargetZoneId?: string;
}

export interface SurvivalObjectiveRules {
  surviveFrames: number;
  launchAfterSurvival?: boolean;
  spawnIntensityMultiplier?: number;
  showCountdown?: boolean;
}

export interface RushObjectiveRules {
  timeLimitFrames: number;
  failOnTimeout: boolean;
  bonusForTimeRemaining?: boolean;
  warningFrames?: number;
}

export interface StageRescueDef {
  id: string;
  x: number;
  y: number;
  enabled: boolean;
  kind: "astronaut" | "maintenanceBot" | "alienWorker" | "scientist" | "tinyDroid";
  name?: string;
  carried?: boolean;
  required?: boolean;
  props?: {
    canWalk?: boolean;
    panicAnim?: boolean;
    value?: number;
  };
}

export interface StageEscortDef {
  id: string;
  x: number;
  y: number;
  enabled: boolean;
  kind: "repairDrone" | "survivor" | "cargoBot" | "powerCore";
  destinationZoneId?: string;
  props?: {
    health?: number;
    speed?: number;
    followPlayer?: boolean;
    vulnerableToHazards?: boolean;
    vulnerableToEnemies?: boolean;
    canBeCarried?: boolean;
  };
}

export interface StageReactorSwitchDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  orderIndex?: number;
  activated?: boolean;
  props?: {
    requiresPlayerTouch?: boolean;
    requiresItemDrop?: boolean;
    oneShot?: boolean;
    resetIfWrongOrder?: boolean;
    color?: string;
  };
}

export interface StageArtifactDef {
  id: string;
  x: number;
  y: number;
  enabled: boolean;
  kind: "crystal" | "dataCore" | "alienRelic" | "starShard" | "reactorCell";
  required?: boolean;
  value?: number;
  props?: {
    floats?: boolean;
    affectedByWind?: boolean;
    affectedByGravity?: boolean;
    hiddenUntilSwitch?: string;
  };
}

export interface StageObjectiveZoneDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  kind: "rescueDropoff" | "escortDestination" | "artifactDropoff" | "reactorCore" | "launchUnlock";
  label?: string;
  props?: {
    visible?: boolean;
    color?: string;
  };
}

export type StagePowerupKind =
  | "gravityBoots"
  | "heatShield"
  | "aquaHelmet"
  | "rubberSuit"
  | "magnetBoots";

export interface StagePowerupDef {
  id: string;
  kind: StagePowerupKind;
  x: number;
  y: number;
  enabled: boolean;
  respawn?: boolean;
  durationFrames?: number | null;
  props?: {
    permanent?: boolean;
    requirePickup?: boolean;
    glowColor?: string;
  };
}

export type StageKeyKind =
  | "redKey"
  | "blueKey"
  | "greenKey"
  | "goldKey"
  | "silverKey";

export interface StageKeyDef {
  id: string;
  kind: StageKeyKind;
  x: number;
  y: number;
  enabled: boolean;
  opensGateIds: string[];
  consumedOnUse?: boolean;
}

export type StageGateKind =
  | "locked"
  | "switch"
  | "timed"
  | "powerup"
  | "oneWay";

export interface StageGateDef {
  id: string;
  kind: StageGateKind;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  initiallyOpen?: boolean;
  requiredKeyKind?: StageKeyKind;
  requiredPowerupKind?: StagePowerupKind;
  linkedSwitchIds?: string[];
  openDurationFrames?: number;
  closesAgain?: boolean;
  props?: {
    color?: string;
    orientation?: "horizontal" | "vertical";
    blocksPlayer?: boolean;
    blocksItems?: boolean;
    blocksEnemies?: boolean;
  };
}

export type StageSwitchKind =
  | "toggle"
  | "momentary"
  | "pressure"
  | "oneShot";

export interface StageSwitchDef {
  id: string;
  kind: StageSwitchKind;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  targetGateIds: string[];
  targetObjectIds?: string[];
  cooldownFrames?: number;
  durationFrames?: number;
  props?: {
    canBeTriggeredByPlayer?: boolean;
    canBeTriggeredByItems?: boolean;
    canBeTriggeredByEnemies?: boolean;
    color?: string;
  };
}

export interface StageEnemyPlacementDef {
  id: string;
  type: string;
  x: number;
  y: number;
  enabled: boolean;
  props?: Record<string, any>;
}

export type JetpacPlatformKind =
  | "normal"
  | "short"
  | "wide"
  | "flicker"
  | "energy"
  | "boss"
  | "ice"
  | "crumbling"
  | "conveyorLeft"
  | "conveyorRight"
  | "bounce"
  | "moving";

export type StageHazardKind =
  | "water"
  | "lava"
  | "spikes"
  | "electric";

export interface StageHazardDef {
  id: string;
  kind: StageHazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  props?: {
    damageDelay?: number;
    escapeWindow?: number;
    sinkSpeed?: number;
    damageInterval?: number;
    orientation?: "up" | "down" | "left" | "right";
    activeFrames?: number;
    inactiveFrames?: number;
    phaseOffset?: number;
    instantKill?: boolean;
  };
}

export type StageZoneKind =
  | "wind"
  | "gravity"
  | "slow"
  | "radiation";

export interface StageZoneDef {
  id: string;
  kind: StageZoneKind;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  props?: {
    forceX?: number;
    forceY?: number;
    gravityMultiplier?: number;
    maxFallSpeedModifier?: number;
    pulseFrames?: number;
    phaseOffset?: number;
    affectsPlayer?: boolean;
    affectsItems?: boolean;
    affectsEnemies?: boolean;
    visible?: boolean;
  };
}

export type StageObjectKind =
  | "fan"
  | "teleporter"
  | "movingPlatform";

export interface StageObjectDef {
  id: string;
  kind: StageObjectKind;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  props?: {
    direction?: "up" | "down" | "left" | "right";
    strength?: number;
    pairId?: string;
    targetId?: string;
    cooldownFrames?: number;
    affectsPlayer?: boolean;
    affectsItems?: boolean;
    affectsEnemies?: boolean;

    pathX1?: number;
    pathY1?: number;
    pathX2?: number;
    pathY2?: number;
    speed?: number;
    pauseAtEnds?: number;
    carryPlayer?: boolean;
    platformKind?: JetpacPlatformKind;
  };
}

export interface EditablePlatformDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: JetpacPlatformKind;
}

export interface LaunchLabDraft {
  id: string;
  name: string;
  source: 'blank' | 'template' | 'profile-copy' | 'imported' | 'promoted-copy';
  sourceProfileId?: number | string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  promotedId?: string;
  lastPromotedAt?: string;
  lastTestSummary?: StageTestSummary;
  profile: JetpacStageProfileV2;
}

export interface PromotedJetpacStage {
  promotedId: string;
  id?: string;
  draftId?: string;
  title: string;
  subtitle?: string;
  campaignName?: string;
  description?: string;
  order: number;
  difficulty: number;
  tags: string[];
  notes?: string;
  promotedAt: string;
  updatedAt: string;
  localOnly: true;
  profile: JetpacStageProfileV2;
}

export interface BuiltInHandcraftedJetpacStage {
  id: string;
  promotedId?: string;
  title: string;
  subtitle: string;
  campaignName: string;
  order: number;
  difficulty: number;
  tags: string[];
  builtIn: true;
  profile: JetpacStageProfileV2;
}

export type PlayableHandcraftedJetpacStage = PromotedJetpacStage | BuiltInHandcraftedJetpacStage;

export interface StageTestSummary {
  result: 'launched' | 'died' | 'quit' | 'failed';
  score: number;
  fuelDelivered: number;
  partsAssembled: number;
  bossDefeated: boolean;
  timeSurvived: number; // in frames
  enemiesKilled: number;
  objectiveResult?: 'success' | 'failed' | 'quit';
  rescuesCompleted?: number;
  artifactsCollected?: number;
  reactorSwitchesActivated?: number;
  survivalTime?: number;
  rushTimeRemaining?: number;
  escortStatus?: 'safe' | 'damaged' | 'dead' | 'none';
}

export interface ValidationResult {
  status: 'clean' | 'warnings' | 'errors';
  errors: string[];
  warnings: string[];
  info: string[];
}
