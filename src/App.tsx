import { useState, useEffect, useRef } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Recorder } from '@/components/Recorder'
import { Settings } from '@/components/Settings'
import { History } from '@/components/History'
import type { HistoryHandle } from '@/components/History'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function App() {
  const [mode, setMode] = useState<'correct' | 'translate'>('correct')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [sourceLanguage, setSourceLanguage] = useState('pt')
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+R')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Refs to control recording from global hotkey
  const recorderRef = useRef<{
    startRecording: () => void;
    stopRecording: () => void;
    isRecording: () => boolean;
  } | null>(null)

  // Ref to refresh history after transcription
  const historyRef = useRef<HistoryHandle | null>(null)

  const handleTranscriptionComplete = () => {
    if (historyRef.current) {
      historyRef.current.refresh();
    }
  }

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

      const soundResult = await window.electronAPI.getSoundEnabled();
      if (soundResult.success) {
        setSoundEnabled(soundResult.enabled);
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
        <div className="mx-auto max-w-3xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <svg className="h-4 w-4 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">WishperPro</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Settings Button */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto p-5">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <Settings
                    mode={mode}
                    setMode={setMode}
                    targetLanguage={targetLanguage}
                    setTargetLanguage={setTargetLanguage}
                    sourceLanguage={sourceLanguage}
                    setSourceLanguage={setSourceLanguage}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    onHotkeyChange={setHotkey}
                  />
                </DialogContent>
              </Dialog>
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
          soundEnabled={soundEnabled}
          ref={recorderRef}
          onTranscriptionComplete={handleTranscriptionComplete}
        />
      </div>

      {/* Main Content - History */}
      <main className="mx-auto max-w-3xl px-6 py-5">
        <History ref={historyRef} />
      </main>

      <Toaster />
    </div>
  )
}

export default App
