import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Recorder } from '@/components/Recorder'
import { Settings } from '@/components/Settings'
import { History } from '@/components/History'

function App() {
  const [mode, setMode] = useState<'correct' | 'translate'>('correct')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [sourceLanguage, setSourceLanguage] = useState('pt')
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+R')

  // Refs to control recording from global hotkey
  const recorderRef = useRef<{
    startRecording: () => void;
    stopRecording: () => void;
    isRecording: () => boolean;
  } | null>(null)

  // Verificar se o electronAPI está disponível ao iniciar
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('CRÍTICO: window.electronAPI não está disponível - preload script falhou');
      toast.error('Critical error: The application failed to initialize correctly. Please restart the application.');
    } else {
      console.log('✓ electronAPI carregado com sucesso');
    }
  }, []);

  // Load hotkey and source language from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      const hotkeyResult = await window.electronAPI.getHotkey();
      if (hotkeyResult.success && hotkeyResult.hotkey) {
        setHotkey(hotkeyResult.hotkey);
      }

      const sourceLanguageResult = await window.electronAPI.getSourceLanguage();
      if (sourceLanguageResult.success && sourceLanguageResult.language) {
        setSourceLanguage(sourceLanguageResult.language);
      }
    };
    loadSettings();
  }, []);

  // Global hotkey listener - works regardless of which tab is active or if app is minimized
  useEffect(() => {
    const handleToggle = () => {
      console.log('[APP] Global hotkey pressed, recorderRef:', recorderRef.current);
      if (recorderRef.current) {
        if (recorderRef.current.isRecording()) {
          console.log('[APP] Stopping recording via global hotkey');
          recorderRef.current.stopRecording();
        } else {
          console.log('[APP] Starting recording via global hotkey');
          recorderRef.current.startRecording();
        }
      } else {
        console.warn('[APP] Recorder not ready yet');
      }
    };

    if (window.electronAPI?.onToggleRecording) {
      console.log('[APP] Registering global hotkey listener');
      const cleanup = window.electronAPI.onToggleRecording(handleToggle);

      return () => {
        console.log('[APP] Cleaning up global hotkey listener');
        if (cleanup) cleanup();
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">WishperPro</h1>
                <p className="text-xs text-muted-foreground">Voice transcription & translation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono">
                {hotkey.replace('CommandOrControl', 'Cmd').replace('+', ' + ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Recorder always mounted but hidden - needed for global hotkey to work */}
      <div style={{ display: 'none' }}>
        <Recorder
          mode={mode}
          targetLanguage={targetLanguage}
          sourceLanguage={sourceLanguage}
          hotkey={hotkey}
          ref={recorderRef}
        />
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 py-6">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-5">
            <History />
          </TabsContent>

          <TabsContent value="settings" className="mt-5">
            <Settings
              mode={mode}
              setMode={setMode}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
              sourceLanguage={sourceLanguage}
              setSourceLanguage={setSourceLanguage}
              onHotkeyChange={setHotkey}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  )
}

export default App
