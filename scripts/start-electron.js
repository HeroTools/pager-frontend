#!/usr/bin/env node

const { spawn } = require('child_process');
const { createServer } = require('http');

let nextProcess;
let electronProcess;

function findAvailablePort() {
  return new Promise((resolve) => {
    for (let port = 3000; port <= 3010; port++) {
      const server = createServer();
      server.listen(port, () => {
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        // Port is in use, try next
      });
    }
  });
}

function waitForServer(port) {
  return new Promise((resolve) => {
    const checkServer = () => {
      const req = require('http').get(`http://localhost:${port}`, (res) => {
        resolve();
      });
      req.on('error', () => {
        setTimeout(checkServer, 1000);
      });
    };
    checkServer();
  });
}

async function startElectron() {
  console.log('🚀 Starting Next.js dev server...');
  
  // Start Next.js
  nextProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  let nextPort = 3000;
  
  nextProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Next.js:', output.trim());
    
    // Extract port from Next.js output
    const portMatch = output.match(/localhost:(\d+)/);
    if (portMatch) {
      nextPort = parseInt(portMatch[1]);
      console.log(`📡 Next.js running on port ${nextPort}`);
      
      // Wait for server to be ready, then start Electron
      waitForServer(nextPort).then(() => {
        console.log('⚡ Starting Electron...');
        electronProcess = spawn('npx', ['electron', '.'], {
          stdio: 'inherit',
          env: { ...process.env, NEXT_PORT: nextPort }
        });
        
        electronProcess.on('close', () => {
          console.log('🔴 Electron closed');
          process.exit(0);
        });
      });
    }
  });

  nextProcess.stderr.on('data', (data) => {
    console.error('Next.js Error:', data.toString());
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (electronProcess) electronProcess.kill();
    if (nextProcess) nextProcess.kill();
    process.exit(0);
  });
}

startElectron();