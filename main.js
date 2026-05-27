const { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Venice AI');

// Persist window state across launches
const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { width: 1300, height: 840 };
  }
}

function saveWindowState(win) {
  if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return;
  try {
    fs.writeFileSync(stateFile, JSON.stringify(win.getBounds()));
  } catch {}
}

let mainWindow;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1300,
    height: state.height || 840,
    x: state.x,
    y: state.y,
    minWidth: 820,
    minHeight: 600,
    title: 'Venice AI',
    titleBarStyle: 'default',
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // persist:venice keeps cookies and localStorage across launches = stays logged in
      partition: 'persist:venice',
      spellcheck: true,
      devTools: true,
    },
  });

  mainWindow.loadURL('https://venice.ai/chat/agent');

  // Show once the page is ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (state.maximized) mainWindow.maximize();
  });

  // Track maximized state
  mainWindow.on('maximize', () => saveWindowState(mainWindow));
  mainWindow.on('unmaximize', () => saveWindowState(mainWindow));
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in the default browser instead of a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowed = [
      'https://venice.ai',
      'https://www.venice.ai',
      'https://api.venice.ai',
      // Auth redirects from OAuth providers need to stay in-app
      'https://accounts.google.com',
      'https://github.com/login',
    ];
    if (allowed.some(prefix => url.startsWith(prefix))) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Keep the title "Venice AI" regardless of page title changes
  mainWindow.on('page-title-updated', (event) => event.preventDefault());
}

function buildMenu() {
  const template = [
    {
      label: 'Venice AI',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'Cmd+N',
          click: () => mainWindow?.webContents.loadURL('https://venice.ai/chat/agent'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'Cmd+F',
          click: () => {
            mainWindow?.webContents.executeJavaScript(
              'document.querySelector(\'[data-testid="search"], input[placeholder*="search"], input[type="search"]\')?.focus()'
            );
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Cmd+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'Cmd+Shift+R',
          click: () => mainWindow?.webContents.reloadIgnoringCache(),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'Cmd+=',
          click: () => {
            if (!mainWindow) return;
            const z = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(z + 0.1, 3.0));
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'Cmd+-',
          click: () => {
            if (!mainWindow) return;
            const z = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(z - 0.1, 0.5));
          },
        },
        {
          label: 'Actual Size',
          accelerator: 'Cmd+0',
          click: () => mainWindow?.webContents.setZoomFactor(1.0),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'Cmd+Option+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Cmd+[',
          click: () => {
            if (mainWindow?.webContents.canGoBack()) mainWindow.webContents.goBack();
          },
        },
        {
          label: 'Forward',
          accelerator: 'Cmd+]',
          click: () => {
            if (mainWindow?.webContents.canGoForward()) mainWindow.webContents.goForward();
          },
        },
        { type: 'separator' },
        {
          label: 'Home',
          accelerator: 'Cmd+Shift+H',
          click: () => mainWindow?.webContents.loadURL('https://venice.ai/chat/agent'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
