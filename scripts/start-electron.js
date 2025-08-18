#!/usr/bin/env node

const { spawn } = require('child_process');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

let nextProcess;
let electronProcess;
let isShuttingDown = false;

function findAvailablePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function waitForServer(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      if (isShuttingDown) {
        reject(new Error('Shutdown initiated'));
        return;
      }

      attempts++;

      const req = require('http').get(`http://localhost:${port}`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          if (attempts < maxAttempts) {
            setTimeout(checkServer, 1000);
          } else {
            reject(new Error(`Server not ready after ${maxAttempts} attempts`));
          }
        }
      });

      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 1000);
        } else {
          reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        }
      });

      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 1000);
        } else {
          reject(new Error(`Server timeout after ${maxAttempts} attempts`));
        }
      });
    };

    checkServer();
  });
}

function compileElectron() {
  return new Promise((resolve, reject) => {
    console.log('🔨 Compiling Electron TypeScript...');

    const tscProcess = spawn('npx', ['tsc', '--project', 'electron/tsconfig.json'], {
      stdio: 'pipe',
    });

    tscProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log('TSC:', output);
    });

    tscProcess.stderr.on('data', (data) => {
      console.error('TSC Error:', data.toString().trim());
    });

    tscProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Electron compilation complete');
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

async function startElectron() {
  try {
    console.log('🚀 Starting Electron development environment...');

    await compileElectron();

    const nextPort = await findAvailablePort(3000);
    console.log(`📡 Using port ${nextPort} for Next.js`);

    console.log('🔄 Starting Next.js dev server...');

    nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON: 'true',
        PORT: nextPort.toString(),
      },
    });

    let nextReady = false;

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js:', output.trim());

      if (
        !nextReady &&
        (output.includes('Ready in') ||
          output.includes('ready') ||
          output.includes('compiled client and server') ||
          output.includes('Local:'))
      ) {
        nextReady = true;
        console.log('✅ Next.js is ready, starting Electron...');

        waitForServer(nextPort)
          .then(() => {
            if (!isShuttingDown) {
              console.log('⚡ Launching Electron...');
              electronProcess = spawn('npx', ['electron', 'dist/main.js'], {
                stdio: 'inherit',
                env: {
                  ...process.env,
                  NODE_ENV: 'development',
                  NEXT_PORT: nextPort.toString(),
                  ELECTRON_IS_DEV: '1',
                },
              });

              electronProcess.on('close', (code) => {
                console.log(`🔴 Electron exited with code ${code}`);
                shutdown();
              });

              electronProcess.on('error', (error) => {
                console.error('❌ Electron error:', error);
                shutdown();
              });
            }
          })
          .catch((error) => {
            console.error('❌ Failed to connect to Next.js server:', error);
            shutdown();
          });
      }
    });

    nextProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      if (!errorOutput.includes('warn') && !errorOutput.includes('info')) {
        console.error('Next.js Error:', errorOutput.trim());
      }
    });

    nextProcess.on('error', (error) => {
      console.error('❌ Failed to start Next.js:', error);
      shutdown();
    });

    nextProcess.on('close', (code) => {
      if (!isShuttingDown) {
        console.log(`🔴 Next.js exited with code ${code}`);
        shutdown();
      }
    });
  } catch (error) {
    console.error('❌ Failed to start development environment:', error);
    shutdown();
  }
}

function shutdown() {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log('\n🛑 Shutting down development environment...');

  const promises = [];

  if (electronProcess && !electronProcess.killed) {
    promises.push(
      new Promise((resolve) => {
        electronProcess.once('close', resolve);
        electronProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!electronProcess.killed) {
            electronProcess.kill('SIGKILL');
          }
          resolve();
        }, 3000);
      }),
    );
  }

  if (nextProcess && !nextProcess.killed) {
    promises.push(
      new Promise((resolve) => {
        nextProcess.once('close', resolve);
        nextProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!nextProcess.killed) {
            nextProcess.kill('SIGKILL');
          }
          resolve();
        }, 3000);
      }),
    );
  }

  Promise.all(promises).then(() => {
    console.log('✅ Cleanup complete');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

if (require.main === module) {
  startElectron();
}
