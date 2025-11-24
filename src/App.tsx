import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Recorder } from '@/components/Recorder'
import { Settings } from '@/components/Settings'
import { History } from '@/components/History'

function App() {
  const [mode, setMode] = useState<'correct' | 'translate'>('correct')
  const [targetLanguage, setTargetLanguage] = useState('en')

  // Verificar se o electronAPI está disponível ao iniciar
  useEffect(() => {
    if (!window.electronAPI) {
      console.error('CRÍTICO: window.electronAPI não está disponível - preload script falhou');
      toast.error('Erro crítico: A aplicação não conseguiu inicializar corretamente. Por favor, reinicie a aplicação.');
    } else {
      console.log('✓ electronAPI carregado com sucesso');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">WishperPro</h1>
          <p className="text-muted-foreground">
            Transcreva, corrija e traduza usando a sua voz
          </p>
        </div>

        <Tabs defaultValue="recorder" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recorder">Gravar</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="recorder" className="mt-6">
            <Recorder mode={mode} targetLanguage={targetLanguage} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <History />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Settings
              mode={mode}
              setMode={setMode}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}

export default App
