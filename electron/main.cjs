const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

const PORT = 3010;

function getUnpackedPath() {
  if (app.isPackaged) {
    // __dirname = .../云音乐.app/Contents/Resources/app.asar/electron
    // unpacked = .../云音乐.app/Contents/Resources/app.asar.unpacked
    const resourcesDir = path.join(app.getAppPath(), '..');
    return path.join(resourcesDir, 'app.asar.unpacked');
  }
  return path.join(__dirname, '..');
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const basePath = getUnpackedPath();
    const backendScript = path.join(basePath, 'backend', 'server.js');

    // 用户数据目录：~/Library/Application Support/云音乐/
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'data');

    console.log('[electron] Unpacked path:', basePath);
    console.log('[electron] User data path:', dataPath);
    console.log('[electron] Backend script:', backendScript);
    console.log('[electron] Script exists:', fs.existsSync(backendScript));

    if (!fs.existsSync(backendScript)) {
      reject(new Error('Backend script not found: ' + backendScript));
      return;
    }

    backendProcess = fork(backendScript, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
        APP_BASE_PATH: basePath,
        ELECTRON_DATA_PATH: dataPath,
        ELECTRON_RUN_AS_NODE: '1'
      },
      silent: true,
      cwd: basePath
    });

    let resolved = false;

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[backend]', msg);
      if (msg.includes('运行在') && !resolved) {
        resolved = true;
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[backend:err]', data.toString());
    });

    backendProcess.on('error', (err) => {
      console.error('[electron] Spawn error:', err);
      if (!resolved) { resolved = true; reject(err); }
    });

    backendProcess.on('exit', (code, signal) => {
      console.error('[electron] Backend exited:', code, signal);
    });

    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    minWidth: 900, minHeight: 600,
    title: '云音乐',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const startURL = `http://localhost:${PORT}`;
  console.log('[electron] Loading:', startURL);
  mainWindow.loadURL(startURL);

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => mainWindow.loadURL(startURL), 2000);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createMenu() {
  const template = [
    { label: app.name, submenu: [
      { role: 'about' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit' }
    ]},
    { label: '编辑', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ]},
    { label: '窗口', submenu: [
      { role: 'minimize' }, { role: 'zoom' }, { role: 'close' }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  createMenu();
  try {
    await startBackend();
    console.log('[electron] Backend started');
    createWindow();
  } catch (err) {
    console.error('[electron] Startup failed:', err);
    dialog.showErrorBox('启动失败', '后端服务启动失败：' + err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
