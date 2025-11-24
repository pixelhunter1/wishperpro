import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TranscriptionRecord {
  id: number;
  date: string;
  originalText: string;
  finalText: string;
  language: string;
  mode: string;
}

export function History() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = async () => {
    try {
      const result = await window.electronAPI.getTranscriptions();
      if (result.success && result.transcriptions) {
        setTranscriptions(result.transcriptions);
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      const result = await window.electronAPI.copyToClipboard(text);
      if (result.success) {
        toast.success('Texto copiado!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erro ao copiar texto');
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const result = await window.electronAPI.deleteTranscription(id);
      if (result.success) {
        toast.success('Transcrição removida!');
        loadTranscriptions(); // Reload list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting transcription:', error);
      toast.error('Erro ao remover transcrição');
    }
  };

  const clearAll = async () => {
    if (!confirm('Tem certeza que deseja apagar todo o histórico?')) {
      return;
    }

    try {
      const result = await window.electronAPI.clearAllTranscriptions();
      if (result.success) {
        toast.success('Histórico limpo!');
        loadTranscriptions(); // Reload list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      pt: 'Português',
      en: 'Inglês',
      es: 'Espanhol',
      fr: 'Francês',
      de: 'Alemão',
      it: 'Italiano',
    };
    return languages[code] || code;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>A carregar...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico de Transcrições</CardTitle>
            <CardDescription>
              {transcriptions.length} transcrição{transcriptions.length !== 1 ? 'ões' : ''}
            </CardDescription>
          </div>
          {transcriptions.length > 0 && (
            <Button variant="destructive" size="sm" onClick={clearAll}>
              Limpar Tudo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transcriptions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transcrição registada
          </p>
        ) : (
          <div className="space-y-4">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={transcription.mode === 'correct' ? 'default' : 'secondary'}>
                      {transcription.mode === 'correct' ? 'Correção' : 'Tradução'}
                    </Badge>
                    <Badge variant="outline">
                      {getLanguageName(transcription.language)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transcription.date)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(transcription.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Original:</p>
                    <p className="text-sm">{transcription.originalText}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Processado:</p>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">
                        {transcription.finalText}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(transcription.finalText)}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
