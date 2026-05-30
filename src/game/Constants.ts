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
];
