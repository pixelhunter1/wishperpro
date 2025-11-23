# WishperPro - Plano de Arquitetura

## Visão Geral

WishperPro é uma aplicação desktop (Electron) que permite ao utilizador gravar áudio via microfone, transcrever usando OpenAI Whisper, corrigir ou traduzir o texto usando GPT-4, e copiar automaticamente para a área de transferência.

---

## Stack Tecnológica

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 4
- **Notifications**: Sonner

### Desktop
- **Runtime**: Electron 39
- **Builder**: electron-builder
- **Architecture**: Main process + Renderer process com IPC seguro

### Database
- **Engine**: SQLite via better-sqlite3
- **Location**: User data directory do Electron
- **Tables**:
  - `settings`: Armazena configurações (API key)
  - `transcriptions`: Histórico de transcrições

### APIs Externas
- **OpenAI Whisper**: Transcrição de áudio para texto
- **OpenAI GPT-4**: Correção e tradução de texto

---

## Arquitetura da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Recorder   │  │   Settings   │  │   History    │      │
│  │  Component   │  │  Component   │  │  Component   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                            │  IPC Communication              │
│                            │  (contextBridge)                │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    MAIN PROCESS                              │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐             │
│         │                                      │             │
│    ┌────▼────┐        ┌──────────┐      ┌────▼────┐        │
│    │  IPC    │        │ Electron │      │  IPC    │        │
│    │ Handlers│◄───────┤ Main     │─────►│ Handlers│        │
│    └────┬────┘        └──────────┘      └────┬────┘        │
│         │                                      │             │
│    ┌────▼────────┐                   ┌────────▼────────┐   │
│    │  OpenAI     │                   │    Database     │   │
│    │  Module     │                   │    (SQLite)     │   │
│    │             │                   │                 │   │
│    │ - Whisper   │                   │ - settings      │   │
│    │ - GPT-4     │                   │ - transcriptions│   │
│    └─────────────┘                   └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados

### 1. Gravação e Processamento de Áudio

```
Utilizador pressiona botão
         │
         ▼
MediaRecorder API grava áudio (WebM)
         │
         ▼
Utilizador solta botão → Grava Blob
         │
         ▼
Blob → ArrayBuffer
         │
         ▼
IPC: transcribeAudio(arrayBuffer)
         │
         ▼
Main: OpenAI Whisper API
         │
         ▼
Texto transcrito retorna ao Renderer
         │
         ▼
IPC: processText({ text, mode, language })
         │
         ▼
Main: OpenAI GPT-4 API (correção/tradução)
         │
         ▼
Main: Salva no SQLite
         │
         ▼
Texto final retorna ao Renderer
         │
         ▼
IPC: copyToClipboard(text)
         │
         ▼
Clipboard do sistema atualizado
```

### 2. Configuração de API Key

```
Utilizador insere API Key
         │
         ▼
IPC: saveApiKey(apiKey)
         │
         ▼
Main: SQLite INSERT/UPDATE settings
         │
         ▼
Confirmação ao Renderer
```

### 3. Consulta de Histórico

```
Componente History monta
         │
         ▼
IPC: getTranscriptions()
         │
         ▼
Main: SQLite SELECT transcriptions
         │
         ▼
Array de registos retorna ao Renderer
         │
         ▼
Renderização da lista
```

---

## Estrutura de Ficheiros

```
wishperpro/
├── electron/
│   ├── main.ts           # Processo principal do Electron
│   ├── preload.ts        # Context bridge (IPC seguro)
│   ├── db.ts             # Camada de dados SQLite
│   └── openai.ts         # Integração com OpenAI APIs
│
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Recorder.tsx  # Componente de gravação
│   │   ├── Settings.tsx  # Configurações da app
│   │   └── History.tsx   # Histórico de transcrições
│   │
│   ├── types/
│   │   └── electron.d.ts # Tipos TypeScript para API Electron
│   │
│   ├── App.tsx           # Componente raiz
│   └── main.tsx          # Entry point React
│
├── docs/
│   ├── PLANO.md          # Este ficheiro
│   └── INSTALACAO.md     # Instruções de instalação
│
├── vite.config.ts        # Config Vite + plugins Electron
├── package.json          # Dependências e scripts
└── tsconfig.json         # Config TypeScript
```

---

## Base de Dados (SQLite)

### Tabela: `settings`

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

**Registos**:
- `key: 'openai_api_key'` → API key do utilizador

### Tabela: `transcriptions`

```sql
CREATE TABLE transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  original_text TEXT NOT NULL,
  final_text TEXT NOT NULL,
  language TEXT NOT NULL,
  mode TEXT NOT NULL
)
```

**Campos**:
- `id`: ID único auto-incrementado
- `date`: ISO 8601 timestamp
- `original_text`: Texto transcrito do Whisper
- `final_text`: Texto corrigido/traduzido
- `language`: Código do idioma (pt, en, es, etc.)
- `mode`: 'correct' ou 'translate'

---

## IPC Handlers (Main Process)

### `save-api-key`
- **Input**: `string` (API key)
- **Output**: `{ success: boolean, error?: string }`
- **Ação**: Salva API key no SQLite

### `get-api-key`
- **Input**: nenhum
- **Output**: `{ success: boolean, apiKey?: string, error?: string }`
- **Ação**: Retorna API key do SQLite

### `transcribe-audio`
- **Input**: `ArrayBuffer` (áudio)
- **Output**: `{ success: boolean, text?: string, error?: string }`
- **Ação**: Envia áudio para OpenAI Whisper, retorna texto

### `process-text`
- **Input**: `{ text: string, mode: 'correct'|'translate', targetLanguage: string }`
- **Output**: `{ success: boolean, text?: string, error?: string }`
- **Ação**:
  - Envia texto para GPT-4 para correção ou tradução
  - Salva no SQLite
  - Retorna texto processado

### `copy-to-clipboard`
- **Input**: `string` (texto)
- **Output**: `{ success: boolean, error?: string }`
- **Ação**: Copia texto para clipboard do sistema

### `get-transcriptions`
- **Input**: nenhum
- **Output**: `{ success: boolean, transcriptions?: TranscriptionRecord[], error?: string }`
- **Ação**: Retorna últimas 50 transcrições

---

## Componentes React

### `Recorder`
**Props**:
- `mode: 'correct' | 'translate'`
- `targetLanguage: string`

**Funcionalidades**:
- Botão push-to-talk (mantém pressionado para gravar)
- Estados visuais: idle, recording, processing
- Mostra texto transcrito e processado
- Botão "Copiar" para clipboard

### `Settings`
**Props**:
- `mode`, `setMode`
- `targetLanguage`, `setTargetLanguage`

**Funcionalidades**:
- Input para API key (type="password")
- Select para modo (corrigir/traduzir)
- Select para idioma de destino (apenas se mode='translate')
- Botão "Guardar" para salvar API key

### `History`
**Props**: nenhumas

**Funcionalidades**:
- Lista de transcrições anteriores
- Mostra texto original e processado
- Badges para modo e idioma
- Botão "Copiar" para cada registo
- Formatação de datas em PT-PT

---

## Tecnologias de UI

### shadcn/ui Components Utilizados
- `Button`: Botões de ação
- `Card`: Containers de conteúdo
- `Input`: Campo de texto
- `Label`: Labels de formulário
- `Select`: Dropdowns
- `Badge`: Tags visuais
- `Tabs`: Navegação entre secções
- `Sonner`: Notificações toast

### Tailwind CSS
- Design system com variáveis CSS
- Tema dark/light (preparado)
- Responsive design
- Utility-first approach

---

## Segurança

### API Key
- Armazenada localmente em SQLite
- Nunca enviada ao servidor (apenas à OpenAI)
- Input type="password" para ocultar visualmente

### Context Isolation
- `contextIsolation: true` no Electron
- `nodeIntegration: false`
- API exposta via `contextBridge` apenas com funções necessárias

### IPC Seguro
- Todos os handlers validam inputs
- Try-catch em todas as operações
- Retornos padronizados com `{ success, error? }`

---

## Prompts OpenAI

### Correção de Português
```
Sistema: Você é um assistente especializado em correção de texto em português.
Sua tarefa é corrigir erros gramaticais, ortográficos e de pontuação,
mantendo o significado original. Retorne apenas o texto corrigido.

User: Corrija o seguinte texto: [texto]
```

### Tradução
```
Sistema: Você é um tradutor profissional especializado.
Traduza o texto fornecido para [idioma] de forma natural e fluente.
Retorne apenas a tradução.

User: Traduza o seguinte texto para [idioma]: [texto]
```

**Modelo**: `gpt-4-turbo-preview`
**Temperature**: `0.3` (mais determinístico)

---

## Considerações de Performance

1. **Transcrição**: Whisper API pode demorar 2-5 segundos
2. **Processamento GPT**: 1-3 segundos adicional
3. **UI Responsiva**: Todos os estados são assíncronos com loading states
4. **Clipboard**: Operação quase instantânea (<100ms)

---

## Limitações e Melhorias Futuras

### Limitações Atuais
- Sem detecção automática de silêncio
- Sem suporte para atalhos de teclado globais
- Sem auto-paste no cursor do sistema (apenas clipboard)

### Melhorias Possíveis
1. Adicionar hotkey global para iniciar gravação
2. Implementar auto-paste com robotjs ou nut-js
3. Adicionar suporte para múltiplos idiomas de entrada no Whisper
4. Cache de transcrições offline
5. Exportação de histórico (CSV/JSON)
6. Dark mode toggle na UI
7. Estatísticas de uso (total de caracteres transcritos, etc.)

---

## Conclusão

WishperPro é uma aplicação desktop moderna e eficiente para transcrição de voz com IA. A arquitetura segue as melhores práticas do Electron, com separação clara entre processos, comunicação IPC segura, e uma UI responsiva construída com React e shadcn/ui.
