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
  const isRecordingRef = useRef(false); // Track recording state without triggering re-renders
  const isProcessingRef = useRef(false); // Prevent duplicate processing

  // Register hotkey listener ONCE on mount, not on every state change
  useEffect(() => {
    const handleToggle = () => {
      console.log('[RECORDER] Hotkey pressed, isRecordingRef:', isRecordingRef.current);
      if (isRecordingRef.current) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    if (window.electronAPI?.onToggleRecording) {
      console.log('[RECORDER] Registering hotkey listener (once on mount)');
      window.electronAPI.onToggleRecording(handleToggle);

      // Cleanup on unmount
      return () => {
        console.log('[RECORDER] Removing hotkey listener on unmount');
      };
    }
  }, []); // Empty deps = runs once on mount

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
        console.log('[RECORDER] Data available, chunk size:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[RECORDER] MediaRecorder stopped, chunks count:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('[RECORDER] Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);

        // Process audio BEFORE clearing chunks (to avoid race conditions)
        await processAudio(audioBlob);

        // Clear audio chunks after processing to prevent contamination of next recording
        audioChunksRef.current = [];
        console.log('[RECORDER] Audio chunks cleared after processing');

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Sync ref with state
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
      isRecordingRef.current = false; // Sync ref with state
      // Note: setIsProcessing(true) will be called in processAudio()
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    // CRITICAL: Prevent duplicate processing if already in progress
    if (isProcessingRef.current) {
      console.log('[RECORDER] Already processing audio, ignoring duplicate call');
      return;
    }

    try {
      isProcessingRef.current = true; // Mark as processing
      setIsProcessing(true);

      // Check minimum audio size (at least 1KB = 1000 bytes)
      // WebM audio is highly compressed, so even 1-2 seconds can be < 5KB
      if (audioBlob.size < 1000) {
        console.log('[RECORDER] Audio too short:', audioBlob.size, 'bytes');
        toast.error('Áudio muito curto. Por favor, grave pelo menos 1 segundo de fala.');
        return;
      }

      console.log('[RECORDER] Processing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeKB: (audioBlob.size / 1024).toFixed(2) + ' KB'
      });

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Step 1: Transcribe audio
      console.log('[RECORDER] Sending audio for transcription...');
      const transcriptionResult = await window.electronAPI.transcribeAudio({
        audioBlob: arrayBuffer,
        mimeType: audioBlob.type,
      });

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Erro na transcrição');
      }

      // Check if transcription is empty or too short (likely a hallucination or silence)
      if (!transcriptionResult.text || transcriptionResult.text.trim().length < 2) {
        console.log('[RECORDER] Empty or invalid transcription received');
        toast.error('Não foi possível transcrever o áudio. Por favor, tente novamente com fala mais clara.');
        return;
      }

      console.log('[RECORDER] Transcription received:', transcriptionResult.text);
      setTranscribedText(transcriptionResult.text);

      // Step 2: Process text (correct or translate)
      console.log('[RECORDER] Processing transcribed text...');
      const processResult = await window.electronAPI.processText({
        text: transcriptionResult.text,
        mode,
        targetLanguage,
      });

      if (!processResult.success) {
        throw new Error(processResult.error || 'Erro no processamento');
      }

      // Validate processed text is not empty
      if (!processResult.text || processResult.text.trim().length < 2) {
        console.log('[RECORDER] Empty or invalid processed text received');
        toast.error('Erro ao processar o texto. Por favor, tente novamente.');
        return;
      }

      console.log('[RECORDER] Processed text received:', processResult.text);
      setFinalText(processResult.text);

      // Only copy to clipboard, do NOT auto-paste
      // User can review the text and manually paste when ready
      await window.electronAPI.copyToClipboard(processResult.text);
      toast.success('✓ Transcrição concluída e copiada para a área de transferência!');
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error((error as Error).message || 'Erro ao processar áudio');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false; // Always reset processing flag
      console.log('[RECORDER] Processing completed, flag reset');
    }
  };

  const copyToClipboard = async () => {
    if (!finalText) return;

    try {
      const result = await window.electronAPI.copyToClipboard(finalText);

      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('✓ Texto copiado!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Erro ao copiar texto');
    }
  };

  const pasteText = async () => {
    if (!finalText) return;

    try {
      console.log('[RECORDER] User requested paste, calling pasteToActiveWindow');
      await window.electronAPI.pasteToActiveWindow(finalText);
      toast.success('✓ Texto colado!');
    } catch (error) {
      console.error('Error pasting text:', error);
      toast.error('Erro ao colar texto. Tente copiar e colar manualmente.');
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
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  Copiar
                </Button>
                <Button size="sm" onClick={pasteText}>
                  Colar
                </Button>
              </div>
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
