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
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">WishperPro</h1>
          <p className="text-muted-foreground">
            Transcribe, correct and translate using your voice
          </p>
        </div>

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

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
            <History />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
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
      </div>

      <Toaster />
    </div>
  )
}

export default App
