const fs = require('fs');
['src/game/GameEngine.ts', 'src/game/Bosses.ts', 'src/game/Item.ts', 'src/game/Enemy.ts', 'src/game/Particle.ts', 'src/App.tsx'].forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/"Space Grotesk", sans-serif/g, '"Press Start 2P", monospace');
  content = content.replace(/"JetBrains Mono", monospace/g, '"Press Start 2P", monospace');
  fs.writeFileSync(f, content);
});
console.log('Done');
