import OpenAI from 'openai';
import { Readable } from 'stream';

export const transcribeAudio = async (
  audioBuffer: ArrayBuffer,
  apiKey: string,
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

  const transcription = await openai.audio.transcriptions.create({
    file: file as any,
    model: 'whisper-1',
    language: 'pt', // Portuguese as default
    response_format: 'verbose_json', // Get more detailed response
    temperature: 0.0, // More deterministic
  });

  // Clean up the transcription text by removing any non-speech annotations
  // Whisper sometimes adds descriptions in brackets like [música], [ruído], etc.
  let cleanText = transcription.text
    .replace(/\[.*?\]/g, '') // Remove anything in square brackets
    .replace(/\(.*?\)/g, '') // Remove anything in parentheses if it's a description
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/\\+/g, '') // Remove backslashes
    .trim();

  return cleanText;
};

export const processText = async (
  text: string,
  mode: 'correct' | 'translate',
  targetLanguage: string,
  apiKey: string
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
    model: 'gpt-4o', // Modelo mais recente e melhor
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // Mais determinístico
  });

  return completion.choices[0]?.message?.content || text;
};
