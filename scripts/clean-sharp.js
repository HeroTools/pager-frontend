const fs = require('fs');
const path = require('path');

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removing: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function cleanSharpModules() {
  console.log('🧹 Cleaning Sharp and @img modules...');

  const nodeModulesPath = path.join(process.cwd(), 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📁 No node_modules directory found');
    return;
  }

  const problematicPaths = [
    path.join(nodeModulesPath, 'sharp'),
    path.join(nodeModulesPath, '@img'),
  ];

  // Also check for any sharp-* directories in node_modules
  try {
    const nodeModulesContents = fs.readdirSync(nodeModulesPath);
    nodeModulesContents.forEach((item) => {
      if (item.startsWith('sharp-') || item.includes('@img')) {
        problematicPaths.push(path.join(nodeModulesPath, item));
      }
    });
  } catch (error) {
    console.warn('⚠️  Could not read node_modules directory:', error.message);
  }

  problematicPaths.forEach(removeDirectory);

  console.log('✅ Sharp modules cleaned successfully');
}

if (require.main === module) {
  cleanSharpModules();
}

module.exports = { cleanSharpModules };
