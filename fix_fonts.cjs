const fs = require('fs');

function updateFonts(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Powerup size (Item.ts)
  content = content.replace(/'bold 16px "Press Start 2P", monospace'/g, '\'bold 11px "Press Start 2P", monospace\'');
  
  // Enemy sizes
  content = content.replace(/'10px monospace'/g, '\'7px monospace\'');
  content = content.replace(/'12px monospace'/g, '\'8px monospace\'');
  
  // Bosses sizes
  content = content.replace(/'bold 32px "Press Start 2P", monospace'/g, '\'bold 22px "Press Start 2P", monospace\'');
  content = content.replace(/'20px "Press Start 2P", monospace'/g, '\'14px "Press Start 2P", monospace\'');
  
  fs.writeFileSync(file, content);
}

['src/game/Item.ts', 'src/game/Enemy.ts', 'src/game/Bosses.ts'].forEach(updateFonts);
console.log('Fonts updated');
