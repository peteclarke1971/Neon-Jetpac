import { JetpacStageProfileV2 } from '../LaunchLabTypes';
import { GAME_WIDTH, GAME_HEIGHT, ROCKET_BASE_X, ROCKET_BASE_Y, PLATFORMS_LAYOUT } from '../Constants';
import { 
  LAYOUT_CLASSIC, 
  LAYOUT_METEOR_NURSERY, 
  LAYOUT_SAUCER_ARENA, 
  LAYOUT_BROKEN_GRID, 
  LAYOUT_CRYSTAL_RIG, 
  LAYOUT_BOSS_LEECH, 
  LAYOUT_ROCKET_EATER 
} from '../StageProfiles';

export interface LaunchLabTemplate {
  id: string;
  name: string;
  description: string;
  profile: JetpacStageProfileV2;
}

export const LAUNCH_LAB_TEMPLATES: LaunchLabTemplate[] = [
  {
    id: 'template-blank',
    name: 'Blank Stage',
    description: 'A completely clear field with player ground, one shelf, and default spawn points.',
    profile: {
      id: 9901,
      name: 'BLANK STAGE',
      subtitle: 'TAP TO BUILD',
      objective: 'build',
      rocketType: 1,
      requiresBuild: true,
      fuelRequired: 6,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [300, 300, 200, 15]
      ],
      enemySet: ['meteor'],
      encounterPattern: 'classic_random',
      visualTheme: 'classic_neon',
      playerStart: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
      rocketBase: { x: ROCKET_BASE_X, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-classic-grid',
    name: 'Classic Launch Grid',
    description: 'Based on the iconic Stage 1 Jetpac experience.',
    profile: {
      id: 9902,
      name: 'CLASSIC GRID',
      subtitle: 'REBUILD THE JETPAC ROCKET',
      objective: 'build',
      rocketType: 1,
      requiresBuild: true,
      fuelRequired: 6,
      platformLayout: LAYOUT_CLASSIC,
      enemySet: ['meteor'],
      encounterPattern: 'classic_random',
      visualTheme: 'classic_neon',
      playerStart: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
      rocketBase: { x: ROCKET_BASE_X, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-fuel-drift',
    name: 'Fuel Drift',
    description: 'Traditional layout with rocket pre-assembled. Pure fueling speedrun.',
    profile: {
      id: 9903,
      name: 'FUEL DRIFT',
      subtitle: 'PRE-BUILT POWER',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_CLASSIC,
      enemySet: ['meteor', 'saucer'],
      encounterPattern: 'classic_random',
      visualTheme: 'classic_neon',
      playerStart: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
      rocketBase: { x: ROCKET_BASE_X, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-meteor-nursery',
    name: 'Meteor Nursery',
    description: 'Two wide hanging shelves with high intensity meteor showers falling.',
    profile: {
      id: 9904,
      name: 'METEOR SHOWER',
      subtitle: 'AVOID THE DEBRIS',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_METEOR_NURSERY,
      enemySet: ['meteor', 'split_meteor'],
      encounterPattern: 'meteor_shower',
      visualTheme: 'meteor_nursery',
      playerStart: { x: 150, y: GAME_HEIGHT - 50 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-saucer-arena',
    name: 'Saucer Arena',
    description: 'A split center arena with intense flying saucers that circle-spawn.',
    profile: {
      id: 9905,
      name: 'SAUCER ARENA',
      subtitle: 'DODGE LASER TRAFFIC',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_SAUCER_ARENA,
      enemySet: ['saucer', 'laser_saucer'],
      encounterPattern: 'saucer_ring',
      visualTheme: 'saucer_storm',
      playerStart: { x: 400, y: 300 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-broken-grid',
    name: 'Broken Grid',
    description: 'Eight fragmented grid landing platforms demanding precise thruster agility.',
    profile: {
      id: 9906,
      name: 'BROKEN GRID',
      subtitle: 'WORMHOLE COLLAPSE',
      objective: 'build',
      rocketType: 2,
      requiresBuild: true,
      fuelRequired: 6,
      platformLayout: LAYOUT_BROKEN_GRID,
      enemySet: ['spinner', 'phase_wisp'],
      encounterPattern: 'classic_random',
      visualTheme: 'wormhole_fever',
      playerStart: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-crystal-rig',
    name: 'Crystal Rig',
    description: 'A stacked vertical spine rig requiring high speed traversals.',
    profile: {
      id: 9907,
      name: 'CRYSTAL RIG',
      subtitle: 'MINING DRILL SYSTEM',
      objective: 'fuel',
      rocketType: 2,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_CRYSTAL_RIG,
      enemySet: ['hunter', 'mine_layer'],
      encounterPattern: 'classic_random',
      visualTheme: 'crystal_rig',
      playerStart: { x: 100, y: 150 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-boss-leech',
    name: 'Boss Leech Arena',
    description: 'Fight the massive Fuel Leech. Minimal platforms to maneuver.',
    profile: {
      id: 9908,
      name: 'FUEL LEECH BOUT',
      subtitle: 'DESTROY THE CORE',
      objective: 'boss',
      rocketType: 2,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_BOSS_LEECH,
      enemySet: [],
      bossId: 'fuel_leech',
      visualTheme: 'boss_leech',
      playerStart: { x: 100, y: GAME_HEIGHT - 50 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-boss-eater',
    name: 'Boss Eater Arena',
    description: 'Fight the fearsome Rocket Eater Boss. Demanding structural layout.',
    profile: {
      id: 9909,
      name: 'ROCKET EATER BOUT',
      subtitle: 'DEFEND THE ENGINES',
      objective: 'boss',
      rocketType: 3,
      requiresBuild: false,
      fuelRequired: 6,
      platformLayout: LAYOUT_ROCKET_EATER,
      enemySet: [],
      bossId: 'rocket_eater',
      visualTheme: 'boss_rocket_eater',
      playerStart: { x: 400, y: GAME_HEIGHT - 50 },
      rocketBase: { x: 550, y: ROCKET_BASE_Y }
    }
  },
  {
    id: 'template-water-rescue',
    name: 'Water Rescue',
    description: 'Pool of water at the bottom, safe platforms above. Do not drown!',
    profile: {
      id: 9910,
      name: 'WATER RESCUE',
      subtitle: 'SURVIVE THE DEPTHS',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, 200, 20],
        [600, GAME_HEIGHT - 20, 200, 20],
        [200, 420, 400, 15],
        [100, 280, 220, 15],
        [480, 280, 220, 15],
      ],
      enemySet: ['meteor'],
      visualTheme: 'classic_neon',
      playerStart: { x: 80, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 680, y: ROCKET_BASE_Y },
      hazards: [
        {
          id: 'water-pit',
          kind: 'water',
          x: 200,
          y: GAME_HEIGHT - 30,
          w: 400,
          h: 30,
          enabled: true,
          props: { escapeWindow: 120, sinkSpeed: 0.7 }
        }
      ],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-lava-refinery',
    name: 'Lava Refinery',
    description: 'Lava pit near the rocket footprint with a bounce pad shortcut.',
    profile: {
      id: 9911,
      name: 'LAVA REFINERY',
      subtitle: 'HOT MOLTEN CRUST',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, 180, 20],
        [620, GAME_HEIGHT - 20, 180, 20],
        [200, 450, 80, 15, 'bounce'],
        [200, 320, 400, 15],
      ],
      enemySet: ['saucer'],
      visualTheme: 'meteor_nursery',
      playerStart: { x: 50, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 680, y: ROCKET_BASE_Y },
      hazards: [
        {
          id: 'lava-pit',
          kind: 'lava',
          x: 180,
          y: GAME_HEIGHT - 25,
          w: 440,
          h: 25,
          enabled: true,
          props: { damageDelay: 20 }
        }
      ],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-electric-rig',
    name: 'Electric Rig',
    description: 'Electric timed zap strips guarding central cargo routes.',
    profile: {
      id: 9912,
      name: 'ELECTRIC RIG',
      subtitle: 'TIMED POWER CORE',
      objective: 'fuel',
      rocketType: 2,
      requiresBuild: false,
      fuelRequired: 5,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [150, 400, 200, 15],
        [450, 400, 200, 15],
        [300, 250, 200, 15],
      ],
      enemySet: ['spinner'],
      visualTheme: 'broken_grid',
      playerStart: { x: 100, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 380, y: 250 },
      hazards: [
        {
          id: 'zap-left',
          kind: 'electric',
          x: 200,
          y: 380,
          w: 100,
          h: 20,
          enabled: true,
          props: { activeFrames: 90, inactiveFrames: 70, phaseOffset: 0 }
        },
        {
          id: 'zap-right',
          kind: 'electric',
          x: 500,
          y: 380,
          w: 100,
          h: 20,
          enabled: true,
          props: { activeFrames: 90, inactiveFrames: 70, phaseOffset: 80 }
        }
      ],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-ice-asteroid',
    name: 'Ice Asteroid',
    description: 'Slippery platforms with low friction slide physics.',
    profile: {
      id: 9913,
      name: 'ICE ASTEROID',
      subtitle: 'PRECISION SLIDING',
      objective: 'fuel',
      rocketType: 2,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20, 'ice'],
        [100, 420, 250, 15, 'ice'],
        [450, 420, 250, 15, 'ice'],
        [300, 250, 200, 15, 'ice'],
      ],
      enemySet: ['meteor'],
      visualTheme: 'crystal_rig',
      playerStart: { x: 100, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 380, y: 250 },
      hazards: [],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-crumbling-tower',
    name: 'Crumbling Tower',
    description: 'Vertical crumbling platforms. Speed is of the essence!',
    profile: {
      id: 9914,
      name: 'CRUMBLING TOWER',
      subtitle: 'FLITTING RAPIDLY',
      objective: 'survive',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 0,
      completion: { mode: 'survive', surviveFrames: 1200 },
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [150, 460, 140, 15, 'crumbling'],
        [500, 460, 140, 15, 'crumbling'],
        [320, 360, 160, 15, 'crumbling'],
        [150, 240, 140, 15, 'crumbling'],
        [500, 240, 140, 15, 'crumbling'],
      ],
      enemySet: ['phase_wisp'],
      visualTheme: 'wormhole_fever',
      playerStart: { x: 400, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 100, y: GAME_HEIGHT - 20 },
      hazards: [],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-conveyor-factory',
    name: 'Conveyor Factory',
    description: 'Conveyor belts pushing the player horizontally toward design hazards.',
    profile: {
      id: 9915,
      name: 'CONVEYOR FACTORY',
      subtitle: 'ASSEMBLY SPEEDWAY',
      objective: 'fuel',
      rocketType: 3,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [100, 420, 250, 15, 'conveyorRight'],
        [450, 420, 250, 15, 'conveyorLeft'],
        [280, 250, 240, 15, 'conveyorRight'],
      ],
      enemySet: ['scavenger'],
      visualTheme: 'classic_neon',
      playerStart: { x: 50, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 380, y: 250 },
      hazards: [],
      zones: [],
      objects: []
    }
  },
  {
    id: 'template-wind-tunnel',
    name: 'Wind Tunnel',
    description: 'Updraft and side wind zones sweeping player and cargo objects.',
    profile: {
      id: 9916,
      name: 'WIND TUNNEL',
      subtitle: 'ATMOSPHERE DRIFT',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [50, 380, 200, 15],
        [550, 380, 200, 15],
      ],
      enemySet: ['meteor'],
      visualTheme: 'saucer_storm',
      playerStart: { x: 100, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 620, y: 380 },
      hazards: [],
      zones: [
        {
          id: 'updraft-center',
          kind: 'wind',
          x: 300,
          y: 50,
          w: 200,
          h: 500,
          enabled: true,
          props: { forceX: 0, forceY: -0.15, affectsPlayer: true, affectsItems: true, affectsEnemies: false, visible: true }
        }
      ],
      objects: []
    }
  },
  {
    id: 'template-fan-assisted',
    name: 'Fan Assisted Launch',
    description: 'Industrial ventilation fans giving vertical lift propulsion.',
    profile: {
      id: 9917,
      name: 'FAN PROPULSOR',
      subtitle: 'VERTICAL AIRFLOW',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [50, 420, 180, 15],
        [570, 420, 180, 15],
      ],
      enemySet: ['meteor'],
      visualTheme: 'crystal_rig',
      playerStart: { x: 80, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 640, y: 420 },
      hazards: [],
      zones: [],
      objects: [
        {
          id: 'up-fan-1',
          kind: 'fan',
          x: 300,
          y: GAME_HEIGHT - 50,
          w: 50,
          h: 30,
          enabled: true,
          props: { direction: 'up', strength: 0.25, affectsPlayer: true, affectsItems: true, affectsEnemies: false }
        },
        {
          id: 'up-fan-2',
          kind: 'fan',
          x: 450,
          y: GAME_HEIGHT - 50,
          w: 50,
          h: 30,
          enabled: true,
          props: { direction: 'up', strength: 0.25, affectsPlayer: true, affectsItems: true, affectsEnemies: false }
        }
      ]
    }
  },
  {
    id: 'template-gravity-bubble',
    name: 'Gravity Bubble',
    description: 'Low-gravity sub-orbital bubble centered around floating cargo deposits.',
    profile: {
      id: 9918,
      name: 'GRAVITY BUBBLE',
      subtitle: 'SUB-ORBITAL FLOAT',
      objective: 'fuel',
      rocketType: 2,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
        [200, 380, 400, 15],
      ],
      enemySet: ['gravity_jelly'],
      visualTheme: 'wormhole_fever',
      playerStart: { x: 100, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 400, y: 380 },
      hazards: [],
      zones: [
        {
          id: 'low-g-sphere',
          kind: 'gravity',
          x: 150,
          y: 100,
          w: 500,
          h: 320,
          enabled: true,
          props: { gravityMultiplier: 0.35, affectsPlayer: true, affectsItems: true, affectsEnemies: true, visible: true }
        }
      ],
      objects: []
    }
  },
  {
    id: 'template-teleporter-relay',
    name: 'Teleporter Relay',
    description: 'Linked teleporter gateways for quick high-speed stage traversals.',
    profile: {
      id: 9919,
      name: 'TELEPORTER RELAY',
      subtitle: 'QUANTUM GATEWAYS',
      objective: 'fuel',
      rocketType: 3,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, 250, 20],
        [550, GAME_HEIGHT - 20, 250, 20],
        [150, 320, 150, 15],
        [500, 320, 150, 15],
      ],
      enemySet: ['phase_wisp'],
      visualTheme: 'broken_grid',
      playerStart: { x: 80, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 680, y: ROCKET_BASE_Y },
      hazards: [],
      zones: [],
      objects: [
        {
          id: 'portal-1',
          kind: 'teleporter',
          x: 30,
          y: 260,
          w: 35,
          h: 40,
          enabled: true,
          props: { pairId: 'portal-2', cooldownFrames: 60 }
        },
        {
          id: 'portal-2',
          kind: 'teleporter',
          x: 730,
          y: 260,
          w: 35,
          h: 40,
          enabled: true,
          props: { pairId: 'portal-1', cooldownFrames: 60 }
        }
      ]
    }
  },
  {
    id: 'template-moving-platform-rig',
    name: 'Moving Platform Rig',
    description: 'Cargo platforms shuttling space junk between fuel deposits and engines.',
    profile: {
      id: 9920,
      name: 'MOVING RIG',
      subtitle: 'SHUTTLE TRANSPORTS',
      objective: 'fuel',
      rocketType: 1,
      requiresBuild: false,
      fuelRequired: 4,
      platformLayout: [
        [0, GAME_HEIGHT - 20, 200, 20],
        [600, GAME_HEIGHT - 20, 200, 20],
      ],
      enemySet: ['meteor'],
      visualTheme: 'classic_neon',
      playerStart: { x: 80, y: GAME_HEIGHT - 60 },
      rocketBase: { x: 680, y: ROCKET_BASE_Y },
      hazards: [],
      zones: [],
      objects: [
        {
          id: 'shuttle-plat-1',
          kind: 'movingPlatform',
          x: 200,
          y: 360,
          w: 120,
          h: 15,
          enabled: true,
          props: {
            pathX1: 200,
            pathY1: 360,
            pathX2: 480,
            pathY2: 360,
            speed: 1.5,
            pauseAtEnds: 20,
            carryPlayer: true,
            platformKind: 'normal'
          }
        }
      ]
    }
  }
];
