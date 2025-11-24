import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RecorderProps {
  mode: 'correct' | 'translate';
  targetLanguage: string;
}

export function Recorder({ mode, targetLanguage }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [finalText, setFinalText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Listen for hotkey toggle from main process
    const handleToggle = () => {
      console.log('Hotkey pressed, isRecording:', isRecording);
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    if (window.electronAPI?.onToggleRecording) {
      window.electronAPI.onToggleRecording(handleToggle);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      console.log('[RECORDER] startRecording called');
      // Clear previous transcription texts before starting new recording
      setTranscribedText('');
      setFinalText('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to find the best supported audio format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);

      console.log('Recording with mimeType:', mediaRecorder.mimeType);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        await processAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao aceder ao microfone');
    }
  };

  const stopRecording = () => {
    console.log('[RECORDER] stopRecording called, isRecording:', isRecording);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Check minimum audio size (at least 1KB)
      if (audioBlob.size < 1000) {
        toast.error('Áudio muito curto. Por favor, grave pelo menos 1 segundo.');
        return;
      }

      console.log('Processing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeKB: (audioBlob.size / 1024).toFixed(2) + ' KB'
      });

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Step 1: Transcribe audio
      const transcriptionResult = await window.electronAPI.transcribeAudio({
        audioBlob: arrayBuffer,
        mimeType: audioBlob.type,
      });

      if (!transcriptionResult.success || !transcriptionResult.text) {
        throw new Error(transcriptionResult.error || 'Erro na transcrição');
      }

      setTranscribedText(transcriptionResult.text);

      // Step 2: Process text (correct or translate)
      const processResult = await window.electronAPI.processText({
        text: transcriptionResult.text,
        mode,
        targetLanguage,
      });

      if (!processResult.success || !processResult.text) {
        throw new Error(processResult.error || 'Erro no processamento');
      }

      setFinalText(processResult.text);

      // Try to paste automatically to where cursor is
      try {
        console.log('[RECORDER] Calling pasteToActiveWindow with:', processResult.text.substring(0, 50));
        await window.electronAPI.pasteToActiveWindow(processResult.text);
        toast.success('✓ Transcrição concluída e colada!');
      } catch (error) {
        // If paste fails, just copy to clipboard
        console.warn('[RECORDER] Auto-paste failed, falling back to clipboard:', error);
        await window.electronAPI.copyToClipboard(processResult.text);
        toast.success('✓ Transcrição concluída e copiada!');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error((error as Error).message || 'Erro ao processar áudio');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!finalText) return;

    try {
      const result = await window.electronAPI.copyToClipboard(finalText);

      if (!result.success) {
        throw new Error(result.error);
      }
      // Toast removed - already copied automatically after transcription
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erro ao copiar texto');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gravação de Áudio</CardTitle>
        <CardDescription>
          <strong>Mouse:</strong> Mantenha o botão pressionado enquanto fala<br />
          <strong>Teclado (Cmd+Shift+R):</strong> Pressione para iniciar, pressione novamente para parar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Button
            size="lg"
            className="h-24 w-24 rounded-full"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => isRecording && stopRecording()}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
          >
            {isRecording ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs">A gravar</span>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500 animate-spin" />
                <span className="text-xs">A processar</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary" />
                <span className="text-xs">Pressionar</span>
              </div>
            )}
          </Button>
        </div>

        {transcribedText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Transcrito</Badge>
            </div>
            <div className="rounded-md border p-3 text-sm">
              {transcribedText}
            </div>
          </div>
        )}

        {finalText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="default">
                {mode === 'correct' ? 'Corrigido' : 'Traduzido'}
              </Badge>
              <Button size="sm" onClick={copyToClipboard}>
                Copiar
              </Button>
            </div>
            <div className="rounded-md border bg-muted p-3 text-sm font-medium">
              {finalText}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
