import { contextBridge, ipcRenderer } from 'electron';

export interface TranscriptionRecord {
  id: number;
  date: string;
  originalText: string;
  finalText: string;
  language: string;
  mode: string;
}

export interface ElectronAPI {
  saveApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  getApiKey: () => Promise<{ success: boolean; apiKey?: string; error?: string }>;
  saveHotkey: (hotkey: string) => Promise<{ success: boolean; error?: string }>;
  getHotkey: () => Promise<{ success: boolean; hotkey?: string; error?: string }>;
  transcribeAudio: (data: { audioBlob: ArrayBuffer; mimeType?: string }) => Promise<{ success: boolean; text?: string; error?: string }>;
  processText: (data: {
    text: string;
    mode: 'correct' | 'translate';
    targetLanguage: string;
  }) => Promise<{ success: boolean; text?: string; error?: string }>;
  copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;
  getTranscriptions: () => Promise<{ success: boolean; transcriptions?: TranscriptionRecord[]; error?: string }>;
  deleteTranscription: (id: number) => Promise<{ success: boolean; error?: string }>;
  clearAllTranscriptions: () => Promise<{ success: boolean; error?: string }>;
  onToggleRecording: (callback: () => void) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveHotkey: (hotkey: string) => ipcRenderer.invoke('save-hotkey', hotkey),
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),
  transcribeAudio: (data: { audioBlob: ArrayBuffer; mimeType?: string }) => ipcRenderer.invoke('transcribe-audio', data),
  processText: (data: {
    text: string;
    mode: 'correct' | 'translate';
    targetLanguage: string;
  }) => ipcRenderer.invoke('process-text', data),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  getTranscriptions: () => ipcRenderer.invoke('get-transcriptions'),
  deleteTranscription: (id: number) => ipcRenderer.invoke('delete-transcription', id),
  clearAllTranscriptions: () => ipcRenderer.invoke('clear-all-transcriptions'),
  onToggleRecording: (callback: () => void) => {
    ipcRenderer.on('toggle-recording', callback);
  },
} as ElectronAPI);
