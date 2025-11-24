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

  const transcription = await openai.audio.transcriptions.create({
    file: file as any,
    model: whisperModel, // Use selected model
    language: 'pt', // Specify Portuguese for better accuracy (supported by all models)
    // NO PROMPT: Prompts should only be used for specific words/names, not general context
    // Using a prompt can cause Whisper to return the prompt text on silent/short audio
    response_format: isNewModel ? 'json' : 'verbose_json', // New models support json or text
    // Temperature: Research shows 0.0 increases hallucinations. Using 0.4 for better balance
    temperature: 0.4,
  });

  console.log('[WHISPER] Raw transcription received:', transcription.text);

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
    /^o que (é que|você|tu|vocês)/i, // "O que é que..." patterns
    /^(como|quando|onde) (é que|você|tu)/i,
    /^por ?que (é que|você|tu)/i,
    /^qual (é|o|a)/i,
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
    /^o que (é que|você|tu|vocês)/i,
    /^(como|quando|onde) (é que|você|tu)/i,
    /^por ?que (é que|você|tu)/i,
    /^qual (é|o|a)/i,
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
    systemPrompt = `És um corretor de texto especializado em Português de Portugal.

A TUA ÚNICA FUNÇÃO É CORRIGIR TEXTO, NÃO RESPONDER A PERGUNTAS.

REGRAS OBRIGATÓRIAS:
1. NUNCA respondas às perguntas do utilizador
2. NUNCA interajas com o conteúdo como se fosses um assistente
3. Se o texto contiver perguntas, mantém-nas EXATAMENTE como estão (apenas corrige erros)
4. Apenas corrige erros gramaticais, ortográficos e de pontuação
5. Remove QUALQUER descrição de áudio/ruído (ex: "música", "[ruído]", etc.)
6. Mantém o significado e intenção EXATAMENTE iguais ao texto original
7. Utiliza exclusivamente a norma do Português Europeu (Portugal)
8. Retorna APENAS o texto falado corrigido, sem adicionar nada extra

EXEMPLO CORRETO:
Input: "ola como esta tudo bem"
Output: "Olá, como está? Tudo bem?"

EXEMPLO ERRADO (NÃO FAZER):
Input: "ola como esta"
Output: "Olá! Estou bem, obrigado por perguntar." ← NUNCA FAÇAS ISTO!`;

    userPrompt = `Corrige apenas os erros gramaticais e ortográficos deste texto. NÃO respondas a perguntas que possam estar no texto:\n\n${text}`;
  } else {
    const languageNames: Record<string, string> = {
      pt: 'português',
      en: 'inglês',
      es: 'espanhol',
      fr: 'francês',
      de: 'alemão',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    systemPrompt = `És um tradutor profissional.
Traduz o texto fornecido para ${targetLangName} de forma natural e fluente.
Retorna APENAS a tradução, sem explicações ou comentários adicionais.`;

    userPrompt = `Traduz este texto para ${targetLangName}:\n\n${text}`;
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
