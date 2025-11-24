const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveHotkey: (hotkey) => ipcRenderer.invoke('save-hotkey', hotkey),
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),
  transcribeAudio: (data) => ipcRenderer.invoke('transcribe-audio', data),
  processText: (data) => ipcRenderer.invoke('process-text', data),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  pasteToActiveWindow: (text) => ipcRenderer.invoke('paste-to-active-window', text),
  getTranscriptions: () => ipcRenderer.invoke('get-transcriptions'),
  deleteTranscription: (id) => ipcRenderer.invoke('delete-transcription', id),
  clearAllTranscriptions: () => ipcRenderer.invoke('clear-all-transcriptions'),
  onToggleRecording: (callback) => {
    ipcRenderer.on('toggle-recording', callback);
  },
});
