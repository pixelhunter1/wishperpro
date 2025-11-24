import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RecorderProps {
  mode: 'correct' | 'translate';
  targetLanguage: string;
  hotkey: string;
}

export interface RecorderHandle {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: () => boolean;
}

// Convert Electron hotkey format to readable format
const formatHotkey = (hotkey: string): string => {
  return hotkey
    .replace('CommandOrControl', 'Cmd')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl')
    .replace('Shift', 'Shift')
    .replace('+', '+');
};

export const Recorder = forwardRef<RecorderHandle, RecorderProps>(({ mode, targetLanguage, hotkey }, ref) => {
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
            toast.error('Audio too short or corrupted. Please try again.');
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
        toast.error('Microphone permission denied. Check system settings.');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone found. Connect a microphone and try again.');
      } else if (err.name === 'NotReadableError') {
        toast.error('Microphone in use by another application. Close other apps and try again.');
      } else {
        toast.error(`Error accessing microphone: ${err.message}`);
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
        toast.warning('Recording too short. Hold longer.');
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
        throw new Error(transcriptionResult.error || 'Transcription error');
      }

      // Check if transcription is empty or too short (likely a hallucination or silence)
      if (!transcriptionResult.text || transcriptionResult.text.trim().length < 2) {
        console.log('[RECORDER] Empty or invalid transcription received');
        toast.error('Could not transcribe audio. Please try again with clearer speech.');
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
        throw new Error(processResult.error || 'Processing error');
      }

      // Validate processed text is not empty
      if (!processResult.text || processResult.text.trim().length < 2) {
        console.log('[RECORDER] Empty or invalid processed text received');
        toast.error('Error processing text. Please try again.');
        return;
      }

      console.log('[RECORDER] Processed text received:', processResult.text);
      setFinalText(processResult.text);

      // Auto-paste text where the cursor is positioned
      console.log('[RECORDER] Auto-pasting text to active window');
      const pasteResult = await window.electronAPI.pasteToActiveWindow(processResult.text);

      if (pasteResult.success) {
        toast.success('✓ Transcription completed and pasted automatically!');
      } else {
        // Fallback to clipboard if auto-paste fails
        console.warn('[RECORDER] Auto-paste failed, falling back to clipboard:', pasteResult.error);
        await window.electronAPI.copyToClipboard(processResult.text);
        toast.success('✓ Transcription completed and copied to clipboard!');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error((error as Error).message || 'Error processing audio');
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
      toast.success('✓ Text copied!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error copying text');
    }
  };

  const pasteText = async () => {
    if (!finalText) return;

    try {
      console.log('[RECORDER] User requested paste, calling pasteToActiveWindow');
      await window.electronAPI.pasteToActiveWindow(finalText);
      toast.success('✓ Text pasted!');
    } catch (error) {
      console.error('Error pasting text:', error);
      toast.error('Error pasting text. Try copying and pasting manually.');
    }
  };

  // Expose methods to parent component via ref (for global hotkey control)
  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    isRecording: () => isRecordingRef.current,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Audio Recording</CardTitle>
        <CardDescription>
          <strong>Mouse:</strong> Hold button while speaking<br />
          <strong>Keyboard ({formatHotkey(hotkey)}):</strong> Press to start, press again to stop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Animated ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
            )}
            <button
              className={`relative h-24 w-24 rounded-full transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                  : isProcessing
                  ? 'bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/50'
                  : 'bg-primary hover:bg-primary/90'
              }`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={() => isRecording && stopRecording()}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isProcessing}
            >
              <div className="flex items-center justify-center h-full">
                {isRecording ? (
                  <svg className="w-8 h-8 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                ) : isProcessing ? (
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </div>
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isRecording ? 'Recording...' : isProcessing ? 'Processing...' : 'Ready to record'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRecording ? 'Release to stop' : isProcessing ? 'Please wait' : 'Press and hold'}
            </p>
          </div>
        </div>

        {transcribedText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Transcribed</Badge>
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
                {mode === 'correct' ? 'Corrected' : 'Translated'}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  Copy
                </Button>
                <Button size="sm" onClick={pasteText}>
                  Paste
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
});
