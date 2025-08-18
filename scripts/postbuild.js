const fs = require('fs');
const path = require('path');

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

function postBuild() {
  console.log('Running post-build script...');

  const standaloneDir = '.next/standalone';
  const staticDir = '.next/static';
  const publicDir = 'public';

  if (!fs.existsSync(standaloneDir)) {
    console.error(
      'Standalone build not found. Make sure output: "standalone" is set in next.config.js',
    );
    process.exit(1);
  }

  if (fs.existsSync(staticDir)) {
    const targetStaticDir = path.join(standaloneDir, '.next/static');
    console.log('Copying static files...');
    copyRecursiveSync(staticDir, targetStaticDir);
  }

  if (fs.existsSync(publicDir)) {
    const targetPublicDir = path.join(standaloneDir, 'public');
    console.log('Copying public files...');
    copyRecursiveSync(publicDir, targetPublicDir);
  }

  const packageJsonPath = path.join(standaloneDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (packageJson.dependencies && packageJson.dependencies.sharp) {
      delete packageJson.dependencies.sharp;
      console.log('Removed sharp dependency from standalone package.json');
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  console.log('Post-build script completed successfully!');
}

postBuild();
