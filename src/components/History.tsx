import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Trash2 } from 'lucide-react';

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
      toast.error('Error loading history');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      const result = await window.electronAPI.copyToClipboard(text);
      if (result.success) {
        toast.success('Text copied!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error copying text');
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const result = await window.electronAPI.deleteTranscription(id);
      if (result.success) {
        toast.success('Transcription deleted!');
        loadTranscriptions(); // Reload list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting transcription:', error);
      toast.error('Error deleting transcription');
    }
  };

  const clearAll = async () => {
    if (!confirm('Are you sure you want to delete all history?')) {
      return;
    }

    try {
      const result = await window.electronAPI.clearAllTranscriptions();
      if (result.success) {
        toast.success('History cleared!');
        loadTranscriptions(); // Reload list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Error clearing history');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      pt: 'Portuguese',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
    };
    return languages[code] || code;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription className="text-sm">Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Transcription History</CardTitle>
            <CardDescription className="text-sm">
              {transcriptions.length} transcription{transcriptions.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </div>
          {transcriptions.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transcriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No transcriptions yet</p>
            <p className="text-xs text-muted-foreground">
              Use the keyboard shortcut to record your first transcription
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="group border rounded-lg p-3.5 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={transcription.mode === 'correct' ? 'default' : 'secondary'}
                        className="text-xs px-2 py-0.5"
                      >
                        {transcription.mode === 'correct' ? 'Corrected' : 'Translated'}
                      </Badge>
                      {transcription.mode === 'translate' && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {getLanguageName(transcription.language)}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(transcription.date)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {transcription.finalText}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(transcription.finalText)}
                      className="h-7 w-7"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteItem(transcription.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
