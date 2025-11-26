import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Trash2, Star, Pencil, Check, X, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TranscriptionRecord {
  id: number;
  date: string;
  originalText: string;
  finalText: string;
  language: string;
  mode: string;
  favorite: boolean;
}

export interface HistoryHandle {
  refresh: () => void;
}

export const History = forwardRef<HistoryHandle>(function History(_props, ref) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

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

  useEffect(() => {
    loadTranscriptions();
  }, []);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: loadTranscriptions,
  }));

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

  const toggleFavorite = async (id: number) => {
    try {
      const result = await window.electronAPI.toggleFavorite(id);
      if (result.success) {
        toast.success(result.isFavorite ? 'Added to favorites!' : 'Removed from favorites');
        loadTranscriptions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Error updating favorite');
    }
  };

  const startEditing = (transcription: TranscriptionRecord) => {
    setEditingId(transcription.id);
    setEditText(transcription.finalText);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: number) => {
    try {
      const result = await window.electronAPI.updateTranscription({ id, finalText: editText });
      if (result.success) {
        toast.success('Transcription updated!');
        setEditingId(null);
        setEditText('');
        loadTranscriptions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating transcription:', error);
      toast.error('Error updating transcription');
    }
  };

  const exportHistory = async (format: 'txt' | 'json' | 'csv') => {
    try {
      const result = await window.electronAPI.exportTranscriptions(format);
      if (result.success) {
        toast.success(`Exported to ${result.filePath}`);
      } else if (result.error !== 'Export cancelled') {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error exporting history:', error);
      toast.error('Error exporting history');
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
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportHistory('txt')}>
                    Export as TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportHistory('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportHistory('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={clearAll} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            </div>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleFavorite(transcription.id)}
                        className="h-6 w-6 -ml-1"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${transcription.favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                        />
                      </Button>
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
                    {editingId === transcription.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(transcription.id)}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="h-7 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">
                        {transcription.finalText}
                      </p>
                    )}
                  </div>
                  {editingId !== transcription.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(transcription)}
                        className="h-7 w-7"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(transcription.finalText)}
                        className="h-7 w-7"
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteItem(transcription.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
