import OpenAI from 'openai';
import { Readable } from 'stream';

export const transcribeAudio = async (
  audioBuffer: ArrayBuffer,
  apiKey: string,
  whisperModel: string,
  mimeType?: string
): Promise<string> => {
  const openai = new OpenAI({ apiKey });

  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(audioBuffer);

  // Detect file extension from mime type
  let extension = 'webm';
  let audioType = 'audio/webm';

  if (mimeType) {
    audioType = mimeType.split(';')[0]; // Remove codec info
    if (audioType.includes('webm')) {
      extension = 'webm';
    } else if (audioType.includes('mp4') || audioType.includes('m4a')) {
      extension = 'm4a';
    } else if (audioType.includes('ogg')) {
      extension = 'ogg';
    } else if (audioType.includes('wav')) {
      extension = 'wav';
    }
  }

  console.log(`Transcribing audio: ${buffer.length} bytes, type: ${audioType}, extension: ${extension}`);

  // Create a readable stream from the buffer
  const stream = Readable.from(buffer);

  // Add required properties for file upload
  const file = Object.assign(stream, {
    name: `audio.${extension}`,
    type: audioType,
  });

  // Check if using new GPT-4o models that support different parameters
  const isNewModel = whisperModel.includes('gpt-4o');

  // Check minimum audio size to prevent hallucinations
  // Whisper tends to hallucinate on very short or silent audio
  // Note: WebM audio is compressed, typical 1-2 second recordings are 2-5KB
  if (buffer.length < 1000) { // Less than 1KB is too short (empty or corrupted)
    console.log('[WHISPER] Audio too short, skipping transcription. Size:', buffer.length, 'bytes');
    return ''; // Return empty string instead of hallucinating
  }

  console.log('[WHISPER] Starting transcription with model:', whisperModel);
  console.log('[WHISPER] Audio details:', {
    size: buffer.length,
    type: audioType,
    extension: extension
  });

  let transcription;
  try {
    // Use File/Blob constructor for better compatibility
    const audioFile = new File([buffer], `audio.${extension}`, { type: audioType });

    transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: whisperModel, // Use selected model
      language: 'pt', // Specify Portuguese for better accuracy (supported by all models)
      // NO PROMPT: Prompts should only be used for specific words/names, not general context
      // Using a prompt can cause Whisper to return the prompt text on silent/short audio
      response_format: isNewModel ? 'json' : 'verbose_json', // New models support json or text
      // Temperature: Research shows 0.0 increases hallucinations. Using 0.4 for better balance
      temperature: 0.4,
    });

    console.log('[WHISPER] Raw transcription received:', transcription.text);
  } catch (error: any) {
    console.error('[WHISPER] Transcription error:', error);
    console.error('[WHISPER] Error details:', {
      message: error.message,
      status: error.status,
      type: error.type
    });
    throw new Error(`${error.status || 'Error'} ${error.message || 'Audio transcription failed'}`);
  }

  // Clean up the transcription text by removing any non-speech annotations and hallucinations
  let cleanText = transcription.text
    .replace(/\[.*?\]/g, '') // Remove anything in square brackets [música], [ruído]
    .replace(/\(.*?\)/g, '') // Remove anything in parentheses
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/\\+/g, '') // Remove backslashes
    // Remove common Whisper hallucinations at the end
    .replace(/(\s+(e\s+ai|ai|eh|hm|mm|uh|ah|oh)\s*[,.]?\s*)+$/gi, '') // Remove hesitation sounds at end
    .replace(/\s+legendas\s+.*$/gi, '') // Remove "legendas" artifacts
    .replace(/\s+(obrigad[oa]|obrigado por assistir|inscreva-se).*$/gi, '') // Remove common video outros
    .trim();

  // Remove trailing punctuation duplicates
  cleanText = cleanText.replace(/([,.!?])\1+/g, '$1');

  // Detect common hallucination patterns - if the entire text is a hallucination, return empty
  // Based on research: Whisper hallucinates in 50%+ of cases with short/silent audio
  const commonHallucinations = [
    /^(eu sou estudante|sou estudante)\.?$/i,
    /^(obrigado|obrigada)\.?$/i,
    /^(olá|oi|bom dia|boa tarde|boa noite)\.?$/i,
    /^(sim|não|ok|certo)\.?$/i,
    /^[\s.,-]*$/,  // Only whitespace and punctuation
    /^[a-z]\.?$/i, // Single letter
    /^(a|e|o|i|u|é|à)\.?$/i, // Single vowel/article
    /^transcrição em português/i, // Prompt echo detection
    /^transcrição/i, // Partial prompt echo
    // Common question hallucinations (Whisper often generates random questions on short audio)
    /^o que (é|são|seria|foi)/i, // "O que é...", "O que é isso?", "O que são..."
    /^(como|quando|onde|porque|porquê) (é|são|está|estava)/i,
    /^qual (é|são|foi|seria)/i,
    // Very short questions (typical hallucinations)
    /^.{0,20}\?$/i, // Any text shorter than 20 chars ending with ?
  ];

  for (const pattern of commonHallucinations) {
    if (pattern.test(cleanText)) {
      console.log('[WHISPER] Detected hallucination pattern, returning empty:', cleanText);
      return '';
    }
  }

  // Final check: if text is too short (less than 2 characters), likely invalid
  if (cleanText.length < 2) {
    console.log('[WHISPER] Text too short after cleanup, returning empty:', cleanText);
    return '';
  }

  console.log('[WHISPER] Transcription completed successfully. Length:', cleanText.length, 'chars');
  return cleanText;
};

export const transcribeAudioStream = async (
  audioBuffer: ArrayBuffer,
  apiKey: string,
  whisperModel: string,
  mimeType?: string,
  onProgress?: (text: string) => void
): Promise<string> => {
  const openai = new OpenAI({ apiKey });

  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(audioBuffer);

  // Detect file extension from mime type
  let extension = 'webm';
  let audioType = 'audio/webm';

  if (mimeType) {
    audioType = mimeType.split(';')[0]; // Remove codec info
    if (audioType.includes('webm')) {
      extension = 'webm';
    } else if (audioType.includes('mp4') || audioType.includes('m4a')) {
      extension = 'm4a';
    } else if (audioType.includes('ogg')) {
      extension = 'ogg';
    } else if (audioType.includes('wav')) {
      extension = 'wav';
    }
  }

  console.log(`Streaming transcription: ${buffer.length} bytes, type: ${audioType}`);

  // Create a readable stream from the buffer
  const stream = Readable.from(buffer);

  // Add required properties for file upload
  const file = Object.assign(stream, {
    name: `audio.${extension}`,
    type: audioType,
  });

  const isNewModel = whisperModel.includes('gpt-4o');

  // Only new models support streaming
  if (!isNewModel) {
    // Fall back to non-streaming for whisper-1
    return transcribeAudio(audioBuffer, apiKey, whisperModel, mimeType);
  }

  // Check minimum audio size for streaming as well
  if (buffer.length < 1000) {
    console.log('[WHISPER] Audio too short for streaming, skipping. Size:', buffer.length, 'bytes');
    return '';
  }

  console.log('[WHISPER] Starting streaming transcription with model:', whisperModel);
  console.log('[WHISPER STREAM] Audio details:', {
    size: buffer.length,
    type: audioType,
    extension: extension
  });

  const streamResponse = await openai.audio.transcriptions.create({
    file: file as any,
    model: whisperModel,
    language: 'pt', // Specify Portuguese for better accuracy
    // NO PROMPT: Prompts can cause Whisper to return the prompt text on silent/short audio
    response_format: 'text',
    stream: true, // Enable streaming
    temperature: 0.4, // Match non-streaming temperature
  });

  let fullText = '';

  for await (const event of streamResponse) {
    if (event && typeof event === 'string') {
      fullText += event;
      if (onProgress) {
        onProgress(fullText);
      }
    }
  }

  // Apply same cleanup as non-streaming version
  let cleanText = fullText
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\\+/g, '')
    .replace(/(\s+(e\s+ai|ai|eh|hm|mm|uh|ah|oh)\s*[,.]?\s*)+$/gi, '')
    .replace(/\s+legendas\s+.*$/gi, '')
    .replace(/\s+(obrigad[oa]|obrigado por assistir|inscreva-se).*$/gi, '')
    .trim();

  cleanText = cleanText.replace(/([,.!?])\1+/g, '$1');

  // Apply same hallucination detection as non-streaming
  const commonHallucinations = [
    /^(eu sou estudante|sou estudante)\.?$/i,
    /^(obrigado|obrigada)\.?$/i,
    /^(olá|oi|bom dia|boa tarde|boa noite)\.?$/i,
    /^(sim|não|ok|certo)\.?$/i,
    /^[\s.,-]*$/,
    /^[a-z]\.?$/i,
    /^(a|e|o|i|u|é|à)\.?$/i,
    /^transcrição em português/i, // Prompt echo detection
    /^transcrição/i, // Partial prompt echo
    // Common question hallucinations
    /^o que (é|são|seria|foi)/i, // "O que é...", "O que é isso?", "O que são..."
    /^(como|quando|onde|porque|porquê) (é|são|está|estava)/i,
    /^qual (é|são|foi|seria)/i,
    // Very short questions (typical hallucinations)
    /^.{0,20}\?$/i, // Any text shorter than 20 chars ending with ?
  ];

  for (const pattern of commonHallucinations) {
    if (pattern.test(cleanText)) {
      console.log('[WHISPER STREAM] Detected hallucination pattern, returning empty:', cleanText);
      return '';
    }
  }

  if (cleanText.length < 2) {
    console.log('[WHISPER STREAM] Text too short after cleanup, returning empty:', cleanText);
    return '';
  }

  console.log('[WHISPER STREAM] Streaming transcription completed. Length:', cleanText.length, 'chars');
  return cleanText;
};

export const processText = async (
  text: string,
  mode: 'correct' | 'translate',
  targetLanguage: string,
  apiKey: string,
  gptModel: string
): Promise<string> => {
  const openai = new OpenAI({ apiKey });

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === 'correct') {
    systemPrompt = `Corretor de texto em Português de Portugal.
Corrige apenas erros gramaticais, ortográficos e de pontuação.
Mantém o significado e intenção originais.
Remove anotações de áudio/ruído.
Retorna APENAS o texto corrigido.`;

    userPrompt = text;
  } else {
    const languageNames: Record<string, string> = {
      pt: 'Português',
      en: 'Inglês',
      es: 'Espanhol',
      fr: 'Francês',
      de: 'Alemão',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    systemPrompt = `Tradutor profissional. Traduz para ${targetLangName}. Retorna APENAS a tradução.`;

    userPrompt = text;
  }

  const completion = await openai.chat.completions.create({
    model: gptModel, // Use selected model (gpt-4o recommended)
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // More deterministic
    store: true, // Enable storage for OpenAI improvements
  });

  return completion.choices[0]?.message?.content || text;
};
