import { app, BrowserWindow, ipcMain, clipboard, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, saveTranscription, getTranscriptions, saveApiKey, getApiKey, saveHotkey, getHotkey, deleteTranscription, clearAllTranscriptions, saveGptModel, getGptModel, saveWhisperModel, getWhisperModel } from './db';
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

    const whisperModel = getWhisperModel();
    const transcription = await transcribeAudio(data.audioBlob, apiKey, whisperModel, data.mimeType);
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

    // Clear clipboard first to prevent old text from being pasted
    clipboard.clear();
    console.log('[PASTE] Clipboard cleared');

    // Copy text to clipboard
    clipboard.writeText(text);
    console.log('[PASTE] Text copied to clipboard');

    // Longer delay to ensure clipboard is ready
    await new Promise(resolve => setTimeout(resolve, 200));

    if (process.platform === 'darwin') {
      // macOS: Use AppleScript to paste
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      console.log('Executing paste command...');
      const result = await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
      console.log('Paste command executed:', result);
    } else if (process.platform === 'linux') {
      // Linux: Use xdotool
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('xdotool key ctrl+v');
    } else if (process.platform === 'win32') {
      // Windows: Use PowerShell SendKeys
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"');
    }

    // Extra delay after paste
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Auto-paste completed');

    return { success: true };
  } catch (error) {
    console.error('Auto-paste error:', error);
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
