export class Input {
  keys: { [key: string]: boolean } = {};
  touchLeft = false;
  touchRight = false;
  touchUp = false;
  touchFire = false;
  infiniteLives = false;
  skipLevel = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      // Prevent default page scrolling for game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
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
    return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchLeft;
  }

  isRight() {
    return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchRight;
  }

  isUp() {
    return this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchUp;
  }

  isFire() {
    return this.keys['KeyF'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['ControlLeft'] || this.touchFire || this.keys['ControlRight'] || this.keys['Enter'] || this.keys['Space'];
  }
}

export const input = new Input();
