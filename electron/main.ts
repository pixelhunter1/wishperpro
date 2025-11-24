import { app, BrowserWindow, ipcMain, clipboard, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, saveTranscription, getTranscriptions, saveApiKey, getApiKey, saveHotkey, getHotkey, deleteTranscription, clearAllTranscriptions } from './db';
import { transcribeAudio, processText } from './openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

const registerHotkey = () => {
  // Unregister all previous shortcuts
  globalShortcut.unregisterAll();

  const hotkey = getHotkey();

  const ret = globalShortcut.register(hotkey, () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-recording');
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
  registerHotkey();

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

ipcMain.handle('transcribe-audio', async (_event, data: { audioBlob: ArrayBuffer; mimeType?: string }) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API Key not configured');
    }

    const transcription = await transcribeAudio(data.audioBlob, apiKey, data.mimeType);
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

    const processedText = await processText(
      data.text,
      data.mode,
      data.targetLanguage,
      apiKey
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
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
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
