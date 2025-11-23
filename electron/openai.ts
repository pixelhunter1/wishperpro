import OpenAI from 'openai';
import { Readable } from 'stream';

export const transcribeAudio = async (
  audioBuffer: ArrayBuffer,
  apiKey: string
): Promise<string> => {
  const openai = new OpenAI({ apiKey });

  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(audioBuffer);

  // Create a readable stream from the buffer
  const stream = Readable.from(buffer);

  // Add required properties for file upload
  const file = Object.assign(stream, {
    name: 'audio.webm',
    type: 'audio/webm',
  });

  const transcription = await openai.audio.transcriptions.create({
    file: file as any,
    model: 'whisper-1',
    language: 'pt', // Portuguese as default
  });

  return transcription.text;
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
    systemPrompt = `Você é um assistente especializado em correção de texto em português.
Sua tarefa é corrigir erros gramaticais, ortográficos e de pontuação, mantendo o significado original.
Retorne apenas o texto corrigido, sem explicações adicionais.`;

    userPrompt = `Corrija o seguinte texto:\n\n${text}`;
  } else {
    const languageNames: Record<string, string> = {
      pt: 'português',
      en: 'inglês',
      es: 'espanhol',
      fr: 'francês',
      de: 'alemão',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    systemPrompt = `Você é um tradutor profissional especializado.
Traduza o texto fornecido para ${targetLangName} de forma natural e fluente.
Retorne apenas a tradução, sem explicações adicionais.`;

    userPrompt = `Traduza o seguinte texto para ${targetLangName}:\n\n${text}`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || text;
};
