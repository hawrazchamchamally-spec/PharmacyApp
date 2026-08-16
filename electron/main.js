const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipcHandlers');
const { initDatabase } = require('./database');
const { seedData } = require('./seed');

let mainWindow = null;

async function createWindow() {
  console.log('🖥️ [Main Process] Creating main Electron window...');
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PharmacyCare Pro - نظام إدارة الصيدلية',
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    console.log('🌐 [Main Process] Loading Dev URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    console.log('📁 [Main Process] Loading production dist file...');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    console.log('🚀 [Main Process] Electron app ready. Starting initialization...');
    console.log('📂 [Main Process] UserData Path:', app.getPath('userData'));
    
    console.log('📡 [Main Process] Registering IPC Handlers immediately...');
    registerIpcHandlers();

    console.log('💾 [Main Process] Initializing SQLite database connection...');
    await initDatabase();

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
      console.log('🌱 [Main Process Dev Mode] Checking and executing initial data seed...');
      await seedData();
    } else {
      console.log('⚡ [Main Process Production] Fresh clean database active. Skipping dev seed for deployment.');
    }

    console.log('🪟 [Main Process] Opening Application Window...');
    await createWindow();
    console.log('✨ [Main Process] Pharmacy Application running successfully!');
  } catch (err) {
    console.error('❌ [Fatal Initialization Error] Failed to start application:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

