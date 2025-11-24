import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SettingsProps {
  mode: 'correct' | 'translate';
  setMode: (mode: 'correct' | 'translate') => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  onHotkeyChange?: (hotkey: string) => void;
}

export function Settings({ mode, setMode, targetLanguage, setTargetLanguage, sourceLanguage, setSourceLanguage, onHotkeyChange }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [hotkey, setHotkey] = useState('');
  const [gptModel, setGptModel] = useState('gpt-4o');
  const [whisperModel, setWhisperModel] = useState('whisper-1');
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI not available - preload script failed');
      }

      const [apiKeyResult, hotkeyResult, gptModelResult, whisperModelResult] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getHotkey(),
        window.electronAPI.getGptModel(),
        window.electronAPI.getWhisperModel(),
      ]);

      if (apiKeyResult?.success && apiKeyResult.apiKey) {
        setApiKey(apiKeyResult.apiKey);
      }

      if (hotkeyResult?.success && hotkeyResult.hotkey) {
        setHotkey(hotkeyResult.hotkey);
      }

      if (gptModelResult?.success && gptModelResult.model) {
        setGptModel(gptModelResult.model);
      }

      if (whisperModelResult?.success && whisperModelResult.model) {
        setWhisperModel(whisperModelResult.model);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error loading settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI not available');
      }

      // Validate API key format
      if (!apiKey.startsWith('sk-')) {
        toast.error('Invalid API Key (must start with "sk-")');
        return;
      }

      const result = await window.electronAPI.saveApiKey(apiKey);
      if (result?.success) {
        toast.success('API Key saved successfully!');
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving API Key';
      toast.error(errorMessage);
    }
  };

  const saveHotkey = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI not available');
      }

      const result = await window.electronAPI.saveHotkey(hotkey);
      if (result?.success) {
        toast.success('Hotkey saved successfully!');
        // Notify parent component of hotkey change
        if (onHotkeyChange) {
          onHotkeyChange(hotkey);
        }
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving hotkey:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving hotkey';
      toast.error(errorMessage);
    }
  };

  const handleHotkeyRecording = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecordingHotkey) return;

    e.preventDefault();

    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    const key = e.key.toUpperCase();
    if (key.length === 1 || ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(key)) {
      const hotkeyString = [...modifiers, key].join('+');
      setHotkey(hotkeyString);
      setIsRecordingHotkey(false);
    }
  };

  const handleGptModelChange = async (model: string) => {
    try {
      setGptModel(model);
      const result = await window.electronAPI.saveGptModel(model);
      if (result?.success) {
        toast.success('GPT model saved!');
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving GPT model:', error);
      toast.error('Error saving GPT model');
    }
  };

  const handleWhisperModelChange = async (model: string) => {
    try {
      setWhisperModel(model);
      const result = await window.electronAPI.saveWhisperModel(model);
      if (result?.success) {
        toast.success('Whisper model saved!');
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving Whisper model:', error);
      toast.error('Error saving Whisper model');
    }
  };

  const handleSourceLanguageChange = async (language: string) => {
    try {
      setSourceLanguage(language);
      const result = await window.electronAPI.saveSourceLanguage(language);
      if (result?.success) {
        toast.success('Source language saved!');
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving source language:', error);
      toast.error('Error saving source language');
    }
  };

  return (
    <div className="space-y-4">
      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey" className="text-sm font-medium">OpenAI API Key</Label>
        <div className="flex gap-2">
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
            className="h-8 text-sm"
          />
          <Button onClick={saveApiKey} disabled={isLoading || !apiKey} size="sm" className="h-8 px-3 text-xs">
            Save
          </Button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Language Settings */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Source Language</Label>
            <Select value={sourceLanguage} onValueChange={handleSourceLanguageChange} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" className="max-h-[180px]">
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Mode</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as 'correct' | 'translate')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correct">Correct Only</SelectItem>
                <SelectItem value="translate">Translate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === 'translate' && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Target Language</Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" className="max-h-[180px]">
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Keyboard Shortcut */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Keyboard Shortcut</Label>
        <div className="flex gap-2">
          <Input
            id="hotkey"
            type="text"
            placeholder="Click and press keys..."
            value={hotkey}
            onFocus={() => setIsRecordingHotkey(true)}
            onBlur={() => setIsRecordingHotkey(false)}
            onKeyDown={handleHotkeyRecording}
            readOnly
            disabled={isLoading}
            className={`h-8 font-mono text-sm ${isRecordingHotkey ? 'border-primary ring-1 ring-primary' : ''}`}
          />
          <Button onClick={saveHotkey} disabled={isLoading || !hotkey} size="sm" className="h-8 px-3 text-xs">
            Save
          </Button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* AI Models */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Transcription</Label>
          <Select value={whisperModel} onValueChange={handleWhisperModelChange} disabled={isLoading}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini-transcribe">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4o-transcribe">GPT-4o</SelectItem>
              <SelectItem value="whisper-1">Whisper-1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Processing</Label>
          <Select value={gptModel} onValueChange={handleGptModelChange} disabled={isLoading}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
