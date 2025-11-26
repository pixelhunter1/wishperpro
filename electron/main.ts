import { app, BrowserWindow, ipcMain, clipboard, globalShortcut, Menu, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, saveTranscription, getTranscriptions, saveApiKey, getApiKey, saveHotkey, getHotkey, deleteTranscription, clearAllTranscriptions, saveGptModel, getGptModel, saveWhisperModel, getWhisperModel, saveOverlayPosition, getOverlayPosition, saveSourceLanguage, getSourceLanguage, toggleFavorite, updateTranscription, saveSoundEnabled, getSoundEnabled } from './db';
import { transcribeAudio, processText } from './openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    skipTaskbar: false, // Ensure app appears in dock/taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Keep renderer active even when hidden
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Explicitly show the window and ensure it appears in dock (macOS)
  mainWindow.show();
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
  }

  // Create menu with DevTools option
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'WishperPro',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        {
          label: 'Abrir DevTools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // When clicking on dock icon, restore the window if minimized
  app.on('activate', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
    }
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    console.log('[WINDOW] Main window closing...');

    // When user closes the main window, we should quit the app on all platforms
    // This ensures overlay window is also closed and app terminates properly
    console.log(`[WINDOW] ${process.platform}: Closing overlay and quitting app`);

    // Close overlay window first
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.destroy();
      overlayWindow = null;
      console.log('[WINDOW] Overlay window destroyed');
    }

    // Quit the app (works on all platforms)
    app.quit();
  });
};

const createOverlayWindow = () => {
  // Get saved position or use default (top-right)
  const savedPosition = getOverlayPosition();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const overlayWidth = 60;
  const overlayHeight = 60;

  let x = width - overlayWidth - 20; // Default: top-right with margin
  let y = 20;

  if (savedPosition) {
    x = savedPosition.x;
    y = savedPosition.y;
  }

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set window to appear above fullscreen apps on macOS
  // Using 'screen-saver' level (highest level) to ensure it appears above ALL apps including fullscreen
  // Levels: normal < floating < modal-panel < main-menu < status < pop-up-menu < screen-saver
  if (process.platform === 'darwin') {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    // Also set the window to be visible on all workspaces/spaces
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '/overlay.html');
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/overlay.html'));
  }

  // Save position when window is moved
  overlayWindow.on('move', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const [newX, newY] = overlayWindow.getPosition();
      saveOverlayPosition(newX, newY);
    }
  });

  // Mostrar sempre o overlay (sempre visível)
  overlayWindow.show();
};

const registerHotkey = () => {
  // Unregister all previous shortcuts
  globalShortcut.unregisterAll();

  const hotkey = getHotkey();

  const ret = globalShortcut.register(hotkey, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        // Send toggle recording event regardless of window state
        // The overlay window will show recording status
        console.log('[HOTKEY] Sending toggle-recording event (window may be minimized)');
        mainWindow.webContents.send('toggle-recording');
      } catch (error) {
        console.error('[HOTKEY] Error sending toggle-recording event:', error);
      }
    } else {
      console.warn('[HOTKEY] Cannot send event - main window is destroyed');
    }
  });

  if (!ret) {
    console.log('Hotkey registration failed:', hotkey);
  } else {
    console.log('Hotkey registered:', hotkey);
  }
};

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Wait for main window to be ready before creating overlay
  // This ensures proper dock icon display on macOS
  if (mainWindow) {
    mainWindow.once('ready-to-show', () => {
      console.log('[APP] Main window ready, creating overlay');
      createOverlayWindow();
      registerHotkey();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) {
        mainWindow.once('ready-to-show', () => {
          createOverlayWindow();
        });
      }
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup overlay window if it still exists
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }

  // Quit on all platforms (including macOS)
  // We changed behavior: closing main window should quit the app
  app.quit();
});

app.on('will-quit', () => {
  console.log('[APP] Application quitting, cleaning up...');

  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // Ensure overlay window is destroyed
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }

  // Ensure main window is destroyed
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
});

// IPC Handlers
ipcMain.handle('save-api-key', async (_event, apiKey: string) => {
  try {
    saveApiKey(apiKey);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-api-key', async () => {
  try {
    const apiKey = getApiKey();
    return { success: true, apiKey };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('transcribe-audio', async (_event, data: { audioBlob: ArrayBuffer; mimeType?: string; sourceLanguage?: string }) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not configured');
    }

    const whisperModel = getWhisperModel();
    const sourceLanguage = data.sourceLanguage || getSourceLanguage();
    const transcription = await transcribeAudio(data.audioBlob, apiKey, whisperModel, sourceLanguage, data.mimeType);
    return { success: true, text: transcription };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('process-text', async (_event, data: {
  text: string;
  mode: 'correct' | 'translate';
  targetLanguage: string;
}) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not configured');
    }

    const gptModel = getGptModel();
    const processedText = await processText(
      data.text,
      data.mode,
      data.targetLanguage,
      apiKey,
      gptModel
    );

    // Save to database
    saveTranscription(
      data.text,
      processedText,
      data.targetLanguage,
      data.mode
    );

    return { success: true, text: processedText };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('copy-to-clipboard', async (_event, text: string) => {
  try {
    console.log('[CLIPBOARD] Copying text to clipboard:', text.substring(0, 50));
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('paste-to-active-window', async (_event, text: string) => {
  try {
    console.log('[PASTE] Starting auto-paste...', text.substring(0, 50));

    // Helper function to verify clipboard content
    const verifyClipboard = (expectedText: string): boolean => {
      const currentClipboard = clipboard.readText();
      const matches = currentClipboard === expectedText;
      if (!matches) {
        console.log('[PASTE] Clipboard verification failed');
        console.log('[PASTE] Expected:', expectedText.substring(0, 50));
        console.log('[PASTE] Got:', currentClipboard.substring(0, 50));
      }
      return matches;
    };

    // Clear clipboard first to prevent old text from being pasted
    clipboard.clear();
    console.log('[PASTE] Clipboard cleared');

    // Verify clipboard is actually empty
    let clearVerified = false;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (clipboard.readText() === '') {
        clearVerified = true;
        console.log('[PASTE] Clipboard clear verified');
        break;
      }
    }

    if (!clearVerified) {
      console.warn('[PASTE] Clipboard clear could not be verified, proceeding anyway');
    }

    // Try to write text to clipboard with verification and retry
    const maxAttempts = 5;
    let writeSuccess = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[PASTE] Write attempt ${attempt}/${maxAttempts}`);

      // Write text to clipboard
      clipboard.writeText(text);

      // Wait for clipboard to sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the clipboard contains our text
      if (verifyClipboard(text)) {
        console.log('[PASTE] Clipboard write verified successfully');
        writeSuccess = true;
        break;
      }

      // If not the last attempt, wait before retry
      if (attempt < maxAttempts) {
        console.log('[PASTE] Retrying clipboard write...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (!writeSuccess) {
      throw new Error('Failed to write text to clipboard after ' + maxAttempts + ' attempts');
    }

    // Execute paste command based on platform
    const pasteStartTime = Date.now();
    if (process.platform === 'darwin') {
      // macOS: Use Cmd+V to paste from clipboard
      // This preserves all text encoding and special characters
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      console.log('[PASTE] Pasting via Cmd+V with AppleScript...');
      // Use keystroke with "v" and command down modifier
      await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
      console.log('[PASTE] Paste command sent successfully');

      // Wait a bit to ensure paste completes
      await new Promise(resolve => setTimeout(resolve, 100));
    } else if (process.platform === 'linux') {
      // Linux: Use xdotool (requires xdotool to be installed)
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        // Check if xdotool is installed
        await execAsync('which xdotool');
        await execAsync('xdotool key ctrl+v');
        console.log('[PASTE] Paste command sent via xdotool');
      } catch (xdotoolError) {
        console.warn('[PASTE] xdotool not found. Text has been copied to clipboard only.');
        console.warn('[PASTE] Install xdotool with: sudo apt-get install xdotool');
        // Text is already in clipboard, so just return success
      }
    } else if (process.platform === 'win32') {
      // Windows: Use PowerShell SendKeys
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"');
    }

    const pasteElapsed = Date.now() - pasteStartTime;
    console.log(`[PASTE] Auto-paste completed successfully (paste took ${pasteElapsed}ms)`);

    return { success: true };
  } catch (error) {
    console.error('[PASTE] Auto-paste error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-transcriptions', async () => {
  try {
    const transcriptions = getTranscriptions();
    return { success: true, transcriptions };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('delete-transcription', async (_event, id: number) => {
  try {
    deleteTranscription(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('clear-all-transcriptions', async () => {
  try {
    clearAllTranscriptions();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('toggle-favorite', async (_event, id: number) => {
  try {
    const isFavorite = toggleFavorite(id);
    return { success: true, isFavorite };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('update-transcription', async (_event, data: { id: number; finalText: string }) => {
  try {
    updateTranscription(data.id, data.finalText);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('export-transcriptions', async (_event, format: 'txt' | 'json' | 'csv') => {
  try {
    const transcriptions = getTranscriptions(1000); // Get all transcriptions
    let content: string;
    let filename: string;

    const now = new Date().toISOString().slice(0, 10);

    switch (format) {
      case 'json':
        content = JSON.stringify(transcriptions, null, 2);
        filename = `wishperpro-export-${now}.json`;
        break;
      case 'csv':
        const headers = 'ID,Date,Original Text,Final Text,Language,Mode,Favorite\n';
        const rows = transcriptions.map(t =>
          `${t.id},"${t.date}","${t.originalText.replace(/"/g, '""')}","${t.finalText.replace(/"/g, '""')}","${t.language}","${t.mode}",${t.favorite}`
        ).join('\n');
        content = headers + rows;
        filename = `wishperpro-export-${now}.csv`;
        break;
      case 'txt':
      default:
        content = transcriptions.map(t =>
          `[${t.date}] (${t.mode === 'correct' ? 'Corrected' : 'Translated to ' + t.language})${t.favorite ? ' ⭐' : ''}\n${t.finalText}\n`
        ).join('\n---\n\n');
        filename = `wishperpro-export-${now}.txt`;
        break;
    }

    // Use dialog to save file
    const { dialog } = await import('electron');
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    const fs = await import('fs/promises');
    await fs.writeFile(result.filePath, content, 'utf-8');

    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('validate-api-key', async (_event, apiKey: string) => {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });

    // Make a minimal API call to validate the key
    await openai.models.list();

    return { success: true, valid: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('401') || errorMessage.includes('Incorrect API key')) {
      return { success: true, valid: false, error: 'Invalid API key' };
    }
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('show-notification', async (_event, data: { title: string; body: string }) => {
  try {
    const { Notification } = await import('electron');

    if (Notification.isSupported()) {
      const notification = new Notification({
        title: data.title,
        body: data.body,
        silent: false
      });
      notification.show();
      return { success: true };
    } else {
      return { success: false, error: 'Notifications not supported' };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-hotkey', async (_event, hotkey: string) => {
  try {
    saveHotkey(hotkey);
    registerHotkey();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-hotkey', async () => {
  try {
    const hotkey = getHotkey();
    return { success: true, hotkey };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-gpt-model', async (_event, model: string) => {
  try {
    saveGptModel(model);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-gpt-model', async () => {
  try {
    const model = getGptModel();
    return { success: true, model };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-whisper-model', async (_event, model: string) => {
  try {
    saveWhisperModel(model);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-whisper-model', async () => {
  try {
    const model = getWhisperModel();
    return { success: true, model };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Overlay window control
ipcMain.handle('show-overlay-window', async () => {
  try {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      createOverlayWindow();
    }
    overlayWindow?.show();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('hide-overlay-window', async () => {
  try {
    overlayWindow?.hide();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Audio level updates (sent from renderer to overlay)
ipcMain.on('audio-level', (_event, level: number) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      overlayWindow.webContents.send('update-audio-level', level);
    } catch (error) {
      console.error('[AUDIO] Error sending audio level to overlay:', error);
    }
  }
});

// Source language handlers
ipcMain.handle('save-source-language', async (_event, language: string) => {
  try {
    saveSourceLanguage(language);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-source-language', async () => {
  try {
    const language = getSourceLanguage();
    return { success: true, language };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('save-sound-enabled', async (_event, enabled: boolean) => {
  try {
    saveSoundEnabled(enabled);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-sound-enabled', async () => {
  try {
    const enabled = getSoundEnabled();
    return { success: true, enabled };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
