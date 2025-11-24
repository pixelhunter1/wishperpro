import { contextBridge, ipcRenderer } from 'electron';

// Interface para o API do overlay
interface ElectronOverlayAPI {
  onUpdateAudioLevel: (callback: (level: number) => void) => () => void;
}

// Expor API segura para o overlay
contextBridge.exposeInMainWorld('electronOverlayAPI', {
  onUpdateAudioLevel: (callback: (level: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, level: number) => {
      callback(level);
    };
    ipcRenderer.on('update-audio-level', listener);

    // Retornar função de cleanup
    return () => {
      ipcRenderer.removeListener('update-audio-level', listener);
    };
  }
} as ElectronOverlayAPI);
