export interface TranscriptionRecord {
  id: number;
  date: string;
  originalText: string;
  finalText: string;
  language: string;
  mode: string;
  favorite: boolean;
}

export interface ElectronAPI {
  saveApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  getApiKey: () => Promise<{ success: boolean; apiKey?: string; error?: string }>;
  validateApiKey: (apiKey: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
  saveHotkey: (hotkey: string) => Promise<{ success: boolean; error?: string }>;
  getHotkey: () => Promise<{ success: boolean; hotkey?: string; error?: string }>;
  saveGptModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  getGptModel: () => Promise<{ success: boolean; model?: string; error?: string }>;
  saveWhisperModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  getWhisperModel: () => Promise<{ success: boolean; model?: string; error?: string }>;
  saveSourceLanguage: (language: string) => Promise<{ success: boolean; error?: string }>;
  getSourceLanguage: () => Promise<{ success: boolean; language?: string; error?: string }>;
  saveSoundEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getSoundEnabled: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  transcribeAudio: (data: { audioBlob: ArrayBuffer; mimeType?: string; sourceLanguage?: string }) => Promise<{ success: boolean; text?: string; error?: string }>;
  processText: (data: {
    text: string;
    mode: 'correct' | 'translate';
    targetLanguage: string;
  }) => Promise<{ success: boolean; text?: string; error?: string }>;
  copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;
  pasteToActiveWindow: (text: string) => Promise<{ success: boolean; error?: string }>;
  getTranscriptions: () => Promise<{ success: boolean; transcriptions?: TranscriptionRecord[]; error?: string }>;
  deleteTranscription: (id: number) => Promise<{ success: boolean; error?: string }>;
  clearAllTranscriptions: () => Promise<{ success: boolean; error?: string }>;
  toggleFavorite: (id: number) => Promise<{ success: boolean; isFavorite?: boolean; error?: string }>;
  updateTranscription: (data: { id: number; finalText: string }) => Promise<{ success: boolean; error?: string }>;
  exportTranscriptions: (format: 'txt' | 'json' | 'csv') => Promise<{ success: boolean; filePath?: string; error?: string }>;
  showNotification: (data: { title: string; body: string }) => Promise<{ success: boolean; error?: string }>;
  onToggleRecording: (callback: () => void) => () => void;
  showOverlayWindow: () => Promise<{ success: boolean; error?: string }>;
  hideOverlayWindow: () => Promise<{ success: boolean; error?: string }>;
  sendAudioLevel: (level: number) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
