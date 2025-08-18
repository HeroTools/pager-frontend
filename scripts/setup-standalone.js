const fs = require('fs');
const path = require('path');

function setupStandalone() {
  console.log('🔧 Setting up standalone build for Electron...');

  const standaloneDir = '.next/standalone';
  const staticDir = '.next/static';
  const publicDir = 'public';

  if (!fs.existsSync(standaloneDir)) {
    console.error(
      '❌ Standalone build not found. Make sure output: "standalone" is set in next.config.ts',
    );
    process.exit(1);
  }

  console.log('📁 Copying static files to standalone...');
  if (fs.existsSync(staticDir)) {
    const targetStaticDir = path.join(standaloneDir, '.next/static');
    console.log(`   Copying ${staticDir} -> ${targetStaticDir}`);
    copyRecursiveSync(staticDir, targetStaticDir);
  }

  console.log('📁 Copying public files to standalone...');
  if (fs.existsSync(publicDir)) {
    const targetPublicDir = path.join(standaloneDir, 'public');
    console.log(`   Copying ${publicDir} -> ${targetPublicDir}`);
    copyRecursiveSync(publicDir, targetPublicDir);
  }

  // Verify server.js exists
  const serverPath = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverPath)) {
    console.error('❌ server.js not found in standalone build at:', serverPath);
    console.log('📁 Files in standalone directory:');
    if (fs.existsSync(standaloneDir)) {
      fs.readdirSync(standaloneDir).forEach((file) => {
        console.log(`   - ${file}`);
      });
    }
    process.exit(1);
  }

  console.log('📦 Server.js found at:', serverPath);

  const packageJsonPath = path.join(standaloneDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('🔧 Cleaning up standalone package.json...');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const problematicDeps = [
      'sharp',
      '@img/sharp-linux-x64',
      '@img/sharp-darwin-x64',
      '@img/sharp-win32-x64',
    ];
    let removed = false;

    problematicDeps.forEach((dep) => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        delete packageJson.dependencies[dep];
        console.log(`   Removed ${dep} dependency`);
        removed = true;
      }
    });

    if (removed) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  }

  console.log('✨ Standalone setup complete!');
  console.log(`📦 Standalone build ready at: ${path.resolve(standaloneDir)}`);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (require.main === module) {
  setupStandalone();
}

module.exports = { setupStandalone };
