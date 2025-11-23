# WishperPro

Aplicação desktop de transcrição de voz com IA para correção e tradução automática.

## 🎤 Funcionalidades

- **Gravação Push-to-Talk**: Mantenha o botão pressionado para gravar
- **Transcrição Automática**: Powered by OpenAI Whisper
- **Correção de Português**: Correção gramatical automática
- **Tradução**: Tradução para Inglês, Espanhol, Francês, Alemão e Italiano
- **Histórico Local**: Todas as transcrições guardadas em SQLite
- **Clipboard Integration**: Copia automaticamente para área de transferência

## 🚀 Quick Start

### Instalar Dependências

```bash
npm install
```

**Nota**: O script `postinstall` irá automaticamente recompilar `better-sqlite3` para Electron.

### Executar em Desenvolvimento

```bash
npm run dev
```

Isto irá:
1. Iniciar o servidor Vite
2. Compilar o processo Electron
3. Abrir a aplicação com DevTools

### Configuração Inicial

1. Obtenha uma API Key da OpenAI em https://platform.openai.com/api-keys
2. Abra a aplicação
3. Vá para o separador **"Configurações"**
4. Cole a sua API Key e clique em "Guardar"
5. Escolha o modo (Corrigir ou Traduzir)
6. Se traduzir, selecione o idioma de destino

### Build para Produção

```bash
# Build completo com instaladores
npm run build

# Build apenas diretório (mais rápido)
npm run build:dir
```

Os instaladores estarão em `release/`:
- **macOS**: `.dmg` e `.zip`
- **Windows**: `.exe` (NSIS e Portable)
- **Linux**: `.AppImage` e `.deb`

## 📖 Documentação Completa

- **[PLANO.md](docs/PLANO.md)**: Arquitetura completa da aplicação
- **[INSTALACAO.md](docs/INSTALACAO.md)**: Guia detalhado de instalação e uso

## 🛠️ Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite 7
- **Desktop**: Electron 39
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: SQLite (better-sqlite3)
- **IA**: OpenAI Whisper + GPT-4 Turbo

## 📁 Estrutura do Projeto

```
wishperpro/
├── electron/          # Processo main do Electron
│   ├── main.ts       # Entry point
│   ├── preload.ts    # Context bridge
│   ├── db.ts         # SQLite layer
│   └── openai.ts     # OpenAI integration
├── src/              # React app
│   ├── components/   # UI components
│   └── App.tsx       # Main app
└── docs/             # Documentação
```

## ⚠️ Troubleshooting

### Erro ao guardar API Key

Se houver erro ao guardar a API Key, certifique-se que a aplicação está a correr em modo desenvolvimento:

```bash
npm run dev
```

A base de dados SQLite será criada automaticamente em:
- **macOS**: `~/Library/Application Support/wishperpro/wishperpro.db`
- **Windows**: `%APPDATA%\wishperpro\wishperpro.db`
- **Linux**: `~/.config/wishperpro/wishperpro.db`

### Erro de Microfone

Verifique as permissões do sistema:
- **macOS**: System Preferences > Security & Privacy > Microphone
- **Windows**: Settings > Privacy > Microphone

### Erro de Compilação better-sqlite3

```bash
npx electron-rebuild
```

## 💰 Custos OpenAI

Uso moderado (1 hora/mês): ~$0.60/mês

- **Whisper**: $0.006 por minuto
- **GPT-4 Turbo**: ~$0.01 por 1K tokens

## 📝 Licença

MIT

---

**Bom uso! 🎤✨**
