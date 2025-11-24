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
  saveGptModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  getGptModel: () => Promise<{ success: boolean; model?: string; error?: string }>;
  saveWhisperModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  getWhisperModel: () => Promise<{ success: boolean; model?: string; error?: string }>;
  transcribeAudio: (data: { audioBlob: ArrayBuffer; mimeType?: string }) => Promise<{ success: boolean; text?: string; error?: string }>;
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
  onToggleRecording: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
