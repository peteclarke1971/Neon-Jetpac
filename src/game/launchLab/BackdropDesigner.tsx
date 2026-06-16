import React, { useEffect, useRef, useState } from 'react';
import { Starfield } from '../Starfield';
import { GAME_WIDTH, GAME_HEIGHT } from '../Constants';
import { BackdropSettings } from '../StageProfiles';

export interface BackdropDesignerProps {
  onClose: () => void;
  onSave: (updatedProfileFields: {
    backdropTheme: string;
    skyPalette: string;
    weatherEffect: string;
    backdropSettings: any;
  }) => void;
  initialSettings?: any;
  initialSkyPalette?: string;
  initialBackdropTheme?: string;
  initialWeatherEffect?: string;
}

// Optimized array of 30 Coherent Presets
const PRESETS = [
  {
    name: 'Moonbase Midnight',
    desc: 'Deep blue night above lunar crater base dunes and research domes in low fog.',
    sky: 'deep_blue_night', bg: 'moonbase_horizon', weather: 'none',
    s: { starDensity: 60, starTwinkleSpeed: 0.4, terrainType: 'moonbase_horizon', structureType: 'moonbase_domes', planetType: 'crater_moon', planetScale: 0.9, planetPosX: 600, planetPosY: 480, fogEnabled: true, fogOpacity: 0.25, fogHeight: 180, terrainOpacity: 0.8, structureOpacity: 0.7 }
  },
  {
    name: 'Acid Swamp Orbit',
    desc: 'Irradiated radioactive yellow daze sky casting green mist over swamp canopy.',
    sky: 'toxic_yellow_sky', bg: 'toxic_swamp_orbit', weather: 'acid_rain',
    s: { starDensity: 90, planetType: 'toxic_world', planetScale: 1.1, planetPosX: 150, planetPosY: 400, terrainType: 'toxic_swamp_canopy', weatherEffect: 'acid_rain', weatherDensityMultiplier: 1.2 }
  },
  {
    name: 'Black Hole Shipyard',
    desc: 'A massive dark singularity pulling spatial dust near heavy orbital scaffolding towers.',
    sky: 'starless_black', bg: 'black_hole', weather: 'solar_flare',
    s: { starDensity: 220, blackHoleEnabled: true, blackHoleScale: 1.1, blackHolePosX: 580, blackHolePosY: 160, blackHoleColor: 'blue', structureType: 'orbital_shipyard', structureOpacity: 0.85, weatherEffect: 'solar_flare', asteroidBeltEnabled: true, asteroidCount: 15 }
  },
  {
    name: 'Neon Metropolis Sunset',
    desc: 'Golden hot synthwave sun bleeding below glowing mega-skyscrapers.',
    sky: 'synthwave_sunset', bg: 'neon_metropolis', weather: 'neon_drizzle',
    s: { starDensity: 80, terrainType: 'city_rooftops', structureType: 'neon_city', planetType: 'city_lights_planet', planetScale: 1.0, planetPosX: 200, planetPosY: 350, weatherEffect: 'neon_drizzle' }
  },
  {
    name: 'Volcanic Red Moon',
    desc: 'Irradiated crimson eclipses hovering over smoldering volcanic valleys of fire.',
    sky: 'red_giant_glow', bg: 'volcanic_horizon', weather: 'embers',
    s: { starDensity: 190, planetType: 'lava_planet', planetScale: 1.3, planetPosX: 500, planetPosY: 480, terrainType: 'volcanic_ridges', weatherEffect: 'embers', terrainGlow: 0.8, weatherDensityMultiplier: 1.5 }
  },
  {
    name: 'Frozen Comet Silence',
    desc: 'An ice-crystal haze behind high frozen peaks drifting with sharp shards.',
    sky: 'frozen_cyan_haze', bg: 'frozen_peaks', weather: 'ice_shards',
    s: { starDensity: 240, planetType: 'ice_world', planetScale: 0.9, terrainType: 'frozen_peaks', weatherEffect: 'ice_shards', weatherOpacity: 0.9 }
  },
  {
    name: 'Crystal Canyon Dawn',
    desc: 'Glancing dawn light refracting off tall crystalline structural spires.',
    sky: 'pale_moon_dawn', bg: 'crystal_canyon', weather: 'falling_crystal_dust',
    s: { starDensity: 180, terrainType: 'crystal_spikes', structureType: 'crystal_city', weatherEffect: 'falling_crystal_dust' }
  },
  {
    name: 'Ringworld Sunrise',
    desc: 'Looking out up the sweeping arc of a giant artificial mega-gantry.',
    sky: 'golden_space_dusk', bg: 'ringworld_arc', weather: 'none',
    s: { starDensity: 110, planetType: 'artificial_ringworld', planetScale: 1.4, terrainType: 'station_gantry', structureType: 'station_scaffold' }
  },
  {
    name: 'Derelict Fleet Graveyard',
    desc: 'Ashes of an antique galactic war drifting in a dark cosmic dust field.',
    sky: 'void_purple', bg: 'derelict_fleet', weather: 'orbital_debris',
    s: { starDensity: 190, structureType: 'derelict_ship', weatherEffect: 'orbital_debris', asteroidBeltEnabled: true, asteroidCount: 22 }
  },
  {
    name: 'Radioactive Jungle Night',
    desc: 'Irradiated glowing green dust settling above alien swamp spores.',
    sky: 'radioactive_aurora', bg: 'radioactive_jungle', weather: 'alien_pollen',
    s: { starDensity: 140, planetType: 'jungle_planet', terrainType: 'alien_forest', weatherEffect: 'alien_pollen' }
  },
  {
    name: 'Midnight Flashlight Test',
    desc: 'Pitch-black level featuring flashlight mode with small visibility circle.',
    sky: 'starless_black', bg: 'midnight_flashlight', weather: 'none',
    s: { starDensity: 40, darknessEnabled: true, darknessLevel: 0.96, playerLightRadius: 130, playerLightSoftness: 0.75, revealEnemies: true, revealItems: true }
  },
  {
    name: 'Data Rain Station',
    desc: 'A cybernetic grid raining cascading lines of terminal machine digits.',
    sky: 'starless_black', bg: 'space_station', weather: 'data_rain',
    s: { starDensity: 120, structureType: 'refinery_towers', weatherEffect: 'data_rain', geometricOverlay: 'grid' }
  },
  {
    name: 'Twin Moon Dream',
    desc: 'Soft dawn glow backing twin moon horizons and mountains in star snow.',
    sky: 'soft_pastel_dawn', bg: 'twin_moon_night', weather: 'star_snow',
    s: { starDensity: 150, planetType: 'twin_moons', planetScale: 1.1, terrainType: 'alien_mountains', weatherEffect: 'star_snow' }
  },
  {
    name: 'Eclipse City',
    desc: 'Blood-red lunar eclipses framing cyber towers and alarm lighting.',
    sky: 'crimson_eclipse', bg: 'eclipse_city', weather: 'none',
    s: { starDensity: 100, planetType: 'eclipse', planetScale: 1.25, terrainType: 'city_rooftops', structureType: 'city_skyline' }
  },
  {
    name: 'Biomechanical Hive',
    desc: 'Fleshy ribs framing pulsing nests under violet starlight and toxic pollens.',
    sky: 'blacklight_purple', bg: 'biomechanical_hive', weather: 'alien_pollen',
    s: { starDensity: 110, terrainType: 'biomechanical_ribs', structureType: 'biomechanical_hive', weatherEffect: 'alien_pollen' }
  },
  {
    name: 'Coral Planet Lagoon',
    desc: 'Immersive underwater blue twilight filtering between ancient reef barriers.',
    sky: 'underwater_space_blue', bg: 'coral_planet', weather: 'underwater_bubbles',
    s: { starDensity: 80, planetType: 'coral_world', terrainType: 'coral_reefs', weatherEffect: 'underwater_bubbles' }
  },
  {
    name: 'Prismatic Rainbow Void',
    desc: 'Swirling rainbow gases framing digital alignments of kaleidoscopic shimmer.',
    sky: 'candy_nebula', bg: 'dimensional_void', weather: 'prismatic_sparks',
    s: { starDensity: 220, nebulaDensity: 4, nebulaOpacity: 0.7, nebulaColorPalette: 'rainbow', trippyIntensity: 0.25, weatherEffect: 'prismatic_sparks' }
  },
  {
    name: 'Ancient Monolith Monolith',
    desc: 'Towering geometric slabs basking under neon green radioactive auroras.',
    sky: 'radioactive_aurora', bg: 'ancient_monolith_valley', weather: 'cosmic_dust',
    s: { starDensity: 140, structureType: 'monoliths', terrainType: 'distant_mountains', weatherEffect: 'cosmic_dust' }
  },
  {
    name: 'Storm Giant Orbit',
    desc: 'Extreme ionized electrical tempests encircling dark giant gas masses.',
    sky: 'storm_indigo', bg: 'storm_gas_giant', weather: 'electrical_storm',
    s: { starDensity: 130, planetType: 'storm_giant', weatherEffect: 'electrical_storm', fogEnabled: true, fogOpacity: 0.4 }
  },
  {
    name: 'Black Lava World',
    desc: 'Eruptive red ash storms raining over fields of cooling jagged igneous glass.',
    sky: 'crimson_eclipse', bg: 'black_lava_world', weather: 'ash',
    s: { starDensity: 210, planetType: 'black_lava_planet', terrainType: 'black_lava_ridges', weatherEffect: 'ash' }
  },
  {
    name: 'Space Elevator Dawn',
    desc: 'A massive elevator cable shooting into deep golden sun rays.',
    sky: 'golden_space_dusk', bg: 'space_elevator_silhouette', weather: 'steam_mist',
    s: { starDensity: 110, structureType: 'space_elevator', terrainType: 'distant_mountains', weatherEffect: 'steam_mist' }
  },
  {
    name: 'Alien Temple Ruins',
    desc: 'Sanctuaries long forgotten under a crescent moon with drifting fireflies.',
    sky: 'void_purple', bg: 'ruined_alien_temple', weather: 'fireflies',
    s: { starDensity: 140, terrainType: 'ruined_temple_ridge', structureType: 'ruined_temple', weatherEffect: 'fireflies' }
  },
  {
    name: 'Candy Nebula Fever',
    desc: 'A vibrant kaleidoscope purple and pink sky with floating dream dust.',
    sky: 'candy_nebula', bg: 'nebula_citadel', weather: 'confetti_stars',
    s: { starDensity: 230, nebulaOpacity: 0.8, nebulaColorPalette: 'pink_magenta', trippyIntensity: 0.1, weatherEffect: 'confetti_stars' }
  },
  {
    name: 'Industrial Pipe Horizon',
    desc: 'Heavy chemical pipeline valves exhaling steam vapor against twilight.',
    sky: 'neon_twilight', bg: 'space_station', weather: 'steam_mist',
    s: { starDensity: 100, terrainType: 'industrial_pipes', structureType: 'giant_pipes', weatherEffect: 'steam_mist' }
  },
  {
    name: 'Aurora Observatory',
    desc: 'Green magnetic polar fields crowning titanic electronic radio receiver dishes.',
    sky: 'aurora_blue_green', bg: 'aurora_mountains', weather: 'aurora_particles',
    s: { starDensity: 180, terrainType: 'alien_mountains', structureType: 'giant_radio_dishes', weatherEffect: 'aurora_particles' }
  },
  {
    name: 'Orbital Junkyard',
    desc: 'An orange dawn backlighting drifting communication telemetry arrays.',
    sky: 'alien_sunset_orange', bg: 'space_station', weather: 'orbital_debris',
    s: { starDensity: 160, structureType: 'satellite_swarm', weatherEffect: 'orbital_debris', asteroidBeltEnabled: true, asteroidCount: 15 }
  },
  {
    name: 'Machine Planet Night',
    desc: 'Vitreous silicon servers discharging green code blocks under violet glow.',
    sky: 'electric_violet', bg: 'space_station', weather: 'data_rain',
    s: { starDensity: 150, planetType: 'machine_planet', structureType: 'antenna_array', weatherEffect: 'data_rain' }
  },
  {
    name: 'Shattered Moon',
    desc: 'Asteroid debris fields encircling a fractured moon core.',
    sky: 'crimson_eclipse', bg: 'black_hole', weather: 'meteor_sparks',
    s: { starDensity: 210, planetType: 'shattered_moon', terrainType: 'asteroid_surface', weatherEffect: 'meteor_sparks', asteroidBeltEnabled: true, asteroidCount: 18 }
  },
  {
    name: 'Pastel Dream Space',
    desc: 'Vaporwave sunrise with lavender clouds drifting under slow stellar dust.',
    sky: 'soft_pastel_dawn', bg: 'layered_nebula', weather: 'star_snow',
    s: { starDensity: 130, nebulaOpacity: 0.45, nebulaColorPalette: 'rainbow', trippyIntensity: 0.05, weatherEffect: 'star_snow' }
  },
  {
    name: 'Toxic Glass City',
    desc: 'Glowing skyscrapers encased in crystal under toxic swamp daze.',
    sky: 'acid_mist', bg: 'alien_city', weather: 'toxic_fumes',
    s: { starDensity: 100, planetType: 'glass_planet', terrainType: 'city_rooftops', structureType: 'neon_city', weatherEffect: 'toxic_fumes' }
  }
];

// Planet Type choices
const PLANET_TYPES = [
  { val: 'none', label: 'None' },
  { val: 'crater_moon', label: 'Crater Grey Moon' },
  { val: 'ringed_giant', label: 'Ringed Gas Giant' },
  { val: 'toxic_world', label: 'Acid Toxic World' },
  { val: 'ice_world', label: 'Icy Subzero World' },
  { val: 'lava_planet', label: 'Molten Lava World' },
  { val: 'red_sun', label: 'Dying Red Giant Sun' },
  { val: 'eclipse', label: 'Coronary Solar Eclipse' },
  { val: 'ocean_world', label: 'Water Ocean World' },
  { val: 'storm_giant', label: 'Tempest Storm Giant' },
  { val: 'striped_gas_giant', label: 'Striped Gas Giant' },
  { val: 'city_lights_planet', label: 'City Lights Planet' },
  { val: 'rainbow_gas_giant', label: 'Rainbow Gas Giant' },
  { val: 'shattered_moon', label: 'Shattered Moon' },
  { val: 'twin_moons', label: 'Twin Moons Silhouette' },
  { val: 'crescent_blue_world', label: 'Crescent Blue World' },
  { val: 'artificial_ringworld', label: 'Artificial Ringworld Arc' },
  { val: 'dyson_sun', label: 'Dyson Sphere Encased Sun' },
  { val: 'coral_world', label: 'Aquatic Coral Reef World' },
  { val: 'black_lava_planet', label: 'Cooling Black Lava Planet' },
  { val: 'glass_planet', label: 'Vitreous Silicon Glass Planet' },
  { val: 'purple_alien_world', label: 'Irradiated Lilac Orb' },
  { val: 'desert_planet', label: 'Sandy Desert Dunes World' },
  { val: 'jungle_planet', label: 'Dense Tropical Forest Planet' },
  { val: 'machine_planet', label: 'Cyberspace Circuit Core' },
  { val: 'fractured_core', label: 'Exploded Core remnants' },
  { val: 'tiny_moon_cluster', label: 'Meteorite Swarm Cluster' },
  { val: 'horizon_planet_surface', label: 'Curving Horizon Ground Surface' }
];

// Structures Type choices
const STRUCTURE_TYPES = [
  { val: 'none', label: 'None' },
  { val: 'orbital_ring', label: 'Orbital Ring Segment' },
  { val: 'city_skyline', label: 'Skyline Skyscrapers' },
  { val: 'antenna_array', label: 'Radio Antenna Network' },
  { val: 'monoliths', label: 'Geometric Monolith Spikes' },
  { val: 'alien_city', label: 'Spired Alien Metropolises' },
  { val: 'neon_city', label: 'Grid-lit Cyberpunk City' },
  { val: 'moonbase_domes', label: 'Spheroid Moonbase Domes' },
  { val: 'orbital_shipyard', label: 'Orbital Gantry Scaffolding' },
  { val: 'derelict_ship', label: 'Shattered Military Cruiser' },
  { val: 'satellite_swarm', label: 'Cosmic Communication Array' },
  { val: 'refinery_towers', label: 'Fuming Chemical Towers' },
  { val: 'space_elevator', label: 'Sub-orbital Space Cable' },
  { val: 'giant_radio_dishes', label: 'Deep Space Signal Receiver' },
  { val: 'crystal_city', label: 'Prismatic Crystal Temple' },
  { val: 'ruined_temple', label: 'Stone Ruined Sanctuary pillars' },
  { val: 'biomechanical_hive', label: 'Spore Rib-organic Incubators' },
  { val: 'power_pylons', label: 'Tesla Electric Distribution poles' },
  { val: 'ancient_gateway', label: 'Dimensional Void Torii Gate' },
  { val: 'station_scaffold', label: 'Industrial Construction Girders' },
  { val: 'ring_station', label: 'Rotating Stanford Torus dock' },
  { val: 'mining_rig', label: 'Geothermal Refinery platform' },
  { val: 'alien_bridge', label: 'Floating Interstellar Passage' },
  { val: 'floating_citadels', label: 'Levitating Gravity Castles' },
  { val: 'underwater_domes', label: 'Subaqueous Biosphere Shells' },
  { val: 'giant_pipes', label: 'Titan Pressurized Steam Valves' },
  { val: 'abandoned_arcade_signs', label: 'Neon Pixel Retro Bilboards' }
];

// Terrain Type choices
const TERRAIN_TYPES = [
  { val: 'none', label: 'None' },
  { val: 'distant_mountains', label: 'Distant Sharp Cliffs' },
  { val: 'alien_mountains', label: 'Weird Glowing Ridge Crags' },
  { val: 'crater_hills', label: 'Impact Dust Crater Lips' },
  { val: 'desert_dunes', label: 'Wavy Sand Dunes horizons' },
  { val: 'volcanic_ridges', label: 'Cracking Lava Magma Ridges' },
  { val: 'frozen_peaks', label: 'Jagged Crystalline Ice Peaks' },
  { val: 'crystal_spikes', label: 'Prismatic Quartz Spikes' },
  { val: 'toxic_swamp_canopy', label: 'Spore Toxic Moss Treetops' },
  { val: 'alien_forest', label: 'Giant Bioluminescent Ferns' },
  { val: 'moonbase_horizon', label: 'Grey Lunar Dust Horizon' },
  { val: 'city_rooftops', label: 'Modular Skyscrapers rooftops' },
  { val: 'ruined_temple_ridge', label: 'Stone Column Ridge blocks' },
  { val: 'biomechanical_ribs', label: 'Fleshy Exoskeletal Shells' },
  { val: 'coral_reefs', label: 'Silhouetted Ocean Reef Branches' },
  { val: 'industrial_pipes', label: 'Dense Pipeline Conduit Grid' },
  { val: 'station_gantry', label: 'Neon Cyber Gantry floor' },
  { val: 'asteroid_surface', label: 'Uneven Gravitational Rock' },
  { val: 'black_lava_ridges', label: 'Basalt Glass Volcanic Crags' },
  { val: 'rolling_neon_hills', label: 'Chroma Sinewave Rolling Swells' }
];

// Weather choices
const WEATHER_EFFECTS = [
  { val: 'none', label: 'Vacuum (None)' },
  { val: 'spurs', label: 'Floating Spores' },
  { val: 'acid_rain', label: 'Lime Acid Rain' },
  { val: 'ash', label: 'Volcanic Ash and Soot' },
  { val: 'embers', label: 'Rising Core Embers' },
  { val: 'ice_shards', label: 'Crystalline Ice Shards' },
  { val: 'solar_flare', label: 'Radiation Solar Flares' },
  { val: 'gentle_snow', label: 'Gentle Polar Snow' },
  { val: 'heavy_snow', label: 'Blinding Polar Blizzard' },
  { val: 'cosmic_dust', label: 'Stardust particles' },
  { val: 'ion_sparks', label: 'Violet Ionized Sparks' },
  { val: 'meteor_sparks', label: 'Meteor Fragment sparks' },
  { val: 'plasma_rain', label: 'Neon Pink Plasma Rain' },
  { val: 'data_rain', label: 'Cascading Green Binary digits' },
  { val: 'neon_drizzle', label: 'Vaporwave Rose Haze mist' },
  { val: 'fireflies', label: 'Blinking Amber Fireflies' },
  { val: 'alien_pollen', label: 'Bioluminescent green pollen' },
  { val: 'toxic_fumes', label: 'Rising Acid Green Vapor' },
  { val: 'steam_mist', label: 'Pressurized Steam jets' },
  { val: 'sandstorm', label: 'Violent Sandstorm dust' },
  { val: 'rain_streaks', label: 'Diagonal Cyan Rain lines' },
  { val: 'underwater_bubbles', label: 'Rising Oceanic Bubbles' },
  { val: 'star_snow', label: 'Floating Glitter Shimmer' },
  { val: 'confetti_stars', label: 'Retro Confetti particles' },
  { val: 'aurora_particles', label: 'Teal/Green Magnetic Sparks' },
  { val: 'electrical_storm', label: 'Strobotron Lightning Sparks' },
  { val: 'orbital_debris', label: 'Scattered Metal Scrap shards' },
  { val: 'falling_crystal_dust', label: 'Sparkling diamond powder' },
  { val: 'glitch_pixels', label: 'Chromatic digital glitches' },
  { val: 'prismatic_sparks', label: 'Rainbow color-switching sparks' }
];

export const BackdropDesigner: React.FC<BackdropDesignerProps> = ({
  onClose,
  onSave,
  initialSettings,
  initialSkyPalette = 'space_black',
  initialBackdropTheme = 'deep_stars',
  initialWeatherEffect = 'none',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starfieldRef = useRef<Starfield | null>(null);

  // Core basic parameters
  const [skyPalette, setSkyPalette] = useState(initialSkyPalette);
  const [backdropTheme, setBackdropTheme] = useState(initialBackdropTheme);
  const [weatherEffect, setWeatherEffect] = useState(initialWeatherEffect);

  // Single unified settings store to solve performance, token limits, and sync worries
  const [settings, setSettings] = useState<any>(() => ({
    starDensity: initialSettings?.starDensity ?? 150,
    starTwinkleSpeed: initialSettings?.starTwinkleSpeed ?? 1.0,
    starColorPalette: initialSettings?.starColorPalette ?? 'white',
    starDirection: initialSettings?.starDirection ?? 'left',
    shootingStarsEnabled: initialSettings?.shootingStarsEnabled ?? true,
    meteorRate: initialSettings?.meteorRate ?? 1.0,
    meteorColorPalette: initialSettings?.meteorColorPalette ?? 'orange',
    meteorSize: initialSettings?.meteorSize ?? 'normal',
    meteorSpeed: initialSettings?.meteorSpeed ?? 'normal',
    meteorStyle: initialSettings?.meteorStyle ?? 'streak',
    asteroidBeltEnabled: initialSettings?.asteroidBeltEnabled ?? false,
    asteroidCount: initialSettings?.asteroidCount ?? 12,
    asteroidSpeed: initialSettings?.asteroidSpeed ?? 1.0,
    asteroidStyle: initialSettings?.asteroidStyle ?? 'gray',

    nebulaDensity: initialSettings?.nebulaDensity ?? 4,
    nebulaOpacity: initialSettings?.nebulaOpacity ?? 0.4,
    nebulaScale: initialSettings?.nebulaScale ?? 1.0,
    nebulaDrift: initialSettings?.nebulaDrift ?? 0.5,
    nebulaPulseSpeed: initialSettings?.nebulaPulseSpeed ?? 1.0,
    nebulaColorPalette: initialSettings?.nebulaColorPalette ?? 'indigo_violet',
    nebulaShapeStyle: initialSettings?.nebulaShapeStyle ?? 'smooth',
    nebulaBanding: initialSettings?.nebulaBanding ?? 0.3,
    nebulaWispiness: initialSettings?.nebulaWispiness ?? 0.5,

    planetType: initialSettings?.planetType ?? 'none',
    planetScale: initialSettings?.planetScale ?? 1.0,
    planetPosX: initialSettings?.planetPosX ?? 150,
    planetPosY: initialSettings?.planetPosY ?? 400,
    planetOrbitRings: initialSettings?.planetOrbitRings ?? false,
    planetAtmosphereGlow: initialSettings?.planetAtmosphereGlow ?? 0.8,
    planetDetailLevel: initialSettings?.planetDetailLevel ?? 2.0,
    planetRotationSpeed: initialSettings?.planetRotationSpeed ?? 1.0,

    planetSecondaryType: initialSettings?.planetSecondaryType ?? 'none',
    planetSecondaryScale: initialSettings?.planetSecondaryScale ?? 0.6,
    planetSecondaryPosX: initialSettings?.planetSecondaryPosX ?? 500,
    planetSecondaryPosY: initialSettings?.planetSecondaryPosY ?? 200,
    planetSecondaryOrbitRings: initialSettings?.planetSecondaryOrbitRings ?? false,
    planetSecondaryAtmosphereGlow: initialSettings?.planetSecondaryAtmosphereGlow ?? 0,

    blackHoleEnabled: initialSettings?.blackHoleEnabled ?? false,
    blackHoleScale: initialSettings?.blackHoleScale ?? 1.0,
    blackHolePosX: initialSettings?.blackHolePosX ?? 600,
    blackHolePosY: initialSettings?.blackHolePosY ?? 160,
    blackHoleColor: initialSettings?.blackHoleColor ?? 'orange',
    blackHoleRingIntensity: initialSettings?.blackHoleRingIntensity ?? 0.8,
    blackHoleParticlePull: initialSettings?.blackHoleParticlePull ?? 1.0,

    structureType: initialSettings?.structureType ?? 'none',
    structureOpacity: initialSettings?.structureOpacity ?? 0.8,
    structureScale: initialSettings?.structureScale ?? 1.0,
    structurePosX: initialSettings?.structurePosX ?? 400,
    structurePosY: initialSettings?.structurePosY ?? 450,
    structureParallax: initialSettings?.structureParallax ?? 0.4,
    structureLightDensity: initialSettings?.structureLightDensity ?? 0.5,
    structureAnimationSpeed: initialSettings?.structureAnimationSpeed ?? 1.0,

    terrainType: initialSettings?.terrainType ?? 'none',
    terrainOpacity: initialSettings?.terrainOpacity ?? 0.9,
    terrainHorizonY: initialSettings?.terrainHorizonY ?? 500,
    terrainScale: initialSettings?.terrainScale ?? 1.0,
    terrainParallax: initialSettings?.terrainParallax ?? 0.6,
    terrainLayers: initialSettings?.terrainLayers ?? 2,
    terrainDetailLevel: initialSettings?.terrainDetailLevel ?? 3.0,
    terrainGlow: initialSettings?.terrainGlow ?? 0.5,

    weatherDensityMultiplier: initialSettings?.weatherDensityMultiplier ?? 1.0,
    weatherSpeedMultiplier: initialSettings?.weatherSpeedMultiplier ?? 1.0,
    weatherOpacity: initialSettings?.weatherOpacity ?? 0.8,
    weatherLayering: initialSettings?.weatherLayering ?? 'front',

    fogEnabled: initialSettings?.fogEnabled ?? false,
    fogColor: initialSettings?.fogColor ?? '#4f46e5',
    fogOpacity: initialSettings?.fogOpacity ?? 0.3,
    fogHeight: initialSettings?.fogHeight ?? 150,
    fogDrift: initialSettings?.fogDrift ?? 0.2,

    darknessEnabled: initialSettings?.darknessEnabled ?? false,
    darknessLevel: initialSettings?.darknessLevel ?? 0.8,
    playerLightRadius: initialSettings?.playerLightRadius ?? 160,
    playerLightSoftness: initialSettings?.playerLightSoftness ?? 0.8,
    playerLightColor: initialSettings?.playerLightColor ?? 'rgba(255, 255, 230, 0.95)',
    revealEnemies: initialSettings?.revealEnemies ?? true,
    revealItems: initialSettings?.revealItems ?? true,
    emergencyGlow: initialSettings?.emergencyGlow ?? false,

    trippyIntensity: initialSettings?.trippyIntensity ?? 0.0,
    trippyColorCycleSpeed: initialSettings?.trippyColorCycleSpeed ?? 1.0,
    geometricOverlay: initialSettings?.geometricOverlay ?? 'none',
    chromaticShimmer: initialSettings?.chromaticShimmer ?? 0.0,

    readabilityVeil: initialSettings?.readabilityVeil ?? 0.0,
    backgroundBrightnessLimit: initialSettings?.backgroundBrightnessLimit ?? 1.0,
    foregroundContrastAssist: initialSettings?.foregroundContrastAssist ?? false
  }));

  // Interface Tabs
  const [activeTab, setActiveTab] = useState<string>('presets');

  // Gameplay Preview Features
  const [gameplayPreview, setGameplayPreview] = useState(true);

  // Procedural Settings states
  const [proceduralSeed, setProceduralSeed] = useState(() => 'COSMOS-' + Math.floor(Math.random() * 100000));
  const [proceduralMood, setProceduralMood] = useState('calm');
  const [proceduralComplexity, setProceduralComplexity] = useState('balanced');
  const [proceduralReadability, setProceduralReadability] = useState('normal');
  const [proceduralLocation, setProceduralLocation] = useState('deep_space');

  // Lock configurations
  const [lockStars, setLockStars] = useState(false);
  const [lockSky, setLockSky] = useState(false);
  const [lockPlanet, setLockPlanet] = useState(false);
  const [lockTerrain, setLockTerrain] = useState(false);
  const [lockStructures, setLockStructures] = useState(false);
  const [lockWeather, setLockWeather] = useState(false);
  const [lockDarkness, setLockDarkness] = useState(false);

  // Copy paste dialog block
  const [jsonPasteInput, setJsonPasteInput] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Preset Applicator
  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setSkyPalette(p.sky);
    setBackdropTheme(p.bg);
    setWeatherEffect(p.weather);
    setSettings((prev: any) => ({
      ...prev,
      ...p.s,
      planetType: p.s.planetType || 'none',
      terrainType: p.s.terrainType || 'none',
      structureType: p.s.structureType || 'none',
      blackHoleEnabled: p.s.blackHoleEnabled || false,
      darknessEnabled: p.s.darknessEnabled || false
    }));
  };

  // Reset helpers
  const handleResetAll = () => {
    setSkyPalette('space_black');
    setBackdropTheme('deep_stars');
    setWeatherEffect('none');
    setSettings({
      starDensity: 150, starTwinkleSpeed: 1.0, starColorPalette: 'white', starDirection: 'left', shootingStarsEnabled: true,
      meteorRate: 1.0, meteorColorPalette: 'orange', meteorSize: 'normal', meteorSpeed: 'normal', meteorStyle: 'streak',
      asteroidBeltEnabled: false, asteroidCount: 12, asteroidSpeed: 1.0,
      asteroidStyle: 'gray', nebulaDensity: 0, nebulaOpacity: 0, nebulaScale: 1.0, nebulaDrift: 0.5,
      nebulaPulseSpeed: 1.0, nebulaColorPalette: 'indigo_violet', nebulaShapeStyle: 'smooth', nebulaBanding: 0.3,
      nebulaWispiness: 0.5, planetType: 'none', planetScale: 1.0, planetPosX: 150, planetPosY: 400,
      planetOrbitRings: false, planetAtmosphereGlow: 0.8, planetDetailLevel: 2.0, planetRotationSpeed: 1.0,
      planetSecondaryType: 'none', planetSecondaryScale: 0.6, planetSecondaryPosX: 500, planetSecondaryPosY: 200,
      planetSecondaryOrbitRings: false, planetSecondaryAtmosphereGlow: 0, blackHoleEnabled: false, blackHoleScale: 1.0,
      blackHolePosX: 600, blackHolePosY: 160, blackHoleColor: 'orange', blackHoleRingIntensity: 0.8,
      blackHoleParticlePull: 1.0, structureType: 'none', structureOpacity: 0.8, structureScale: 1.0,
      structurePosX: 400, structurePosY: 450, structureParallax: 0.4, structureLightDensity: 0.5,
      structureAnimationSpeed: 1.0, terrainType: 'none', terrainOpacity: 0.9, terrainHorizonY: 500,
      terrainScale: 1.0, terrainParallax: 0.6, terrainLayers: 2, terrainDetailLevel: 3.0, terrainGlow: 0.5,
      weatherDensityMultiplier: 1.0, weatherSpeedMultiplier: 1.0, weatherOpacity: 0.8, weatherLayering: 'front',
      fogEnabled: false, fogColor: '#4f46e5', fogOpacity: 0.3, fogHeight: 150, fogDrift: 0.2,
      darknessEnabled: false, darknessLevel: 0.8, playerLightRadius: 160, playerLightSoftness: 0.8,
      playerLightColor: 'rgba(255, 255, 230, 0.95)', revealEnemies: true, revealItems: true, emergencyGlow: false,
      trippyIntensity: 0.0, trippyColorCycleSpeed: 1.0, geometricOverlay: 'none', chromaticShimmer: 0.0,
      readabilityVeil: 0.0, backgroundBrightnessLimit: 1.0, foregroundContrastAssist: false
    });
  };

  const handleResetCurrentTab = () => {
    if (activeTab === 'sky_nebula') {
      setSettings((prev: any) => ({
        ...prev,
        nebulaDensity: 4, nebulaOpacity: 0.4, nebulaScale: 1.0, nebulaColorPalette: 'indigo_violet',
        trippyIntensity: 0.0, trippyColorCycleSpeed: 1.0, geometricOverlay: 'none', chromaticShimmer: 0.0
      }));
    } else if (activeTab === 'stars_meteors') {
      setSettings((prev: any) => ({
        ...prev,
        starDensity: 150, starTwinkleSpeed: 1.0, starColorPalette: 'white', starDirection: 'left',
        shootingStarsEnabled: true, meteorRate: 1.0, meteorColorPalette: 'orange',
        meteorSize: 'normal', meteorSpeed: 'normal', meteorStyle: 'streak',
        asteroidBeltEnabled: false, asteroidCount: 12, asteroidSpeed: 1.0
      }));
    } else if (activeTab === 'planets_suns') {
      setSettings((prev: any) => ({
        ...prev,
        planetType: 'none', planetScale: 1.0, planetPosX: 150, planetPosY: 400, planetOrbitRings: false,
        planetAtmosphereGlow: 0.8, planetSecondaryType: 'none', blackHoleEnabled: false
      }));
    } else if (activeTab === 'structures') {
      setSettings((prev: any) => ({
        ...prev,
        structureType: 'none', structureOpacity: 0.8, structureScale: 1.0, structurePosX: 400, structurePosY: 450
      }));
    } else if (activeTab === 'terrain') {
      setSettings((prev: any) => ({
        ...prev,
        terrainType: 'none', terrainOpacity: 0.9, terrainHorizonY: 500, terrainScale: 1.0, terrainLayers: 2
      }));
    } else if (activeTab === 'weather_fog') {
      setWeatherEffect('none');
      setSettings((prev: any) => ({
        ...prev,
        weatherDensityMultiplier: 1.0, weatherOpacity: 0.8, fogEnabled: false, fogColor: '#4f46e5', fogOpacity: 0.3
      }));
    } else if (activeTab === 'darkness_lighting') {
      setSettings((prev: any) => ({
        ...prev,
        darknessEnabled: false, darknessLevel: 0.8, playerLightRadius: 160, playerLightSoftness: 0.8,
        revealEnemies: true, revealItems: true
      }));
    } else if (activeTab === 'advanced') {
      setSettings((prev: any) => ({
        ...prev,
        readabilityVeil: 0.0, backgroundBrightnessLimit: 1.0, foregroundContrastAssist: false
      }));
    }
  };

  // Seeded deterministic generation algorithm
  const handleProceduralGenerate = () => {
    // string parsing to deterministic PRNG function
    let hash = 0;
    const sStr = String(proceduralSeed || 'COSMOS');
    for (let i = 0; i < sStr.length; i++) {
        hash = sStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    let stateSeed = hash;

    const rnd = () => {
      let t = stateSeed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const choose = (arr: any[]) => arr[Math.floor(rnd() * arr.length)];

    // 1. Skies selection by mood
    let generatedSky = skyPalette;
    if (!lockSky) {
      if (proceduralMood === 'toxic') {
        generatedSky = choose(['toxic_yellow_sky', 'acid_mist']);
      } else if (proceduralMood === 'volcanic') {
        generatedSky = choose(['red_giant_glow', 'crimson_eclipse']);
      } else if (proceduralMood === 'icy') {
        generatedSky = choose(['frozen_cyan_haze', 'pale_moon_dawn']);
      } else if (proceduralMood === 'psychedelic' || proceduralMood === 'rainbow_fever') {
        generatedSky = choose(['candy_nebula', 'radioactive_magenta', 'soft_pastel_dawn']);
      } else if (proceduralMood === 'industrial') {
        generatedSky = choose(['starless_black', 'golden_space_dusk']);
      } else if (proceduralMood === 'alien_city') {
        generatedSky = choose(['synthwave_sunset', 'neon_twilight']);
      } else if (proceduralMood === 'storm') {
        generatedSky = choose(['storm_indigo', 'electric_violet']);
      } else if (proceduralMood === 'sunset') {
        generatedSky = choose(['alien_sunset_orange', 'soft_pastel_dawn']);
      } else if (proceduralMood === 'night') {
        generatedSky = choose(['deep_blue_night', 'starless_black']);
      } else {
        generatedSky = choose(['deep_blue_night', 'neon_twilight', 'void_purple', 'emerald_twilight', 'obsidian_green']);
      }
      setSkyPalette(generatedSky);
    }

    // 2. Weather choice by mood & location
    let generatedWeather = weatherEffect;
    if (!lockWeather) {
      if (proceduralMood === 'toxic') {
        generatedWeather = choose(['toxic_fumes', 'acid_rain', 'alien_pollen']);
      } else if (proceduralMood === 'volcanic') {
        generatedWeather = choose(['embers', 'ash']);
      } else if (proceduralMood === 'icy') {
        generatedWeather = choose(['ice_shards', 'gentle_snow']);
      } else if (proceduralMood === 'psychedelic' || proceduralMood === 'rainbow_fever') {
        generatedWeather = choose(['prismatic_sparks', 'confetti_stars']);
      } else if (proceduralMood === 'storm') {
        generatedWeather = choose(['electrical_storm', 'ion_sparks']);
      } else if (proceduralMood === 'industrial') {
        generatedWeather = choose(['steam_mist', 'data_rain', 'glitch_pixels']);
      } else if (proceduralLocation === 'deep_space' || proceduralLocation === 'black_hole_zone') {
        generatedWeather = choose(['cosmic_dust', 'orbital_debris', 'meteor_sparks']);
      } else {
        generatedWeather = choose(['none', 'spurs', 'cosmic_dust', 'star_snow']);
      }
      setWeatherEffect(generatedWeather);
    }

    // Prepare generated fields
    const generated: any = {};

    // Complexity scalar
    let starDensityValue = 150;
    let nebulaNodes = 3;
    let weatherD = 1.0;
    if (proceduralComplexity === 'minimal') {
      starDensityValue = 40;
      nebulaNodes = 0;
      weatherD = 0.4;
    } else if (proceduralComplexity === 'balanced') {
      starDensityValue = 140;
      nebulaNodes = 3;
      weatherD = 0.9;
    } else {
      starDensityValue = 280;
      nebulaNodes = 5;
      weatherD = 1.4;
    }

    // Readability configurations
    let rawVeil = 0.0;
    let brightnessCap = 1.0;
    let contrastAssistBool = false;
    if (proceduralReadability === 'high') {
      rawVeil = 0.42;
      brightnessCap = 0.55;
      contrastAssistBool = true;
    } else if (proceduralReadability === 'normal') {
      rawVeil = 0.15;
      brightnessCap = 0.8;
    }

    // Lock merges
    if (!lockStars) {
      generated.starDensity = starDensityValue;
      generated.starTwinkleSpeed = 0.5 + rnd() * 1.5;
      generated.starColorPalette = choose(['white', 'multicolor', 'pastel', 'neon']);
      generated.shootingStarsEnabled = rnd() < 0.7;
    }

    if (!lockSky) {
      generated.nebulaDensity = nebulaNodes;
      generated.nebulaOpacity = nebulaNodes > 0 ? (0.2 + rnd() * 0.4) : 0;
      generated.nebulaScale = 0.5 + rnd() * 1.5;
      generated.nebulaColorPalette = choose(['indigo_violet', 'pink_magenta', 'cyan_blue', 'amber_red', 'emerald_teal', 'rainbow']);
      generated.trippyIntensity = (proceduralMood === 'psychedelic' || proceduralMood === 'rainbow_fever') ? (0.1 + rnd() * 0.4) : 0;
      generated.trippyColorCycleSpeed = 0.5 + rnd() * 1.5;
    }

    if (!lockPlanet) {
      if (proceduralLocation === 'black_hole_zone') {
        generated.blackHoleEnabled = true;
        generated.blackHoleScale = 0.8 + rnd() * 0.5;
        generated.blackHolePosX = 500 + rnd() * 150;
        generated.blackHolePosY = 150 + rnd() * 100;
        generated.blackHoleColor = choose(['orange', 'white', 'blue', 'magenta']);
        generated.planetType = 'none';
      } else {
        generated.blackHoleEnabled = false;
        // Determine type from mood
        if (proceduralMood === 'volcanic') generated.planetType = choose(['black_lava_planet', 'red_sun']);
        else if (proceduralMood === 'toxic') generated.planetType = choose(['toxic_world', 'glass_planet']);
        else if (proceduralMood === 'icy') generated.planetType = choose(['ice_world', 'shattered_moon']);
        else if (proceduralLocation === 'city_orbit' || proceduralLocation === 'industrial_station') generated.planetType = choose(['city_lights_planet', 'machine_planet']);
        else generated.planetType = choose(['ringed_giant', 'crater_moon', 'twin_moons', 'crescent_blue_world']);

        generated.planetScale = 0.7 + rnd() * 0.7;
        generated.planetPosX = 120 + rnd() * 550;
        generated.planetPosY = 350 + rnd() * 150;
        generated.planetOrbitRings = rnd() < 0.4;
        generated.planetAtmosphereGlow = 0.3 + rnd() * 0.6;
      }
    }

    if (!lockTerrain) {
      if (proceduralLocation === 'planet_surface') {
        generated.terrainType = choose(['alien_mountains', 'distant_mountains', 'rolling_neon_hills']);
      } else if (proceduralLocation === 'moonbase') {
        generated.terrainType = choose(['moonbase_horizon', 'crater_hills']);
      } else if (proceduralLocation === 'alien_wilderness') {
        generated.terrainType = choose(['alien_forest', 'toxic_swamp_canopy', 'rolling_neon_hills']);
      } else if (proceduralLocation === 'industrial_station') {
        generated.terrainType = choose(['industrial_pipes', 'station_gantry']);
      } else if (proceduralLocation === 'ancient_ruins') {
        generated.terrainType = 'ruined_temple_ridge';
      } else if (proceduralLocation === 'boss_realm') {
        generated.terrainType = choose(['crystal_spikes', 'biomechanical_ribs', 'black_lava_ridges']);
      } else {
        generated.terrainType = 'none';
      }
      generated.terrainOpacity = 0.6 + rnd() * 0.3;
      generated.terrainHorizonY = 480 + rnd() * 60;
      generated.terrainLayers = choose([1, 2, 3]);
    }

    if (!lockStructures) {
      if (proceduralLocation === 'city_orbit' || proceduralLocation === 'industrial_station') {
        generated.structureType = choose(['orbital_ring', 'city_skyline', 'refinery_towers', 'station_scaffold']);
      } else if (proceduralLocation === 'ancient_ruins') {
        generated.structureType = choose(['monoliths', 'ruined_temple', 'ancient_gateway']);
      } else if (proceduralLocation === 'moonbase') {
        generated.structureType = 'moonbase_domes';
      } else if (proceduralLocation === 'boss_realm') {
        generated.structureType = choose(['biomechanical_hive', 'crystal_city', 'power_pylons']);
      } else {
        generated.structureType = choose(['none', 'satellite_swarm', 'derelict_ship']);
      }
      generated.structureOpacity = 0.5 + rnd() * 0.4;
      generated.structureScale = 0.8 + rnd() * 0.5;
    }

    if (!lockDarkness) {
      if (proceduralMood === 'night') {
        generated.darknessEnabled = rnd() < 0.5;
        generated.darknessLevel = 0.65 + rnd() * 0.25;
        generated.playerLightRadius = 130 + rnd() * 60;
      } else {
        generated.darknessEnabled = false;
      }
    }

    // Apply complexity / readability forces
    generated.weatherDensityMultiplier = weatherD;
    generated.readabilityVeil = rawVeil;
    generated.backgroundBrightnessLimit = brightnessCap;
    generated.foregroundContrastAssist = contrastAssistBool;

    setSettings((prev: any) => ({
      ...prev,
      ...generated
    }));

    // Randomize the next seed so multi-clicks cycle beautifully!
    setProceduralSeed('COSMOS-' + Math.floor(rnd() * 100000));
  };

  // Clipboard Copier
  const handleCopyJson = () => {
    const fullSpec = {
      backdropTheme,
      skyPalette,
      weatherEffect,
      backdropSettings: settings
    };
    navigator.clipboard.writeText(JSON.stringify(fullSpec, null, 2))
      .then(() => alert('✓ Backdrop JSON configuration copied to clipboard successfully!'))
      .catch(err => alert('Failed copying JSON to clipboard: ' + err));
  };

  // Parser validation
  const handlePasteApplyJson = () => {
    setPasteError(null);
    if (!jsonPasteInput.trim()) {
      setPasteError('JSON block is empty.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonPasteInput);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('JSON structure is not an object.');
      }
      // Apply parsed properties safely with fallback protectors
      if (parsed.skyPalette) setSkyPalette(parsed.skyPalette);
      if (parsed.backdropTheme) setBackdropTheme(parsed.backdropTheme);
      if (parsed.weatherEffect) setWeatherEffect(parsed.weatherEffect);

      const bs = parsed.backdropSettings || parsed;
      setSettings((prev: any) => ({
        ...prev,
        ...bs
      }));
      alert('✓ Atmospheric Backdrop JSON successfully parsed and locked into current session state!');
    } catch (err: any) {
      setPasteError('Invalid JSON structure: ' + (err.message || err));
    }
  };

  // Compile active bundle package
  const getCompiledSettingsBundle = () => {
    return {
      ...settings,
      planetType: settings.planetType || 'none',
      terrainType: settings.terrainType || 'none',
      structureType: settings.structureType || 'none',
      weatherEffect: weatherEffect,
      skyPalette: skyPalette,
      backdropTheme: backdropTheme
    };
  };

  // Initialize Canvas simulation loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (!starfieldRef.current) {
      starfieldRef.current = new Starfield(GAME_WIDTH, GAME_HEIGHT, 450);
    }

    let animationId: number;
    let ticks = 0;

    const renderLoop = () => {
      ticks++;
      if (!ctx || !starfieldRef.current) return;

      const currentSettings = getCompiledSettingsBundle();

      // Clear Canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 1. Draw Starfield & Sky Backdrops
      starfieldRef.current.draw(ctx, GAME_WIDTH, GAME_HEIGHT, {
        backdropTheme,
        skyPalette,
        weatherEffect,
        backdropSettings: currentSettings,
        feverIntensity: 0.1,
        warpAmount: 0.0,
      });

      // 2. Draw Weather
      starfieldRef.current.drawWeatherOverlay(ctx, GAME_WIDTH, GAME_HEIGHT, {
        weatherEffect,
        backdropSettings: currentSettings,
      });

      // 3. Optional Readability Filter (Draws a translucent backing)
      if (currentSettings.readabilityVeil > 0.05) {
        ctx.fillStyle = `rgba(0, 0, 0, ${currentSettings.readabilityVeil})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // 4. Optionally Draw gameplay silhouettes to check readability & contrast assist
      if (gameplayPreview) {
        // Draw solid platform silhouettes
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#f59e0b'; // Neon orange platforms
        ctx.fillStyle = '#1e1b4b';

        // Ground line
        ctx.fillRect(0, GAME_HEIGHT - 25, GAME_WIDTH, 25);
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT - 25);
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 25);
        ctx.stroke();

        // Platform floats
        const platX1 = 120, platY1 = 420, platW1 = 200, platH1 = 14;
        ctx.fillRect(platX1, platY1, platW1, platH1);
        ctx.strokeRect(platX1, platY1, platW1, platH1);

        const platX2 = 480, platY2 = 320, platW2 = 240, platH2 = 14;
        ctx.fillRect(platX2, platY2, platW2, platH2);
        ctx.strokeRect(platX2, platY2, platW2, platH2);

        // Rocket Silhouette (yellow neon body)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#eab308';
        ctx.fillStyle = '#451a03';
        const rx = 220, ry = GAME_HEIGHT - 120, rw = 36, rh = 95;
        // Fins draw
        ctx.beginPath();
        ctx.moveTo(rx - 12, ry + rh);
        ctx.lineTo(rx + rw + 12, ry + rh);
        ctx.lineTo(rx + rw/2, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rocket cabin
        ctx.fillRect(rx, ry + 15, rw, rh - 15);
        ctx.strokeRect(rx, ry + 15, rw, rh - 15);

        // Player Astronaut Silhouette (Neon Cyan)
        const px = 200, py = 330;
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        // Jetpack nozzle sparks
        if (ticks % 10 < 7) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px - 14, py + 18, 6, 12);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(px - 12, py + 26, 3, 6);
        }
        // Astronaut circular bodies
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(px, py - 10, 8, 0, Math.PI * 2); // helmet
        ctx.fill();
        ctx.fillRect(px - 8, py - 1, 16, 22); // space suit chest
        ctx.strokeRect(px - 5, py - 12, 10, 6); // visor visor glass

        // Purple fuel canister pickup marker
        const fux = 560, fuy = 260;
        ctx.strokeStyle = '#d946ef';
        ctx.fillStyle = '#701a75';
        ctx.lineWidth = 2;
        ctx.strokeRect(fux, fuy, 16, 25);
        ctx.fillRect(fux, fuy, 16, 25);
        // glowing label fuel
        ctx.fillStyle = '#fdf4ff';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FUEL', fux + 8, fuy + 15);

        // Red Alien Saucer Enemy Marker
        const ax = 600, ay = 150;
        ctx.strokeStyle = '#ef4444';
        ctx.fillStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ax, ay, 20, 8, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // dome
        ctx.beginPath();
        ctx.arc(ax, ay - 3, 8, Math.PI, 0, false);
        ctx.closePath();
        ctx.stroke();

        // Optional Contrast Assist outline circles
        if (currentSettings.foregroundContrastAssist) {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(px - 14, py - 20, 28, 48); // assist player box
          ctx.strokeRect(fux - 4, fuy - 4, 24, 33); // assist canister box
          ctx.setLineDash([]);
        }

        // 5. Draw Flashlight mask circle if darknessEnabled
        if (currentSettings.darknessEnabled) {
          ctx.save();
          // Create temporary alpha channel clipping canvas mask
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = GAME_WIDTH;
          maskCanvas.height = GAME_HEIGHT;
          const mctx = maskCanvas.getContext('2d');
          if (mctx) {
            // Fill black overlay
            mctx.fillStyle = `rgba(0, 0, 0, ${currentSettings.darknessLevel ?? 0.8})`;
            mctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

            // Cut out flashlight cone (Player at px, py)
            mctx.globalCompositeOperation = 'destination-out';
            const fRadius = currentSettings.playerLightRadius ?? 160;
            const fSoft = currentSettings.playerLightSoftness ?? 0.8;

            const radialGrad = mctx.createRadialGradient(px, py, fRadius * (1 - fSoft), px, py, fRadius);
            radialGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

            mctx.fillStyle = radialGrad;
            mctx.beginPath();
            mctx.arc(px, py, fRadius, 0, Math.PI * 2);
            mctx.fill();

            // Draw composite mask back
            ctx.drawImage(maskCanvas, 0, 0);
          }
          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    skyPalette,
    backdropTheme,
    weatherEffect,
    settings,
    gameplayPreview
  ]);

  const handleSave = () => {
    onSave({
      backdropTheme,
      skyPalette,
      weatherEffect,
      backdropSettings: getCompiledSettingsBundle(),
    });
  };

  // Helper warning diagnostics calculations for live status readouts
  const getReadabilityStatus = () => {
    const bs = settings;
    let score = 'Good';
    let busyScore = 0;
    if (weatherEffect && weatherEffect !== 'none') busyScore += 2;
    if ((bs.nebulaDensity ?? 4) > 3) busyScore += 1;
    if ((bs.starDensity ?? 150) > 220) busyScore += 1;
    if (bs.structureType && bs.structureType !== 'none') busyScore += 1.5;
    if (bs.terrainType && bs.terrainType !== 'none') busyScore += 1.5;
    if (bs.asteroidBeltEnabled) busyScore += 1;
    if (bs.trippyIntensity > 0.4) busyScore += 2;

    if (busyScore >= 8) score = 'Heavy FX / Busy';
    else if (bs.darknessEnabled && (bs.darknessLevel ?? 0.8) > 0.85 && (bs.playerLightRadius ?? 160) < 130) score = 'Too Dark';
    else if (bs.backgroundBrightnessLimit < 0.6) score = 'Dark Veil Protected';
    return { score, busyScore };
  };

  const statusDiag = getReadabilityStatus();

  return (
    <div id="backdrop-designer-overlay" className="fixed inset-0 bg-[#020208]/95 backdrop-blur-md z-50 flex flex-col md:flex-row text-cyan-50 font-sans select-none animate-fadeIn">
      
      {/* LEFT: Live Simulation Canvas Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-5 border-b md:border-b-0 md:border-r border-cyan-950/60 bg-[#010103]/60 relative">
        <div className="flex items-center justify-between w-full max-w-[800px] mb-2 px-1">
          <div>
            <h1 className="text-sm font-bold tracking-wider text-cyan-400 uppercase font-mono">
              Cosmic Backdrop atmospheric Designer Pass 2
            </h1>
            <p className="text-[10px] text-cyan-600 font-mono">
              ATMOSPHERIC REPLAY DECK | 800x600 logical canvas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-cyan-300">
              <input
                type="checkbox"
                checked={gameplayPreview}
                onChange={(e) => setGameplayPreview(e.target.checked)}
                className="accent-cyan-400 rounded bg-black border-cyan-900"
              />
              ⚙️ Overlay Gameplay Readability
            </label>
            <button 
              type="button"
              onClick={() => starfieldRef.current?.triggerReaction('launch')} 
              className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-800 text-cyan-300 font-mono text-[9px] uppercase hover:bg-cyan-700/40 rounded transition-all active:scale-95"
            >
              🚀 Warp Reaction
            </button>
          </div>
        </div>

        {/* Canvas Holding Box */}
        <div id="designer-canvas-frame" className="relative p-1 bg-[#050510] border shadow-[0_0_24px_rgba(6,182,212,0.15)] overflow-hidden max-w-full">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="aspect-[4/3] block max-h-[64vh] rounded-sm bg-[#000000]"
          />
        </div>

        {/* Live Diagnostics Bar */}
        <div className="mt-2.5 flex items-center gap-4 text-[10px] text-cyan-500 uppercase font-mono tracking-tight bg-cyan-950/20 p-2 rounded border border-cyan-950/60 max-w-[600px] w-full justify-between">
          <span>Readability Diagnostic: 
            <span className={`font-bold ml-1.5 ${statusDiag.score === 'Good' ? 'text-green-400' : 'text-amber-500'}`}>
              {statusDiag.score}
            </span>
          </span>
          <span>Entropy Rating: <span className="text-cyan-300">{statusDiag.busyScore.toFixed(0)}</span></span>
          <span>Seed value: <span className="text-purple-400">{proceduralSeed}</span></span>
        </div>
      </div>

      {/* RIGHT: Variable Slider Tuning Deck */}
      <div className="w-full md:w-[440px] bg-[#02020a] border-l border-cyan-950 flex flex-col h-full overflow-hidden shadow-2xl">
        
        {/* Header toolbar */}
        <div className="p-3 border-b border-cyan-950 flex items-center justify-between bg-cyan-950/15 shrink-0">
          <div>
            <span className="text-[9px] text-cyan-500 font-mono font-bold uppercase tracking-widest block">ENVIRONMENT EDITOR</span>
            <span className="text-xs text-cyan-200 font-bold uppercase font-mono">NEON COSMOS LAB</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-2.5 hover:bg-red-950/20 hover:border-red-850 border border-transparent text-cyan-500 hover:text-red-400 font-mono text-[10px] uppercase transition-all rounded"
          >
            ✕ Close
          </button>
        </div>

        {/* Tab Selection grid - 10 tabs neatly categorized */}
        <div className="grid grid-cols-5 border-b border-cyan-950 text-center text-[10px] font-mono shrink-0 bg-black/40">
          <button onClick={() => setActiveTab('presets')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'presets' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Presets</button>
          <button onClick={() => setActiveTab('sky_nebula')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'sky_nebula' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Sky</button>
          <button onClick={() => setActiveTab('stars_meteors')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'stars_meteors' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Stars</button>
          <button onClick={() => setActiveTab('planets_suns')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'planets_suns' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Planets</button>
          <button onClick={() => setActiveTab('structures')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'structures' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Systems</button>
          
          <button onClick={() => setActiveTab('terrain')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'terrain' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Terrain</button>
          <button onClick={() => setActiveTab('weather_fog')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'weather_fog' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Weather</button>
          <button onClick={() => setActiveTab('darkness_lighting')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'darkness_lighting' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Darkness</button>
          <button onClick={() => setActiveTab('procedural')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'procedural' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Procedural</button>
          <button onClick={() => setActiveTab('advanced')} className={`py-2 border-b hover:bg-cyan-950/20 ${activeTab === 'advanced' ? 'border-cyan-400 text-cyan-200 bg-cyan-950/10' : 'border-transparent text-cyan-600'}`}>Readability</button>
        </div>

        {/* Parameter Panels with scroll feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 select-none scrollbar-thin">
          
          {/* TAB 1: PRESETS COHERENT LISTS */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5 animate-fadeIn">
              <span className="text-[9px] text-cyan-600 font-mono font-bold uppercase tracking-wider block">CURATED COSMIC BIOMES (30 PRESETS)</span>
              <div className="grid grid-cols-1 gap-1.5 h-[60vh] overflow-y-auto pr-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPreset(p)}
                    className="p-2 text-left bg-cyan-950/10 hover:bg-cyan-900/40 border border-cyan-950 hover:border-cyan-700/60 rounded transition-all group flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[11px] font-bold text-cyan-300 font-mono">{p.name}</span>
                      <span className="text-[8px] text-cyan-500 font-mono uppercase opacity-50 group-hover:opacity-100 group-hover:text-cyan-300">Equip biome →</span>
                    </div>
                    <span className="text-[9px] text-cyan-600/90 mt-0.5 font-sans leading-tight">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SKY / NEBULA CLOUDS */}
          {activeTab === 'sky_nebula' && (
            <div className="space-y-4.5 animate-fadeIn text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Horizon Color Stops (Sky Palette)</label>
                <select
                  value={skyPalette}
                  onChange={(e) => setSkyPalette(e.target.value)}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs focus:ring-1 focus:ring-cyan-500 font-mono outline-none rounded"
                >
                  <option value="space_black">Absolute Space Void</option>
                  <option value="neon_twilight">Hot Neon Pink Twilight</option>
                  <option value="radioactive_aurora">Radioactive Green Horizon</option>
                  <option value="acid_mist">Sickly Swamp Yellow Daze</option>
                  <option value="cosmic_pink">Cyber Violet Sunrise</option>
                  <option value="void_purple">High Contrast Void Purple</option>
                  <option value="underwater_space_blue">Deep Underwater Space Blue</option>
                  <option value="emerald_twilight">Enchanted Emerald Twilight</option>
                  <option value="frozen_cyan_haze">Subzero Cyan Haze</option>
                  <option value="golden_space_dusk">Dusty Golden Space Dusk</option>
                  <option value="candy_nebula">Swirling Candy Nebula Pink</option>
                  <option value="red_giant_glow">Red Giant Corona Glow</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-cyan-950/40">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Nebula Base Material Style</label>
                <select
                  value={backdropTheme}
                  onChange={(e) => setBackdropTheme(e.target.value)}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs focus:ring-1 focus:ring-cyan-500 font-mono outline-none rounded"
                >
                  <option value="deep_stars">Classic Deep Stars Only</option>
                  <option value="layered_nebula">Layered Volumetric Vapor Nebulae</option>
                  <option value="black_hole">Singularity Accretion Horizon</option>
                  <option value="alien_planet">Gigantic Gas Giant Silhouette</option>
                  <option value="dimensional_void">Psychedelic Aurora Veil</option>
                  <option value="space_station">Orbital Docking Silhouette</option>
                </select>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">NEBULA SECTORS</span>
                
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-cyan-400">Nebula Node Density</span>
                    <span>{settings.nebulaDensity} nodes</span>
                  </div>
                  <input type="range" min="0" max="5" step="1" value={settings.nebulaDensity} onChange={(e) => setSettings({...settings, nebulaDensity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-cyan-400">Nebula Blend Opacity</span>
                    <span>{(settings.nebulaOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="0.9" step="0.05" value={settings.nebulaOpacity} onChange={(e) => setSettings({...settings, nebulaOpacity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  {(settings.nebulaOpacity > 0.8) && <div className="text-[9px] text-amber-500 font-mono uppercase">⚠ Nebula levels could reduce foreground contrast</div>}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-cyan-400">Nebula scale diameter</span>
                    <span>{settings.nebulaScale.toFixed(2)}x</span>
                  </div>
                  <input type="range" min="0.3" max="2.8" step="0.1" value={settings.nebulaScale} onChange={(e) => setSettings({...settings, nebulaScale: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Nebula Color Stop spectrum</label>
                  <select
                    value={settings.nebulaColorPalette}
                    onChange={(e) => setSettings({...settings, nebulaColorPalette: e.target.value})}
                    className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono outline-none rounded"
                  >
                    <option value="indigo_violet">Volcanic Violet</option>
                    <option value="pink_magenta">Ethereal Soft Pink</option>
                    <option value="cyan_blue">Cosmic Cool Cyan</option>
                    <option value="amber_red">Smoldering Amber-Red</option>
                    <option value="emerald_teal">Magnetic Emerald Teal</option>
                    <option value="rainbow">Kaleidoscope Spectrum Cycle</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">PSYCHEDELIC COLOR ROTATIONS</span>
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-cyan-400 font-bold">Vaporwave Trippy Intensity</span>
                    <span>{(settings.trippyIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={settings.trippyIntensity} onChange={(e) => setSettings({...settings, trippyIntensity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STARS / METEORS */}
          {activeTab === 'stars_meteors' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">BACKGROUND DUST FIELD</span>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-cyan-400">Total Stellar Density</span>
                  <span>{settings.starDensity} particles</span>
                </div>
                <input type="range" min="10" max="400" step="10" value={settings.starDensity} onChange={(e) => setSettings({...settings, starDensity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-cyan-400">Star Twinkle Hertz speed</span>
                  <span>{settings.starTwinkleSpeed.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.1" max="2.8" step="0.1" value={settings.starTwinkleSpeed} onChange={(e) => setSettings({...settings, starTwinkleSpeed: Number(e.target.value)})} className="w-full accent-cyan-400"/>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Star Color Schema</label>
                <select
                  value={settings.starColorPalette}
                  onChange={(e) => setSettings({...settings, starColorPalette: e.target.value})}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  <option value="white">Retro Arcade White</option>
                  <option value="multicolor">Prismatic Natural colors</option>
                  <option value="neon">Flashy Cyberpunk Neons</option>
                  <option value="pastel">Calming Dreamy Pastels</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Starfield Drift Direction</label>
                <select
                  value={settings.starDirection || 'left'}
                  onChange={(e) => setSettings({...settings, starDirection: e.target.value})}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  <option value="left">Drift Left (Westward Cruise)</option>
                  <option value="right">Drift Right (Eastward Cruise)</option>
                  <option value="up">Drift Upward (Suborbital Ascent)</option>
                  <option value="down">Drift Downward (Cosmic Re-entry)</option>
                </select>
              </div>

              <div className="space-y-3 pt-2 border-t border-cyan-950/40">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="designer-shootingstar" checked={settings.shootingStarsEnabled} onChange={(e) => setSettings({...settings, shootingStarsEnabled: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                  <label htmlFor="designer-shootingstar" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer">Activate shooting star arcs</label>
                </div>

                {settings.shootingStarsEnabled && (
                  <div className="space-y-3 pl-3.5 border-l border-cyan-950 bg-cyan-950/10 p-2 rounded animate-fadeIn">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Meteor spawn rate (frequency)</span>
                        <span>{settings.meteorRate !== undefined ? settings.meteorRate.toFixed(1) : '1.0'}x</span>
                      </div>
                      <input type="range" min="0.2" max="6.0" step="0.2" value={settings.meteorRate !== undefined ? settings.meteorRate : 1.0} onChange={(e) => setSettings({...settings, meteorRate: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Meteor Tail Style</label>
                        <select
                          value={settings.meteorStyle || 'streak'}
                          onChange={(e) => setSettings({...settings, meteorStyle: e.target.value})}
                          className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-[11px] font-mono outline-none rounded"
                        >
                          <option value="streak">Arcing Streak</option>
                          <option value="comet">Majestic Comet</option>
                          <option value="fireball">Scalloped Fireball</option>
                          <option value="plasma_blast">Cyber Plasma Blast</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Color Palette</label>
                        <select
                          value={settings.meteorColorPalette || 'orange'}
                          onChange={(e) => setSettings({...settings, meteorColorPalette: e.target.value})}
                          className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-[11px] font-mono outline-none rounded"
                        >
                          <option value="orange">Fusion Orange</option>
                          <option value="cyan">Neon Quantum Cyan</option>
                          <option value="pink">Hyper pink</option>
                          <option value="emerald">Acid Emerald</option>
                          <option value="yellow">Solar Flare Yellow</option>
                          <option value="purple">Event Horizon Purple</option>
                          <option value="white">Supernova White</option>
                          <option value="rainbow">Prismatic Rainbow</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Meteor Core Size</label>
                        <select
                          value={settings.meteorSize || 'normal'}
                          onChange={(e) => setSettings({...settings, meteorSize: e.target.value})}
                          className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-[11px] font-mono outline-none rounded"
                        >
                          <option value="tiny">Micro Spark</option>
                          <option value="normal">Standard Core</option>
                          <option value="massive">Giga Boulder</option>
                          <option value="colossal">Colossal Armageddon</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Travel Velocity</label>
                        <select
                          value={settings.meteorSpeed || 'normal'}
                          onChange={(e) => setSettings({...settings, meteorSpeed: e.target.value})}
                          className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-[11px] font-mono outline-none rounded"
                        >
                          <option value="slow">Cruising Slow</option>
                          <option value="normal">Standard Speed</option>
                          <option value="fast">Warp Hyper</option>
                          <option value="ludicrous">Ludicrous speed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">ASTEROID DEBRIS BELTS</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="designer-asteroidbelt" checked={settings.asteroidBeltEnabled} onChange={(e) => setSettings({...settings, asteroidBeltEnabled: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                  <label htmlFor="designer-asteroidbelt" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer font-bold">Draw Drift Layer asteroids</label>
                </div>

                {settings.asteroidBeltEnabled && (
                  <div className="space-y-3.5 pl-3.5 border-l border-cyan-950/80 animate-fadeIn bg-cyan-950/5 p-2 rounded">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Asteroid pieces count</span>
                        <span>{settings.asteroidCount} chunks</span>
                      </div>
                      <input type="range" min="3" max="30" step="1" value={settings.asteroidCount} onChange={(e) => setSettings({...settings, asteroidCount: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Drift Horizontal Velocity</span>
                        <span>{settings.asteroidSpeed.toFixed(1)}x</span>
                      </div>
                      <input type="range" min="0.1" max="2.5" step="0.1" value={settings.asteroidSpeed} onChange={(e) => setSettings({...settings, asteroidSpeed: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PLANETS / SUNS */}
          {activeTab === 'planets_suns' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">PRIMARY CELESTIAL ALIGNMENTS</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Primary World Type</label>
                <select
                  value={settings.planetType}
                  onChange={(e) => setSettings({...settings, planetType: e.target.value})}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  {PLANET_TYPES.map(p => (
                    <option key={p.val} value={p.val}>{p.label}</option>
                  ))}
                </select>
              </div>

              {settings.planetType !== 'none' && (
                <div className="space-y-3.5 pl-3.5 border-l border-cyan-950/80 p-2 rounded bg-cyan-950/5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Scale Radius</span>
                      <span>{settings.planetScale.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.3" max="2.4" step="0.05" value={settings.planetScale} onChange={(e) => setSettings({...settings, planetScale: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Position X (axis width)</span>
                      <span>{settings.planetPosX}px</span>
                    </div>
                    <input type="range" min="-100" max="900" step="5" value={settings.planetPosX} onChange={(e) => setSettings({...settings, planetPosX: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Position Y (axis height)</span>
                      <span>{settings.planetPosY}px</span>
                    </div>
                    <input type="range" min="-100" max="700" step="5" value={settings.planetPosY} onChange={(e) => setSettings({...settings, planetPosY: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400 font-bold">Atmosphere Glow Bloom</span>
                      <span>{(settings.planetAtmosphereGlow * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={settings.planetAtmosphereGlow} onChange={(e) => setSettings({...settings, planetAtmosphereGlow: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="designer-primaryrings" checked={settings.planetOrbitRings} onChange={(e) => setSettings({...settings, planetOrbitRings: e.target.checked})} className="accent-cyan-400 rounded h-3 w-3 bg-black"/>
                    <label htmlFor="designer-primaryrings" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer">Equip Saturnian Ring Belt</label>
                  </div>
                </div>
              )}

              {/* BLACK HOLE SINGULARITIES */}
              <div className="space-y-3 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">GRAVITATIONAL ACCRETION BLACK HOLES</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="designer-bh-bool" checked={settings.blackHoleEnabled} onChange={(e) => setSettings({...settings, blackHoleEnabled: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                  <label htmlFor="designer-bh-bool" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer font-bold">Enable vortex Singularity</label>
                </div>

                {settings.blackHoleEnabled && (
                  <div className="space-y-3 pl-3 border-l border-cyan-950 bg-cyan-950/10 p-2 rounded animate-fadeIn">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Gravitational Core diameter</span>
                        <span>{settings.blackHoleScale.toFixed(2)}x</span>
                      </div>
                      <input type="range" min="0.4" max="2.4" step="0.1" value={settings.blackHoleScale} onChange={(e) => setSettings({...settings, blackHoleScale: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Suck/Pull Dust intensity</label>
                      <select
                        value={settings.blackHoleColor}
                        onChange={(e) => setSettings({...settings, blackHoleColor: e.target.value})}
                        className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono outline-none rounded"
                      >
                        <option value="orange">Hot Accretion Amber-Orange</option>
                        <option value="white">Blinding light white</option>
                        <option value="blue">Cyan Supernova Blue</option>
                        <option value="magenta">Ultraviolet Magnetar Pink</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STRUCTURES */}
          {activeTab === 'structures' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold font-bold">MEGAPOWER BACKGROUND SILHOUETTES</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Background Megastructure Silhouettes</label>
                <select
                  value={settings.structureType}
                  onChange={(e) => setSettings({...settings, structureType: e.target.value})}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  {STRUCTURE_TYPES.map(s => (
                    <option key={s.val} value={s.val}>{s.label}</option>
                  ))}
                </select>
              </div>

              {settings.structureType !== 'none' && (
                <div className="space-y-3.5 pl-3 border-l border-cyan-950 bg-cyan-950/5 p-2 rounded animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Silhouette Opacity opacity</span>
                      <span>{(settings.structureOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0.05" max="1" step="0.05" value={settings.structureOpacity} onChange={(e) => setSettings({...settings, structureOpacity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    {settings.structureOpacity > 0.9 && <div className="text-[9px] text-amber-500 font-mono uppercase">⚠ High opacity may resemble actionable solid platforms</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Structural Scale multiplier</span>
                      <span>{settings.structureScale.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.3" max="2.4" step="0.1" value={settings.structureScale} onChange={(e) => setSettings({...settings, structureScale: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TERRAIN / LANDSCAPES */}
          {activeTab === 'terrain' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold font-bold font-bold">DECORATIVE DEEP LANDSCAPINGS</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Natural Landscape Type</label>
                <select
                  value={settings.terrainType}
                  onChange={(e) => setSettings({...settings, terrainType: e.target.value})}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  {TERRAIN_TYPES.map(t => (
                    <option key={t.val} value={t.val}>{t.label}</option>
                  ))}
                </select>
              </div>

              {settings.terrainType !== 'none' && (
                <div className="space-y-3.5 pl-3 border-l border-cyan-950 bg-cyan-950/5 p-2 rounded animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Mountains Opacity level</span>
                      <span>{(settings.terrainOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.05" value={settings.terrainOpacity} onChange={(e) => setSettings({...settings, terrainOpacity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    {settings.terrainOpacity > 0.9 && <div className="text-[9px] text-amber-500 font-mono uppercase">⚠ Landscape peaks might deceive active players</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Perspective Parallax depth</span>
                      <span>{settings.terrainParallax.toFixed(2)}x speed</span>
                    </div>
                    <input type="range" min="0.1" max="0.95" step="0.05" value={settings.terrainParallax} onChange={(e) => setSettings({...settings, terrainParallax: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Total Layer heights</span>
                      <span>{settings.terrainLayers} overlapping layers</span>
                    </div>
                    <input type="range" min="1" max="4" step="1" value={settings.terrainLayers} onChange={(e) => setSettings({...settings, terrainLayers: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>
                </div>
              )}
              <div className="p-2.5 bg-cyan-950/15 border border-cyan-900/40 rounded text-[9px] text-cyan-400 italic font-mono leading-relaxed mt-2.5">
                NOTE: Background landscape layers are strictly visual decorations for neon style depth and do NOT possess any active block collisions.
              </div>
            </div>
          )}

          {/* TAB 7: WEATHER / FOG */}
          {activeTab === 'weather_fog' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">ATMOSPHERIC WEATHER REPLAY DECK</span>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-cyan-500 uppercase font-mono font-bold">Visual Weather Particle Flux</label>
                <select
                  value={weatherEffect}
                  onChange={(e) => setWeatherEffect(e.target.value)}
                  className="bg-[#050510] border border-cyan-950 text-cyan-100 p-2 text-xs font-mono outline-none rounded"
                >
                  {WEATHER_EFFECTS.map(we => (
                    <option key={we.val} value={we.val}>{we.label}</option>
                  ))}
                </select>
              </div>

              {weatherEffect !== 'none' && (
                <div className="space-y-3 pl-3 border-l border-cyan-950 bg-cyan-950/5 p-2 rounded animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Storm Particle Density Scalar</span>
                      <span>{settings.weatherDensityMultiplier.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.2" max="2.5" step="0.1" value={settings.weatherDensityMultiplier} onChange={(e) => setSettings({...settings, weatherDensityMultiplier: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Storm speed hertz speed</span>
                      <span>{settings.weatherSpeedMultiplier.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.1" max="2.5" step="0.1" value={settings.weatherSpeedMultiplier} onChange={(e) => setSettings({...settings, weatherSpeedMultiplier: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>
                </div>
              )}

              {/* FOG CONTROLS */}
              <div className="space-y-3 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold font-bold">AMORPHOUS GROUND FOG</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="designer-fog-on" checked={settings.fogEnabled} onChange={(e) => setSettings({...settings, fogEnabled: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                  <label htmlFor="designer-fog-on" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer">Activate planetary mist</label>
                </div>

                {settings.fogEnabled && (
                  <div className="space-y-3 pl-3 border-l border-cyan-950 bg-cyan-950/10 p-2 rounded animate-fadeIn">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Mist height level</span>
                        <span>{settings.fogHeight}px vertical bounds</span>
                      </div>
                      <input type="range" min="40" max="350" step="10" value={settings.fogHeight} onChange={(e) => setSettings({...settings, fogHeight: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-cyan-400">Mist opacity thickness</span>
                        <span>{(settings.fogOpacity * 100).toFixed(0)}% thick</span>
                      </div>
                      <input type="range" min="0.05" max="0.75" step="0.05" value={settings.fogOpacity} onChange={(e) => setSettings({...settings, fogOpacity: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: DARKNESS / LIGHTING */}
          {activeTab === 'darkness_lighting' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold pb-1 font-bold">FLASHLIGHT / SURVIVAL DARK HOURS</span>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="designer-dark-on" checked={settings.darknessEnabled} onChange={(e) => setSettings({...settings, darknessEnabled: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                <label htmlFor="designer-dark-on" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer font-bold">Enable flashlight blindness level</label>
              </div>

              {settings.darknessEnabled && (
                <div className="space-y-3.5 pl-3 border-l border-cyan-950 bg-cyan-950/5 p-2 rounded animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Absolute Darkness level</span>
                      <span>{(settings.darknessLevel * 100).toFixed(0)}% black</span>
                    </div>
                    <input type="range" min="0.1" max="0.98" step="0.02" value={settings.darknessLevel} onChange={(e) => setSettings({...settings, darknessLevel: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Player lantern range sphere</span>
                      <span>{settings.playerLightRadius} logical px</span>
                    </div>
                    <input type="range" min="50" max="350" step="10" value={settings.playerLightRadius} onChange={(e) => setSettings({...settings, playerLightRadius: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                    {settings.playerLightRadius < 110 && <div className="text-[9px] text-rose-500 font-mono uppercase font-bold">⚠ Critical warning: flashlight circle is too small! Players cannot read oncoming enemies.</div>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="text-cyan-400">Lantern bloom softness (feather)</span>
                      <span>{(settings.playerLightSoftness * 100).toFixed(0)}% soft grad</span>
                    </div>
                    <input type="range" min="0.1" max="0.95" step="0.05" value={settings.playerLightSoftness} onChange={(e) => setSettings({...settings, playerLightSoftness: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: PROCEDURAL BACKDROP GENERATOR */}
          {activeTab === 'procedural' && (
            <div className="space-y-3 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold font-bold font-bold font-bold">COHERENT DETERMINISTIC SEED SYNTHESIZER</span>

              <div className="flex gap-1.5 items-center bg-black/40 p-2 border border-cyan-950 rounded">
                <input
                  type="text"
                  placeholder="Entropy Seed string"
                  value={proceduralSeed}
                  onChange={(e) => setProceduralSeed(e.target.value.toUpperCase().slice(0, 24))}
                  className="bg-[#050510] border border-cyan-950 text-cyan-300 p-1 px-2 text-xs font-mono outline-none rounded flex-1 uppercase"
                />
                <button
                  type="button"
                  onClick={() => setProceduralSeed('COSMOS-' + Math.floor(Math.random() * 100000))}
                  className="px-2 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono text-[10px] uppercase active:scale-95 hover:bg-cyan-900"
                >
                  🎲 Seed
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Coherent Mood preset</label>
                  <select value={proceduralMood} onChange={(e) => setProceduralMood(e.target.value)} className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono rounded">
                    <option value="calm">Calm Zen Space</option>
                    <option value="heroic">Heroic Retro Starway</option>
                    <option value="eerie">Eerie Gravitational Rift</option>
                    <option value="toxic">Corrosive Toxic Fumes</option>
                    <option value="volcanic">Molten Volcanic Giant</option>
                    <option value="icy">Zero-Kelvin Frozen Peak</option>
                    <option value="psychedelic">Psychedelic Kaleidoscopes</option>
                    <option value="industrial">Heavy Industry Scaffold</option>
                    <option value="alien_city">Megacity Neon Skyline</option>
                    <option value="deep_space">Classic vacuum Void</option>
                    <option value="sunset">Warm Vapor Sunset</option>
                    <option value="night">Dark flashlight test</option>
                    <option value="storm">Electro Static Storm</option>
                    <option value="boss_arena">Dramatic Hazard Realm</option>
                    <option value="cute_weird">Playfully Cute Weird</option>
                    <option value="rainbow_fever">Prismatic Rainbow Fever</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Terrain Location Profile</label>
                  <select value={proceduralLocation} onChange={(e) => setProceduralLocation(e.target.value)} className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono rounded">
                    <option value="deep_space">Pure Space Orbit (Vacuum)</option>
                    <option value="planet_surface">Cosmic Mountain peaks</option>
                    <option value="moonbase">Moon Crater base dunes</option>
                    <option value="city_orbit">Metropolitan Skylines</option>
                    <option value="alien_wilderness">Luminescent Swamps & Forests</option>
                    <option value="industrial_station">Steel Refinery pipelines</option>
                    <option value="black_hole_zone">Gravitational accretion rifts</option>
                    <option value="nebula_field">Volumetric Nebula clusters</option>
                    <option value="ancient_ruins">Stone Archeological Temples</option>
                    <option value="boss_realm">Spore hives & Crystal beds</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">FX complexity</label>
                  <select value={proceduralComplexity} onChange={(e) => setProceduralComplexity(e.target.value)} className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono rounded">
                    <option value="minimal">Minimal / High Frame rate</option>
                    <option value="balanced">Balanced performance</option>
                    <option value="rich">Rich volumetric layers</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-cyan-500 uppercase font-mono font-bold">Safety readability</label>
                  <select value={proceduralReadability} onChange={(e) => setProceduralReadability(e.target.value)} className="bg-[#050510] border border-cyan-950 text-cyan-100 p-1.5 text-xs font-mono rounded">
                    <option value="high">Highly readable (contrast block)</option>
                    <option value="normal">Standard readability</option>
                    <option value="cinematic">Cinematic raw beauty</option>
                  </select>
                </div>
              </div>

              {/* Locks Sub-panel */}
              <div className="p-2.5 bg-black/40 border border-cyan-950 rounded mt-1 text-[10px]">
                <span className="text-[9px] text-cyan-600 font-mono font-bold uppercase block mb-1.5">PREVENT SELECTOR OVERWRITES (LOCKS)</span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-cyan-300">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockStars} onChange={(e) => setLockStars(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Stars</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockSky} onChange={(e) => setLockSky(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Sky</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockPlanet} onChange={(e) => setLockPlanet(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Planet</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockTerrain} onChange={(e) => setLockTerrain(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Landscape</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockStructures} onChange={(e) => setLockStructures(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Structures</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={lockWeather} onChange={(e) => setLockWeather(e.target.checked)} className="accent-cyan-400 rounded"/> Lock Weather</label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceduralGenerate}
                className="w-full py-2 bg-gradient-to-r from-purple-800 to-cyan-700 hover:from-purple-700 hover:to-cyan-600 text-white font-mono text-xs uppercase font-bold rounded shadow-[0_0_12px_rgba(147,51,234,0.3)] border border-purple-650 tracking-widest active:scale-98 mt-1.5"
              >
                ⚡ Generate Coherent Backdrop
              </button>
            </div>
          )}

          {/* TAB 10: ADVANCED READABILITY VEIL & COPY PASTE */}
          {activeTab === 'advanced' && (
            <div className="space-y-3.5 animate-fadeIn text-xs">
              <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">SOLUTIONS FOR FOREGROUND CONTRAST READABILITY</span>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-cyan-400">Readability Contrast Veil</span>
                  <span>{(settings.readabilityVeil * 100).toFixed(0)}% darkness</span>
                </div>
                <input type="range" min="0" max="0.75" step="0.05" value={settings.readabilityVeil} onChange={(e) => setSettings({...settings, readabilityVeil: Number(e.target.value)})} className="w-full accent-cyan-400"/>
                <div className="text-[9px] text-cyan-500 font-sans leading-tight">Spawns a translucent dark filter behind platforms, making items and characters extremely crisp on cluttered backdrops.</div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-cyan-950/40">
                <input type="checkbox" id="designer-contrast-assist" checked={settings.foregroundContrastAssist} onChange={(e) => setSettings({...settings, foregroundContrastAssist: e.target.checked})} className="accent-cyan-400 rounded h-3.5 w-3.5 bg-black"/>
                <label htmlFor="designer-contrast-assist" className="text-[10px] font-mono text-cyan-300 uppercase cursor-pointer">Activate active border outline blocks</label>
              </div>

              {/* JSON COPY PASTE */}
              <div className="space-y-2 pt-2 border-t border-cyan-950/40">
                <span className="text-[10px] text-cyan-600 font-mono font-bold uppercase tracking-wider block font-bold">PORTABILITY & DATA TRANSFERS</span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex-1 py-2 border border-cyan-800 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-200 font-mono text-[10px] uppercase rounded transition-all active:scale-95"
                  >
                    📋 Copy Backdrop JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const baseTheme = getDefaultBackdropSettingsForTheme('deep_stars');
                      setSettings(baseTheme);
                    }}
                    className="py-2 px-3 border border-red-950 bg-red-950/20 text-red-400 font-mono text-[10px] uppercase rounded transition-all hover:bg-red-900/25 active:scale-95 animate-fadeIn"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-1 mt-2.5">
                  <label className="text-[10px] text-cyan-500 font-mono font-bold block uppercase">Paste Visual JSON Data</label>
                  <textarea
                    rows={4}
                    placeholder="Paste backdropSettings JSON block here..."
                    value={jsonPasteInput}
                    onChange={(e) => setJsonPasteInput(e.target.value)}
                    className="w-full bg-[#030308] border border-cyan-950 p-2 text-[10px] font-mono text-emerald-300 outline-none rounded focus:border-cyan-800"
                  />
                  {pasteError && <div className="text-[9px] text-rose-500 font-mono">{pasteError}</div>}
                  <button
                    type="button"
                    onClick={handlePasteApplyJson}
                    className="w-full py-1.5 bg-[#0e172a] hover:bg-[#1e293b] text-cyan-400 font-mono text-[10px] border border-cyan-950 rounded transition-all uppercase font-bold active:scale-95"
                  >
                    Apply Pasted Atmosphere Data
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Controls Footer */}
        <div className="p-3.5 border-t border-cyan-950 bg-black/60 flex flex-col gap-2 shrink-0">
          <div className="flex gap-2 text-center text-[10px]">
             <button
               onClick={handleResetCurrentTab}
               className="flex-1 py-1 px-1 bg-transparent hover:bg-cyan-950/25 border border-cyan-950 text-cyan-600 font-mono uppercase rounded transition-all"
             >
               Reset Tab
             </button>
             <button
               onClick={handleResetAll}
               className="flex-1 py-1 px-1 bg-transparent hover:bg-cyan-950/25 border border-cyan-950 text-cyan-600 font-mono uppercase rounded transition-all"
             >
               Reset All
             </button>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-[#02020a] font-mono text-xs uppercase font-bold tracking-wider rounded transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-98"
          >
            ✓ Lock In Atmospheric Settings
          </button>
          <button
            onClick={onClose}
            className="w-full py-1.5 bg-transparent hover:bg-cyan-950/15 border border-cyan-950 text-cyan-600 font-mono text-xs uppercase rounded transition-all active:scale-98"
          >
            Discard Edits
          </button>
        </div>
      </div>
    </div>
  );
};

function getDefaultBackdropSettingsForTheme(themeId: string): BackdropSettings {
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
