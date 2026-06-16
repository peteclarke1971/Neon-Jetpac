import { Player } from './Player';
import { Rocket } from './Rocket';
import { Item } from './Item';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';
import { Particle } from './Particle';
import { audio } from './Audio';
import { input } from './Input';
import { Starfield } from './Starfield';
import { GAME_WIDTH, GAME_HEIGHT, ROCKET_BASE_X, ROCKET_BASE_Y, ENEMY_TYPES, NEON_COLORS } from './Constants';
import { StageProfile, getStageProfile, PlatformDef, normalizeBackdropSettings } from './StageProfiles';
import { Boss, FuelLeechBoss, RocketEaterBoss, RainbowUnicornBoss, AcidKiwiBoss } from './Bosses';
import { VisualThemePalette, getTheme } from './VisualThemes';
import { JetpacStageProfileV2, StageTestSummary, JetpacObjectiveMode } from './LaunchLabTypes';
import { normalizeStageProfile, normalizeObjectiveRules } from './launchLab/launchLabDataHelpers';
import { StageElementsManager } from './StageElements';

export interface RuntimeRescueEntity {
  id: string;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  enabled: boolean;
  kind: "astronaut" | "maintenanceBot" | "alienWorker" | "scientist" | "tinyDroid";
  name: string;
  carried: boolean;
  required: boolean;
  props: {
    canWalk?: boolean;
    panicAnim?: boolean;
    value?: number;
  };
  bubbleAnimTimer?: number;
}

export interface RuntimeEscortEntity {
  id: string;
  x: number;
  y: number;
  velX: number;
  velY: number;
  enabled: boolean;
  kind: "repairDrone" | "survivor" | "cargoBot" | "powerCore";
  destinationZoneId: string;
  health: number;
  maxHealth: number;
  speed: number;
  followPlayer: boolean;
  vulnerableToHazards: boolean;
  vulnerableToEnemies: boolean;
  canBeCarried: boolean;
  carried: boolean;
  completed: boolean;
  damagedFlashTimer: number;
}

export interface RuntimeReactorSwitch {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  enabled: boolean;
  orderIndex?: number;
  activated: boolean;
  props: {
    requiresPlayerTouch?: boolean;
    requiresItemDrop?: boolean;
    oneShot?: boolean;
    resetIfWrongOrder?: boolean;
    color?: string;
  };
}

export interface RuntimeArtifact {
  id: string;
  x: number;
  y: number;
  velX: number;
  velY: number;
  enabled: boolean;
  kind: "crystal" | "dataCore" | "alienRelic" | "starShard" | "reactorCell";
  required: boolean;
  value: number;
  props: {
    floats?: boolean;
    affectedByWind?: boolean;
    affectedByGravity?: boolean;
    hiddenUntilSwitch?: string;
  };
  collected: boolean;
  carried: boolean;
}

export interface ObjectiveRuntimeState {
  mode: JetpacObjectiveMode;

  rescuesRequired: number;
  rescuesCompleted: number;
  rescueEntities: RuntimeRescueEntity[];

  escortEntities: RuntimeEscortEntity[];
  escortCompleted: boolean;
  escortFailed: boolean;

  reactorSwitches: RuntimeReactorSwitch[];
  reactorActivatedCount: number;
  reactorSequenceIndex: number;
  reactorComplete: boolean;

  artifacts: RuntimeArtifact[];
  artifactsCollected: number;
  artifactsRequired: number;

  survivalTimer: number;
  survivalComplete: boolean;

  rushTimer: number;
  rushFailed: boolean;

  launchUnlocked: boolean;
}

export interface GameEngineOptions {
  profiles?: JetpacStageProfileV2[];
  mode?: 'standard' | 'classic' | 'handcrafted' | 'editorTest';
  startStageIndex?: number;
  onReturnToEditor?: (summary?: StageTestSummary) => void;
  onStageComplete?: (summary?: StageTestSummary) => void;
  onCampaignComplete?: () => void;
  playerMode?: 'onePlayer' | 'twoPlayerTurns' | 'twoPlayerCoop' | 'twoPlayerDeathmatch';
  p1Score?: number;
  p2Score?: number;
  p1Lives?: number;
  p2Lives?: number;
  p1LaserConfig?: any;
  p2LaserConfig?: any;
  p1JumpConfig?: any;
  p2JumpConfig?: any;
}

export class GameEngine {
  ctx: CanvasRenderingContext2D;
  players: Player[] = [];
  playerMode: 'onePlayer' | 'twoPlayerTurns' | 'twoPlayerCoop' | 'twoPlayerDeathmatch' = 'onePlayer';
  activeTurnPlayerId: 1 | 2 = 1;

  p1Score = 0;
  p2Score = 0;
  p1Lives = 3;
  p2Lives = 3;

  get player(): Player {
    if (!this.players[0]) {
      const p = new Player();
      p.playerId = 1;
      p.label = 'P1';
      this.players[0] = p;
    }
    return this.players[0];
  }
  set player(val: Player) {
    this.players[0] = val;
  }

  get score(): number {
    return (this.playerMode === 'twoPlayerTurns' && this.activeTurnPlayerId === 2) ? this.p2Score : this.p1Score;
  }
  set score(val: number) {
    if (this.playerMode === 'twoPlayerTurns' && this.activeTurnPlayerId === 2) {
      this.p2Score = val;
    } else {
      this.p1Score = val;
    }
  }

  get lives(): number {
    return (this.playerMode === 'twoPlayerTurns' && this.activeTurnPlayerId === 2) ? this.p2Lives : this.p1Lives;
  }
  set lives(val: number) {
    if (this.playerMode === 'twoPlayerTurns' && this.activeTurnPlayerId === 2) {
      this.p2Lives = val;
    } else {
      this.p1Lives = val;
    }
  }

  rocket: Rocket;
  items: Item[] = [];
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  starfield: Starfield;
  
  stage = 1;
  state: 'START' | 'PLAYING' | 'GAMEOVER' | 'LAUNCHING' | 'NEXT_STAGE' = 'START';
  
  enemyTimer = 0;
  frameCount = 0;

  // Real-time FPS metrics tracking
  lastFrameTime = performance.now();
  fps = 60;
  fpsLastUpdate = performance.now();
  fpsFrames = 0;

  gameMode: 'STANDARD' | 'CLASSIC' = 'STANDARD';
  playMode: 'standard' | 'classic' | 'handcrafted' | 'editorTest' = 'standard';
  profileList: JetpacStageProfileV2[] = [];
  profileIndex = 0;
  options?: GameEngineOptions;
  rocketBaseX = ROCKET_BASE_X;
  rocketBaseY = ROCKET_BASE_Y;
  enemiesKilledThisStage = 0;
  stageStartTime = 0;
  testSummary: StageTestSummary | null = null;
  classicLoop = 0;
  persistedRocketType: number | null = null;
  stageElements = new StageElementsManager();
  lastInfiniteLivesState = false;

  activeProfile!: JetpacStageProfileV2;
  platforms: PlatformDef[] = [];
  activePowerups: { type: string; timer: number }[] = [];
  
  activeBoss: Boss | null = null;
  bossDefeatedState = false;

  // Expansion runtime lists
  runtimePowerups: { id: string; kind: string; x: number; y: number; enabled: boolean; respawn?: boolean; durationFrames?: number | null; props?: any }[] = [];
  runtimeKeys: { id: string; kind: string; x: number; y: number; enabled: boolean; opensGateIds: string[]; consumedOnUse?: boolean }[] = [];
  runtimeGates: { id: string; kind: string; x: number; y: number; w: number; h: number; enabled: boolean; open: boolean; requiredKeyKind?: string; requiredPowerupKind?: string; linkedSwitchIds?: string[]; openDurationFrames?: number; closesAgain?: boolean; props?: any }[] = [];
  runtimeSwitches: { id: string; kind: string; x: number; y: number; w: number; h: number; enabled: boolean; targetGateIds: string[]; targetObjectIds?: string[]; cooldownFrames?: number; durationFrames?: number; active: boolean; cooldownLeft: number; durationLeft: number; props?: any }[] = [];
  runtimeEnemyPlacements: { id: string; type: string; x: number; y: number; enabled: boolean; lastSpawnTime: number; spawnInterval: number; props?: any }[] = [];
  
  // Objective Expansion State
  objectiveState!: ObjectiveRuntimeState;
  missionFailed = false;
  missionFailReason = '';
  
  // Visual Polish State
  visualThemeConfig!: VisualThemePalette;
  visualTime = 0;
  feverIntensity = 0;
  screenPulse = 0;
  riftBombShake = 0;
  stageIntroTimer = 0;
  launchEffectTimer = 0;

  constructor(ctx: CanvasRenderingContext2D, options?: GameEngineOptions) {
    this.ctx = ctx;
    this.options = options;
    
    if (options && options.playerMode) {
      this.playerMode = options.playerMode;
    }

    // Set scores and lives from options if present
    if (options) {
      if (options.p1Score !== undefined) this.p1Score = options.p1Score;
      if (options.p2Score !== undefined) this.p2Score = options.p2Score;
      if (options.p1Lives !== undefined) this.p1Lives = options.p1Lives;
      if (options.p2Lives !== undefined) this.p2Lives = options.p2Lives;
    }

    // Setup active player list
    this.players = [];
    const p1 = new Player();
    p1.playerId = 1;
    p1.label = 'P1';
    p1.lives = this.p1Lives;
    p1.score = this.p1Score;
    this.players.push(p1);

    if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
      const p2 = new Player();
      p2.playerId = 2;
      p2.label = 'P2';
      p2.lives = this.p2Lives;
      p2.score = this.p2Score;
      this.players.push(p2);
    }

    this.rocket = new Rocket();
    this.starfield = new Starfield(GAME_WIDTH, GAME_HEIGHT, 150);
    
    if (options) {
      if (options.mode) {
        this.playMode = options.mode;
        if (options.mode === 'classic') {
          this.gameMode = 'CLASSIC';
        } else {
          this.gameMode = 'STANDARD';
        }
      }
      if (options.profiles) {
        this.profileList = options.profiles;
      }
      if (options.startStageIndex !== undefined) {
        this.profileIndex = options.startStageIndex;
        this.stage = this.profileIndex + 1;
      }
    }
    
    this.initStage();
    this.state = 'START';
  }

  getClassicEnemyType() {
    const cycle = (this.stage - 1) % 8; // 8 enemy families, they cycle every 8 levels
    const classicTypes = [
      { name: 'classic_asteroid', speed: 1.5, score: 25, color: NEON_COLORS.ORANGE },
      { name: 'classic_fuzzball', speed: 2, score: 30, color: NEON_COLORS.MAGENTA },
      { name: 'classic_bubble', speed: 1.5, score: 40, color: NEON_COLORS.CYAN },
      { name: 'classic_fighter', speed: 3, score: 50, color: NEON_COLORS.RED },
      { name: 'classic_saucer', speed: 2.5, score: 60, color: NEON_COLORS.GREEN },
      { name: 'classic_cross', speed: 2.5, score: 70, color: NEON_COLORS.YELLOW },
      { name: 'classic_dart', speed: 4, score: 80, color: '#ffffff' },
      { name: 'classic_blob', speed: 2, score: 100, color: NEON_COLORS.MAGENTA }
    ];
    let t = classicTypes[cycle];
    
    // speed multiplier for loops or later stages
    const multi = 1 + (Math.floor((this.stage - 1) / 8) * 0.1) + (this.classicLoop * 0.2);
    return { ...t, speed: t.speed * multi };
  }

  initStage() {
    this.stageStartTime = Date.now();
    this.enemiesKilledThisStage = 0;
    this.testSummary = null;

    if (this.playMode === 'editorTest' || this.playMode === 'handcrafted') {
      if (this.profileList && this.profileList.length > 0) {
        const idx = this.profileIndex % this.profileList.length;
        this.activeProfile = normalizeStageProfile(this.profileList[idx]);
      } else {
        this.activeProfile = normalizeStageProfile(getStageProfile(this.stage));
      }
    } else {
      this.activeProfile = normalizeStageProfile(getStageProfile(this.stage));
    }

    this.stageElements.init(this.activeProfile);
    this.platforms = this.activeProfile.platformLayout;
    
    // Ensure we have correct player instances in this.players for the current playerMode
    if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
      let p1 = this.players.find(p => p.playerId === 1);
      if (!p1) {
        p1 = new Player();
        p1.playerId = 1;
        p1.label = 'P1';
      }
      p1.lives = this.p1Lives;
      p1.score = this.p1Score;
      p1.dead = false;
      p1.isOut = false;
      p1.laserConfig = this.options?.p1LaserConfig || null;

      let p2 = this.players.find(p => p.playerId === 2);
      if (!p2) {
        p2 = new Player();
        p2.playerId = 2;
        p2.label = 'P2';
      }
      p2.lives = this.p2Lives;
      p2.score = this.p2Score;
      p2.dead = false;
      p2.isOut = false;
      p2.laserConfig = this.options?.p2LaserConfig || null;
      
      this.players = [p1, p2];
    } else {
      let p1 = this.players.find(p => p.playerId === 1) || this.players[0] || new Player();
      p1.playerId = this.playerMode === 'twoPlayerTurns' ? this.activeTurnPlayerId : 1;
      p1.label = 'P' + p1.playerId;
      p1.lives = this.playerMode === 'twoPlayerTurns' ? (this.activeTurnPlayerId === 1 ? this.p1Lives : this.p2Lives) : this.p1Lives;
      p1.score = this.playerMode === 'twoPlayerTurns' ? (this.activeTurnPlayerId === 1 ? this.p1Score : this.p2Score) : this.p1Score;
      p1.dead = false;
      p1.isOut = false;
      p1.laserConfig = p1.playerId === 2 ? (this.options?.p2LaserConfig || null) : (this.options?.p1LaserConfig || null);
      this.players = [p1];
    }
    
    // Position players according to starts
    this.players.forEach(p => {
      const isP2 = p.playerId === 2;
      const spawn = (isP2 && (this.activeProfile as any).player2Start) 
        ? (this.activeProfile as any).player2Start 
        : (this.activeProfile.playerStart || { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
        
      let sx = spawn.x;
      if (isP2 && !(this.activeProfile as any).player2Start) {
        sx += 40; // separate P1 and P2 starting coords if no custom P2 start defined
      }
      p.pos.set(sx, spawn.y);
      p.vel.set(0, 0);
      p.carryingItem = null;
      p.carryingRescue = null;
      p.carryingArtifact = null;
      p.waveTimer = 120;
      p.invulnerableTimer = 180;
      p.isOut = false;

      // Handle start states
      p.hasJetpack = spawn.jetpack !== false;
      p.jumpConfig = p.playerId === 2 
        ? (this.options?.p2JumpConfig || null) 
        : (this.options?.p1JumpConfig || null);
      p.dead = false;
      p.shield = p.maxShield;
      if (typeof p.resetAll === 'function') {
         p.resetAll();
      }
    });
    
    // Position rocket according to rocketBase or default
    const rBase = this.activeProfile.rocketBase || { x: ROCKET_BASE_X, y: ROCKET_BASE_Y };
    this.rocketBaseX = rBase.x;
    this.rocketBaseY = rBase.y;
    this.rocket.baseX = this.rocketBaseX;
    this.rocket.baseY = this.rocketBaseY;
    this.rocket.launchY = rBase.y; // Make sure launch state is reset correctly!
    this.rocket.launching = false;

    this.items = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.activeBoss = null;
    this.bossDefeatedState = false;

    // Initialize Expansion Runtime arrays
    this.runtimePowerups = (this.activeProfile.powerups || []).map(p => ({
       id: p.id,
       kind: p.kind,
       x: p.x,
       y: p.y,
       enabled: p.enabled ?? true,
       respawn: p.respawn,
       durationFrames: p.durationFrames,
       props: p.props
    }));

    this.runtimeKeys = (this.activeProfile.keys || []).map(k => ({
       id: k.id,
       kind: k.kind,
       x: k.x,
       y: k.y,
       enabled: k.enabled ?? true,
       opensGateIds: k.opensGateIds || [],
       consumedOnUse: k.consumedOnUse
    }));

    this.runtimeGates = (this.activeProfile.gates || []).map(g => ({
       id: g.id,
       kind: g.kind,
       x: g.x,
       y: g.y,
       w: g.w,
       h: g.h,
       enabled: g.enabled ?? true,
       open: g.initiallyOpen ?? false,
       requiredKeyKind: g.requiredKeyKind,
       requiredPowerupKind: g.requiredPowerupKind,
       linkedSwitchIds: g.linkedSwitchIds || [],
       openDurationFrames: g.openDurationFrames,
       closesAgain: g.closesAgain,
       props: g.props
    }));

    this.runtimeSwitches = (this.activeProfile.switches || []).map(s => ({
       id: s.id,
       kind: s.kind,
       x: s.x,
       y: s.y,
       w: s.w,
       h: s.h,
       enabled: s.enabled ?? true,
       targetGateIds: s.targetGateIds || [],
       targetObjectIds: s.targetObjectIds || [],
       cooldownFrames: s.cooldownFrames || 0,
       durationFrames: s.durationFrames || 0,
       active: false,
       cooldownLeft: 0,
       durationLeft: 0,
       props: s.props
    }));

    this.player.invulnerableTimer = 180; // 3 seconds spawn protection
    this.runtimeEnemyPlacements = (this.activeProfile.enemyPlacements || []).map(ep => ({
       id: ep.id,
       type: ep.type,
       x: ep.x,
       y: ep.y,
       enabled: ep.enabled ?? true,
       lastSpawnTime: 0,
       spawnInterval: ep.props?.spawnInterval || 300,
       props: ep.props
    }));
    
    this.player.dead = false;

    if (this.gameMode === 'CLASSIC') {
      this.rocket.type = (Math.floor((this.stage - 1) / 4) % 4) + 1;
      this.rocket.fuelLevel = 0;
      if ((this.stage - 1) % 4 === 0) {
        this.rocket.partsAssembled = 1;
        this.spawnItem('part', 2);
      } else {
        this.rocket.partsAssembled = 3;
        this.spawnItem('fuel');
      }
    } else {
      // Respect our objective rules first
      const rules = this.activeProfile.objectiveRules || normalizeObjectiveRules(this.activeProfile.objectiveRules, this.activeProfile);
      const requireBuild = rules.requireRocketBuild !== false && this.activeProfile.requiresBuild !== false;
      const requireFuel = rules.requireFuel !== false;

      if (requireBuild) {
         this.rocket.type = this.activeProfile.rocketType || 1;
         this.persistedRocketType = this.rocket.type;
         this.rocket.partsAssembled = 1;
         this.rocket.fuelLevel = 0;
         this.spawnItem('part', 2);
      } else {
         if (this.persistedRocketType !== undefined && this.persistedRocketType !== null) {
            this.rocket.type = this.persistedRocketType;
         } else {
            this.rocket.type = this.activeProfile.rocketType || 1;
            this.persistedRocketType = this.rocket.type;
         }
         this.rocket.partsAssembled = 3;
         this.rocket.fuelLevel = 0;
         if (requireFuel) {
            this.spawnItem('fuel');
         }
      }

      if (this.activeProfile.bossId) {
         this.rocket.partsAssembled = 3;
         if (this.activeProfile.bossId === 'rainbow_unicorn' || this.activeProfile.bossId === 'acid_kiwi') {
            this.rocket.fuelLevel = 0; // Starts empty like normal, gets fueled after boss is destroyed
         } else {
            this.rocket.fuelLevel = 6; // Rocket complete, but we must defeat boss to launch
         }
         if (this.activeProfile.bossId === 'fuel_leech') {
            this.activeBoss = new FuelLeechBoss();
         } else if (this.activeProfile.bossId === 'rainbow_unicorn') {
            this.activeBoss = new RainbowUnicornBoss();
         } else if (this.activeProfile.bossId === 'acid_kiwi') {
            this.activeBoss = new AcidKiwiBoss();
         } else {
            this.activeBoss = new RocketEaterBoss();
         }
      }
    }

    // Initialize objective runtime state
    const rulesConfig = this.activeProfile.objectiveRules || normalizeObjectiveRules(this.activeProfile.objectiveRules, this.activeProfile);

    // Initialize rescues
    const rescueList: RuntimeRescueEntity[] = (this.activeProfile.rescueEntities || []).map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      originalX: r.x,
      originalY: r.y,
      enabled: r.enabled ?? true,
      kind: r.kind,
      name: r.name || 'Rescue Unit',
      carried: false,
      required: r.required ?? true,
      props: r.props || {},
      bubbleAnimTimer: Math.random() * 100
    }));

    // Initialize escorts
    const escortList: RuntimeEscortEntity[] = (this.activeProfile.escortEntities || []).map(e => ({
      id: e.id,
      x: e.x,
      y: e.y,
      velX: 0,
      velY: 0,
      enabled: e.enabled ?? true,
      kind: e.kind,
      destinationZoneId: e.destinationZoneId || '',
      health: e.props?.health ?? 3,
      maxHealth: e.props?.health ?? 3,
      speed: e.props?.speed ?? 0.7,
      followPlayer: e.props?.followPlayer ?? true,
      vulnerableToHazards: e.props?.vulnerableToHazards ?? true,
      vulnerableToEnemies: e.props?.vulnerableToEnemies ?? true,
      canBeCarried: e.props?.canBeCarried ?? false,
      carried: false,
      completed: false,
      damagedFlashTimer: 0
    }));

    // Initialize reactor switches
    const reactorList: RuntimeReactorSwitch[] = (this.activeProfile.reactorSwitches || []).map(s => ({
      id: s.id,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      enabled: s.enabled ?? true,
      orderIndex: s.orderIndex,
      activated: false,
      props: s.props || {}
    }));

    // Initialize artifacts
    const artifactList: RuntimeArtifact[] = (this.activeProfile.artifacts || []).map(a => ({
      id: a.id,
      x: a.x,
      y: a.y,
      velX: 0,
      velY: 0,
      enabled: a.enabled ?? true,
      kind: a.kind,
      required: a.required ?? true,
      value: a.value ?? 250,
      collected: false,
      carried: false,
      props: a.props || {}
    }));

    this.missionFailed = false;
    this.missionFailReason = '';

    const requiredRescuesVal = rulesConfig.rescue?.requiredRescues ?? rescueList.filter(r => r.required).length;
    const requiredArtifactsVal = rulesConfig.artifact?.requiredArtifacts ?? artifactList.filter(a => a.required).length;

    this.objectiveState = {
      mode: rulesConfig.mode,

      rescuesRequired: requiredRescuesVal,
      rescuesCompleted: 0,
      rescueEntities: rescueList,

      escortEntities: escortList,
      escortCompleted: false,
      escortFailed: false,

      reactorSwitches: reactorList,
      reactorActivatedCount: 0,
      reactorSequenceIndex: 0,
      reactorComplete: false,

      artifacts: artifactList,
      artifactsCollected: 0,
      artifactsRequired: requiredArtifactsVal,

      survivalTimer: rulesConfig.survival?.surviveFrames ?? 1800,
      survivalComplete: false,

      rushTimer: rulesConfig.rush?.timeLimitFrames ?? 1800,
      rushFailed: false,

      launchUnlocked: false
    };
    
    this.rocket.launching = false;
    this.rocket.launchY = this.rocketBaseY;
    this.state = 'PLAYING';
    this.stageIntroTimer = 120; // 2 seconds banner
    this.launchEffectTimer = 0;
    this.visualThemeConfig = getTheme(this.activeProfile?.visualTheme || 'classic_neon');
    this.feverIntensity = this.calculateTargetFever();
  }

  calculateTargetFever(): number {
    if (this.gameMode === 'CLASSIC') return 0.3;
    
    let base = 0.5;
    if (this.activeProfile?.visualTheme === 'wormhole_fever') base = 0.8;
    if (this.activeBoss && !this.activeBoss.dead) base = 0.8;
    if (this.state === 'LAUNCHING') return 2.0;
    
    if (this.activePowerups.length > 0) base += 0.2;
    if (this.player.carryingItem || this.items.some(i => i.fallingToRocket)) base += 0.15;
    
    return Math.min(base, 1.2);
  }

  nextStage() {
    // Generate summary
    const summary: StageTestSummary = {
      result: 'launched',
      score: this.score,
      fuelDelivered: this.rocket.fuelLevel,
      partsAssembled: this.rocket.partsAssembled,
      bossDefeated: this.activeBoss ? this.activeBoss.dead : false,
      timeSurvived: Math.floor((Date.now() - this.stageStartTime) / 1000 * 60),
      enemiesKilled: this.enemiesKilledThisStage
    };
    
    this.testSummary = summary;

    if (this.playMode === 'editorTest') {
      this.state = 'GAMEOVER'; // Stop game updates
      if (this.options && this.options.onStageComplete) {
        this.options.onStageComplete(summary);
      }
      return;
    }

    if (this.playMode === 'handcrafted') {
      if (this.options && this.options.onStageComplete) {
        this.options.onStageComplete(summary);
      }
      this.profileIndex++;
      if (this.profileIndex >= this.profileList.length) {
        if (this.options && this.options.onCampaignComplete) {
          this.options.onCampaignComplete();
        } else {
          this.state = 'GAMEOVER';
        }
      } else {
        this.stage = this.profileIndex + 1;
        this.initStage();
      }
      return;
    }

    this.stage++;
    if (this.gameMode === 'CLASSIC' && this.stage > 16) {
      this.stage = 1;
      this.classicLoop++;
    }
    this.initStage();
  }

  spawnItem(type: 'part' | 'fuel' | 'valuable' | 'powerup', param?: number | string) {
    const item = new Item(type, param as any);
    const zones = this.activeProfile?.itemSpawnZones?.filter(z => z.enabled && (z.kind === 'any' || (type === 'powerup' && z.kind === 'powerup') || (type !== 'powerup' && z.kind === 'item'))) || [];
    if (zones.length > 0) {
      const selectedZone = zones[Math.floor(Math.random() * zones.length)];
      const rx = selectedZone.x + Math.random() * selectedZone.w;
      const ry = selectedZone.y + Math.random() * selectedZone.h;
      item.pos.set(rx, ry);
      item.vel.set(0, 1.5);
    }
    this.items.push(item);
  }

  spawnEnemy(typeName: string | any, defaultX?: number, defaultY?: number) {
    const enemyZones = this.activeProfile?.enemySpawnZones?.filter(z => z.enabled && (z.kind === 'enemy' || z.kind === 'any')) || [];
    let enemy: Enemy;
    if (enemyZones.length > 0 && defaultX === undefined && defaultY === undefined) {
      const z = enemyZones[Math.floor(Math.random() * enemyZones.length)];
      const rx = z.x + Math.random() * z.w;
      const ry = z.y + Math.random() * z.h;
      enemy = new Enemy(typeName, rx, ry);
    } else {
      enemy = new Enemy(typeName, defaultX, defaultY);
    }
    this.enemies.push(enemy);
  }

  turnMessageTimer = 0;

  die(p?: Player) {
    const player = p || this.player;
    if (player.dead) return;
    if (player.invulnerableTimer > 0) return; // Immune to all damage while invulnerable!
    
    player.dead = true;
    audio.playExplosion();
    input.rumble(player.playerId, 500, 1.0, 1.0);
    
    // drop carried item
    if (player.carryingItem) {
      player.carryingItem.carried = false;
      player.carryingItem.dropped = true;
      player.carryingItem = null;
    }

    const pColor = player.playerId === 2 ? '#22c55e' : NEON_COLORS.CYAN;
    for (let i=0; i<30; i++) {
      this.particles.push(new Particle(player.pos.x, player.pos.y, pColor, 2));
    }
    
    setTimeout(() => {
      if (this.playerMode === 'onePlayer') {
        if (!input.infiniteLives) {
          this.lives--;
        }
        if (this.lives <= 0) {
          this.state = 'GAMEOVER';
          audio.playGameOver();

          const summary: StageTestSummary = {
            result: 'died',
            score: this.score,
            fuelDelivered: this.rocket.fuelLevel,
            partsAssembled: this.rocket.partsAssembled,
            bossDefeated: this.activeBoss ? this.activeBoss.dead : false,
            timeSurvived: Math.floor((Date.now() - this.stageStartTime) / 1000 * 60),
            enemiesKilled: this.enemiesKilledThisStage
          };
          this.testSummary = summary;
          if ((this.playMode === 'editorTest' || this.playMode === 'handcrafted') && this.options?.onStageComplete) {
            this.options.onStageComplete(summary);
          }
        } else {
          // respawn at player start node
          player.dead = false;
          player.invulnerableTimer = 180; // 3 seconds protection
          const playerStart = this.activeProfile?.playerStart || { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 };
          player.pos.set(playerStart.x, playerStart.y);
          player.vel.set(0, 0);
        }
      } else if (this.playerMode === 'twoPlayerTurns') {
        if (!input.infiniteLives) {
          this.lives--; // subtract from active turn lives getter/setter
        }
        
        // Determine if both players are out of lives
        if (this.p1Lives <= 0 && this.p2Lives <= 0) {
          this.state = 'GAMEOVER';
          audio.playGameOver();
          return;
        }

        // Switch turn if other player has lives left
        const otherId = 3 - this.activeTurnPlayerId as 1 | 2;
        const otherLives = otherId === 2 ? this.p2Lives : this.p1Lives;
        
        if (otherLives > 0) {
          // Play a turn change jingle
          audio.playPowerup();
          this.activeTurnPlayerId = otherId;
          this.turnMessageTimer = 120; // 2 seconds banner
          
          this.player.playerId = this.activeTurnPlayerId;
          this.player.label = 'P' + this.activeTurnPlayerId;
        }
        
        // Respawn the active turn player at spawn points
        this.player.dead = false;
        this.player.invulnerableTimer = 180;
        const playerStart = this.activeProfile?.playerStart || { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 };
        this.player.pos.set(playerStart.x, playerStart.y);
        this.player.vel.set(0, 0);

      } else {
        // Co-Op or Deathmatch (Both on-screen)
        if (!input.infiniteLives) {
          player.lives--;
        }
        if (player.playerId === 1) {
          this.p1Lives = player.lives;
        } else {
          this.p2Lives = player.lives;
        }
        
        if (player.lives <= 0) {
          player.isOut = true;
          player.dead = true;
          
          // Check if ALL are out
          const allOut = this.players.every(pl => pl.isOut || pl.lives <= 0);
          if (allOut) {
            this.state = 'GAMEOVER';
            audio.playGameOver();
            return;
          }
        } else {
          // Respawn player
          player.dead = false;
          player.invulnerableTimer = 180;
          if (this.playerMode === 'twoPlayerDeathmatch') {
            player.shield = 100;
          }
          const isP2 = player.playerId === 2;
          const spawn = (isP2 && (this.activeProfile as any).player2Start) 
            ? (this.activeProfile as any).player2Start 
            : (this.activeProfile.playerStart || { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 });
            
          let spawnX = spawn.x;
          if (isP2 && !(this.activeProfile as any).player2Start) {
            spawnX += 40; // separate them
          }
          player.pos.set(spawnX, spawn.y);
          player.vel.set(0, 0);
        }
      }
    }, 2000);
  }

  checkCollisions() {
    // Player vs Item
    this.players.forEach(p => {
      if (!p.dead && !p.isOut && !this.rocket.launching) {
        for (const item of this.items) {
          if (!item.collected && !item.carried && !item.fallingToRocket) {
            if (Math.abs(item.pos.x - p.pos.x) < 20 && Math.abs(item.pos.y - p.pos.y) < 20) {
              // pickup
              if (item.type === 'valuable') {
                item.collected = true;
                if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
                  p.score += 250;
                  if (p.playerId === 1) this.p1Score = p.score;
                  else this.p2Score = p.score;
                } else {
                  this.score += 250;
                }
                audio.playPowerup();
                const colors = [NEON_COLORS.CYAN, NEON_COLORS.MAGENTA, NEON_COLORS.YELLOW, NEON_COLORS.GREEN];
                for (let i=0; i<20; i++) {
                  const rc = colors[Math.floor(Math.random() * colors.length)];
                  this.particles.push(new Particle(item.pos.x + 12, item.pos.y + 12, rc, 2));
                }
                this.particles.push(new Particle(item.pos.x + 12, item.pos.y, '#ffffff', 1, '$'));
              } else if (item.type === 'powerup') {
                item.collected = true;
                if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
                  p.score += 150;
                  if (p.playerId === 1) this.p1Score = p.score;
                  else this.p2Score = p.score;
                } else {
                  this.score += 150;
                }
                audio.playPowerup();
                const pType = item.powerupType;
                if (pType) {
                   if (pType === 'rift_bomb') {
                      // Wipe enemies with massive visual and impact effects
                      this.screenPulse = 2.0; 
                      this.riftBombShake = 35; 
                      
                      const activeEnemies = this.enemies.filter(e => !e.dead);
                      activeEnemies.forEach(enemy => {
                         enemy.dead = true;
                         
                         const enemyScore = enemy.type?.score || 50;
                         if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
                            p.score += enemyScore;
                            if (p.playerId === 1) this.p1Score = p.score;
                            else this.p2Score = p.score;
                         } else {
                            this.score += enemyScore;
                         }
                         this.enemiesKilledThisStage++;
                         
                         if (enemy.carryingItem) {
                            enemy.carryingItem.carried = false;
                            enemy.carryingItem.dropped = true;
                          }

                         if (enemy.type?.name === 'split_meteor') {
                            this.enemies.push(new Enemy('split_meteor_shard', enemy.pos.x, enemy.pos.y, -3, -2));
                            this.enemies.push(new Enemy('split_meteor_shard', enemy.pos.x, enemy.pos.y, 3, -2));
                         }

                         const pCount = (enemy.type?.name.startsWith('boss_')) ? 100 : 15;
                         const eColor = enemy.type?.color || '#ff0055';
                         this.particles.push(new Particle(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, eColor, undefined, undefined, false, 'ring'));
                         for (let i=0; i<pCount; i++) {
                            const pType = Math.random() > 0.5 ? 'shard' : undefined;
                            this.particles.push(new Particle(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, eColor, (enemy.type?.name.startsWith('boss_')) ? 4 : 1.5, undefined, false, pType));
                         }
                      });

                      audio.playExplosion();
                      if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
                        // Already scored above per-enemy
                        if (p.playerId === 1) this.p1Score = p.score;
                        else this.p2Score = p.score;
                      } else {
                        // Already scored above per-enemy
                      }
                      if (this.activeBoss && this.activeBoss.onRiftBomb) {
                         this.activeBoss.onRiftBomb(this);
                      }
                   } else {
                      this.activePowerups.push({ type: pType, timer: 600 }); // 10 seconds
                      if (pType === 'rocket_magnet') {
                         (window as any).__magnetActive = true;
                      } else if (pType === 'tri_shot') {
                         (window as any).__triShotActive = true;
                      } else if (pType === 'gravity_clamp') {
                         (window as any).__gravityClampActive = true;
                      }
                   }
                }
                this.particles.push(new Particle(item.pos.x + 12, item.pos.y, '#ffffff', 1, '!'));
              } else if (!p.carryingItem) {
                item.carried = true;
                item.dropped = false;
                p.carryingItem = item;
                audio.playPickup();
              }
            }
          }
        }

        // Check drop zone for rocket
        if (p.carryingItem) {
          const item = p.carryingItem;
          if (Math.abs(p.pos.x - (this.rocketBaseX + 5)) < 20) {
            item.carried = false;
            item.fallingToRocket = true;
            p.carryingItem = null;
            audio.playDrop();
          }
        }
      }
    });

    // Items falling to rocket
    for (const item of this.items) {
      if (item.fallingToRocket) {
        if (item.pos.y >= this.rocketBaseY - 45) {
          item.collected = true;
          item.fallingToRocket = false;
          audio.playPowerup();
          
          if (item.type === 'part') {
            this.rocket.partsAssembled++;
            this.score += 100;
            if (this.rocket.partsAssembled === 2) {
              setTimeout(() => this.spawnItem('part', 3), 1000);
            } else if (this.rocket.partsAssembled === 3) {
              setTimeout(() => this.spawnItem('fuel'), 1000);
            }
          } else if (item.type === 'fuel') {
            this.rocket.fuelLevel++;
            this.score += 50;
            if (this.rocket.fuelLevel < 6) {
              setTimeout(() => this.spawnItem('fuel'), 500);
            } else {
              // Fuel full, get ready to launch!
            }
          }
        }
      }
    }

    // Getting in the rocket
    if (this.isRocketLaunchAllowed() && !this.rocket.launching) {
      this.players.forEach(p => {
        if (!p.dead && !p.isOut) {
          if (Math.abs(p.pos.x - (this.rocketBaseX + 5)) < 15 && Math.abs(p.pos.y - (this.rocketBaseY - 20)) < 30) {
            // Player enters rocket
            p.dead = true; // hide player
            this.rocket.launching = true;
            this.state = 'LAUNCHING';
            audio.playLaunch();
          }
        }
      });
    }

    // Bullets vs Enemies
    for (const bullet of this.bullets) {
      if (bullet.life === -100) continue;
      
      // Bullets vs Boss
      if (this.activeBoss && !this.activeBoss.dead && !bullet.enemyBullet) {
         if (this.activeBoss.checkHit(bullet, this)) {
            bullet.life = -100;
            continue;
         }
      }

      for (const enemy of this.enemies) {
        if (!enemy.dead && bullet.life !== -100) {
          if (bullet.overlapsWith(enemy.pos.x, enemy.pos.y, enemy.width, enemy.height, 6, 8)) {
            
            // Check Phase Wisp invulnerability
            if (enemy.type.name === 'phase_wisp' && !enemy.phaseSolid) {
               continue; // Bullet passes through
            }

            bullet.life = -100; // mark for deletion
            
            if (enemy.hp > 1) {
              enemy.hp--;
              audio.playExplosion();
              for (let i=0; i<3; i++) {
                this.particles.push(new Particle(bullet.pos.x, bullet.pos.y, '#ffffff', 1));
              }
              continue;
            }

            enemy.dead = true;
            
            const shooterId = (bullet as any).ownerPlayerId || 1;
            const shooter = this.players.find(pl => pl.playerId === shooterId) || this.player;
            if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
              shooter.score += enemy.type.score;
              if (shooter.playerId === 1) this.p1Score = shooter.score;
              else this.p2Score = shooter.score;
            } else {
              this.score += enemy.type.score;
            }
            this.enemiesKilledThisStage++;
            audio.playExplosion();
            
            // Scavenger drop item
            if (enemy.carryingItem) {
              enemy.carryingItem.carried = false;
              enemy.carryingItem.dropped = true;
            }

            // Split Meteor
            if (enemy.type.name === 'split_meteor') {
              this.enemies.push(new Enemy('split_meteor_shard', enemy.pos.x, enemy.pos.y, -3, -2));
              this.enemies.push(new Enemy('split_meteor_shard', enemy.pos.x, enemy.pos.y, 3, -2));
            }

            const pCount = (enemy.type.name.startsWith('boss_')) ? 100 : 15;
            this.particles.push(new Particle(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, enemy.type.color, undefined, undefined, false, 'ring'));
            for (let i=0; i<pCount; i++) {
              const pType = Math.random() > 0.5 ? 'shard' : undefined;
              this.particles.push(new Particle(enemy.pos.x + enemy.width/2, enemy.pos.y + enemy.height/2, enemy.type.color, (enemy.type.name.startsWith('boss_')) ? 4 : 1.5, undefined, false, pType));
            }
          }
        }
      }
    }

    // Player vs Enemies & PvP Checks
    this.players.forEach(p => {
      if (!p.dead && !p.isOut && !this.rocket.launching) {
        // Check enemy bullets
        for (const bullet of this.bullets) {
          if (bullet.enemyBullet && bullet.life !== -100) {
             if (bullet.overlapsWith(p.pos.x, p.pos.y, p.width, p.height, 6, 8)) {
                bullet.life = -100;
                const shieldIndex = this.activePowerups.findIndex(pr => pr.type === 'shield');
                if (shieldIndex !== -1) {
                   this.activePowerups.splice(shieldIndex, 1);
                   audio.playExplosion();
                   for (let i=0; i<15; i++) {
                     this.particles.push(new Particle(p.pos.x, p.pos.y, NEON_COLORS.CYAN, 2));
                   }
                } else {
                   if (this.playerMode === 'twoPlayerDeathmatch') {
                     p.shield = Math.max(0, p.shield - 25);
                     audio.playExplosion();
                     for (let i=0; i<10; i++) {
                       this.particles.push(new Particle(p.pos.x, p.pos.y, '#ef4444', 1.5));
                     }
                     if (p.shield <= 0) {
                       this.die(p);
                     }
                   } else {
                     this.die(p);
                   }
                }
             }
          }
        }

        // PvP bullets checks in Deathmatch
        if (this.playerMode === 'twoPlayerDeathmatch') {
          for (const bullet of this.bullets) {
            if (!bullet.enemyBullet && (bullet as any).ownerPlayerId && (bullet as any).ownerPlayerId !== p.playerId && bullet.life !== -100) {
              if (bullet.overlapsWith(p.pos.x, p.pos.y, p.width, p.height, 6, 8)) {
                 bullet.life = -100;
                 const shieldIndex = this.activePowerups.findIndex(pr => pr.type === 'shield');
                 if (shieldIndex !== -1) {
                    this.activePowerups.splice(shieldIndex, 1);
                    audio.playExplosion();
                    for (let i=0; i<15; i++) {
                      this.particles.push(new Particle(p.pos.x, p.pos.y, NEON_COLORS.CYAN, 2));
                    }
                 } else {
                    p.shield = Math.max(0, p.shield - 15);
                    audio.playExplosion();
                    for (let i=0; i<10; i++) {
                      this.particles.push(new Particle(p.pos.x, p.pos.y, p.playerId === 1 ? NEON_COLORS.CYAN : '#22c55e', 2));
                    }
                    if (p.shield <= 0) {
                      // Award frag points to shooter!
                      const shooterId = (bullet as any).ownerPlayerId;
                      const shooter = this.players.find(pl => pl.playerId === shooterId);
                      if (shooter) {
                        shooter.score += 1000;
                        if (shooter.playerId === 1) this.p1Score = shooter.score;
                        else this.p2Score = shooter.score;
                      }
                      this.die(p);
                    }
                 }
              }
            }
          }
        }

        // Check enemy contact
        for (const enemy of this.enemies) {
          if (!enemy.dead) {
            // Check Phase Wisp invulnerability/intangibility
            if (enemy.type.name === 'phase_wisp' && !enemy.phaseSolid) {
              continue; // Player passes through phantom
            }

            if (Math.abs(p.pos.x - enemy.pos.x) < 20 && Math.abs(p.pos.y - enemy.pos.y) < 20) {
              
              const shieldIndex = this.activePowerups.findIndex(pr => pr.type === 'shield');
              if (shieldIndex !== -1) {
                 // Consume shield, kill enemy
                 this.activePowerups.splice(shieldIndex, 1);
                 enemy.dead = true;
                 audio.playExplosion();
                 for (let i=0; i<15; i++) {
                   this.particles.push(new Particle(enemy.pos.x, enemy.pos.y, NEON_COLORS.MAGENTA, 2));
                 }
              } else {
                 if (this.playerMode === 'twoPlayerDeathmatch') {
                   p.shield = Math.max(0, p.shield - 35);
                   audio.playExplosion();
                   for (let i=0; i<15; i++) {
                     this.particles.push(new Particle(p.pos.x, p.pos.y, '#ef4444', 1.5));
                   }
                   if (p.shield <= 0) {
                     this.die(p);
                   }
                 } else {
                   this.die(p);
                 }
              }
            }
          }
        }
      }
    });
  }

  update() {
    this.frameCount++;
    
    // Handle infinite lives keyboard toggle sfx feedback
    if (input.infiniteLives !== this.lastInfiniteLivesState) {
       if (input.infiniteLives) {
          audio.playPowerup();
       } else {
          audio.playDrop();
       }
       this.lastInfiniteLivesState = input.infiniteLives;
    }

    // Update Visual System State
    this.visualThemeConfig = getTheme(this.activeProfile?.visualTheme || 'classic_neon');
    const targetFever = this.calculateTargetFever();
    this.feverIntensity += (targetFever - this.feverIntensity) * 0.05;
    this.visualTime += this.visualThemeConfig.feverSpeed * (0.5 + this.feverIntensity);
    
    if (this.screenPulse > 0) this.screenPulse -= 0.05;
    if (this.riftBombShake > 0) this.riftBombShake--;
    if (this.stageIntroTimer > 0) this.stageIntroTimer--;
    if (this.turnMessageTimer > 0) this.turnMessageTimer--;
    
    if (input.skipLevel && this.state !== 'START' && this.state !== 'GAMEOVER') {
      input.skipLevel = false;
      this.nextStage();
      this.state = 'PLAYING';
      return;
    }

    if (this.state === 'START') return;

    if (this.state === 'GAMEOVER') {
      this.particles.forEach(p => p.update());
      this.particles = this.particles.filter(p => p.life > 0);
      return;
    }

    if (this.state === 'LAUNCHING') {
      this.launchEffectTimer++;
      this.feverIntensity = 2.0; // Max fever during launch

      // Multi-player dual gamepad haptic rumble support during takeoff
      if (this.launchEffectTimer % 10 === 0) {
         if (this.launchEffectTimer < 60) {
            input.rumble(1, 150, 0.4, 0.4);
            input.rumble(2, 150, 0.4, 0.4);
         } else {
            input.rumble(1, 150, 1.0, 1.0);
            input.rumble(2, 150, 1.0, 1.0);
         }
      }
      
      // Dramatic slow ease before snapping
      if (this.launchEffectTimer < 60) {
         this.screenPulse = 0.5;
         this.rocket.launchY -= 0.5; // low rumble
         if (this.launchEffectTimer % 10 === 0) {
            this.particles.push(new Particle(this.rocketBaseX + 15, this.rocket.launchY + 50, NEON_COLORS.CYAN, undefined, undefined, false, 'ring'));
            audio.playExplosion();
         }
      } else {
         this.screenPulse = 1.0;
         this.rocket.launchY -= 12; // explosive takeoff
      }
      
      this.particles.push(new Particle(this.rocketBaseX + 15 + (Math.random() - 0.5)*10, this.rocket.launchY + 80, this.visualThemeConfig.particleA, 3, undefined, true));
      this.particles.push(new Particle(this.rocketBaseX + 15 + (Math.random() - 0.5)*20, this.rocket.launchY + 85, '#ffffff', 2, undefined, true));
      const launchProgress = Math.max(0, this.rocketBaseY - this.rocket.launchY);
      
      // Giant thruster particles
      for(let i=0; i < (this.launchEffectTimer < 60 ? 5 : 20); i++) {
        const spread = (Math.random() - 0.5) * 40;
        this.particles.push(new Particle(this.rocketBaseX + 15 + spread * 0.5, this.rocket.launchY + 50, NEON_COLORS.CYAN, Math.random() * 3 + 2, undefined, true));
        this.particles.push(new Particle(this.rocketBaseX + 15 + spread, this.rocket.launchY + 60, NEON_COLORS.MAGENTA, Math.random() * 4 + 1, undefined, true));
      }
      
      if (this.launchEffectTimer === 60) {
         this.screenPulse = 2.0;
         audio.playExplosion();
         for (let i=0; i<30; i++) {
            this.particles.push(new Particle(this.rocketBaseX + 15, this.rocketBaseY, NEON_COLORS.CYAN, 4, undefined, false, 'shard'));
         }
      }
      
      this.particles.forEach(p => p.update());
      this.particles = this.particles.filter(p => p.life > 0);
      
      if (launchProgress < 50) {
        this.score += 10; // Launch points trickle
      }
      
      if (this.rocket.launchY < -300) {
        this.nextStage();
        return;
      }
      return;
    }

    // Update stage elements (crumbling platform states, moving platform movements, teleporter timers, etc.)
    this.stageElements.update(this.player, this.particles, this);
    
    // Refresh collision platforms list dynamically
    this.platforms = this.stageElements.getCollisionPlatforms(this.activeProfile.platformLayout);

    // Tick keys, gates, switches, and placements
    this.updateExpansionElements();
    this.updateObjectives();

    // Append blocking gates dynamically to physical platforms list
    this.runtimeGates.forEach(g => {
       if (g.enabled && !g.open) {
          if (g.props?.blocksPlayer !== false) {
             this.platforms.push([g.x, g.y, g.w, g.h] as any);
          }
       }
    });

    // Run environmental checks and call player.update internally for each player
    this.players.forEach(p => {
      this.stageElements.applyEnvironmentalForces(p, this.items, this.enemies, this.particles, this);
      if (p.carryingItem) {
        p.carryingItem.pos.x = p.pos.x;
        p.carryingItem.pos.y = p.pos.y - 20;
      }
    });

    // Player vs Player physical collision & elastic bounce protocol (in 2-Player simultaneous modes)
    if (this.players.length === 2) {
      const p1 = this.players[0];
      const p2 = this.players[1];
      if (p1 && p2 && !p1.dead && !p1.isOut && !p2.dead && !p2.isOut) {
        // Core bounding overlaps check (with tolerance margins)
        if (
          p1.pos.x + p1.width > p2.pos.x &&
          p1.pos.x < p2.pos.x + p2.width &&
          p1.pos.y + p1.height > p2.pos.y &&
          p1.pos.y < p2.pos.y + p2.height
        ) {
          // Centroids of both players
          const c1x = p1.pos.x + p1.width / 2;
          const c1y = p1.pos.y + p1.height / 2;
          const c2x = p2.pos.x + p2.width / 2;
          const c2y = p2.pos.y + p2.height / 2;
          
          let dx = c2x - c1x;
          let dy = c2y - c1y;
          
          // Account for Screen Wrapping when determining shortest separation distance
          if (Math.abs(dx) > GAME_WIDTH / 2) {
            dx = dx > 0 ? dx - GAME_WIDTH : dx + GAME_WIDTH;
          }

          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push them apart slightly to instantly resolve penetration block
          const overlapX = (p1.width / 2 + p2.width / 2) - Math.abs(dx);
          const overlapY = (p1.height / 2 + p2.height / 2) - Math.abs(dy);
          
          if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
              const pushForceX = (overlapX / 2) + 1.5;
              p1.pos.x -= nx * pushForceX;
              p2.pos.x += nx * pushForceX;
              // Boundary wrapping safety check
              if (p1.pos.x < -p1.width) p1.pos.x = GAME_WIDTH;
              if (p1.pos.x > GAME_WIDTH) p1.pos.x = -p1.width;
              if (p2.pos.x < -p2.width) p2.pos.x = GAME_WIDTH;
              if (p2.pos.x > GAME_WIDTH) p2.pos.x = -p2.width;
            } else {
              const pushForceY = (overlapY / 2) + 1.5;
              p1.pos.y -= ny * pushForceY;
              p2.pos.y += ny * pushForceY;
              // Guard Y bounds
              if (p1.pos.y < 0) p1.pos.y = 0;
              if (p2.pos.y < 0) p2.pos.y = 0;
            }
          }

          // Apply bouncy impulse velocities in opposite directions (Elastic Coefficient = 4.8)
          const bounceImpulse = 4.8;
          p1.vel.x = -nx * bounceImpulse;
          p1.vel.y = -ny * bounceImpulse - 0.8; // subtle uplift
          
          p2.vel.x = nx * bounceImpulse;
          p2.vel.y = ny * bounceImpulse - 0.8; // subtle uplift

          // Trigger elastic retro sound chimes
          audio.playDrop();

          // Spawn gorgeous pink-magenta-cyan particle splash on contact line
          const midX = (c1x + c2x) / 2;
          const midY = (c1y + c2y) / 2;
          const bounceColors = ['#ff00ff', '#00ffff', '#10b981', '#ffffff'];
          for (let pcount = 0; pcount < 15; pcount++) {
            const chosenColor = bounceColors[pcount % bounceColors.length];
            const p = new Particle(midX + (Math.random() - 0.5) * 16, midY + (Math.random() - 0.5) * 16, chosenColor, 1.8, undefined, true);
            p.vel.x = (Math.random() - 0.5) * 5;
            p.vel.y = (Math.random() - 0.5) * 5;
            this.particles.push(p);
          }
        }
      }
    }

    this.items.forEach(i => i.update(this.platforms, { x: this.rocketBaseX, y: this.rocketBaseY }, this.rocket.isComplete()));
    this.items = this.items.filter(i => !i.collected && (i.type !== 'valuable' || i.life > 0));

    // Powerups timer
    this.activePowerups.forEach(p => p.timer--);
    this.activePowerups = this.activePowerups.filter(p => p.timer > 0);
    
    // Clear globals if powerup ended
    if (!this.activePowerups.find(p => p.type === 'rocket_magnet')) (window as any).__magnetActive = false;
    if (!this.activePowerups.find(p => p.type === 'tri_shot')) (window as any).__triShotActive = false;
    if (!this.activePowerups.find(p => p.type === 'gravity_clamp')) (window as any).__gravityClampActive = false;

    // Occasional valuable or powerup spawn
    if (this.gameMode === 'CLASSIC' && Math.random() < 0.002) {
      if (this.items.filter(i => i.type === 'valuable').length < 2) {
        this.spawnItem('valuable', Math.floor(Math.random() * 4));
      }
    } else if (this.gameMode === 'STANDARD' && Math.random() < 0.0015) { // 0.15% chance per frame (~every 10-12s)
      const powerups = (this.activeProfile?.powerupSet || ['tri_shot', 'shield', 'rocket_magnet', 'rift_bomb']).filter(p => p !== 'gravity_clamp');
      if (this.items.filter(i => i.type === 'powerup').length < 2 && powerups.length > 0) {
        this.spawnItem('powerup', powerups[Math.floor(Math.random() * powerups.length)]);
      }
    }
    
    // spawn enemies
    this.enemyTimer++;
    const spawnRate = Math.max(30, 120 / (this.activeProfile?.spawnRateMultiplier || 1));
    
    // Check if we have an active encounter block
    if (this.gameMode === 'STANDARD' && this.activeProfile?.encounterPattern) {
      if (this.enemyTimer > spawnRate && this.enemies.filter(e => !e.dead).length < 5 + this.stage) {
         this.enemyTimer = 0;
         const pattern = this.activeProfile.encounterPattern;
         if (pattern === 'meteor_shower') {
            this.spawnEnemy('split_meteor');
            if (Math.random() < 0.5) { this.spawnEnemy('meteor'); }
         } else if (pattern === 'saucer_ring') {
            this.spawnEnemy('saucer', Math.random() < 0.5 ? -40 : GAME_WIDTH + 40, 50 + Math.random() * 100);
            if (Math.random() < 0.3) this.spawnEnemy('laser_saucer', -40, 60);
         } else if (pattern === 'blob_swarm') {
            this.spawnEnemy('classic_blob');
            this.spawnEnemy('classic_blob');
         } else if (pattern === 'sabotage_pressure') {
            this.spawnEnemy('saboteur');
            if (Math.random() < 0.3) this.spawnEnemy('mine_layer');
         } else {
            // Random from set
            const types = this.activeProfile.enemySet;
            if (types && types.length > 0) {
               const typeName = types[Math.floor(Math.random() * types.length)];
               this.spawnEnemy(typeName);
            }
         }
      }
    } else {
      if (this.enemyTimer > spawnRate && this.enemies.filter(e => !e.dead).length < 6 + this.stage) {
        this.enemyTimer = 0;
        if (this.gameMode === 'CLASSIC') {
          this.spawnEnemy(this.getClassicEnemyType());
        } else {
          const types = this.activeProfile?.enemySet || ["meteor"];
          if (types.length > 0) {
            const typeName = types[Math.floor(Math.random() * types.length)];
            this.spawnEnemy(typeName);
          }
        }
      }
    }

    this.enemies.forEach(e => e.update(this.player, this.platforms, this.items, { x: this.rocketBaseX, y: this.rocketBaseY }));
    this.enemies = this.enemies.filter(e => !e.dead);
    
    if (this.activeBoss) {
       this.activeBoss.update(this);
       if (this.activeBoss.dead) {
          this.bossDefeatedState = true;
          this.activeBoss = null;
       }
    }
    
    this.bullets.forEach(b => b.update());
    this.bullets = this.bullets.filter(b => b.life > 0);

    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => p.life > 0);

    this.checkCollisions();
  }

  areStageObjectivesComplete(): boolean {
    const mode = this.objectiveState?.mode;
    if (!mode || mode === 'launch') {
      return (this.activeProfile.requiresBuild ? this.rocket.isComplete() : true) && 
             ((this.activeProfile.fuelRequired || 0) > 0 ? this.rocket.isFueled() : true);
    }
    if (mode === 'boss') {
      const bossDead = (this.activeBoss !== null && this.activeBoss.dead) || this.bossDefeatedState;
      if (this.activeProfile.bossId === 'rainbow_unicorn' || this.activeProfile.bossId === 'acid_kiwi') {
         return bossDead && this.rocket.isFueled();
      }
      return bossDead;
    }
    
    // Evaluate based on the active mode (or hybrid combination of any active entities)
    if (mode === 'rescue') {
      return this.objectiveState.rescuesCompleted >= this.objectiveState.rescuesRequired;
    }
    if (mode === 'escort') {
      const activeEscorts = this.objectiveState.escortEntities.filter(e => e.enabled);
      if (activeEscorts.length === 0) return true;
      return activeEscorts.every(e => e.completed) && !this.objectiveState.escortFailed;
    }
    if (mode === 'reactor') {
      return this.objectiveState.reactorComplete;
    }
    if (mode === 'artifact') {
      return this.objectiveState.artifactsCollected >= this.objectiveState.artifactsRequired;
    }
    if (mode === 'survival') {
      return this.objectiveState.survivalComplete;
    }
    if (mode === 'rush') {
      // Normal launch check
      return (this.activeProfile.requiresBuild ? this.rocket.isComplete() : true) && 
             ((this.activeProfile.fuelRequired || 0) > 0 ? this.rocket.isFueled() : true) &&
             !this.objectiveState.rushFailed;
    }
    if (mode === 'hybrid') {
      // Check all active non-empty conditions
      let pass = true;
      if (this.objectiveState.rescueEntities.length > 0) {
        pass = pass && (this.objectiveState.rescuesCompleted >= this.objectiveState.rescuesRequired);
      }
      if (this.objectiveState.escortEntities.length > 0) {
        const activeEscorts = this.objectiveState.escortEntities.filter(e => e.enabled);
        if (activeEscorts.length > 0) {
          pass = pass && activeEscorts.every(e => e.completed) && !this.objectiveState.escortFailed;
        }
      }
      if (this.objectiveState.reactorSwitches.length > 0) {
        pass = pass && this.objectiveState.reactorComplete;
      }
      if (this.objectiveState.artifacts.length > 0) {
        pass = pass && (this.objectiveState.artifactsCollected >= this.objectiveState.artifactsRequired);
      }
      if (this.objectiveState.survivalTimer > 0) {
        pass = pass && this.objectiveState.survivalComplete;
      }
      return pass;
    }
    return true;
  }

  isRocketLaunchAllowed(): boolean {
    if (this.player.dead || this.missionFailed) return false;
    const bossAlive = this.activeBoss !== null && !this.activeBoss.dead;
    if (bossAlive) return false;
    return this.areStageObjectivesComplete();
  }

  handleMissionFailure(reason: string) {
    if (this.missionFailed) return;
    this.missionFailed = true;
    this.missionFailReason = reason;
    this.state = 'GAMEOVER';
    audio.playGameOver();
    
    // De-render/clear any carry indicators
    this.player.carryingRescue = null;
    this.player.carryingArtifact = null;

    const summary: StageTestSummary = {
      result: 'failed',
      score: this.score,
      fuelDelivered: this.rocket.fuelLevel,
      partsAssembled: this.rocket.partsAssembled,
      bossDefeated: this.activeBoss ? this.activeBoss.dead : false,
      timeSurvived: Math.floor((Date.now() - this.stageStartTime) / 1000 * 60),
      enemiesKilled: this.enemiesKilledThisStage
    };

    this.testSummary = summary;
    if ((this.playMode === 'editorTest' || this.playMode === 'handcrafted') && this.options?.onStageComplete) {
      this.options.onStageComplete(summary);
    }
  }

  updateObjectives() {
    if (this.state !== 'PLAYING' || this.missionFailed) return;

    const rules = this.activeProfile.objectiveRules || normalizeObjectiveRules(this.activeProfile.objectiveRules, this.activeProfile);

    // 1. Rush Timer Check
    if (rules.mode === 'rush' || rules.rush?.failOnTimeout) {
      if (this.objectiveState.rushTimer > 0) {
        this.objectiveState.rushTimer--;
        if (this.objectiveState.rushTimer === rules.rush?.warningFrames) {
          // Play warning audio or effect
          audio.playExplosion(); 
        }
        if (this.objectiveState.rushTimer <= 0) {
          this.objectiveState.rushFailed = true;
          this.handleMissionFailure("RUSH TIMER LIMIT EXCEEDED");
          return;
        }
      }
    }

    // 2. Survival Timer Check
    if (rules.mode === 'survival' || this.objectiveState.mode === 'survival') {
      if (this.objectiveState.survivalTimer > 0) {
        this.objectiveState.survivalTimer--;
        // Spawn extra enemies based on intensity
        if (Math.random() < 0.01 * (rules.survival?.spawnIntensityMultiplier || 1.2)) {
          const types = this.activeProfile.enemySet || ["meteor"];
          if (types.length > 0) {
            this.spawnEnemy(types[Math.floor(Math.random() * types.length)]);
          }
        }
        if (this.objectiveState.survivalTimer <= 0) {
          this.objectiveState.survivalComplete = true;
          // Survival finished! If automatic launch trigger is true, start take-off
          if (rules.survival?.launchAfterSurvival === false) {
             // Unlock pad, let player board manually
             this.objectiveState.launchUnlocked = true;
          } else {
             // Auto boarding
             this.player.dead = true;
             this.rocket.launching = true;
             this.state = 'LAUNCHING';
             audio.playLaunch();
             return;
          }
        }
      }
    }

    // 3. Rescue Entities Ticking (Astronauts, etc.)
    const playerX = this.player.pos.x;
    const playerY = this.player.pos.y;

    for (const r of this.objectiveState.rescueEntities) {
      if (!r.enabled) continue;

      r.bubbleAnimTimer = (r.bubbleAnimTimer || 0) + 1;

      // Handle gravity/wind if not carried
      if (!r.carried) {
        // Astronaut can walk or float gently
        if (r.props?.canWalk) {
          r.x += Math.sin(this.frameCount * 0.02) * 0.5;
        } else {
          r.y += Math.sin(this.frameCount * 0.04) * 0.2; // Float
        }

        // Clip to game bounds
        if (r.x < 10) r.x = GAME_WIDTH - 20;
        if (r.x > GAME_WIDTH - 10) r.x = 10;
        if (r.y < 0) r.y = GAME_HEIGHT - 30;
        if (r.y > GAME_HEIGHT - 30) r.y = GAME_HEIGHT - 30;

        // Player pick up check
        if (!this.player.carryingRescue && !this.player.dead) {
          const dx = r.x - playerX;
          const dy = r.y - playerY;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 25) {
            r.carried = true;
            this.player.carryingRescue = r;
            audio.playPickup();
            for (let i = 0; i < 15; i++) {
              this.particles.push(new Particle(r.x, r.y, NEON_COLORS.GREEN, 1.5));
            }
          }
        }
      } else {
        // Carried by player
        r.x = playerX;
        r.y = playerY - 18;

        // Check drop-off zone or rocket pad (default)
        let isAtDropoff = false;
        const targetZoneId = rules.rescue?.rescueTargetZoneId;
        
        if (targetZoneId) {
          // Check if player is within specific dropoff zone
          const zoneObj = (this.activeProfile.objectiveZones || []).find(z => z.id === targetZoneId);
          if (zoneObj && playerX >= zoneObj.x && playerX <= zoneObj.x + zoneObj.w &&
              playerY >= zoneObj.y && playerY <= zoneObj.y + zoneObj.h) {
            isAtDropoff = true;
          }
        } else {
          // Default rocket pad area
          const dxRocket = playerX - (this.rocketBaseX + 15);
          if (Math.abs(dxRocket) < 40 && Math.abs(playerY - this.rocketBaseY) < 60) {
            isAtDropoff = true;
          }
          // Or any zone of kind "rescueDropoff"
          const dropZones = (this.activeProfile.objectiveZones || []).filter(z => z.kind === 'rescueDropoff');
          for (const zoneObj of dropZones) {
            if (playerX >= zoneObj.x && playerX <= zoneObj.x + zoneObj.w &&
                playerY >= zoneObj.y && playerY <= zoneObj.y + zoneObj.h) {
              isAtDropoff = true;
            }
          }
        }

        if (isAtDropoff) {
          // Secured!
          r.carried = false;
          r.enabled = false;
          this.player.carryingRescue = null;
          this.objectiveState.rescuesCompleted++;
          this.score += r.props?.value || 500;
          audio.playPowerup();
          for (let i = 0; i < 25; i++) {
            this.particles.push(new Particle(playerX, playerY, '#ffffff', 2, 'R'));
          }
        }
      }
    }

    // 4. Escort Entities Ticking
    for (const e of this.objectiveState.escortEntities) {
      if (!e.enabled || e.completed) continue;

      if (e.damagedFlashTimer > 0) e.damagedFlashTimer--;

      // Escorts check movement logic
      if (!e.carried) {
        if (e.followPlayer && !this.player.dead) {
          const dx = playerX - e.x;
          const dy = playerY - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < (rules.escort?.escortFollowDistance || 150)) {
            // Approach player
            e.velX = (dx / dist) * e.speed;
            e.velY = (dy / dist) * e.speed;
          } else {
            // Soft drift
            e.velX *= 0.95;
            e.velY *= 0.95;
          }
        } else {
          // Float/drift
          e.velX = Math.sin(this.frameCount * 0.012) * e.speed;
        }

        e.x += e.velX;
        e.y += e.velY;

        // Clip constraints
        if (e.x < 10) e.x = GAME_WIDTH - 20;
        if (e.x > GAME_WIDTH - 10) e.x = 10;
        if (e.y < 20) e.y = 20;
        if (e.y > GAME_HEIGHT - 35) e.y = GAME_HEIGHT - 35;

        // Carry check if allowed
        if (e.canBeCarried && !this.player.carryingRescue && !this.player.dead) {
          const dx = e.x - playerX;
          const dy = e.y - playerY;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 25) {
            e.carried = true;
            this.player.carryingRescue = e as any; // treat carried escort as holding slot
            audio.playPickup();
          }
        }
      } else {
        // Carried
        e.x = playerX;
        e.y = playerY - 18;
      }

      // Vulnerability to hazard zones inside check
      if (e.vulnerableToHazards) {
        for (const haz of this.activeProfile.hazards || []) {
          if (e.x >= haz.x && e.x <= haz.x + haz.w && e.y >= haz.y && e.y <= haz.y + haz.h) {
            if (e.damagedFlashTimer <= 0) {
              e.health--;
              e.damagedFlashTimer = 30; // 0.5s flash invuln
              audio.playExplosion();
              if (e.health <= 0) {
                e.enabled = false;
                if (e.carried) this.player.carryingRescue = null;
                if (rules.escort?.failOnEscortDeath) {
                  this.objectiveState.escortFailed = true;
                  this.handleMissionFailure("ESCORT TARGET WAS DESTROYED");
                  return;
                }
              }
            }
          }
        }
      }

      // Vulnerability to enemies
      if (e.vulnerableToEnemies) {
        for (const enemy of this.enemies) {
          if (!enemy.dead) {
            const dx = enemy.pos.x - e.x;
            const dy = enemy.pos.y - e.y;
            if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
              if (e.damagedFlashTimer <= 0) {
                e.health--;
                e.damagedFlashTimer = 30;
                audio.playExplosion();
                enemy.dead = true; // impact explodes enemy
                if (e.health <= 0) {
                  e.enabled = false;
                  if (e.carried) this.player.carryingRescue = null;
                  if (rules.escort?.failOnEscortDeath) {
                    this.objectiveState.escortFailed = true;
                    this.handleMissionFailure("ESCORT TARGET TOOK CRITICAL DAMAGE");
                    return;
                  }
                }
              }
            }
          }
        }
      }

      // Destination completion logic
      let atDest = false;
      const destId = e.destinationZoneId || rules.escort?.destinationZoneId;
      if (destId) {
        const zoneObj = (this.activeProfile.objectiveZones || []).find(z => z.id === destId);
        if (zoneObj && e.x >= zoneObj.x && e.x <= zoneObj.x + zoneObj.w &&
            e.y >= zoneObj.y && e.y <= zoneObj.y + zoneObj.h) {
          atDest = true;
        }
      } else {
        // Or reach the rocket pad
        const dxRocket = e.x - (this.rocketBaseX + 15);
        if (Math.abs(dxRocket) < 40 && Math.abs(e.y - this.rocketBaseY) < 60) {
          atDest = true;
        }
        // Or any endpoint zone of kind "escortDestination"
        const dropZones = (this.activeProfile.objectiveZones || []).filter(z => z.kind === 'escortDestination');
        for (const zoneObj of dropZones) {
          if (e.x >= zoneObj.x && e.x <= zoneObj.x + zoneObj.w &&
              e.y >= zoneObj.y && e.y <= zoneObj.y + zoneObj.h) {
            atDest = true;
          }
        }
      }

      if (atDest) {
        e.completed = true;
        e.carried = false;
        if (this.player.carryingRescue === (e as any)) {
          this.player.carryingRescue = null;
        }
        audio.playPowerup();
        for (let i = 0; i < 20; i++) {
          this.particles.push(new Particle(e.x, e.y, NEON_COLORS.CYAN, 2, '✔'));
        }
      }
    }

    // 5. Reactor Code System Ticking (Activation Switches)
    let activeCount = 0;
    const allSwitches = this.objectiveState.reactorSwitches;
    for (const sw of allSwitches) {
      if (!sw.enabled) continue;

      // Interaction check
      const insideTouch = Math.abs(playerX - sw.x) < 20 && Math.abs(playerY - sw.y) < 25;
      if (insideTouch && !sw.activated && !this.player.dead) {
        // Player stepped on reactor switch
        if (rules.reactor?.requireSequence) {
          const curIndex = this.objectiveState.reactorSequenceIndex;
          if (sw.orderIndex === curIndex) {
            // Correct order!
            sw.activated = true;
            this.objectiveState.reactorSequenceIndex++;
            audio.playPickup();
            for (let i = 0; i < 12; i++) {
              this.particles.push(new Particle(sw.x + sw.w/2, sw.y + sw.h/2, '#00ffcc', 1.5));
            }
          } else {
            // Wrong order! If resetOnWrongOrder is set, turn off all toggles
            audio.playExplosion();
            if (rules.reactor?.resetOnWrongOrder) {
              allSwitches.forEach(s => s.activated = false);
              this.objectiveState.reactorSequenceIndex = 0;
            }
          }
        } else {
          // Ordinary simple activation
          sw.activated = true;
          audio.playPickup();
          for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(sw.x + sw.w/2, sw.y + sw.h/2, '#00ffcc', 1.5));
          }
        }
      }

      if (sw.activated) activeCount++;
    }

    this.objectiveState.reactorActivatedCount = activeCount;
    // Check if total matches target threshold
    const requiredSwitches = rules.reactor?.requiredSwitches ?? allSwitches.length;
    if (activeCount >= requiredSwitches && !this.objectiveState.reactorComplete) {
      this.objectiveState.reactorComplete = true;
      audio.playPowerup();
    }

    // 6. Artifact Hunter Ticking
    for (const a of this.objectiveState.artifacts) {
      if (!a.enabled || a.collected) continue;

      // Handle float forces and winds
      if (!a.carried) {
        // Standard item physics drift
        if (a.props?.affectedByGravity) {
          a.velY += 0.08; // small gravity sink
        }
        
        a.x += a.velX;
        a.y += a.velY;
        
        // Dampen
        a.velX *= 0.98;
        a.velY *= 0.98;

        // Clip constraints
        if (a.x < 10) a.x = GAME_WIDTH - 20;
        if (a.x > GAME_WIDTH - 10) a.x = 10;
        if (a.y < 20) a.y = 20;
        if (a.y > GAME_HEIGHT - 35) {
          a.y = GAME_HEIGHT - 35;
          a.velY = 0;
        }

        // Stepped on/Collided with player check
        if (!this.player.dead) {
          const dx = a.x - playerX;
          const dy = a.y - playerY;
          if (Math.abs(dx) < 20 && Math.abs(dy) < 25) {
            if (rules.artifact?.artifactsCanBeCarried) {
              if (!this.player.carryingArtifact) {
                a.carried = true;
                this.player.carryingArtifact = a;
                audio.playPickup();
              }
            } else {
              // Direct immediate collection
              a.collected = true;
              a.enabled = false;
              this.objectiveState.artifactsCollected++;
              this.score += a.value || 250;
              audio.playPowerup();
              for (let i = 0; i < 15; i++) {
                this.particles.push(new Particle(a.x, a.y, NEON_COLORS.YELLOW, 2, '*'));
              }
            }
          }
        }
      } else {
        // Carried by player
        a.x = playerX;
        a.y = playerY - 14;

        // Carry Drop-off Check
        let isAtDrop = false;
        const targetZoneId = rules.artifact?.artifactTargetZoneId;
        if (targetZoneId) {
          const zoneObj = (this.activeProfile.objectiveZones || []).find(z => z.id === targetZoneId);
          if (zoneObj && playerX >= zoneObj.x && playerX <= zoneObj.x + zoneObj.w &&
              playerY >= zoneObj.y && playerY <= zoneObj.y + zoneObj.h) {
            isAtDrop = true;
          }
        } else {
          // Default rocket pad area
          const dxRocket = playerX - (this.rocketBaseX + 15);
          if (Math.abs(dxRocket) < 40 && Math.abs(playerY - this.rocketBaseY) < 60) {
            isAtDrop = true;
          }
          // Or any zone of kind "artifactDropoff"
          const dropZones = (this.activeProfile.objectiveZones || []).filter(z => z.kind === 'artifactDropoff');
          for (const zoneObj of dropZones) {
            if (playerX >= zoneObj.x && playerX <= zoneObj.x + zoneObj.w &&
                playerY >= zoneObj.y && playerY <= zoneObj.y + zoneObj.h) {
              isAtDrop = true;
            }
          }
        }

        if (isAtDrop) {
          a.collected = true;
          a.carried = false;
          a.enabled = false;
          this.player.carryingArtifact = null;
          this.objectiveState.artifactsCollected++;
          this.score += a.value || 250;
          audio.playPowerup();
          for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(playerX, playerY, '#ffff00', 2, '★'));
          }
        }
      }
    }
  }

   updateExpansionElements() {
     // 1. Ticking Switches duration & cooldown
     this.runtimeSwitches.forEach(sw => {
        if (sw.cooldownLeft > 0) sw.cooldownLeft--;
        if (sw.durationLeft > 0) {
           sw.durationLeft--;
           if (sw.durationLeft === 0) {
              sw.active = false;
              this.toggleGatesForSwitch(sw.id, false);
           }
        }
     });

     // 2. Ticking timed doors/gates
     this.runtimeGates.forEach(g => {
        if (g.open && g.kind === 'timed' && g.openDurationFrames) {
           if (!g.props) g.props = {};
           if (g.props.openTimeLeft === undefined) {
              g.props.openTimeLeft = g.openDurationFrames;
           }
           g.props.openTimeLeft--;
           if (g.props.openTimeLeft <= 0) {
              g.open = false;
              g.props.openTimeLeft = undefined;
           }
        }
     });

     // 3. Spawning from Handcrafted EnemyPlacements
     this.runtimeEnemyPlacements.forEach(ep => {
        if (!ep.enabled) return;
        if (this.enemies.length < 18) {
           if (ep.lastSpawnTime === 0 || this.frameCount - ep.lastSpawnTime >= ep.spawnInterval) {
              ep.lastSpawnTime = this.frameCount;
              this.spawnEnemy(ep.type, ep.x, ep.y);
           }
        }
     });

     // 4. Special enemy drop triggers tick
     this.enemies.forEach(e => {
        if (e.shouldDropMine) {
           e.shouldDropMine = false;
           const mine = new Enemy('classic_asteroid', e.pos.x, e.pos.y + 15);
           mine.vel.x = 0; mine.vel.y = 1;
           this.enemies.push(mine);
        }
        if (e.shouldSpawnSpore) {
           e.shouldSpawnSpore = false;
           const spore = new Enemy('spore', e.pos.x, e.pos.y + 15);
           spore.vel.x = (Math.random() - 0.5) * 2;
           spore.vel.y = 1.5;
           this.enemies.push(spore);
        }
     });

     // 5. Check Player collision with Keys & Powerups
     if (!this.player.dead && !this.rocket.launching) {
        // Powerups pickup
        this.runtimePowerups.forEach(p => {
           if (p.enabled) {
              const dx = this.player.pos.x + this.player.width/2 - p.x;
              const dy = this.player.pos.y + this.player.height/2 - p.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 22) {
                 p.enabled = false;
                 audio.playPowerup();
                 this.score += 150;
                 
                 // Activate equipment
                 if (p.kind === 'gravityBoots') this.player.equipment.gravityBoots = true;
                  else if (p.kind === 'jetpack') {
                     for (const pl of this.players) {
                        const dx = pl.pos.x + pl.width/2 - p.x;
                        const dy = pl.pos.y + pl.height/2 - p.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < 40) {
                           pl.hasJetpack = true;
                           for (let k = 0; k < 25; k++) {
                              const angle = Math.random() * Math.PI * 2;
                              const speed = 1 + Math.random() * 2.5;
                              const pt = new Particle(p.x, p.y, '#fc22ff', 2.2, undefined, true);
                              pt.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
                              this.particles.push(pt);
                           }
                        }
                     }
                  }
                 else if (p.kind === 'heatShield') this.player.equipment.heatShield = true;
                 else if (p.kind === 'aquaHelmet') this.player.equipment.aquaHelmet = true;
                 else if (p.kind === 'rubberSuit') this.player.equipment.rubberSuit = true;
                 else if (p.kind === 'magnetBoots') this.player.equipment.magnetBoots = true;

                 // Spawn particles
                 const color = p.props?.glowColor || '#06b6d4';
                 for (let k = 0; k < 20; k++) {
                    this.particles.push(new Particle(p.x, p.y, color, 2));
                 }

                 if (p.respawn) {
                    setTimeout(() => {
                       p.enabled = true;
                    }, 12000);
                 }
              }
           }
        });

        // Keys pickup
        this.runtimeKeys.forEach(k => {
           if (k.enabled) {
              const dx = this.player.pos.x + this.player.width/2 - k.x;
              const dy = this.player.pos.y + this.player.height/2 - k.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 22) {
                 k.enabled = false;
                 audio.playPowerup();
                 this.score += 200;
                 
                 this.player.keysCollected.push(k.kind);

                 let color = '#ef4444';
                 if (k.kind === 'blueKey') color = '#3b82f6';
                 else if (k.kind === 'greenKey') color = '#10b981';
                 else if (k.kind === 'goldKey') color = '#fbbf24';
                 else if (k.kind === 'silverKey') color = '#94a3b8';

                 for (let idx = 0; idx < 15; idx++) {
                    this.particles.push(new Particle(k.x, k.y, color, 1.8));
                 }
              }
           }
        });

        // Switches trigger
        this.runtimeSwitches.forEach(sw => {
           if (sw.enabled && sw.cooldownLeft === 0) {
              const dx = this.player.pos.x + this.player.width/2 - sw.x;
              const dy = this.player.pos.y + this.player.height/2 - sw.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < sw.w/2 + 10) {
                 this.triggerSwitch(sw);
              }
           }
        });

        // Check Gate unlock with Keys
        this.runtimeGates.forEach(g => {
           if (g.enabled && !g.open && g.kind === 'locked' && g.requiredKeyKind) {
              const dx = this.player.pos.x + this.player.width/2 - (g.x + g.w/2);
              const dy = this.player.pos.y + this.player.height/2 - (g.y + g.h/2);
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < Math.max(g.w, g.h) + 15) {
                 const keyIdx = this.player.keysCollected.indexOf(g.requiredKeyKind);
                 if (keyIdx >= 0) {
                    g.open = true;
                    audio.playPowerup();
                    
                    if (g.closesAgain !== false) {
                       this.player.keysCollected.splice(keyIdx, 1);
                    }

                    for (let pc = 0; pc < 20; pc++) {
                       this.particles.push(new Particle(g.x + g.w/2, g.y + g.h/2, '#10b981', 1.5));
                    }
                 }
              }
           }
        });
     }
   }

   triggerSwitch(sw: any) {
      sw.active = true;
      sw.cooldownLeft = sw.cooldownFrames || 60;
      if (sw.durationFrames > 0) {
         sw.durationLeft = sw.durationFrames;
      }
      audio.playExplosion();
      
      this.toggleGatesForSwitch(sw.id, true);

      for (let idx = 0; idx < 10; idx++) {
         this.particles.push(new Particle(sw.x + sw.w/2, sw.y + sw.h/2, sw.props?.color || '#eab308', 1.5));
      }
   }

   toggleGatesForSwitch(switchId: string, open: boolean) {
      this.runtimeGates.forEach(g => {
         if (g.linkedSwitchIds && g.linkedSwitchIds.includes(switchId)) {
            g.open = open;
            for (let idx = 0; idx < 10; idx++) {
               this.particles.push(new Particle(g.x + g.w/2, g.y + g.h/2, g.props?.color || '#38bdf8', 1));
            }
         }
      });
   }

   drawExpansionElements(ctx: CanvasRenderingContext2D) {
     const theme = this.visualThemeConfig;
     // 1. Draw Gates
     this.runtimeGates.forEach(g => {
        if (!g.enabled) return;
        ctx.save();
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        const glowColor = g.props?.color || (g.kind === 'locked' ? '#ef4444' : g.kind === 'oneWay' ? '#f59e0b' : '#06b6d4');
        ctx.shadowBlur = g.open ? 3 : 15;
        ctx.shadowColor = glowColor;

        if (g.open) {
           ctx.strokeStyle = `${glowColor}33`;
           ctx.fillStyle = `${glowColor}05`;
           ctx.fillRect(g.x, g.y, g.w, g.h);
           ctx.strokeRect(g.x, g.y, g.w, g.h);
           
           ctx.strokeStyle = `${glowColor}66`;
           ctx.setLineDash([4, 6]);
           ctx.beginPath();
           if (g.w > g.h) {
              ctx.moveTo(g.x, g.y + g.h/2);
              ctx.lineTo(g.x + g.w, g.y + g.h/2);
           } else {
              ctx.moveTo(g.x + g.w/2, g.y);
              ctx.lineTo(g.x + g.w/2, g.y + g.h);
           }
           ctx.stroke();
        } else {
           ctx.strokeStyle = glowColor;
           ctx.fillStyle = `${glowColor}15`;
           ctx.fillRect(g.x, g.y, g.w, g.h);
           ctx.strokeRect(g.x, g.y, g.w, g.h);

           const isVert = g.h > g.w;
           ctx.beginPath();
           if (isVert) {
              const spacing = 6;
              for (let rx = g.x + spacing; rx < g.x + g.w; rx += spacing) {
                 ctx.moveTo(rx, g.y + 2);
                 ctx.lineTo(rx, g.y + g.h - 2);
              }
           } else {
              const spacing = 6;
              for (let ry = g.y + spacing; ry < g.y + g.h; ry += spacing) {
                 ctx.moveTo(g.x + 2, ry);
                 ctx.lineTo(g.x + g.w - 2, ry);
              }
           }
           ctx.stroke();

           if (g.kind === 'locked') {
              ctx.beginPath();
              ctx.fillStyle = '#050510';
              ctx.arc(g.x + g.w/2, g.y + g.h/2, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(g.x + g.w/2, g.y + g.h/2 - 2, 4, Math.PI, 0);
              ctx.stroke();
           }
        }
        ctx.restore();
     });

     // 2. Draw Switches
     this.runtimeSwitches.forEach(sw => {
        if (!sw.enabled) return;
        ctx.save();
        ctx.lineWidth = 2.5;

        const color = sw.active ? '#10b981' : (sw.props?.color || '#ef4444');
        ctx.shadowBlur = sw.active ? 15 : 6;
        ctx.shadowColor = color;

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#94a3b8';
        ctx.fillRect(sw.x, sw.y + sw.h - 6, sw.w, 6);
        ctx.strokeRect(sw.x, sw.y + sw.h - 6, sw.w, 6);

        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        const btnH = sw.active ? 2 : 5;
        ctx.fillRect(sw.x + 4, sw.y + sw.h - 6 - btnH, sw.w - 8, btnH);
        ctx.strokeRect(sw.x + 4, sw.y + sw.h - 6 - btnH, sw.w - 8, btnH);

        ctx.beginPath();
        ctx.arc(sw.x + sw.w/2, sw.y + sw.h/2, 2, 0, Math.PI*2);
        ctx.fillStyle = sw.active ? '#ffffff' : '#050510';
        ctx.fill();

        ctx.restore();
     });

     // 3. Draw Keys
     this.runtimeKeys.forEach(k => {
        if (!k.enabled) return;
        ctx.save();
        
        let color = '#ef4444';
        if (k.kind === 'blueKey') color = '#3b82f6';
        else if (k.kind === 'greenKey') color = '#10b981';
        else if (k.kind === 'goldKey') color = '#fbbf24';
        else if (k.kind === 'silverKey') color = '#94a3b8';

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = '#050510';
        ctx.lineWidth = 2.5;

        const bounceY = Math.sin(this.frameCount * 0.1 + k.x) * 3;
        ctx.translate(k.x, k.y + bounceY);

        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 10);
        ctx.lineTo(4, 10);
        ctx.moveTo(0, 6);
        ctx.lineTo(3, 6);
        ctx.stroke();

        ctx.restore();
     });

     // 4. Draw Powerups
     this.runtimePowerups.forEach(p => {
        if (!p.enabled) return;
        ctx.save();
        
        const bounceY = Math.sin(this.frameCount * 0.08 + p.x) * 4;
        ctx.translate(p.x, p.y + bounceY);

        const color = p.props?.glowColor || '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = 'PU';
        if (p.kind === 'gravityBoots') label = 'GB';
        else if (p.kind === 'heatShield') label = 'HS';
        else if (p.kind === 'aquaHelmet') label = 'AH';
        else if (p.kind === 'rubberSuit') label = 'RS';
        else if (p.kind === 'magnetBoots') label = 'MB';
         else if (p.kind === 'jetpack') label = 'JP';
        ctx.fillText(label, 0, 0);

        ctx.restore();
     });

     // 5. Draw Objective Zones
     (this.activeProfile.objectiveZones || []).forEach(z => {
        if (z.props?.visible === false) return;
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        
        const color = z.props?.color || (z.kind === 'rescueDropoff' ? '#22c55e' : z.kind === 'escortDestination' ? '#06b6d4' : z.kind === 'artifactDropoff' ? '#eab308' : '#38bdf8');
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = `${color}15`;
        
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(z.label || z.kind.toUpperCase(), z.x + z.w/2, z.y + 12);
        ctx.restore();
     });

     // 6. Draw Astronauts (Rescue Entities)
     this.objectiveState?.rescueEntities.forEach(r => {
        if (!r.enabled) return;
        ctx.save();
        ctx.translate(r.x, r.y);
        
        const bubbleOffset = Math.sin((r.bubbleAnimTimer || 0) * 0.05) * 2;
        
        // Glow back shadow
        ctx.shadowBlur = r.carried ? 15 : 10;
        ctx.shadowColor = '#22c55e';
        
        // Bubble helmet outline
        ctx.beginPath();
        ctx.ellipse(0, -10 + bubbleOffset, 8, 8, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        
        // Inner astronaut head
        ctx.beginPath();
        ctx.arc(0, -10 + bubbleOffset, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Visor gloss
        ctx.beginPath();
        ctx.arc(1.5, -11.5 + bubbleOffset, 1.5, 0, Math.PI*2);
        ctx.fillStyle = '#67e8f9';
        ctx.fill();

        // Spacesuit body
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#ffffff';
         ctx.lineWidth = 1;
         ctx.fillRect(-6, -2, 12, 12);
         ctx.strokeRect(-6, -2, 12, 12);

         // Little boots
         ctx.fillStyle = '#15803d';
         ctx.fillRect(-6, 10, 4, 3);
         ctx.fillRect(2, 10, 4, 3);
         
         // Floating Help text
         if (!r.carried) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = '6px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("HELP!", 0, -22 + bubbleOffset);
         }
         
         ctx.restore();
      });

      // 7. Draw Escorts (Repair Drones)
      this.objectiveState?.escortEntities.forEach(e => {
         if (!e.enabled || e.completed) return;
         ctx.save();
         ctx.translate(e.x, e.y);

         const isFlash = e.damagedFlashTimer > 0 && Math.floor(this.frameCount / 4) % 2 === 0;
         const color = isFlash ? '#ffffff' : '#ec4899';
         
         ctx.shadowBlur = 12;
         ctx.shadowColor = color;
         ctx.strokeStyle = color;
         ctx.lineWidth = 2;

         // Propeller spin visualization
         const propellerSize = 10 + Math.sin(this.frameCount * 0.4) * 4;
         ctx.beginPath();
         ctx.moveTo(-12, -8);
         ctx.lineTo(-12 + propellerSize, -8);
         ctx.moveTo(12, -8);
         ctx.lineTo(12 - propellerSize, -8);
         ctx.strokeStyle = '#38bdf8';
         ctx.stroke();

         // Drone main chassis block
         ctx.fillStyle = '#0f172a';
         ctx.strokeStyle = color;
         ctx.beginPath();
         ctx.arc(0, 0, 9, 0, Math.PI*2);
         ctx.fill();
         ctx.stroke();

         // Drone eye/visor
         ctx.fillStyle = '#06b6d4';
         ctx.fillRect(-4, -2, 8, 3);

         // Helper antennas
         ctx.beginPath();
         ctx.moveTo(-6, -6);
         ctx.lineTo(-10, -12);
         ctx.moveTo(6, -6);
         ctx.lineTo(10, -12);
         ctx.stroke();

         // Health bars rendering
         ctx.shadowBlur = 0;
         ctx.fillStyle = 'rgba(0,0,0,0.6)';
         ctx.fillRect(-12, 14, 24, 4);
         ctx.fillStyle = '#22c55e';
         const hpValue = e.health;
         const maxHp = e.maxHealth || 3;
         const hpWidth = (hpValue / maxHp) * 24;
         ctx.fillRect(-12, 14, Math.max(0, hpWidth), 4);
         ctx.strokeStyle = '#ffffff';
         ctx.lineWidth = 0.5;
         ctx.strokeRect(-12, 14, 24, 4);

         ctx.restore();
      });

      // 8. Draw Reactor Switches
      this.objectiveState?.reactorSwitches.forEach(sw => {
         if (!sw.enabled) return;
         ctx.save();
         ctx.translate(sw.x, sw.y);

         const color = sw.activated ? '#00ee99' : '#38bdf8';
         ctx.shadowBlur = sw.activated ? 15 : 8;
         ctx.shadowColor = color;
         ctx.strokeStyle = color;
         ctx.fillStyle = '#0f172a';
         ctx.lineWidth = 2;

         // Base plate
         ctx.fillRect(0, 0, sw.w, sw.h);
         ctx.strokeRect(0, 0, sw.w, sw.h);

         // Glowing indicator
         ctx.fillStyle = sw.activated ? '#ffffff' : '#1e293b';
         ctx.beginPath();
         ctx.arc(sw.w/2, sw.h/2 - 2, 4, 0, Math.PI*2);
         ctx.fill();
         ctx.stroke();

         // Order index caption or serial number
         ctx.fillStyle = color;
         ctx.font = 'bold 7px monospace';
         ctx.textAlign = 'center';
         ctx.shadowBlur = 0;
         ctx.fillText(`SW-${sw.orderIndex + 1}`, sw.w/2, sw.h - 3);

         ctx.restore();
      });

      // 9. Draw Crystals / Relics (Artifacts)
      this.objectiveState?.artifacts.forEach(a => {
         if (!a.enabled || a.collected) return;
         ctx.save();
         ctx.translate(a.x, a.y);

         const bounce = Math.sin(this.frameCount * 0.08 + a.x) * 3;
         const color = a.kind === 'crystal' ? '#fbbf24' : a.kind === 'dataCore' ? '#06b6d4' : a.kind === 'alienRelic' ? '#ec4899' : '#a855f7';
         
         ctx.shadowBlur = 12;
         ctx.shadowColor = color;
         ctx.strokeStyle = color;
         ctx.fillStyle = `${color}44`;
         ctx.lineWidth = 2;

         // Octagon or Crystal shape
         ctx.beginPath();
         ctx.moveTo(0, -9 + bounce);
         ctx.lineTo(6, -3 + bounce);
         ctx.lineTo(6, 3 + bounce);
         ctx.lineTo(0, 9 + bounce);
         ctx.lineTo(-6, 3 + bounce);
         ctx.lineTo(-6, -3 + bounce);
         ctx.closePath();
         ctx.fill();
         ctx.stroke();

         // Core shining center
         ctx.fillStyle = '#ffffff';
         ctx.beginPath();
         ctx.arc(0, bounce, 2, 0, Math.PI*2);
         ctx.fill();

         ctx.restore();
      });
   }

   drawPsychedelicBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.visualThemeConfig;
    const t = this.visualTime;
    
    // Deep void base
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, theme.bgPrimary);
    grad.addColorStop(1, theme.bgSecondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Layered Nebula fields
    const cx1 = GAME_WIDTH / 2 + Math.sin(t * 0.05) * 150;
    const cy1 = GAME_HEIGHT / 2 + Math.cos(t * 0.03) * 100;
    const neb1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, GAME_WIDTH * 0.8);
    neb1.addColorStop(0, `${theme.bgAccent}${(theme.nebulaIntensity * 40).toString(16).padStart(2, '0')}`);
    neb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Wormhole / Rift rings for intense stages
    if (this.feverIntensity > 0.6) {
      ctx.save();
      ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.globalAlpha = (this.feverIntensity - 0.6) * 0.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, GAME_WIDTH * 0.4 + i*50 + Math.sin(t*0.1)*20, GAME_HEIGHT * 0.4 + i*30 + Math.cos(t*0.15)*20, t * 0.02 * i, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? theme.particleA : theme.boss;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Grid / Horizon suggestion
    ctx.save();
    ctx.globalAlpha = theme.gridIntensity * 0.15 * this.feverIntensity;
    ctx.strokeStyle = theme.platform;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      ctx.moveTo(x, GAME_HEIGHT - 100);
      ctx.lineTo(x + (x - GAME_WIDTH/2) * 0.5, GAME_HEIGHT);
    }
    for (let y = GAME_HEIGHT - 100; y <= GAME_HEIGHT; y += 20) {
      const offset = (y - (GAME_HEIGHT - 100)) / 100;
      ctx.moveTo(GAME_WIDTH/2 - offset * GAME_WIDTH/2, y);
      ctx.lineTo(GAME_WIDTH/2 + offset * GAME_WIDTH/2, y);
    }
    ctx.stroke();
    ctx.restore();

    // Starfield Call
    const warpAmount = this.state === 'LAUNCHING' ? this.launchEffectTimer / 60 : 0;
    this.starfield.draw(ctx, GAME_WIDTH, GAME_HEIGHT, {
       theme: theme,
       feverIntensity: this.feverIntensity,
       warpAmount: Math.min(warpAmount, 1.5),
       backdropTheme: this.activeProfile?.backdropTheme,
       skyPalette: this.activeProfile?.skyPalette,
       weatherEffect: this.activeProfile?.weatherEffect,
       backdropSettings: this.activeProfile?.backdropSettings,
       stageId: this.stage,
       shakeAmount: this.state === 'LAUNCHING' ? Math.min(10, this.launchEffectTimer * 0.1) : 0,
       screenPulse: this.screenPulse
    });
    
    // Full screen pulse
    if (this.screenPulse > 0) {
       ctx.fillStyle = `rgba(255, 255, 255, ${this.screenPulse * 0.3})`;
       if (this.activeBoss && (this.activeBoss as any).state === 'warning') {
          ctx.fillStyle = `rgba(255, 0, 50, ${this.screenPulse * 0.4})`;
       }
       ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    ctx.globalAlpha = 1.0;
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    
    let shake = 0;
    if (this.state === 'LAUNCHING') {
       shake = Math.min(10, this.launchEffectTimer * 0.1);
    } else if (this.riftBombShake > 0) {
       shake = this.riftBombShake * 0.4;
    }
    
    if (shake > 0) {
       const shakeX = (Math.random() - 0.5) * shake;
       const shakeY = (Math.random() - 0.5) * shake;
       ctx.translate(shakeX, shakeY);
    }
    
    this.drawPsychedelicBackground(ctx);

    // Draw platforms with AAA thickness and depth
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const theme = this.visualThemeConfig;
    const t = this.visualTime;

    for (const p of this.platforms) {
      const isBossType = this.activeBoss && p[1] > 400; // rough heuristic matching bottom platform often boss hazard

      // Platform dark fill core
      ctx.fillStyle = theme.platformCore;
      ctx.beginPath();
      ctx.rect(p[0], p[1], p[2], p[3] + 5);
      ctx.fill();

      // Inner grid / circuitry
      ctx.beginPath();
      const step = p[2] < 100 ? 10 : 20;
      for(let x = step/2; x < p[2]; x+=step) {
          ctx.moveTo(p[0] + x, p[1] + 2);
          ctx.lineTo(p[0] + x, p[1] + p[3] + 3);
      }
      ctx.strokeStyle = isBossType ? theme.hazard : theme.particleA;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 0.1 + p[0]);
      ctx.lineWidth = p[2] > 200 ? 2 : 1;
      ctx.stroke();
      
      // Top glowing rim
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 15;
      const pc = isBossType ? theme.hazard : theme.platform;
      ctx.shadowColor = pc;
      ctx.strokeStyle = pc;
      ctx.lineWidth = p[3] < 12 ? 2 : 4;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + p[2], p[1]);
      ctx.stroke();
      
      // Top white hot core
      ctx.shadowBlur = Math.random() < this.feverIntensity * 0.5 ? 5 : 0;
      ctx.shadowColor = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Energy nodes / ticks along platform
      ctx.fillStyle = pc;
      for(let x = step; x < p[2]; x+=step*2) {
          ctx.fillRect(p[0] + x - 1, p[1] + (p[3] + 5)/2 - 1, 2, 2);
      }

      // Bottom rim
      ctx.shadowBlur = 5;
      ctx.shadowColor = pc;
      ctx.strokeStyle = pc;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.2 * Math.cos(t * 0.05 + p[1]);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] + p[3] + 5);
      ctx.lineTo(p[0] + p[2], p[1] + p[3] + 5);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      
      // Player landing sparks (heuristic)
      if (!this.player.dead && Math.abs((this.player.pos.y + 20) - p[1]) < 2 && this.player.pos.x > p[0] && this.player.pos.x < p[0] + p[2]) {
         ctx.fillStyle = '#ffffff';
         ctx.fillRect(this.player.pos.x - 5, p[1], 10, 2);
         if (Math.random() < 0.2) {
            this.particles.push(new Particle(this.player.pos.x + (Math.random()-0.5)*10, p[1], theme.text, 1));
         }
      }
    }
    ctx.restore();

    // Render special platform highlights, hazards, wind zones, gravity zones, fans, teleporters, and moving platforms
    this.stageElements.draw(ctx, this.visualThemeConfig);

    this.rocket.draw(ctx);
    
    this.items.forEach(i => i.draw(ctx));
    this.drawExpansionElements(ctx);
    // Enemies drawn slightly below bullets for viz hierarchy
    this.enemies.forEach(e => e.draw(ctx));
    if (this.activeBoss) this.activeBoss.draw(ctx);
    
    if (this.state !== 'LAUNCHING') {
      this.players.forEach(p => {
        if (!p.dead && !p.isOut) {
          p.draw(ctx);
        }
      });

      const shieldPowerup = this.activePowerups.find(pr => pr.type === 'shield');
      if (shieldPowerup) {
         let drawShield = true;
         // flicker model in the last 2 seconds (120 frames)
         if (shieldPowerup.timer < 120) {
            drawShield = Math.floor(shieldPowerup.timer / 4) % 2 === 0;
         }
         
         if (drawShield) {
            this.players.forEach(p => {
               if (!p.dead && !p.isOut) {
                  ctx.save();
                  
                  const cx = p.pos.x + p.width / 2;
                  const cy = p.pos.y + p.height / 2;
                  const r = Math.max(p.width, p.height) * 0.95 + Math.sin(Date.now() * 0.01) * 2;
                  
                  // Setup glowing neon shield context
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = '#00ffff';
                  
                  // Radial blue/cyan energy field
                  const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
                  grad.addColorStop(0, 'rgba(6, 182, 212, 0.02)');
                  grad.addColorStop(0.75, 'rgba(6, 182, 212, 0.12)');
                  grad.addColorStop(1, 'rgba(6, 182, 212, 0.65)');
                  
                  ctx.fillStyle = grad;
                  ctx.strokeStyle = '#00ffff';
                  ctx.lineWidth = 1.8;
                  
                  ctx.beginPath();
                  ctx.arc(cx, cy, r, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                  
                  // Draw two energetic rotating tech dashes around orbit
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                  ctx.lineWidth = 2.0;
                  const angle = (Date.now() * 0.004) % (Math.PI * 2);
                  
                  ctx.beginPath();
                  ctx.arc(cx, cy, r + 0.5, angle, angle + 0.45);
                  ctx.stroke();
                  
                  ctx.beginPath();
                  ctx.arc(cx, cy, r + 0.5, angle + Math.PI, angle + Math.PI + 0.45);
                  ctx.stroke();
                  
                  ctx.restore();
               }
            });
         }
      }
    }
    
    // Bullets and particles on top
    this.bullets.forEach(b => b.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));

    // Foreground weather atmospheric effects
    this.starfield.drawWeatherOverlay(ctx, GAME_WIDTH, GAME_HEIGHT, {
       weatherEffect: this.activeProfile?.weatherEffect,
       backdropSettings: this.activeProfile?.backdropSettings,
       stageId: this.stage
    });

    // Dynamic Fog and Darkness Masking Engine (COSMIC BACKDROP ENG SUPPORTS)
    const backdropSet = normalizeBackdropSettings(this.activeProfile?.backdropSettings);

    if (backdropSet.fogEnabled) {
      ctx.save();
      let fogColor = '#0b0f19';
      const sky = backdropSet.skyPalette;
      if (sky === 'acid_mist' || sky === 'toxic_yellow_sky') fogColor = '#1e2410';
      else if (sky === 'crimson_eclipse' || sky === 'volcano_red_sky') fogColor = '#2b0c0a';
      else if (sky === 'frozen_cyan_haze') fogColor = '#07121c';
      else if (sky === 'sunset_glow' || sky === 'golden_space_dusk') fogColor = '#211307';
      else if (sky === 'void_purple' || sky === 'candy_nebula') fogColor = '#12041c';
      else if (sky === 'emerald_dust' || sky === 'radioactive_aurora') fogColor = '#031a10';
      else if (sky === 'cobalt_abyss' || sky === 'deep_blue_night') fogColor = '#010512';
      
      ctx.fillStyle = fogColor;
      ctx.globalAlpha = backdropSet.fogOpacity !== undefined ? backdropSet.fogOpacity : 0.45;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.restore();
    }

    if (backdropSet.darknessEnabled) {
      const darkness = backdropSet.darknessLevel !== undefined ? backdropSet.darknessLevel : 0.85;
      const radius = backdropSet.playerLightRadius !== undefined ? backdropSet.playerLightRadius : 150;
      const softness = backdropSet.playerLightSoftness !== undefined ? backdropSet.playerLightSoftness : 0.8;

      ctx.save();
      // Offscreen digital cutout layer for high contrast spotlights
      const darkCanvas = document.createElement('canvas');
      darkCanvas.width = GAME_WIDTH;
      darkCanvas.height = GAME_HEIGHT;
      const dCtx = darkCanvas.getContext('2d');
      if (dCtx) {
        dCtx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        dCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        dCtx.globalCompositeOperation = 'destination-out';

        // Carve spotlight around rockets
        const rx = this.rocketBaseX + 20;
        const ry = this.rocketBaseY - 30;
        const rockRad = 160;
        const rockGrad = dCtx.createRadialGradient(rx, ry, rockRad * 0.15, rx, ry, rockRad);
        rockGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        rockGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        dCtx.fillStyle = rockGrad;
        dCtx.beginPath();
        dCtx.arc(rx, ry, rockRad, 0, Math.PI * 2);
        dCtx.fill();

        // Carve spotlights around all alive players
        this.players.forEach(p => {
          if (!p.dead && !p.isOut) {
            const px = p.pos.x + p.width / 2;
            const py = p.pos.y + p.height / 2;

            const radGrad = dCtx.createRadialGradient(px, py, radius * (1 - softness), px, py, radius);
            radGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
            dCtx.fillStyle = radGrad;
            dCtx.beginPath();
            dCtx.arc(px, py, radius, 0, Math.PI * 2);
            dCtx.fill();
          }
        });

        ctx.drawImage(darkCanvas, 0, 0);
      }
      ctx.restore();
    }
    
    this.drawHUD(ctx);
    
    // Launch Flash
    if (this.state === 'LAUNCHING') {
       const launchProgress = Math.max(0, this.rocketBaseY - this.rocket.launchY);
       if (launchProgress < 50) {
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - (launchProgress/50)})`;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
       }
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform from shake
  }

  drawHUD(ctx: CanvasRenderingContext2D) {
    const theme = this.visualThemeConfig;
    const isClassic = this.gameMode === 'CLASSIC';
    
    ctx.shadowBlur = 0;

    // Helper to draw ultimate retro-sharp high contrast double drop-shadows (Spectrum CRT style)
    const drawSpectrumText = (text: string, x: number, y: number, color: string, align: 'left' | 'right' | 'center' = 'center') => {
       ctx.save();
       ctx.textAlign = align;
       ctx.fillStyle = '#000000';
       
       // Cardinal offset shadows for perfect high-res border
       ctx.fillText(text, x - 1.5, y - 1.5);
       ctx.fillText(text, x + 1.5, y - 1.5);
       ctx.fillText(text, x - 1.5, y + 1.5);
       ctx.fillText(text, x + 1.5, y + 1.5);
       
       // Bottom right retro accent drop shadow
       ctx.fillText(text, x + 2, y + 2);
       
       // Pure solid neon color text overlay
       ctx.fillStyle = color;
       ctx.fillText(text, x, y);
       ctx.restore();
    };
    
    if (isClassic) {
      // Classic HUD styling - scaled up to 25px for Spectrum 8bit arcade aesthetics
       ctx.font = 'bold 25px "Press Start 2P", monospace';
       
       // Level text in bright Cyan
       const stageStr = `CLASSIC L${this.stage.toString().padStart(2, '0')}`;
       drawSpectrumText(stageStr, 20, 48, NEON_COLORS.CYAN, 'left');
       
       // Dynamic build state text in pure White
       const rTypeNum = ['I', 'II', 'III', 'IV'][this.rocket.type - 1];
       let statusStr = '';
       if (this.rocket.isComplete()) {
         statusStr = `ROCKET ${rTypeNum} BUILT FUEL ${this.rocket.fuelLevel}/6`;
       } else {
         statusStr = `ROCKET ${rTypeNum} BUILD ${this.rocket.partsAssembled}/3 FUEL 0/6`;
       }
       drawSpectrumText(statusStr, GAME_WIDTH / 2, 48, '#ffffff', 'center');
       
       // Score in high-vibrancy Magenta
       const scoreStr = `SCORE ${this.score.toString().padStart(6, '0')}`;
       drawSpectrumText(scoreStr, GAME_WIDTH - 20, 48, '#ff00ff', 'right');
       
       // Lives lower down in solid Yellow
       const livesStr = input.infiniteLives ? `LIVES INF` : `LIVES ${this.lives}`;
       drawSpectrumText(livesStr, GAME_WIDTH - 20, 85, '#ffff00', 'right');
       return;
    }

    // Fever Dream standard HUD logic - scaled up to 18px for Spectrum 8bit aesthetics
    ctx.save();
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    
    if (this.playerMode === 'twoPlayerTurns') {
      const p1Text = `P1 ${this.p1Score.toString().padStart(6, '0')} L${input.infiniteLives ? 'INF' : this.p1Lives}`;
      const p1Color = this.activeTurnPlayerId === 1 ? NEON_COLORS.CYAN : 'rgba(0, 255, 255, 0.45)';
      drawSpectrumText(p1Text, 15, 48, p1Color, 'left');
      
      const p2Text = `P2 ${this.p2Score.toString().padStart(6, '0')} L${input.infiniteLives ? 'INF' : this.p2Lives}`;
      const p2Color = this.activeTurnPlayerId === 2 ? '#22c55e' : 'rgba(34, 197, 94, 0.45)';
      drawSpectrumText(p2Text, GAME_WIDTH - 15, 48, p2Color, 'right');
    } else if (this.playerMode === 'twoPlayerCoop' || this.playerMode === 'twoPlayerDeathmatch') {
      const p1 = this.players[0];
      const p2 = this.players.find(p => p.playerId === 2) || p1;
      
      const p1LivesStr = p1.isOut ? 'OUT' : (input.infiniteLives ? 'INF' : p1.lives);
      const p1Text = `P1 ${p1.score.toString().padStart(6, '0')} L:${p1LivesStr}`;
      drawSpectrumText(p1Text, 15, 48, NEON_COLORS.CYAN, 'left');
      
      const p2LivesStr = p2.isOut ? 'OUT' : (input.infiniteLives ? 'INF' : p2.lives);
      const p2Text = `P2 ${p2.score.toString().padStart(6, '0')} L:${p2LivesStr}`;
      drawSpectrumText(p2Text, GAME_WIDTH - 15, 48, '#22c55e', 'right');
    } else {
      // Single Player Score in bright Yellow
      const scoreStr = `${this.score.toString().padStart(7, '0')}`;
      drawSpectrumText(scoreStr, 15, 48, '#eab308', 'left');
      
      // Stage & Lives in high-contrast solid Green
      const rightText = input.infiniteLives ? `S${this.stage.toString().padStart(2, '0')} L:INF` : `S${this.stage.toString().padStart(2, '0')} L${this.lives}`;
      drawSpectrumText(rightText, GAME_WIDTH - 15, 48, '#10b981', 'right');
    }

    // Top Center: Objective or Boss
    if (this.activeBoss) {
       const hud = this.activeBoss.getHUDText();
       drawSpectrumText(hud.name, GAME_WIDTH/2, 28, '#f43f5e', 'center');
       
       // Expanded health bar
       ctx.fillStyle = '#000000';
       ctx.fillRect(GAME_WIDTH/2 - 140, 44, 280, 8);
       ctx.lineWidth = 2;
       ctx.strokeStyle = '#f43f5e';
       ctx.strokeRect(GAME_WIDTH/2 - 140, 44, 280, 8);
       const hpPct = Math.max(0, this.activeBoss.hp / this.activeBoss.maxHp);
       ctx.fillStyle = '#f43f5e';
       ctx.fillRect(GAME_WIDTH/2 - 138, 46, 276 * hpPct, 4);
    } else {
       let objText = '';
       let objColor = '#ffffff';
       if (this.rocket.isComplete() && this.rocket.isFueled()) {
          objText = 'OBJECTIVE: LAUNCH ROCKET';
          objColor = '#a855f7'; // Purple-magenta taking off indicator
       } else if (this.rocket.isComplete()) {
          objText = `OBJECTIVE: FUEL ${this.rocket.fuelLevel}/6`;
          objColor = '#06b6d4'; // Cyan fuel status
       } else {
          objText = `OBJECTIVE: BUILD ${this.rocket.partsAssembled}/3`;
          objColor = '#ec4899'; // Hot pink assembly status
       }
       drawSpectrumText(objText, GAME_WIDTH/2, 48, objColor, 'center');
    }

    // Bottom Center: Powerup
    if (false && this.activePowerups.length > 0) {
       const p = this.activePowerups[0];
       const pwPct = Math.max(0, p.timer / 600);
       ctx.beginPath();
       ctx.rect(GAME_WIDTH/2 - 100, GAME_HEIGHT - 45, 200, 35);
       ctx.fillStyle = '#000000';
       ctx.strokeStyle = theme.powerup;
       ctx.fill();
       ctx.stroke();
       
       ctx.fillStyle = theme.powerup;
       ctx.shadowColor = theme.powerup;
       ctx.font = '8px "Press Start 2P", monospace';
       ctx.fillText(`SYS: ${p.type.replace('_', ' ').toUpperCase()}`, GAME_WIDTH/2, GAME_HEIGHT - 28);
       
       // timer bar
       ctx.fillRect(GAME_WIDTH/2 - 96, GAME_HEIGHT - 20, 192 * pwPct, 4);
    }

    // Bottom Left: Collected Keys indicators
    if (this.player.keysCollected && this.player.keysCollected.length > 0) {
       ctx.save();
       ctx.textAlign = 'left';
       ctx.font = '8px "Press Start 2P", monospace';
       ctx.fillStyle = theme.text;
       ctx.shadowColor = theme.text;
       ctx.shadowBlur = 5;
       ctx.fillText('KEYS:', 20, GAME_HEIGHT - 30);
       
       this.player.keysCollected.forEach((kKind, idx) => {
          let color = '#ef4444';
          if (kKind === 'blueKey') color = '#3b82f6';
          else if (kKind === 'greenKey') color = '#10b981';
          else if (kKind === 'goldKey') color = '#fbbf24';
          else if (kKind === 'silverKey') color = '#94a3b8';

          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(75 + idx * 16, GAME_HEIGHT - 33, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
       });
       ctx.restore();
    }

    // Bottom Right: Obtained Equipment indicators
    const eqList = Object.keys(this.player.equipment || {}).filter(k => (this.player.equipment as any)[k]);
    if (eqList.length > 0) {
       ctx.save();
       ctx.textAlign = 'right';
       ctx.font = '8px "Press Start 2P", monospace';
       ctx.fillStyle = theme.text;
       ctx.shadowColor = theme.text;
       ctx.shadowBlur = 5;
       ctx.fillText('EQUIP:', GAME_WIDTH - 200, GAME_HEIGHT - 30);

       eqList.forEach((eq, idx) => {
          let abbreviation = 'GB';
          let color = theme.powerup || '#06b6d4';
          if (eq === 'gravityBoots') { abbreviation = 'GB'; color = '#06b6d4'; }
          else if (eq === 'heatShield') { abbreviation = 'HS'; color = '#fb7185'; }
          else if (eq === 'aquaHelmet') { abbreviation = 'AH'; color = '#38bdf8'; }
          else if (eq === 'rubberSuit') { abbreviation = 'RS'; color = '#facc15'; }
          else if (eq === 'magnetBoots') { abbreviation = 'MB'; color = '#a78bfa'; }

          // Small circular indicator with active glowing tag
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = color;
          ctx.fillStyle = '#050510';
          ctx.beginPath();
          ctx.arc(GAME_WIDTH - 150 + idx * 28, GAME_HEIGHT - 33, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(abbreviation, GAME_WIDTH - 150 + idx * 28, GAME_HEIGHT - 33);
       });
       ctx.restore();
    }

    // Draw MISSION COMPASS panel (HIDDEN per request)
    if (false && this.objectiveState && this.state === 'PLAYING') {
       ctx.save();
       ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale/shaking so HUD is perfectly static
       
       const cX = GAME_WIDTH - 215;
       const cY = 55;
       const cW = 200;
       const cH = 60;

       // Draw box panel
       ctx.fillStyle = 'rgba(5, 5, 16, 0.85)';
       ctx.strokeStyle = this.areStageObjectivesComplete() ? '#10b981' : '#0891b2';
       ctx.lineWidth = 1.5;
       ctx.shadowBlur = 8;
       ctx.shadowColor = ctx.strokeStyle as string;
       
       ctx.fillRect(cX, cY, cW, cH);
       ctx.strokeRect(cX, cY, cW, cH);

       // Box Title
       ctx.shadowBlur = 0;
       ctx.fillStyle = '#67e8f9';
       ctx.textAlign = 'left';
       ctx.font = 'bold 8px monospace';
       ctx.textBaseline = 'alphabetic';
       ctx.fillText("⊘ SYSTEM COMPASS:", cX + 8, cY + 12);

       // List Items based on mode
       const textX = cX + 16;
       let textY = cY + 24;
       ctx.font = '7px monospace';

       const drawObjectiveRow = (label: string, done: boolean) => {
          ctx.fillStyle = done ? '#10b981' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(textX - 6, textY - 2.5, 2, 0, Math.PI * 2);
          ctx.fill();
          
          if (done) {
             ctx.fillStyle = '#10b981';
             ctx.fillText(`✓ [OK] ${label}`, textX, textY);
          } else {
             ctx.fillStyle = '#ffffff';
             ctx.fillText(`⚡ [  ] ${label}`, textX, textY);
          }
          textY += 9;
       };

       const mode = this.objectiveState.mode;
       if (mode === 'rescue') {
          const count = this.objectiveState.rescuesCompleted;
          const req = this.objectiveState.rescuesRequired;
          drawObjectiveRow(`ASTRONAUTS SECURED: ${count} / ${req}`, count >= req);
          drawObjectiveRow(`RETURN TO ESCAPE SHUTTLE`, count >= req);
       } else if (mode === 'escort') {
          const activeEscorts = this.objectiveState.escortEntities.filter(ent => ent.enabled);
          if (activeEscorts.length === 0) {
             drawObjectiveRow(`NO ACTIVE ESCORTS FOUND`, true);
          } else {
              activeEscorts.forEach((ent, index) => {
                const hpText = ent.health > 0 ? `| HP: ${ent.health}/${ent.maxHealth}` : `| DESTROYED`;
                drawObjectiveRow(`DRONE #${index+1} SECURE ${hpText}`, ent.completed);
             });
          }
       } else if (mode === 'reactor') {
          const act = this.objectiveState.reactorActivatedCount;
          const total = this.activeProfile.objectiveRules?.reactor?.requiredSwitches ?? this.objectiveState.reactorSwitches.length;
          drawObjectiveRow(`REACTOR CORE ACTIVATED: ${act} / ${total}`, this.objectiveState.reactorComplete);
          drawObjectiveRow(`OVERLOAD SEQUENCE SECURED`, this.objectiveState.reactorComplete);
       } else if (mode === 'artifact') {
          const count = this.objectiveState.artifactsCollected;
          const req = this.objectiveState.artifactsRequired;
          drawObjectiveRow(`ARTIFACT EXTRACTION: ${count} / ${req}`, count >= req);
          drawObjectiveRow(`RETURN TO EXTRACTION BAY`, count >= req);
       } else if (mode === 'survival') {
          const sec = Math.ceil(this.objectiveState.survivalTimer / 60);
          drawObjectiveRow(`SURVIVE WAVES: ${sec}s REMAINING`, this.objectiveState.survivalComplete);
          if (this.activeProfile.objectiveRules?.survival?.launchAfterSurvival === false) {
             drawObjectiveRow(`BOARD EXTRACTION CHASSIS`, this.objectiveState.survivalComplete);
          } else {
             drawObjectiveRow(`AUTO LAUNCH EXECUTING`, this.objectiveState.survivalComplete);
          }
       } else if (mode === 'rush') {
          const sec = Math.ceil(this.objectiveState.rushTimer / 60);
          const launchReady = (this.activeProfile.requiresBuild ? this.rocket.isComplete() : true) && 
                              ((this.activeProfile.fuelRequired || 0) > 0 ? this.rocket.isFueled() : true);
          drawObjectiveRow(`FUEL & LAUNCH: ${sec}s FAST SPEED`, launchReady && !this.objectiveState.rushFailed);
          drawObjectiveRow(`SPEED LIMIT OK`, !this.objectiveState.rushFailed);
       } else {
          // Default launch / Classic mode
          const built = this.rocket.isComplete();
          const fueled = this.rocket.isFueled();
          
          if (this.activeProfile.requiresBuild) {
             drawObjectiveRow(`ASSEMBLE CAPSULE CHASSIS`, built);
          }
          if ((this.activeProfile.fuelRequired || 0) > 0) {
             drawObjectiveRow(`SOLID FUEL RODS: ${this.rocket.fuelLevel}/${this.activeProfile.fuelRequired}`, fueled);
          }
          drawObjectiveRow(`BOARD CHASSIS CABIN`, built && fueled);
       }

       // Bottom caption of the compass
       ctx.fillStyle = this.areStageObjectivesComplete() ? '#10b981' : '#0891b2';
       ctx.font = 'bold 6.5px monospace';
       ctx.textAlign = 'right';
       ctx.fillText(this.areStageObjectivesComplete() ? "READY FOR TAKE-OFF" : "SYSTEMS ENGAGED - ALL SECURE", cX + cW - 8, cY + cH - 4);

       ctx.restore();
    }

    // Stage Intro Banner
    if (this.stageIntroTimer > 0 && this.state === 'PLAYING') {
       ctx.save();
       const bannerAlpha = 0.5 * Math.min(1.0, this.stageIntroTimer / 30);
       ctx.fillStyle = `rgba(3, 4, 18, ${bannerAlpha})`;
       ctx.fillRect(0, GAME_HEIGHT/2 - 60, GAME_WIDTH, 120);
       
       ctx.strokeStyle = theme.particleA || '#22d3ee';
       ctx.lineWidth = 1.5;
       ctx.shadowColor = theme.particleA || '#22d3ee';
       ctx.shadowBlur = 10;
       ctx.globalAlpha = 0.7 * Math.min(1.0, this.stageIntroTimer / 30);
       
       ctx.beginPath();
       ctx.moveTo(0, GAME_HEIGHT/2 - 60);
       ctx.lineTo(GAME_WIDTH, GAME_HEIGHT/2 - 60);
       ctx.moveTo(0, GAME_HEIGHT/2 + 60);
       ctx.lineTo(GAME_WIDTH, GAME_HEIGHT/2 + 60);
       ctx.stroke();
       
       ctx.shadowBlur = 15;
       ctx.globalAlpha = Math.min(1.0, this.stageIntroTimer/20);
       ctx.shadowBlur = 15;
       ctx.textAlign = 'center';
       
       if (this.activeBoss) {
          ctx.fillStyle = theme.hazard;
          ctx.shadowColor = theme.hazard;
          ctx.font = 'bold 25px "Press Start 2P", monospace';
          ctx.fillText(`WARNING: HOSTILE DETECTED`, GAME_WIDTH/2, GAME_HEIGHT/2 - 10);
          ctx.font = 'bold 17px "Press Start 2P", monospace';
          ctx.fillText(this.activeBoss.getHUDText().name, GAME_WIDTH/2, GAME_HEIGHT/2 + 25);
       } else {
          ctx.fillStyle = theme.text;
          ctx.shadowColor = theme.text;
          ctx.font = 'bold 25px "Press Start 2P", monospace';
          ctx.fillText(`STAGE ${this.stage.toString().padStart(2, '0')}`, GAME_WIDTH/2, GAME_HEIGHT/2 - 10);
          ctx.font = 'bold 17px "Press Start 2P", monospace';
          ctx.fillStyle = theme.particleA;
          ctx.shadowColor = theme.particleA;
          ctx.fillText(this.activeProfile.subtitle, GAME_WIDTH/2, GAME_HEIGHT/2 + 25);
       }
       ctx.restore();
    }
    
    // Turn Change Banner
    if (this.turnMessageTimer > 0 && this.playerMode === 'twoPlayerTurns') {
       ctx.save();
       ctx.fillStyle = 'rgba(5, 5, 20, 0.9)';
       ctx.fillRect(0, GAME_HEIGHT/2 - 60, GAME_WIDTH, 120);
       
       const activeColor = this.activeTurnPlayerId === 2 ? '#22c55e' : NEON_COLORS.CYAN;
       ctx.shadowBlur = 15;
       ctx.shadowColor = activeColor;
       ctx.fillStyle = activeColor;
       ctx.font = 'bold 24px "Press Start 2P", monospace';
       ctx.textAlign = 'center';
       ctx.fillText(`PLAYER ${this.activeTurnPlayerId} TURN`, GAME_WIDTH/2, GAME_HEIGHT/2 - 10);
       
       ctx.fillStyle = '#ffffff';
       ctx.shadowColor = '#ffffff';
       ctx.font = '8px "Press Start 2P", monospace';
       ctx.fillText(`PREPARE JETPAC BOOSTERS`, GAME_WIDTH/2, GAME_HEIGHT/2 + 25);
       ctx.restore();
    }

    // Deathmatch Shields UI
    if (this.playerMode === 'twoPlayerDeathmatch') {
       ctx.save();
       ctx.shadowBlur = 0;
       ctx.font = 'bold 8px monospace';
       
       const p1 = this.players[0];
       const p2 = this.players.find(p => p.playerId === 2) || p1;
       
       // P1 Shield Bar on Bottom Left
       if (!p1.isOut) {
          ctx.strokeStyle = NEON_COLORS.CYAN;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(30, GAME_HEIGHT - 35, 150, 10);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.fillRect(32, GAME_HEIGHT - 33, 146 * (p1.shield / 100), 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`P1 SHIELD`, 30, GAME_HEIGHT - 42);
       }
       
       // P2 Shield Bar on Bottom Right
       if (!p2.isOut) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(GAME_WIDTH - 180, GAME_HEIGHT - 35, 150, 10);
          ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.fillRect(GAME_WIDTH - 178, GAME_HEIGHT - 33, 146 * (p2.shield / 100), 6);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'right';
          ctx.fillText(`P2 SHIELD`, GAME_WIDTH - 30, GAME_HEIGHT - 42);
       }
       
       ctx.restore();
    }
    
     // real-time FPS calculation
     const now = performance.now();
     this.fpsFrames++;
     if (now - this.fpsLastUpdate >= 500) {
        this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastUpdate));
        this.fpsFrames = 0;
        this.fpsLastUpdate = now;
     }

     // display FPS at bottom right of screen if turned on
     if ((window as any).__showFPS) {
        ctx.save();
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#00ffcc'; // elegant high contrast retro green-blue
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 5;
        ctx.textAlign = 'right';
        ctx.fillText(`FPS: ${this.fps}`, GAME_WIDTH - 25, GAME_HEIGHT - 15);
        ctx.restore();
     }

     ctx.restore();
  }
}
