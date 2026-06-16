import { GAME_WIDTH, GAME_HEIGHT } from './Constants';

export interface BackdropSettings {
  presetId?: string;
  generationMode?: "manual" | "procedural" | "hybrid";
  seed?: string | number;

  starDensity?: number;
  starTwinkleSpeed?: number;
  starColorPalette?: string;
  starDirection?: string;
  shootingStarsEnabled?: boolean;
  meteorRate?: number;
  meteorColorPalette?: string;
  meteorSize?: string;
  meteorSpeed?: string;
  meteorStyle?: string;

  skyPalette?: string;
  skyGradientOverride?: {
    top?: string;
    mid?: string;
    bottom?: string;
  };

  backdropTheme?: string;

  nebulaDensity?: number;
  nebulaOpacity?: number;
  nebulaScale?: number;
  nebulaDrift?: number;
  nebulaPulseSpeed?: number;
  nebulaColorPalette?: string;
  nebulaShapeStyle?: string;
  nebulaBanding?: number;
  nebulaWispiness?: number;

  planetType?: string;
  planetScale?: number;
  planetPosX?: number;
  planetPosY?: number;
  planetOrbitRings?: boolean;
  planetAtmosphereGlow?: number;
  planetDetailLevel?: number;
  planetRotationSpeed?: number;
  planetSecondaryType?: string;
  planetSecondaryScale?: number;
  planetSecondaryPosX?: number;
  planetSecondaryPosY?: number;
  planetSecondaryOrbitRings?: boolean;
  planetSecondaryAtmosphereGlow?: number;
  auroraRibbonsEnabled?: boolean;
  maxAmbientParticles?: number;

  blackHoleEnabled?: boolean;
  blackHoleScale?: number;
  blackHolePosX?: number;
  blackHolePosY?: number;
  blackHoleColor?: string;
  blackHoleRingIntensity?: number;
  blackHoleParticlePull?: number;

  structureType?: string;
  structureOpacity?: number;
  structureScale?: number;
  structurePosX?: number;
  structurePosY?: number;
  structureParallax?: number;
  structureLightDensity?: number;
  structureAnimationSpeed?: number;

  terrainType?: string;
  terrainOpacity?: number;
  terrainHorizonY?: number;
  terrainScale?: number;
  terrainParallax?: number;
  terrainLayers?: number;
  terrainDetailLevel?: number;
  terrainGlow?: number;

  weatherEffect?: string;
  weatherDensityMultiplier?: number;
  weatherSpeedMultiplier?: number;
  weatherOpacity?: number;
  weatherLayering?: "behind" | "front" | "both";

  fogEnabled?: boolean;
  fogColor?: string;
  fogOpacity?: number;
  fogHeight?: number;
  fogDrift?: number;

  darknessEnabled?: boolean;
  darknessLevel?: number;
  playerLightRadius?: number;
  playerLightSoftness?: number;
  playerLightColor?: string;
  revealItems?: boolean;
  revealEnemies?: boolean;
  emergencyGlow?: boolean;

  trippyIntensity?: number;
  trippyColorCycleSpeed?: number;
  geometricOverlay?: string;
  chromaticShimmer?: number;

  asteroidBeltEnabled?: boolean;
  asteroidCount?: number;
  asteroidSpeed?: number;
  asteroidStyle?: string;

  readabilityVeil?: number;
  backgroundBrightnessLimit?: number;
  foregroundContrastAssist?: boolean;
}

export function getDefaultBackdropSettingsForTheme(themeId: string): BackdropSettings {
  const defaults: Record<string, BackdropSettings> = {
    deep_stars: { starDensity: 150, starTwinkleSpeed: 0.8, starColorPalette: 'white' },
    layered_nebula: { starDensity: 120, starTwinkleSpeed: 0.6, nebulaDensity: 3, nebulaOpacity: 0.75, nebulaColorPalette: 'indigo_violet' },
    black_hole: { starDensity: 200, blackHoleEnabled: true, blackHoleScale: 1.0, blackHolePosX: 550, blackHolePosY: 180, blackHoleColor: 'orange', blackHoleRingIntensity: 0.8, blackHoleParticlePull: 1.0 },
    alien_planet: { starDensity: 150, planetType: 'ringed_giant', planetScale: 1.1, planetPosX: 150, planetPosY: 400, planetOrbitRings: true, planetAtmosphereGlow: 0.8 },
    space_station: { starDensity: 130, structureType: 'orbital_ring', structureOpacity: 0.8 },
    dying_sun: { starDensity: 250, skyPalette: 'cosmic_pink', weatherEffect: 'embers', planetType: 'red_sun', planetScale: 1.3, planetPosX: 400, planetPosY: 550 },
    crystal_clouds: { starDensity: 220, weatherEffect: 'ice_shards', nebulaDensity: 3, nebulaOpacity: 0.4, nebulaColorPalette: 'cyan_blue', asteroidBeltEnabled: true, asteroidCount: 12 },
    dimensional_void: { starDensity: 180, nebulaDensity: 4, nebulaOpacity: 0.6, nebulaColorPalette: 'rainbow', trippyIntensity: 0.2 },
    alien_city: { starDensity: 120, structureType: 'alien_city', structureOpacity: 0.75, terrainType: 'city_rooftops', terrainLayers: 2, terrainOpacity: 0.8 },
    mountain_world: { starDensity: 160, terrainType: 'distant_mountains', terrainLayers: 3, terrainOpacity: 0.9 },
    volcanic_horizon: { starDensity: 220, skyPalette: 'red_giant_glow', planetType: 'lava_planet', terrainType: 'volcanic_ridges', terrainLayers: 2, weatherEffect: 'embers', terrainGlow: 0.8 },
    frozen_peaks: { starDensity: 180, skyPalette: 'frozen_cyan_haze', planetType: 'ice_world', terrainType: 'frozen_peaks', terrainLayers: 3, weatherEffect: 'gentle_snow' },
    toxic_swamp_orbit: { starDensity: 100, skyPalette: 'toxic_yellow_sky', planetType: 'toxic_world', terrainType: 'toxic_swamp_canopy', weatherEffect: 'acid_rain' },
    desert_moon_dunes: { starDensity: 200, skyPalette: 'alien_sunset_orange', planetType: 'crater_moon', terrainType: 'desert_dunes', terrainLayers: 2 },
    crystal_canyon: { starDensity: 240, skyPalette: 'frozen_cyan_haze', terrainType: 'crystal_spikes', structureType: 'crystal_city', weatherEffect: 'falling_crystal_dust' },
    orbital_shipyard: { starDensity: 140, structureType: 'orbital_shipyard', structureOpacity: 0.85, nebulaColorPalette: 'cyan_blue' },
    ruined_alien_temple: { starDensity: 150, terrainType: 'ruined_temple_ridge', structureType: 'ruined_temple', weatherEffect: 'fireflies' },
    ringworld_arc: { starDensity: 160, planetType: 'artificial_ringworld', terrainType: 'station_gantry' },
    twin_moon_night: { starDensity: 180, skyPalette: 'deep_blue_night', planetType: 'twin_moons' },
    storm_gas_giant: { starDensity: 130, skyPalette: 'storm_indigo', planetType: 'storm_giant', weatherEffect: 'electrical_storm', fogEnabled: true, fogOpacity: 0.4 },
    neon_metropolis: { starDensity: 120, skyPalette: 'synthwave_sunset', terrainType: 'city_rooftops', structureType: 'neon_city', weatherEffect: 'neon_drizzle' },
    biomechanical_hive: { starDensity: 140, skyPalette: 'blacklight_purple', terrainType: 'biomechanical_ribs', structureType: 'biomechanical_hive', weatherEffect: 'alien_pollen' },
    derelict_fleet: { starDensity: 200, structureType: 'derelict_ship', asteroidBeltEnabled: true, asteroidCount: 15, weatherEffect: 'orbital_debris' },
    coral_planet: { starDensity: 110, skyPalette: 'underwater_space_blue', planetType: 'coral_world', terrainType: 'coral_reefs', weatherEffect: 'underwater_bubbles' },
    electric_ion_storm: { starDensity: 150, skyPalette: 'electric_violet', weatherEffect: 'ion_sparks' },
    midnight_flashlight: { starDensity: 50, skyPalette: 'starless_black', darknessEnabled: true, darknessLevel: 0.95, playerLightRadius: 160, playerLightSoftness: 0.8 },
    aurora_mountains: { starDensity: 220, skyPalette: 'aurora_blue_green', terrainType: 'alien_mountains', weatherEffect: 'aurora_particles' },
    eclipse_city: { starDensity: 120, skyPalette: 'crimson_eclipse', planetType: 'eclipse', terrainType: 'city_rooftops', structureType: 'city_skyline' },
    cosmic_ocean: { starDensity: 170, skyPalette: 'underwater_space_blue', nebulaDensity: 3, nebulaColorPalette: 'cyan_blue', weatherEffect: 'underwater_bubbles' },
    asteroid_graveyard: { starDensity: 190, asteroidBeltEnabled: true, asteroidCount: 22, structureType: 'derelict_ship', weatherEffect: 'orbital_debris' },
    data_rain_station: { starDensity: 130, skyPalette: 'starless_black', structureType: 'refinery_towers', weatherEffect: 'data_rain' },
    prismatic_dreamfield: { starDensity: 250, skyPalette: 'soft_pastel_dawn', nebulaDensity: 4, nebulaOpacity: 0.8, nebulaColorPalette: 'rainbow', weatherEffect: 'prismatic_sparks', trippyIntensity: 0.15 },
    black_lava_world: { starDensity: 240, skyPalette: 'crimson_eclipse', planetType: 'black_lava_planet', terrainType: 'black_lava_ridges', weatherEffect: 'embers' },
    ancient_monolith_valley: { starDensity: 180, skyPalette: 'radioactive_aurora', structureType: 'monoliths', terrainType: 'distant_mountains' },
    space_elevator_silhouette: { starDensity: 160, skyPalette: 'golden_space_dusk', structureType: 'space_elevator', terrainType: 'distant_mountains' },
    moonbase_horizon: { starDensity: 150, skyPalette: 'deep_blue_night', planetType: 'crater_moon', terrainType: 'moonbase_horizon', structureType: 'moonbase_domes' },
    nebula_citadel: { starDensity: 220, skyPalette: 'candy_nebula', nebulaOpacity: 0.85, structureType: 'floating_citadels' },
    radioactive_jungle: { starDensity: 140, skyPalette: 'radioactive_aurora', terrainType: 'alien_forest', planetType: 'jungle_planet', weatherEffect: 'alien_pollen' }
  };
  return defaults[themeId] || defaults['deep_stars'];
}

export function normalizeBackdropSettings(settings: any): BackdropSettings {
  if (!settings) return {};
  const baseDefaults = getDefaultBackdropSettingsForTheme(settings.backdropTheme || 'deep_stars');
  return { ...baseDefaults, ...settings };
}

export function mergeBackdropSettings(base: BackdropSettings, override: BackdropSettings): BackdropSettings {
  return { ...base, ...override };
}

export function getSkyGradientStops(skyPalette: string, theme?: string, settings?: BackdropSettings): string[] {
  // Returns [top, mid, bottom] colors
  if (settings?.skyGradientOverride) {
    const o = settings.skyGradientOverride;
    if (o.top || o.mid || o.bottom) {
      return [o.top || '#000000', o.mid || o.top || '#000000', o.bottom || o.mid || o.top || '#000000'];
    }
  }

  const p = skyPalette || settings?.skyPalette;
  switch (p) {
    case 'neon_twilight':
      return ['#040212', '#120d2d', '#3c0a32', '#ff2452'];
    case 'radioactive_aurora':
      return ['#010915', '#052a32', '#044c3d', '#10b981'];
    case 'acid_mist':
      return ['#040502', '#121204', '#0c220a', '#a3e635'];
    case 'cosmic_pink':
      return ['#060114', '#1e0835', '#4d0b43', '#ec4899'];
    case 'void_purple':
      return ['#020005', '#0b011c', '#2d0442', '#8b5cf6'];
    case 'deep_blue_night':
      return ['#010108', '#020518', '#050d30', '#0a195e'];
    case 'alien_sunset_orange':
      return ['#050201', '#170602', '#351105', '#f97316'];
    case 'pale_moon_dawn':
      return ['#020306', '#080d1a', '#18243e', '#bae6fd'];
    case 'crimson_eclipse':
      return ['#030001', '#100103', '#2e0208', '#dc2626'];
    case 'emerald_twilight':
      return ['#010403', '#03140f', '#093627', '#10b981'];
    case 'frozen_cyan_haze':
      return ['#010305', '#040d17', '#0c253d', '#0891b2'];
    case 'golden_space_dusk':
      return ['#040301', '#150f05', '#33240a', '#eab308'];
    case 'toxic_yellow_sky':
      return ['#030401', '#0f1404', '#263309', '#ca8a04'];
    case 'storm_indigo':
      return ['#010204', '#070b14', '#131e36', '#4f46e5'];
    case 'starless_black':
      return ['#000000', '#010103', '#020205', '#04040a'];
    case 'candy_nebula':
      return ['#050106', '#1a0422', '#410950', '#d946ef'];
    case 'radioactive_magenta':
      return ['#060105', '#1e0319', '#4c053c', '#ff007f'];
    case 'soft_pastel_dawn':
      return ['#05050e', '#13122b', '#2c2759', '#fed7aa'];
    case 'red_giant_glow':
      return ['#050000', '#1c0101', '#450202', '#ef4444'];
    case 'underwater_space_blue':
      return ['#000208', '#000720', '#001444', '#0ea5e9'];
    case 'electric_violet':
      return ['#040108', '#14032a', '#32066d', '#8b5cf6'];
    case 'synthwave_sunset':
      return ['#020110', '#180424', '#4c0542', '#f43f5e'];
    case 'obsidian_green':
      return ['#010302', '#040f09', '#0c2e1b', '#059669'];
    case 'aurora_blue_green':
      return ['#010609', '#041d24', '#0d4352', '#22d3ee'];
    case 'blacklight_purple':
      return ['#03010b', '#0d0429', '#240a6b', '#a855f7'];
    default:
      return ['#020205', '#03020e', '#05041a', '#08062a'];
  }
}

export type StageObjective =
  | "build"
  | "fuel"
  | "boss"
  | "survive"
  | "rush";

export type VisualTheme =
  | "classic_neon"
  | "meteor_nursery"
  | "saucer_storm"
  | "broken_grid"
  | "crystal_rig"
  | "wormhole_fever"
  | "boss_leech"
  | "boss_rocket_eater"
  | "boss_unicorn"
  | "boss_kiwi";

export interface PlatformDef {
  0: number; // x
  1: number; // y
  2: number; // w
  3: number; // h
  kind?: string;
}

export type EnemyType = "meteor" | "saucer" | "spinner" | "hunter" | "scavenger" | "saboteur" | "split_meteor" | "phase_wisp" | "gravity_jelly" | "laser_saucer" | "mine_layer" | "fuelThief" | "turretOrb" | "swooper" | "mineLayer" | "gravityJelly" | "mimicFuel" | "splitter";

export type EncounterPattern =
  | "classic_random"
  | "meteor_shower"
  | "saucer_ring"
  | "hunter_pair"
  | "fuzzball_bounce_storm"
  | "dart_ambush"
  | "blob_swarm"
  | "scavenger_raid"
  | "sabotage_pressure"
  | "boss";

export interface StageProfile {
  id: number;
  name: string;
  subtitle: string;

  objective: StageObjective;

  rocketType: number;
  requiresBuild: boolean;
  fuelRequired: number;

  platformLayout: PlatformDef[];

  enemySet: EnemyType[];
  encounterPattern?: EncounterPattern;

  visualTheme: VisualTheme;

  bossId?: "fuel_leech" | "rocket_eater" | "rainbow_unicorn" | "acid_kiwi";

  spawnRateMultiplier?: number;
  enemySpeedMultiplier?: number;
  itemDropMultiplier?: number;
  powerupSet?: string[];
  powerupDropChance?: number;

  backdropTheme?: string;
  skyPalette?: string;
  weatherEffect?: string;
  environmentGravity?: number;
  backdropSettings?: BackdropSettings;
}

// Layout definitions
export const LAYOUT_CLASSIC: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [50, 400, 180, 15],
  [550, 350, 180, 15],
  [300, 200, 200, 15],
];

export const LAYOUT_LOW_GRAVITY_STEPS: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [50, 450, 100, 15],
  [200, 380, 100, 15],
  [350, 310, 100, 15],
  [500, 240, 100, 15],
  [650, 170, 100, 15],
];

export const LAYOUT_METEOR_NURSERY: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [100, 450, 250, 15],
  [450, 450, 250, 15],
];

export const LAYOUT_SAUCER_ARENA: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [300, 350, 200, 15],
  [0, 250, 150, 15],
  [650, 250, 150, 15],
];

export const LAYOUT_BROKEN_GRID: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [50, 450, 80, 15], [250, 450, 80, 15], [450, 450, 80, 15], [650, 450, 80, 15],
  [150, 300, 80, 15], [350, 300, 80, 15], [550, 300, 80, 15],
];

export const LAYOUT_CRYSTAL_RIG: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [350, 500, 100, 15],
  [350, 400, 100, 15],
  [350, 300, 100, 15],
  [350, 200, 100, 15],
  [100, 350, 150, 15],
  [550, 350, 150, 15],
];

export const LAYOUT_BOSS_LEECH: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  [0, 350, 150, 15],
  [650, 350, 150, 15]
];

export const LAYOUT_ROCKET_EATER: PlatformDef[] = [
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20], // ground
  [100, 380, 180, 15],  // mid platform left
  [250, 180, 180, 15],  // high platform center-left
];

export const STAGE_PROFILES: StageProfile[] = [
  {
    id: 1, name: "STAGE 01", subtitle: "LAUNCH GRID", objective: "build",
    rocketType: 1, requiresBuild: true, fuelRequired: 6,
    platformLayout: LAYOUT_CLASSIC, enemySet: ["meteor"], visualTheme: "classic_neon",
    backdropTheme: "moonbase_horizon", skyPalette: "deep_blue_night", weatherEffect: "none",
    backdropSettings: { starDensity: 150, starTwinkleSpeed: 0.8, starColorPalette: "white", planetType: "crater_moon", planetScale: 1.0, planetPosX: 650, planetPosY: 450, planetAtmosphereGlow: 0.5, terrainType: "moonbase_horizon", structureType: "moonbase_domes", structureOpacity: 0.6 }
  },
  {
    id: 2, name: "STAGE 02", subtitle: "FUEL DRIFT", objective: "fuel",
    rocketType: 1, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_CLASSIC, enemySet: ["meteor", "saucer"], visualTheme: "classic_neon",
    backdropTheme: "alien_planet", skyPalette: "neon_twilight", weatherEffect: "none",
    backdropSettings: { starDensity: 180, starTwinkleSpeed: 1.0, starColorPalette: "multicolor", planetType: "ringed_giant", planetScale: 1.2, planetPosX: 150, planetPosY: 420, planetOrbitRings: true, planetAtmosphereGlow: 0.8, terrainType: "rolling_neon_hills" }
  },
  {
    id: 3, name: "STAGE 03", subtitle: "BOSS: RAINBOW UNICORN", objective: "boss",
    rocketType: 1, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_METEOR_NURSERY, enemySet: [], bossId: "rainbow_unicorn", visualTheme: "boss_unicorn",
    backdropTheme: "prismatic_dreamfield", skyPalette: "candy_nebula", weatherEffect: "prismatic_sparks",
    backdropSettings: { starDensity: 240, starTwinkleSpeed: 1.8, starColorPalette: "pastel", nebulaDensity: 4, nebulaOpacity: 0.8, nebulaScale: 1.5, nebulaColorPalette: "rainbow", trippyIntensity: 0.15, trippyColorCycleSpeed: 0.8, weatherEffect: "prismatic_sparks" }
  },
  {
    id: 4, name: "STAGE 04", subtitle: "BOSS: ACID KIWI", objective: "boss",
    rocketType: 1, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_SAUCER_ARENA, enemySet: [], bossId: "acid_kiwi", visualTheme: "boss_kiwi",
    backdropTheme: "toxic_swamp_orbit", skyPalette: "toxic_yellow_sky", weatherEffect: "acid_rain",
    backdropSettings: { starDensity: 100, starTwinkleSpeed: 0.6, starColorPalette: "pastel", planetType: "toxic_world", planetScale: 1.1, planetPosX: 250, planetPosY: 440, planetAtmosphereGlow: 0.7, terrainType: "toxic_swamp_canopy", weatherEffect: "acid_rain" }
  },
  {
    id: 5, name: "STAGE 05", subtitle: "ROCKET BUILD FEVER", objective: "build",
    rocketType: 2, requiresBuild: true, fuelRequired: 6,
    platformLayout: LAYOUT_BROKEN_GRID, enemySet: ["spinner", "phase_wisp"], visualTheme: "wormhole_fever",
    backdropTheme: "dimensional_void", skyPalette: "void_purple", weatherEffect: "none",
    backdropSettings: { starDensity: 200, starTwinkleSpeed: 1.2, starColorPalette: "neon", nebulaDensity: 3, nebulaOpacity: 0.5, nebulaScale: 1.3, nebulaColorPalette: "indigo_violet", trippyIntensity: 0.1, trippyColorCycleSpeed: 1.0, terrainType: "crystal_spikes" }
  },
  {
    id: 6, name: "STAGE 06", subtitle: "BOSS: THE FUEL LEECH", objective: "boss",
    rocketType: 2, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_BOSS_LEECH, enemySet: [], bossId: "fuel_leech", visualTheme: "boss_leech",
    backdropTheme: "black_hole", skyPalette: "space_black", weatherEffect: "solar_flare",
    backdropSettings: { starDensity: 280, starTwinkleSpeed: 2.2, starColorPalette: "neon", blackHoleEnabled: true, blackHoleScale: 1.3, blackHolePosX: 600, blackHolePosY: 160, blackHoleColor: "orange", nebulaDensity: 4, nebulaOpacity: 0.6, nebulaScale: 1.6, nebulaColorPalette: "amber_red" }
  },
  {
    id: 7, name: "STAGE 07", subtitle: "CRYSTAL RIG", objective: "fuel",
    rocketType: 2, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_CRYSTAL_RIG, enemySet: ["hunter", "mine_layer"], visualTheme: "crystal_rig",
    backdropTheme: "crystal_canyon", skyPalette: "frozen_cyan_haze", weatherEffect: "falling_crystal_dust",
    backdropSettings: { starDensity: 240, starTwinkleSpeed: 1.0, starColorPalette: "pastel", terrainType: "crystal_spikes", structureType: "crystal_city", weatherEffect: "falling_crystal_dust" }
  },
  {
    id: 8, name: "STAGE 08", subtitle: "BROKEN PLATFORMS", objective: "fuel",
    rocketType: 2, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_BROKEN_GRID, enemySet: ["phase_wisp", "split_meteor"], encounterPattern: "blob_swarm", visualTheme: "broken_grid",
    backdropTheme: "asteroid_graveyard", skyPalette: "obsidian_green", weatherEffect: "orbital_debris",
    backdropSettings: { starDensity: 190, asteroidBeltEnabled: true, asteroidCount: 22, structureType: "derelict_ship", weatherEffect: "orbital_debris" }
  },
  {
    id: 9, name: "STAGE 09", subtitle: "THIRD ROCKET BUILD", objective: "build",
    rocketType: 3, requiresBuild: true, fuelRequired: 6,
    platformLayout: LAYOUT_LOW_GRAVITY_STEPS, enemySet: ["scavenger", "saboteur", "saucer"], visualTheme: "wormhole_fever",
    backdropTheme: "space_elevator_silhouette", skyPalette: "golden_space_dusk", weatherEffect: "none",
    backdropSettings: { starDensity: 160, starTwinkleSpeed: 1.0, starColorPalette: "white", structureType: "space_elevator", terrainType: "distant_mountains" }
  },
  {
    id: 10, name: "STAGE 10", subtitle: "GRAVITY JELLY SWARM", objective: "fuel",
    rocketType: 3, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_SAUCER_ARENA, enemySet: ["gravity_jelly", "hunter"], visualTheme: "wormhole_fever",
    backdropTheme: "storm_gas_giant", skyPalette: "storm_indigo", weatherEffect: "electrical_storm",
    backdropSettings: { starDensity: 130, starTwinkleSpeed: 1.5, starColorPalette: "multicolor", planetType: "storm_giant", weatherEffect: "electrical_storm", fogEnabled: true, fogOpacity: 0.4 }
  },
  {
    id: 11, name: "STAGE 11", subtitle: "SABOTEUR NIGHT", objective: "fuel",
    rocketType: 3, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_CLASSIC, enemySet: ["saboteur", "mine_layer", "phase_wisp"], encounterPattern: "sabotage_pressure", visualTheme: "broken_grid",
    backdropTheme: "midnight_flashlight", skyPalette: "starless_black", weatherEffect: "none",
    backdropSettings: { starDensity: 50, starTwinkleSpeed: 0.5, starColorPalette: "white", darknessEnabled: true, darknessLevel: 0.95, playerLightRadius: 160, playerLightSoftness: 0.8 }
  },
  {
    id: 12, name: "STAGE 12", subtitle: "BOSS: THE ROCKET EATER", objective: "boss",
    rocketType: 3, requiresBuild: false, fuelRequired: 6,
    platformLayout: LAYOUT_ROCKET_EATER, enemySet: [], bossId: "rocket_eater", visualTheme: "boss_rocket_eater",
    backdropTheme: "black_lava_world", skyPalette: "crimson_eclipse", weatherEffect: "embers",
    backdropSettings: { starDensity: 240, planetType: "black_lava_planet", terrainType: "black_lava_ridges", weatherEffect: "embers" }
  }
];

export function getStageProfile(stage: number): StageProfile {
  // Loop back around with increased difficulty after 12
  const idx = ((stage - 1) % 12);
  const loop = Math.floor((stage - 1) / 12);
  
  const base = STAGE_PROFILES[idx];
  
  return {
    ...base,
    spawnRateMultiplier: 1 + (loop * 0.2),
    enemySpeedMultiplier: 1 + (loop * 0.1),
  };
}
