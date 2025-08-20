const { app, BrowserWindow, ipcMain, Notification, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if we're in development mode
const isDev = !app.isPackaged;

let serverProcess = null;
const PORT = 3456;

// Setup logging for debugging
const logPath = app.getPath('logs');
const logFile = path.join(logPath, 'main.log');

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Console output
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  
  // File output for production
  if (!isDev) {
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

// Start the Next.js server using standalone build
async function startNextServer() {
  if (!isDev && !serverProcess) {
    return new Promise((resolve, reject) => {
      const { utilityProcess } = require('electron');
      
      const serverPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'server.js')
        : path.join(__dirname, '..', '.next', 'standalone', 'server.js');
      
      const cwd = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', '.next', 'standalone');
      
      log(`Starting server from: ${serverPath}`);
      log(`Working directory: ${cwd}`);
      
      // Check if server.js exists
      if (!fs.existsSync(serverPath)) {
        const error = `Server file not found: ${serverPath}`;
        log(error, 'error');
        reject(new Error(error));
        return;
      }
      
      // For production, environment variables are baked into the Next.js build
      // For development, we can optionally load from .env.local
      let envVars = {};
      
      if (!app.isPackaged) {
        // Development mode - try to load .env.local
        const envPath = path.join(__dirname, '..', '.env.local');
        if (fs.existsSync(envPath)) {
          try {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            envContent.split('\n').forEach(line => {
              if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                  envVars[key.trim()] = valueParts.join('=').trim();
                }
              }
            });
            log('Loaded environment variables from .env.local');
          } catch (err) {
            log(`Failed to load .env.local: ${err.message}`, 'error');
          }
        }
      }
      
      // Environment for the server process
      const env = {
        ...process.env,
        ...envVars,  // Include env variables (only in dev)
        PORT: PORT.toString(),
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0'  // Bind to all interfaces
      };
      
      log('Spawning server process using utilityProcess...');
      
      try {
        // Use Electron's utilityProcess API - this is the modern way to spawn hidden processes
        // This prevents any Terminal window or dock icon from appearing
        serverProcess = utilityProcess.fork(serverPath, [], {
          env,
          cwd,
          serviceName: 'pager-server',
          stdio: 'pipe'
        });
        
        // Handle stdout
        serverProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          log(`Server: ${output}`);
          
          // Check if server is ready
          if (output.includes('Ready in') || output.includes('started server on') || output.includes('Listening on')) {
            log('Server is ready!');
            setTimeout(() => {
              resolve(`http://localhost:${PORT}`);
            }, 500);
          }
        });
        
        // Handle stderr
        serverProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          log(`Server Error: ${error}`, 'error');
        });
        
        // Handle process exit
        serverProcess.on('exit', (code) => {
          log(`Server exited with code ${code}`, code === 0 ? 'info' : 'error');
          serverProcess = null;
          
          // If server exits unexpectedly during startup, reject the promise
          if (code !== 0) {
            reject(new Error(`Server exited with code ${code}`));
          }
        });
        
        // Handle spawn errors
        serverProcess.on('spawn', () => {
          log('Server process spawned successfully');
        });
        
      } catch (err) {
        log(`Failed to spawn server: ${err.message}`, 'error');
        reject(err);
        return;
      }

      // Health check - verify server actually starts
      let healthCheckAttempts = 0;
      const maxHealthChecks = 30;
      
      const checkServerHealth = () => {
        healthCheckAttempts++;
        
        // Try to connect to the server
        const http = require('http');
        const req = http.get(`http://localhost:${PORT}/`, (res) => {
          log(`Server health check succeeded (status: ${res.statusCode})`);
          resolve(`http://localhost:${PORT}`);
        });
        
        req.on('error', (err) => {
          if (healthCheckAttempts < maxHealthChecks) {
            // Server not ready yet, try again
            setTimeout(checkServerHealth, 1000);
          } else {
            log(`Server health check failed after ${maxHealthChecks} attempts`, 'error');
            reject(new Error('Server failed to respond to health checks'));
          }
        });
        
        req.setTimeout(1000);
      };
      
      // Start health checks after a brief delay
      setTimeout(checkServerHealth, 2000);
    });
  }
  return isDev ? 'http://localhost:3000' : `http://localhost:${PORT}`;
}

let mainWindow;

// Security: Configure Content Security Policy
function setupSecurity() {
  session.defaultSession.webSecurity = true;
  
  // Set up CSP for security - more permissive for API connections
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Remove any existing CSP headers to avoid conflicts
    Object.keys(responseHeaders).forEach(key => {
      if (key.toLowerCase().includes('content-security-policy')) {
        delete responseHeaders[key];
      }
    });
    
    // Build CSP based on environment
    const cspParts = [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net",
      "connect-src 'self' " +
        "http://localhost:* " +
        "http://127.0.0.1:* " +
        "ws://localhost:* " +
        "wss://localhost:* " +
        "https://*.supabase.co " +
        "wss://*.supabase.co " +
        "https://api.openai.com " +
        "https://m7vs6bfljtuvekta2gw27tyg2a0iwdqz.lambda-url.us-east-2.on.aws " +
        "https://va.vercel-scripts.com " +
        "https://vitals.vercel-insights.com " +
        "https://media.tenor.com " +
        "https://g.tenor.com " +
        "https://api.tenor.com",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' data: https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' data: https:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:"
    ];
    
    responseHeaders['Content-Security-Policy'] = [cspParts.join('; ')];
    
    callback({ responseHeaders });
  });
}

function createWindow() {
  // Determine icon path based on platform and packaging
  let iconPath;
  if (app.isPackaged) {
    // In production, icon is in Resources/public
    iconPath = path.join(process.resourcesPath, 'public', 'desktop-platform-icons', 
      process.platform === 'darwin' ? 'icon.icns' : 
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    );
  } else {
    // In development, use relative path
    iconPath = path.join(__dirname, '..', 'public', 'desktop-platform-icons',
      process.platform === 'darwin' ? 'icon.icns' : 
      process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    );
  }
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: iconPath,
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    log('Loading development server at http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      log(`Failed to load localhost:3000: ${err.message}`, 'error');
      log('Make sure Next.js dev server is running (npm run dev)', 'error');
    });
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start the Next.js server and then load
    log('Starting production server...');
    startNextServer().then(url => {
      log(`Loading production server at ${url}`);
      mainWindow.loadURL(url).catch(err => {
        log(`Failed to load URL ${url}: ${err.message}`, 'error');
        // Show error dialog to user
        const { dialog } = require('electron');
        dialog.showErrorBox(
          'Failed to Start', 
          `Unable to start the application server.\n\nError: ${err.message}\n\nPlease check the logs at:\n${logFile}`
        );
        app.quit();
      });
    }).catch(err => {
      log(`Failed to start production server: ${err.message}`, 'error');
      // Show error dialog to user
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Server Start Failed', 
        `Unable to start the application server.\n\nError: ${err.message}\n\nPlease check the logs at:\n${logFile}`
      );
      app.quit();
    });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on the window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (isDev) {
      // Allow all navigation in development
      return;
    }
    
    // In production, only allow navigation within the app
    if (!navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
}

// File proxy handler for Supabase storage
async function handleFileProxy(url, headers = {}) {
  // Use native fetch in Node.js 18+
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'User-Agent': 'Pager-Desktop/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return {
      success: true,
      data: buffer,
      contentType,
      status: response.status,
    };
  } catch (error) {
    console.error('File proxy error:', error);
    return {
      success: false,
      error: error.message,
      status: 500,
    };
  }
}

// Native notification handler
function showNotification(title, options = {}) {
  if (!Notification.isSupported()) {
    console.warn('Notifications not supported on this system');
    return false;
  }

  // On macOS, the notification uses the app's icon from the bundle
  // The icon parameter is mainly for Linux/Windows
  // For macOS, ensure the app has the correct icon in Info.plist
  
  // Determine icon path for notifications (mainly for Windows/Linux)
  let defaultIcon;
  if (app.isPackaged) {
    defaultIcon = path.join(process.resourcesPath, 'public', 'desktop-platform-icons', 'icon.png');
  } else {
    defaultIcon = path.join(__dirname, '..', 'public', 'desktop-platform-icons', 'icon.png');
  }
  
  // Log for debugging
  log(`Notification icon path: ${options.icon || defaultIcon}`);

  const notification = new Notification({
    title,
    body: options.body || '',
    icon: options.icon || defaultIcon,
    silent: options.silent || false,
    urgency: options.urgency || 'normal',
    timeoutType: options.timeoutType || 'default',
  });

  // Handle notification click
  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Send click event to renderer
      mainWindow.webContents.send('notification-clicked', options.data || {});
    }
  });

  notification.show();
  return true;
}

// IPC Handlers
function setupIPCHandlers() {
  // File proxy handler
  ipcMain.handle('file-proxy', async (event, url, headers) => {
    return await handleFileProxy(url, headers);
  });

  // Native notification handler
  ipcMain.handle('show-notification', async (event, title, options) => {
    return showNotification(title, options);
  });

  // Window controls
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Check if running in development
  ipcMain.handle('is-dev', () => {
    return isDev;
  });

  // Open external URL
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

// App event handlers
app.whenReady().then(() => {
  log('App ready, initializing...');
  log(`App version: ${app.getVersion()}`);
  log(`Electron version: ${process.versions.electron}`);
  log(`Node version: ${process.versions.node}`);
  log(`Platform: ${process.platform}`);
  log(`Packaged: ${app.isPackaged}`);
  
  setupSecurity();
  setupIPCHandlers();
  createWindow();

  // macOS specific: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up server on quit
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev && url.startsWith('http://localhost:')) {
    // In development, ignore certificate errors for localhost
    event.preventDefault();
    callback(true);
  } else {
    // In production, use default behavior
    callback(false);
  }
});

// Auto-updater (add when ready for updates)
// const { autoUpdater } = require('electron-updater');
// 
// if (!isDev) {
//   autoUpdater.checkForUpdatesAndNotify();
// }