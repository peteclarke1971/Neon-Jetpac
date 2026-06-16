export interface PlayerBindings {
  left: string;
  right: string;
  up: string;
  down: string;
  fire: string;
}

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export class Input {
  keys: { [key: string]: boolean } = {};
  touchLeft = false;
  touchRight = false;
  touchUp = false;
  touchFire = false;
  infiniteLives = false;
  skipLevel = false;

  p1Bindings: PlayerBindings = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    fire: 'Space'
  };

  p2Bindings: PlayerBindings = {
    left: 'KeyA',
    right: 'KeyD',
    up: 'KeyW',
    down: 'KeyS',
    fire: 'KeyF'
  };

  p1GamepadBindings: PlayerBindings = {
    left: 'button_14',
    right: 'button_15',
    up: 'button_12',
    down: 'button_13',
    fire: 'button_0'
  };

  p2GamepadBindings: PlayerBindings = {
    left: 'button_14',
    right: 'button_15',
    up: 'button_12',
    down: 'button_13',
    fire: 'button_0'
  };

  // Gamepad options: 'auto', '0', '1', 'none'
  p1Gamepad = 'auto';
  p2Gamepad = 'auto';

  constructor() {
    this.loadSettings();

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      // Prevent default page scrolling for active game controls
      const activeKeys = [
        this.p1Bindings.left, this.p1Bindings.right, this.p1Bindings.up, this.p1Bindings.down, this.p1Bindings.fire,
        this.p2Bindings.left, this.p2Bindings.right, this.p2Bindings.up, this.p2Bindings.down, this.p2Bindings.fire,
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'
      ];
      if (activeKeys.includes(e.code)) {
        if (e.target === document.body) {
          e.preventDefault();
        }
      }

      if (e.code === 'KeyI' || e.key === 'i' || e.key === 'I') {
        this.infiniteLives = !this.infiniteLives;
      }
      if (e.key === '+' || e.key === '=') {
        this.skipLevel = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  isLeft() {
    return this.getPlayerInput(1).left;
  }

  isRight() {
    return this.getPlayerInput(1).right;
  }

  isUp() {
    return this.getPlayerInput(1).up;
  }

  isFire() {
    return this.getPlayerInput(1).fire;
  }

  getPlayerInput(playerId: 1 | 2): PlayerInputState {
    const isP1 = playerId === 1;
    const b = isP1 ? this.p1Bindings : this.p2Bindings;

    let left = this.keys[b.left] || false;
    let right = this.keys[b.right] || false;
    let up = this.keys[b.up] || false;
    let down = this.keys[b.down] || false;
    let fire = this.keys[b.fire] || false;

    // Additional P1 touch support
    if (isP1) {
      if (this.touchLeft) left = true;
      if (this.touchRight) right = true;
      if (this.touchUp) up = true;
      if (this.touchFire) fire = true;

      // Unmodified compatibility shortcuts
      if (b.fire === 'Space') {
        if (this.keys['ShiftRight'] || this.keys['ControlRight'] || this.keys['Enter']) {
          fire = true;
        }
      }
    } else {
      // Unmodified P2 shortcuts
      if (b.fire === 'KeyF') {
        if (this.keys['ShiftLeft'] || this.keys['ControlLeft']) {
          fire = true;
        }
      }
    }

    // Gamepad support
    const gpIndex = this.getGamepadIndexForPlayer(playerId);
    if (gpIndex !== null) {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[gpIndex];
      if (gp) {
        const btn = (idx: number) => gp.buttons[idx] ? gp.buttons[idx].pressed : false;
        
        const checkMapping = (binding: string) => {
          if (!binding) return false;
          if (binding.startsWith('button_')) {
            const idx = parseInt(binding.replace('button_', ''), 10);
            return btn(idx);
          }
          if (binding.startsWith('axis_')) {
            const parts = binding.split('_'); // e.g. ["axis", "0", "negative"]
            const idx = parseInt(parts[1], 10);
            const isPos = parts[2] === 'positive';
            const val = gp.axes[idx];
            if (isPos) {
              return val > 0.3;
            } else {
              return val < -0.3;
            }
          }
          return false;
        };

        const gb = playerId === 1 ? this.p1GamepadBindings : this.p2GamepadBindings;

        if (checkMapping(gb.left)) left = true;
        if (checkMapping(gb.right)) right = true;
        if (checkMapping(gb.up)) up = true;
        if (checkMapping(gb.down)) down = true;
        if (checkMapping(gb.fire)) fire = true;

        // Intelligent defaults as fallbacks so everything works automatically out of the box
        if (btn(14) || gp.axes[0] < -0.3) left = true;
        if (btn(15) || gp.axes[0] > 0.3) right = true;
        if (btn(12) || gp.axes[1] < -0.3) up = true;
        if (btn(13) || gp.axes[1] > 0.3) down = true;

        if (btn(0) || btn(1) || btn(2) || btn(3) || btn(7)) fire = true;
      }
    }

    return { left, right, up, down, fire };
  }

  rumble(playerId: 1 | 2, durationMs: number = 200, strong: number = 1.0, weak: number = 1.0) {
    if ((window as any).__rumbleEnabled === false) return;
    const gpIndex = this.getGamepadIndexForPlayer(playerId);
    if (gpIndex !== null) {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[gpIndex];
      if (gp && (gp as any).vibrationActuator && (gp as any).vibrationActuator.playEffect) {
        (gp as any).vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          strongMagnitude: strong,
          weakMagnitude: weak
        }).catch(() => {});
      }
    }
  }

  getGamepadIndexForPlayer(playerId: 1 | 2): number | null {
    const setting = playerId === 1 ? this.p1Gamepad : this.p2Gamepad;
    if (setting === 'none') return null;
    if (setting === '0') return 0;
    if (setting === '1') return 1;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const connectedIndices: number[] = [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) connectedIndices.push(i);
    }
    
    if (playerId === 1) {
      return connectedIndices.length > 0 ? connectedIndices[0] : null;
    } else {
      return connectedIndices.length > 1 ? connectedIndices[1] : null;
    }
  }

  loadSettings() {
    try {
      const data = localStorage.getItem('neonJetpac.controls.v2');
      if (!data) {
        const legacy = localStorage.getItem('neonJetpac.controls.v1');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed.p1Bindings) this.p1Bindings = { ...this.p1Bindings, ...parsed.p1Bindings };
          if (parsed.p2Bindings) this.p2Bindings = { ...this.p2Bindings, ...parsed.p2Bindings };
          if (parsed.p1Gamepad !== undefined) this.p1Gamepad = parsed.p1Gamepad;
          if (parsed.p2Gamepad !== undefined) this.p2Gamepad = parsed.p2Gamepad;
        }
        return;
      }
      const parsed = JSON.parse(data);
      if (parsed.p1Bindings) this.p1Bindings = { ...this.p1Bindings, ...parsed.p1Bindings };
      if (parsed.p2Bindings) this.p2Bindings = { ...this.p2Bindings, ...parsed.p2Bindings };
      if (parsed.p1GamepadBindings) this.p1GamepadBindings = { ...this.p1GamepadBindings, ...parsed.p1GamepadBindings };
      if (parsed.p2GamepadBindings) this.p2GamepadBindings = { ...this.p2GamepadBindings, ...parsed.p2GamepadBindings };
      if (parsed.p1Gamepad !== undefined) this.p1Gamepad = parsed.p1Gamepad;
      if (parsed.p2Gamepad !== undefined) this.p2Gamepad = parsed.p2Gamepad;
      
      (window as any).__p1AutoFire = parsed.p1AutoFire ?? false;
      (window as any).__p2AutoFire = parsed.p2AutoFire ?? false;
      (window as any).__showFPS = parsed.showFPS ?? false;
      (window as any).__rumbleEnabled = parsed.rumbleEnabled ?? true;
      (window as any).__soundVolume = parsed.soundVolume ?? 1.0;
    } catch (e) {
      console.error('Error loading Input bindings v2', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('neonJetpac.controls.v2', JSON.stringify({
        p1Bindings: this.p1Bindings,
        p2Bindings: this.p2Bindings,
        p1GamepadBindings: this.p1GamepadBindings,
        p2GamepadBindings: this.p2GamepadBindings,
        p1Gamepad: this.p1Gamepad,
        p2Gamepad: this.p2Gamepad,
        p1AutoFire: (window as any).__p1AutoFire ?? false,
        p2AutoFire: (window as any).__p2AutoFire ?? false,
        showFPS: (window as any).__showFPS ?? false,
        rumbleEnabled: (window as any).__rumbleEnabled ?? true,
        soundVolume: (window as any).__soundVolume ?? 1.0
      }));
    } catch (e) {
      console.error('Error saving Input bindings v2', e);
    }
  }

  resetAllSettings() {
    this.p1Bindings = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      fire: 'Space'
    };
    this.p2Bindings = {
      left: 'KeyA',
      right: 'KeyD',
      up: 'KeyW',
      down: 'KeyS',
      fire: 'KeyF'
    };
    this.p1GamepadBindings = {
      left: 'button_14',
      right: 'button_15',
      up: 'button_12',
      down: 'button_13',
      fire: 'button_0'
    };
    this.p2GamepadBindings = {
      left: 'button_14',
      right: 'button_15',
      up: 'button_12',
      down: 'button_13',
      fire: 'button_0'
    };
    this.p1Gamepad = 'auto';
    this.p2Gamepad = 'auto';
    (window as any).__p1AutoFire = false;
    (window as any).__p2AutoFire = false;
    (window as any).__showFPS = false;
    (window as any).__rumbleEnabled = true;
    (window as any).__soundVolume = 1.0;
    this.saveSettings();
  }
}

export const input = new Input();
