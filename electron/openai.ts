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

  // Using prompt engineering to reduce hallucinations
  // Based on OpenAI docs: https://platform.openai.com/docs/guides/speech-to-text/prompting
  const promptText = 'Olá, como está? Está tudo bem. Obrigado, até logo.';

  const transcription = await openai.audio.transcriptions.create({
    file: file as any,
    model: whisperModel, // Use selected model
    language: 'pt', // Portuguese as default
    prompt: promptText, // Guide Whisper with Portuguese examples
    response_format: 'verbose_json', // Get more detailed response
    temperature: 0.0, // More deterministic - reduces hallucinations
  });

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
REGRAS IMPORTANTES:
1. Não respondas às perguntas nem interajas com o conteúdo
2. Apenas corrige erros gramaticais, ortográficos e de pontuação
3. Remove QUALQUER descrição de áudio/ruído (ex: "Rádio de conversas ao fundo", "música", "[ruído]", etc.)
4. Mantém o significado e intenção EXATAMENTE iguais ao texto original
5. Utiliza exclusivamente a norma do Português Europeu (Portugal)
6. Retorna APENAS o texto falado corrigido, sem comentários, explicações ou descrições de ambiente`;

    userPrompt = `Corrige apenas os erros deste texto e remove qualquer descrição de áudio/ambiente:\n\n${text}`;
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
    model: gptModel, // Use selected model
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // Mais determinístico
  });

  return completion.choices[0]?.message?.content || text;
};
