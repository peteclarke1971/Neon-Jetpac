export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const GRAVITY = 0.15;
export const DRAG = 0.98;

export const NEON_COLORS = {
  CYAN: '#00ffff',
  MAGENTA: '#ff00ff',
  YELLOW: '#ffff00',
  GREEN: '#00ff00',
  RED: '#ff0000',
  ORANGE: '#ff8800',
  WHITE: '#ffffff',
  PLATFORM: '#2244ff',
  ROCKET: '#aaaaaa',
};

// Platforms format: [x, y, width, height]
export const PLATFORMS_LAYOUT = [
  // Base floor
  [0, GAME_HEIGHT - 20, GAME_WIDTH, 20],
  // Middle left
  [50, 400, 180, 15],
  // Middle right
  [550, 350, 180, 15],
  // Top middle
  [300, 200, 200, 15],
];

export const ROCKET_BASE_X = 550;
export const ROCKET_BASE_Y = GAME_HEIGHT - 20;

export const ENEMY_TYPES = [
  { name: 'meteor', speed: 1.5, score: 20, color: NEON_COLORS.RED },
  { name: 'saucer', speed: 2, score: 40, color: NEON_COLORS.GREEN },
  { name: 'spinner', speed: 2.5, score: 60, color: NEON_COLORS.MAGENTA },
  { name: 'hunter', speed: 3, score: 80, color: NEON_COLORS.YELLOW },
  
  // Fever Dream Enemies
  { name: 'scavenger', speed: 1.5, score: 100, color: NEON_COLORS.CYAN },
  { name: 'saboteur', speed: 2.5, score: 120, color: NEON_COLORS.MAGENTA },
  { name: 'split_meteor', speed: 1.2, score: 30, color: NEON_COLORS.ORANGE },
  { name: 'split_meteor_shard', speed: 3.5, score: 50, color: NEON_COLORS.ORANGE },
  { name: 'phase_wisp', speed: 2, score: 75, color: '#aa33ff' }, // violet
  { name: 'gravity_jelly', speed: 1, score: 90, color: '#33ffaa' }, // cyan-green
  { name: 'laser_saucer', speed: 1, score: 150, color: NEON_COLORS.RED },
  { name: 'mine_layer', speed: 2, score: 80, color: NEON_COLORS.YELLOW },

  // Expansion Enemies
  { name: 'fuelThief', speed: 2.2, score: 150, color: '#f59e0b' }, // amber/gold
  { name: 'turretOrb', speed: 0, score: 100, color: '#3b82f6' }, // blue stationary
  { name: 'swooper', speed: 3.5, score: 110, color: '#a855f7' }, // purple dive-bomber
  { name: 'mineLayer', speed: 1.8, score: 90, color: NEON_COLORS.YELLOW }, // yellow (alias representation)
  { name: 'gravityJelly', speed: 1, score: 90, color: '#33ffaa' }, // cyan-green (alias representation)
  { name: 'mimicFuel', speed: 1.5, score: 200, color: '#00ffff' }, // warning cyan
  { name: 'splitter', speed: 2.0, score: 120, color: '#ef4444' }, // splitting orange-red

  { name: 'spore', speed: 2, score: 0, color: NEON_COLORS.MAGENTA },
  // Bosses
  { name: 'boss_leech', speed: 1, score: 1000, color: '#ff0055' },
  { name: 'boss_eater', speed: 1, score: 3000, color: '#ff2200' }
];
