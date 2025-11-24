import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
}

export function Settings({ mode, setMode, targetLanguage, setTargetLanguage }: SettingsProps) {
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
        throw new Error('electronAPI não está disponível - preload script falhou');
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
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI não está disponível');
      }

      // Validar formato da API key
      if (!apiKey.startsWith('sk-')) {
        toast.error('API Key inválida (deve começar com "sk-")');
        return;
      }

      const result = await window.electronAPI.saveApiKey(apiKey);
      if (result?.success) {
        toast.success('API Key guardada com sucesso!');
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao guardar API Key';
      toast.error(errorMessage);
    }
  };

  const saveHotkey = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI não está disponível');
      }

      const result = await window.electronAPI.saveHotkey(hotkey);
      if (result?.success) {
        toast.success('Atalho guardado com sucesso!');
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error saving hotkey:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao guardar atalho';
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
        toast.success('Modelo GPT guardado!');
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error saving GPT model:', error);
      toast.error('Erro ao guardar modelo GPT');
    }
  };

  const handleWhisperModelChange = async (model: string) => {
    try {
      setWhisperModel(model);
      const result = await window.electronAPI.saveWhisperModel(model);
      if (result?.success) {
        toast.success('Modelo Whisper guardado!');
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error saving Whisper model:', error);
      toast.error('Erro ao guardar modelo Whisper');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>Configure a API OpenAI e preferências de idioma</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">OpenAI API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={saveApiKey} disabled={isLoading || !apiKey}>
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha a sua API key em{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>

        {/* Mode Selection */}
        <div className="space-y-2">
          <Label>Modo de Processamento</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as 'correct' | 'translate')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="correct">Apenas Corrigir Português</SelectItem>
              <SelectItem value="translate">Traduzir para Outro Idioma</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language Selection (only shown in translate mode) */}
        {mode === 'translate' && (
          <div className="space-y-2">
            <Label>Idioma de Destino</Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
                <SelectItem value="fr">Francês</SelectItem>
                <SelectItem value="de">Alemão</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Hotkey Configuration */}
        <div className="space-y-2">
          <Label htmlFor="hotkey">Atalho de Teclado para Gravar</Label>
          <div className="flex gap-2">
            <Input
              id="hotkey"
              type="text"
              placeholder="Pressione as teclas..."
              value={hotkey}
              onFocus={() => setIsRecordingHotkey(true)}
              onBlur={() => setIsRecordingHotkey(false)}
              onKeyDown={handleHotkeyRecording}
              readOnly
              disabled={isLoading}
              className={isRecordingHotkey ? 'border-primary' : ''}
            />
            <Button onClick={saveHotkey} disabled={isLoading || !hotkey}>
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isRecordingHotkey
              ? 'Pressione a combinação de teclas desejada...'
              : 'Clique no campo e pressione a combinação (ex: Ctrl+Shift+R)'}
          </p>
        </div>

        {/* GPT Model Selection */}
        <div className="space-y-2">
          <Label>Modelo GPT (Correção/Tradução)</Label>
          <Select value={gptModel} onValueChange={handleGptModelChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o (Recomendado - Melhor qualidade)</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido e económico)</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais barato)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Modelo usado para corrigir e traduzir o texto transcrito
          </p>
        </div>

        {/* Whisper Model Selection */}
        <div className="space-y-2">
          <Label>Modelo Whisper (Transcrição)</Label>
          <Select value={whisperModel} onValueChange={handleWhisperModelChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whisper-1">Whisper-1 (Padrão)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Modelo usado para transcrever áudio para texto (atualmente apenas whisper-1 disponível)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
