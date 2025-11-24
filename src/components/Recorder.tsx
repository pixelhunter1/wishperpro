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
  const recordingStartTimeRef = useRef<number>(0); // Track recording duration
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
      const cleanup = window.electronAPI.onToggleRecording(handleToggle);

      // Cleanup on unmount - properly remove the IPC listener
      return () => {
        console.log('[RECORDER] Removing hotkey listener on unmount');
        if (cleanup) cleanup();
      };
    }
  }, []); // Empty deps = runs once on mount

  const startRecording = async () => {
    try {
      console.log('[RECORDER] startRecording called');
      // Clear previous transcription texts before starting new recording
      setTranscribedText('');
      setFinalText('');

      console.log('[RECORDER] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[RECORDER] Microphone access granted, stream:', stream);

      // Try audio formats in order of OpenAI compatibility
      // WAV is most compatible but larger file size
      let mimeType = '';
      const formats = [
        'audio/wav',           // Most compatible with OpenAI
        'audio/mp4',           // Good compatibility
        'audio/webm;codecs=opus', // Compressed but may have issues
        'audio/webm',          // Fallback
      ];

      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          console.log('[RECORDER] Selected format:', format);
          break;
        }
      }

      if (!mimeType) {
        console.warn('[RECORDER] No preferred format supported, using default');
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

        // Check if we have any chunks before processing
        if (audioChunksRef.current.length === 0) {
          console.log('[RECORDER] No audio chunks collected, skipping processing');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('[RECORDER] Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);

        // Only process if we have meaningful data (>3KB for ~1 second of audio)
        if (audioBlob.size > 3000) {
          // Process audio BEFORE clearing chunks (to avoid race conditions)
          await processAudio(audioBlob);
        } else {
          console.log('[RECORDER] Audio blob too small, likely corrupted or too short');
          if (audioBlob.size > 0) {
            toast.error('Áudio muito curto ou corrompido. Por favor, tente novamente.');
          }
        }

        // Clear audio chunks after processing to prevent contamination of next recording
        audioChunksRef.current = [];
        console.log('[RECORDER] Audio chunks cleared after processing');

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Sync ref with state
      recordingStartTimeRef.current = Date.now(); // Track when recording started
      console.log('[RECORDER] Recording started successfully');

      // Setup Web Audio API for real-time audio level visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start sending audio levels to overlay
      const sendAudioLevels = () => {
        if (!analyserRef.current || !isRecordingRef.current) {
          return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Send to main process which forwards to overlay
        window.electronAPI.sendAudioLevel(average);

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(sendAudioLevels);
      };

      sendAudioLevels();
    } catch (error) {
      console.error('[RECORDER] Error starting recording:', error);

      // Provide specific error messages
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Verifica as definições do sistema.');
      } else if (err.name === 'NotFoundError') {
        toast.error('Nenhum microfone encontrado. Conecta um microfone e tenta novamente.');
      } else if (err.name === 'NotReadableError') {
        toast.error('Microfone em uso por outra aplicação. Fecha outras apps e tenta novamente.');
      } else {
        toast.error(`Erro ao aceder ao microfone: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    console.log('[RECORDER] stopRecording called, isRecordingRef:', isRecordingRef.current);

    // Stop audio level updates
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    // Enviar nível 0 para mostrar que não está a gravar
    window.electronAPI.sendAudioLevel(0);

    // Use ref instead of state for checking, as state may be stale in hotkey handler
    if (mediaRecorderRef.current && isRecordingRef.current) {
      // Check if recording was too short (less than 500ms)
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      console.log('[RECORDER] Recording duration:', recordingDuration, 'ms');

      if (recordingDuration < 500) {
        console.log('[RECORDER] Recording too short, cancelling');
        // Stop recording but don't process
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        isRecordingRef.current = false;
        // Clear chunks to prevent processing
        audioChunksRef.current = [];
        toast.warning('Gravação muito curta. Mantenha pressionado por mais tempo.');
        return;
      }

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

      // Auto-paste text where the cursor is positioned
      console.log('[RECORDER] Auto-pasting text to active window');
      const pasteResult = await window.electronAPI.pasteToActiveWindow(processResult.text);

      if (pasteResult.success) {
        toast.success('✓ Transcrição concluída e colada automaticamente!');
      } else {
        // Fallback to clipboard if auto-paste fails
        console.warn('[RECORDER] Auto-paste failed, falling back to clipboard:', pasteResult.error);
        await window.electronAPI.copyToClipboard(processResult.text);
        toast.success('✓ Transcrição concluída e copiada para a área de transferência!');
      }
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
