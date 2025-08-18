import { ChildProcess, spawn } from 'child_process';
import { app, BrowserWindow, dialog, ipcMain, Notification, session, shell } from 'electron';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import * as path from 'path';

let nextServer: ChildProcess | null = null;
const serverPort = 3000;

const getAppPath = () => {
  if (isDev) {
    return process.cwd();
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }

  return path.join(__dirname, '..');
};

const startNextServer = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (isDev) {
      const port = parseInt(process.env.NEXT_PORT || '3000');
      resolve(port);
      return;
    }

    const appPath = getAppPath();
    const serverPath = path.join(appPath, 'server.js');

    console.log('App path:', appPath);
    console.log('Looking for standalone server at:', serverPath);

    if (!fs.existsSync(serverPath)) {
      console.error('Standalone server not found at:', serverPath);

      // Try alternative paths
      const altPaths = [
        path.join(appPath, '.next', 'standalone', 'server.js'),
        path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
      ];

      console.log('Trying alternative paths:');
      altPaths.forEach((altPath) => {
        console.log(`  - ${altPath}: ${fs.existsSync(altPath) ? 'EXISTS' : 'NOT FOUND'}`);
      });

      if (fs.existsSync(appPath)) {
        console.log('Files in app directory:', fs.readdirSync(appPath));
      }

      reject(new Error(`Standalone server not found at ${serverPath}`));
      return;
    }

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: serverPort.toString(),
      HOSTNAME: 'localhost',
    };

    console.log('Starting Next.js standalone server...');

    nextServer = spawn('node', [serverPath], {
      cwd: appPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    let serverReady = false;
    const timeout = setTimeout(() => {
      if (!serverReady) {
        console.log('Server startup timeout, assuming ready on port', serverPort);
        resolve(serverPort);
      }
    }, 15000);

    nextServer.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('Server stdout:', output);

      if (
        !serverReady &&
        (output.includes('ready') ||
          output.includes('started server') ||
          output.includes('listening') ||
          output.includes('Ready in'))
      ) {
        serverReady = true;
        clearTimeout(timeout);

        const portMatch = output.match(/:(\d+)/);
        const port = portMatch ? parseInt(portMatch[1]) : serverPort;
        console.log('Server ready on port:', port);
        resolve(port);
      }
    });

    nextServer.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('Server stderr:', errorOutput);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start server:', error);
      clearTimeout(timeout);
      reject(error);
    });

    nextServer.on('exit', (code, signal) => {
      console.log('Server exited with code:', code, 'signal:', signal);
      if (!serverReady) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
};

const createWindow = async (): Promise<void> => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
      allowRunningInsecureContent: isDev,
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: getAppIcon(),
    title: 'Pager',
  });

  let url: string;

  if (isDev) {
    url = `http://localhost:${process.env.NEXT_PORT || '3000'}`;
    console.log('Development mode, loading:', url);
  } else {
    try {
      console.log('Production mode, starting Next.js server...');
      const port = await startNextServer();
      url = `http://localhost:${port}`;
      console.log('Production server started at:', url);

      await waitForServer(url, 20000);
    } catch (error) {
      console.error('Failed to start Next.js server:', error);

      const response = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Server Error',
        message: 'Failed to start the application server',
        detail: error instanceof Error ? error.message : String(error),
        buttons: ['Retry', 'Quit'],
      });

      if (response.response === 0) {
        return createWindow();
      } else {
        app.quit();
        return;
      }
    }
  }

  try {
    await mainWindow.loadURL(url);
    console.log('Window loaded successfully');
  } catch (error) {
    console.error('Failed to load URL:', error);

    const response = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Load Error',
      message: 'Failed to load the application',
      detail: `Could not load ${url}`,
      buttons: ['Retry', 'Quit'],
    });

    if (response.response === 0) {
      return createWindow();
    } else {
      app.quit();
      return;
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.platform === 'darwin') {
    mainWindow.on('closed', () => {
      // Keep app running on macOS
    });
  }
};

const waitForServer = (url: string, timeout = 15000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Pager-Electron' },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          resolve();
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server timeout after ${timeout}ms`));
        return;
      }

      setTimeout(checkServer, 1000);
    };

    checkServer();
  });
};

const getAppIcon = () => {
  const iconDir = isDev ? path.join(process.cwd(), 'public') : path.join(getAppPath(), 'public');

  switch (process.platform) {
    case 'darwin':
      return path.join(iconDir, 'icon.icns');
    case 'win32':
      return path.join(iconDir, 'icon.ico');
    default:
      return path.join(iconDir, 'icon.png');
  }
};

app.whenReady().then(() => {
  if (isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      const url = new URL(details.url);

      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        Object.keys(responseHeaders).forEach((key) => {
          if (key.toLowerCase().includes('content-security-policy')) {
            delete responseHeaders[key];
          }
        });

        responseHeaders['Content-Security-Policy'] = [
          [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
            "connect-src 'self' http://127.0.0.1:8081 http://localhost:8081 https://ypkobnsdgcclemmiswkj.supabase.co wss://ypkobnsdgcclemmiswkj.supabase.co https://m7vs6bfljtuvekta2gw27tyg2a0iwdqz.lambda-url.us-east-2.on.aws https://va.vercel-scripts.com https://vitals.vercel-insights.com",
            "img-src 'self' data: blob: https: http:",
            "style-src 'self' 'unsafe-inline' https:",
            "font-src 'self' data: https:",
            "frame-src 'self' https:",
            "worker-src 'self' blob:",
          ].join('; '),
        ];
      }

      callback({ responseHeaders });
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill('SIGTERM');
    nextServer = null;
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const allowedOrigins = [
      `http://localhost:${serverPort}`,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    if (!allowedOrigins.includes(parsedUrl.origin) && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

// IPC Handlers
ipcMain.handle('app-version', () => app.getVersion());

ipcMain.handle('focus-window', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.show();
  }
});

ipcMain.handle('request-notification-permission', async () => {
  if (process.platform === 'darwin') {
    const hasPermission = Notification.isSupported();
    if (!hasPermission) {
      try {
        const testNotification = new Notification({
          title: 'Permission Test',
          body: 'Testing notification permissions',
          silent: true,
        });
        testNotification.show();
        testNotification.close();
        return 'granted';
      } catch (error) {
        return 'denied';
      }
    }
    return 'granted';
  }
  return Notification.isSupported() ? 'granted' : 'denied';
});

ipcMain.handle('get-notification-permission', () => {
  if (process.platform === 'darwin') {
    return Notification.isSupported() ? 'granted' : 'default';
  }
  return Notification.isSupported() ? 'granted' : 'denied';
});

const activeNativeNotifications: Map<string, Notification> = new Map();

ipcMain.handle('show-native-notification', async (event, id: string, options: any) => {
  try {
    if (!Notification.isSupported()) {
      console.warn('Native notifications not supported on this system');
      return null;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: getAppIcon(),
      sound: options.sound,
      urgency: options.urgency || 'normal',
      timeoutType: options.timeoutType || 'default',
      actions: options.actions || [],
      ...(process.platform === 'darwin' && {
        subtitle: options.subtitle,
        hasReply: true,
        replyPlaceholder: 'Type a reply...',
        sound: options.sound || 'Submarine',
        threadId: options.threadId,
      }),
    });

    activeNativeNotifications.set(id, notification);

    notification.on('click', () => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const mainWindow = windows[0];
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.show();
      }
      event.sender.send(`notification-click-${id}`);
      activeNativeNotifications.delete(id);
    });

    notification.on('action', (_, index) => {
      const action = options.actions?.[index];
      if (action) {
        event.sender.send(`notification-action-${id}`, action.id);
      }
    });

    notification.on('reply', (_, reply) => {
      event.sender.send(`notification-reply-${id}`, reply);
    });

    notification.on('close', () => {
      activeNativeNotifications.delete(id);
    });

    notification.show();
    return id;
  } catch (error) {
    console.error('Error showing native notification:', error);
    return null;
  }
});

ipcMain.handle('close-native-notification', async (event, id: string) => {
  const notification = activeNativeNotifications.get(id);
  if (notification) {
    notification.close();
    activeNativeNotifications.delete(id);
  }
});

ipcMain.handle('close-all-native-notifications', async () => {
  activeNativeNotifications.forEach((notification) => {
    notification.close();
  });
  activeNativeNotifications.clear();
});

ipcMain.handle('check-native-notification-support', async () => {
  return Notification.isSupported();
});

ipcMain.handle('request-native-notification-permission', async () => {
  if (process.platform === 'darwin') {
    return Notification.isSupported();
  }
  return true;
});
