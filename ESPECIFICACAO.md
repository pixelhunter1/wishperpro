# App de Ditado com Electron + Vite + OpenAI + SQLite

## Objectivo

Criar uma app desktop (Electron) baseada num projecto Vite onde o utilizador fala, a fala é transcrita, corrigida/traduzida via OpenAI e o texto é "colado" na posição actual do cursor do sistema.

Guardamos ainda API key e transcrições em SQLite, localmente.

---

## 1. Stack Tecnológica

- **Frontend:** Vite + React (ou outro framework que já tenhas escolhido)
- **Desktop:** Electron
- **Base de dados local:** SQLite (via `better-sqlite3` ou `sqlite3`)
- **IA (correcção/tradução):** OpenAI API (modelos GPT, ex: `gpt-4.1-mini`)
- **Transcrição áudio → texto:** OpenAI Audio API (ex: `whisper-1` ou modelos de transcrição mais recentes)
- **Inserção de texto no cursor global:** módulo de automação (ex: `robotjs` ou `@nut-tree/nut-js`) **+** clipboard do Electron.
- **UI Components:** shadcn/ui (sempre criar componentes usando shadcn)

---

## 2. Fluxo da Aplicação

### 2.1. Configuração Inicial
1. Utilizador escolhe idioma de saída (PT, EN, ES, etc.) e modo:
   - **Só corrigir português**
   - **Traduzir para outra língua**

### 2.2. Gravação de Áudio (Push-to-Talk)
1. Utilizador **mantém pressionado** um botão para gravar
2. Electron (renderer) pede acesso ao microfone
3. Grava o áudio com `MediaRecorder`

### 2.3. Processamento quando Utilizador Solta o Botão
1. O renderer envia o áudio via IPC para o processo **main** do Electron

### 2.4. Processo Main
1. Envia o áudio para a OpenAI Audio API (transcrição)
2. Recebe o texto original
3. Faz pedido à OpenAI (modelo GPT) para:
   - Corrigir português **ou**
   - Traduzir para o idioma escolhido
4. Guarda tudo em SQLite (data, texto original, texto final, idioma)
5. Devolve o texto final ao renderer

### 2.5. Inserção de Texto
1. Renderer mostra o texto final na UI
2. Envia pedido ao main para "escrever" este texto onde estiver o cursor
3. Main usa:
   - Clipboard do Electron (`clipboard.writeText`)
   - Notificação visual ao utilizador "Texto copiado!"
   - *Nota: Implementação actual usa apenas clipboard, não auto-paste*

---

## 3. Estrutura de Pastas

```text
root/
├─ electron/
│  ├─ main.ts        # Processo principal do Electron
│  ├─ preload.ts     # API segura exposta ao renderer
│  ├─ db.ts          # Configuração SQLite
│  ├─ openai.ts      # Funções para falar com a OpenAI
│  └─ clipboard.ts   # Funções para "colar" texto onde está o cursor (clipboard)
├─ src/
│  ├─ main.tsx       # Entrada Vite (React)
│  └─ components/
│     ├─ Recorder.tsx    # Componente de gravação
│     ├─ Settings.tsx    # Configurações da app
│     └─ History.tsx     # Histórico de transcrições
├─ docs/
│  ├─ PLANO.md           # Arquitetura completa
│  └─ INSTALACAO.md      # Instruções de instalação
├─ package.json
├─ vite.config.ts
└─ ESPECIFICACAO.md      # Este ficheiro
```

**Nota:** Sempre usar componentes shadcn/ui e criar ficheiro.md com as instruções

---

## 4. Base de Dados SQLite

### 4.1. Tabela: `settings`
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

**Dados armazenados:**
- `key: 'openai_api_key'` → API key do utilizador

### 4.2. Tabela: `transcriptions`
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

**Campos:**
- `id`: ID único auto-incrementado
- `date`: Timestamp ISO 8601
- `original_text`: Texto transcrito do Whisper
- `final_text`: Texto corrigido/traduzido pelo GPT
- `language`: Código do idioma (pt, en, es, fr, de, it)
- `mode`: 'correct' ou 'translate'

---

## 5. Interface do Utilizador (shadcn/ui)

### 5.1. Separador "Gravar"
**Componente: `Recorder.tsx`**

- Botão circular grande (push-to-talk)
- Estados visuais:
  - **Idle**: Botão normal
  - **Recording**: Indicador vermelho a piscar
  - **Processing**: Indicador amarelo a rodar
- Preview do texto transcrito
- Preview do texto final (corrigido/traduzido)
- Botão "Copiar" para clipboard

### 5.2. Separador "Configurações"
**Componente: `Settings.tsx`**

- **Input:** OpenAI API Key (type="password")
- **Botão:** Guardar API Key
- **Select:** Modo de processamento
  - Apenas Corrigir Português
  - Traduzir para Outro Idioma
- **Select:** Idioma de destino (apenas visível em modo tradução)
  - Inglês, Espanhol, Francês, Alemão, Italiano

### 5.3. Separador "Histórico"
**Componente: `History.tsx`**

- Lista de transcrições anteriores (últimas 50)
- Para cada registo:
  - Data e hora (formatada em PT-PT)
  - Texto original
  - Texto processado
  - Badges: modo e idioma
  - Botão "Copiar" individual
- Scroll vertical

---

## 6. Funcionalidades Implementadas

### 6.1. Gravação
✅ Push-to-talk (mantenha pressionado)
✅ MediaRecorder API (WebM format)
✅ Indicadores visuais de estado

### 6.2. Processamento
✅ Transcrição via OpenAI Whisper
✅ Correção de português via GPT-4 Turbo
✅ Tradução para múltiplos idiomas via GPT-4 Turbo
✅ Armazenamento em SQLite

### 6.3. Clipboard
✅ Cópia automática para área de transferência
✅ Notificações toast (sonner)
❌ Auto-paste no cursor do sistema (não implementado)

### 6.4. Histórico
✅ Listagem de transcrições
✅ Filtros por data
✅ Cópia individual de registos

---

## 7. Prompts OpenAI

### 7.1. Correção de Português
```
Sistema: Você é um assistente especializado em correção de texto em português.
Sua tarefa é corrigir erros gramaticais, ortográficos e de pontuação,
mantendo o significado original. Retorne apenas o texto corrigido.

User: Corrija o seguinte texto: [texto]
```

### 7.2. Tradução
```
Sistema: Você é um tradutor profissional especializado.
Traduza o texto fornecido para [idioma] de forma natural e fluente.
Retorne apenas a tradução.

User: Traduza o seguinte texto para [idioma]: [texto]
```

**Modelo:** `gpt-4-turbo-preview`
**Temperature:** `0.3` (mais determinístico)

---

## 8. Segurança

### 8.1. API Key
- Armazenada localmente em SQLite
- Nunca enviada para servidores externos (apenas OpenAI)
- Input type="password" para ocultar visualmente

### 8.2. Context Isolation
- `contextIsolation: true` no Electron
- `nodeIntegration: false`
- API exposta via `contextBridge` (preload.ts)

### 8.3. IPC Handlers
- Todos os handlers com try-catch
- Validação de inputs
- Retornos padronizados: `{ success: boolean, data?, error? }`

---

## 9. Build e Distribuição

### 9.1. Scripts NPM
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build && electron-builder",
  "build:dir": "tsc -b && vite build && electron-builder --dir",
  "postinstall": "electron-rebuild"
}
```

### 9.2. Plataformas Suportadas
- **macOS**: .dmg, .zip
- **Windows**: .exe (NSIS), .exe (Portable)
- **Linux**: .AppImage, .deb

### 9.3. electron-builder Config
```json
{
  "appId": "com.wishperpro.app",
  "productName": "WishperPro",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ]
}
```

---

## 10. Melhorias Futuras

### Não Implementadas (Possíveis Melhorias)
1. **Auto-paste no cursor do sistema**
   - Usar `robotjs` ou `@nut-tree/nut-js`
   - Simular CTRL+V / CMD+V automaticamente

2. **Detecção automática de silêncio**
   - Parar gravação automaticamente quando não há áudio

3. **Hotkeys globais**
   - Atalho de teclado para iniciar gravação sem abrir a app

4. **Múltiplos idiomas de entrada**
   - Deteção automática de idioma no Whisper

5. **Exportação de histórico**
   - Exportar para CSV ou JSON

6. **Dark mode**
   - Toggle para tema escuro

7. **Estatísticas de uso**
   - Total de caracteres transcritos
   - Tempo total de gravação
   - Custos estimados OpenAI

---

## 11. Custos Estimados (OpenAI)

### Preços (Janeiro 2024)
- **Whisper API**: $0.006 por minuto de áudio
- **GPT-4 Turbo**:
  - Input: $0.01 por 1K tokens
  - Output: $0.03 por 1K tokens

### Exemplo de Uso
- 10 minutos de áudio: ~$0.06 (transcrição)
- 1000 palavras processadas: ~$0.05 (GPT-4)
- **Total**: ~$0.10 por 10 minutos

### Uso Moderado (1 hora/mês)
**Custo estimado: $0.60/mês**

---

## 12. Requisitos do Sistema

### Software
- Node.js 18+
- npm 9+
- Sistema operativo: macOS, Windows ou Linux

### Conta OpenAI
- API Key ativa
- Acesso aos modelos:
  - `whisper-1`
  - `gpt-4-turbo-preview`
- Créditos disponíveis

### Permissões
- Acesso ao microfone (para gravação)
- Permissões de escrita (para SQLite)

---

## 13. Localização da Base de Dados

A base de dados SQLite é criada automaticamente no diretório de dados do utilizador:

- **macOS**: `~/Library/Application Support/wishperpro/wishperpro.db`
- **Windows**: `%APPDATA%\wishperpro\wishperpro.db`
- **Linux**: `~/.config/wishperpro/wishperpro.db`

**Privacidade**: Todos os dados são armazenados apenas localmente. Nada é enviado para servidores externos exceto para a OpenAI API durante o processamento.

---

## 14. Tecnologias Utilizadas

### Frontend
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.17
- shadcn/ui (Radix UI primitives)
- Sonner (notificações toast)

### Desktop
- Electron 39.2.3
- electron-builder 26.0.12
- vite-plugin-electron 0.29.0

### Backend (Main Process)
- better-sqlite3 12.4.6
- openai 6.9.1
- Node.js built-ins (path, fs, etc.)

### Build Tools
- TypeScript Compiler
- Vite Build System
- electron-rebuild (para módulos nativos)

---

## Conclusão

Este documento especifica todos os requisitos e funcionalidades da aplicação **WishperPro** - uma solução desktop moderna para transcrição de voz com IA, correção gramatical e tradução automática.

A implementação segue as melhores práticas do Electron, com separação clara de processos, comunicação IPC segura, e interface de utilizador construída com React e shadcn/ui.

**Status:** ✅ Implementação Completa
**Versão:** 1.0.0
**Data:** Novembro 2025
