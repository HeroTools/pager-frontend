import { ChildProcess, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';

let nextServer: ChildProcess | null = null;

const startNextServer = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Start Next.js production server
    nextServer = spawn('npm', ['run', 'start'], {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
    });

    nextServer.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js server:', output);

      // Look for the server ready message
      if (output.includes('ready on') || output.includes('Local:')) {
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch) {
          resolve(parseInt(portMatch[1]));
        } else {
          resolve(3000); // Default port
        }
      }
    });

    nextServer.stderr?.on('data', (data) => {
      console.error('Next.js server error:', data.toString());
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // Fallback timeout
    setTimeout(() => {
      resolve(3000);
    }, 10000);
  });
};

const createWindow = async (): Promise<void> => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load the app
  let url: string;
  if (isDev) {
    const port = process.env.NEXT_PORT || '3000';
    url = `http://localhost:${port}`;
  } else {
    // In production, start Next.js server to handle API routes
    try {
      const port = await startNextServer();
      url = `http://localhost:${port}`;
    } catch (error) {
      console.error('Failed to start Next.js server, falling back to static files');
      url = `file://${join(__dirname, '../out/index.html')}`;
    }
  }

  mainWindow.loadURL(url);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle app protocol for macOS
  if (process.platform === 'darwin') {
    // Hide the app when all windows are closed (but keep it running)
    mainWindow.on('closed', () => {
      // Don't quit the app when the window is closed on macOS
    });
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up when app is quitting
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

// Security: Prevent navigation to external websites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

// Handle app updates and other IPC messages
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

// Handle window focus
ipcMain.handle('focus-window', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
  }
});

// Handle notification permissions (for future native notifications)
ipcMain.handle('request-notification-permission', async () => {
  // In Electron, web notifications work automatically
  // This is for future native notification implementation
  return 'granted';
});

ipcMain.handle('get-notification-permission', () => {
  // Web notifications in Electron don't need special permission
  return 'granted';
});
