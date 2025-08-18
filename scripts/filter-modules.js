const path = require('path');

function filterModules(file) {
  const normalizedPath = path.normalize(file).replace(/\\/g, '/');

  const excludePatterns = [
    '/@img/',
    '/sharp/',
    '/node_modules/sharp/',
    '/node_modules/@img/',
    'sharp-linux-x64',
    'sharp-darwin-x64',
    'sharp-darwin-arm64',
    'sharp-win32-x64',
    'sharp-win32-ia32',
    '.node',
    '/canvas/',
    '/node_modules/canvas/',
  ];

  for (const pattern of excludePatterns) {
    if (normalizedPath.includes(pattern)) {
      console.log(`Excluding: ${normalizedPath}`);
      return false;
    }
  }

  return true;
}

exports.default = filterModules;
module.exports = filterModules;
