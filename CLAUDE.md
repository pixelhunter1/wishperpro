# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WishperPro is an Electron desktop application for voice transcription with AI-powered correction and translation. It uses OpenAI Whisper for speech-to-text and GPT-4 for text processing (correction/translation).

## Development Commands

### Development
```bash
npm run dev          # Start development server with Vite + Electron
npm run lint         # Run ESLint
```

### Building
```bash
npm run build        # Full production build with installers
npm run build:dir    # Build directory only (faster, no installers)
```

### Post-Install
```bash
npm install          # Automatically runs electron-rebuild via postinstall
npx electron-rebuild # Manually rebuild better-sqlite3 if needed
```

## Architecture

### Process Communication
This is an Electron app with **two separate processes** that communicate via IPC:

1. **Main Process** (`electron/main.ts`): Node.js environment that manages:
   - Window creation and lifecycle
   - SQLite database operations (`electron/db.ts`)
   - OpenAI API calls (`electron/openai.ts`)
   - Global keyboard shortcuts
   - Clipboard operations

2. **Renderer Process** (`src/`): React app running in Chromium that:
   - Renders UI components
   - Captures audio via MediaRecorder API
   - Communicates with main process via `window.electronAPI`

3. **Preload Script** (`electron/preload.ts`): Security bridge that:
   - Uses `contextBridge` to expose safe IPC methods
   - Defines TypeScript interfaces for `ElectronAPI`
   - **IMPORTANT**: Must be updated when adding new IPC handlers

### IPC Pattern
All main-renderer communication follows this pattern:

**Renderer → Main:**
```typescript
const result = await window.electronAPI.methodName(args);
// Returns: { success: boolean, data?: any, error?: string }
```

**Main → Renderer:**
```typescript
mainWindow.webContents.send('event-name', data);
```

Registered in preload with:
```typescript
ipcRenderer.on('event-name', callback);
```

### Database (SQLite)

Located in Electron's user data directory:
- macOS: `~/Library/Application Support/wishperpro/wishperpro.db`
- Windows: `%APPDATA%\wishperpro\wishperpro.db`
- Linux: `~/.config/wishperpro/wishperpro.db`

**Tables:**
- `settings`: Key-value store (API key, hotkey)
- `transcriptions`: History of all transcriptions

**Important:** All database operations happen in main process via `electron/db.ts`. The renderer never directly accesses SQLite.

### Audio Recording Flow

1. User presses/holds record button
2. `MediaRecorder` API captures audio as WebM
3. User releases → audio Blob created
4. Blob converted to ArrayBuffer
5. IPC call: `transcribeAudio(arrayBuffer)`
6. Main process converts to Buffer, sends to Whisper API
7. Transcribed text returned to renderer
8. IPC call: `processText({ text, mode, language })`
9. Main process sends to GPT-4 for correction/translation
10. Processed text saved to SQLite
11. Final text returned and auto-copied to clipboard

## Component Structure

### Main Components (`src/components/`)
- **Recorder.tsx**: Push-to-talk recording interface with real-time status
- **Settings.tsx**: API key configuration, mode selection (correct/translate), language picker
- **History.tsx**: List of past transcriptions from SQLite
- **ui/**: shadcn/ui components (Button, Card, Select, Tabs, Badge, etc.)

### App State
The main `App.tsx` manages two global states:
- `mode`: 'correct' | 'translate'
- `targetLanguage`: Language code (en, es, fr, de, etc.)

These are passed to Recorder component and saved in Settings.

## Key Technologies

- **Electron 39**: Desktop runtime
- **React 19 + TypeScript**: UI framework
- **Vite 7**: Build tool with `vite-plugin-electron`
- **better-sqlite3**: Synchronous SQLite (requires native rebuild)
- **OpenAI SDK**: Whisper transcription + GPT-4 text processing
- **shadcn/ui**: Radix UI + Tailwind CSS 4
- **Sonner**: Toast notifications

## Important Notes

### Native Modules
`better-sqlite3` is a native module that must be rebuilt for Electron:
- Automatically happens via `postinstall` script
- If errors occur, run `npx electron-rebuild` manually
- Must be marked as `external` in vite.config.ts rollup options

### Vite Configuration
`vite.config.ts` uses two Electron plugins:
1. Main process compilation (`electron/main.ts` → `dist-electron/`)
2. Preload script compilation (`electron/preload.ts` → `dist-electron/`)

Both have separate build configs and must externalize native modules.

### TypeScript Paths
The project uses `@/` alias for `src/` directory:
```typescript
import { Button } from '@/components/ui/button'
```

### Global Shortcuts
The app registers a global hotkey (default: Cmd/Ctrl+Shift+R) that toggles recording even when app is not focused. This is managed in `electron/main.ts` using Electron's `globalShortcut` API.

### OpenAI Configuration
- **Whisper model**: `whisper-1` with language set to Portuguese (`pt`)
- **GPT model**: `gpt-4-turbo-preview` with temperature `0.3`
- API key stored in SQLite and retrieved for each request

## Common Workflows

### Adding a New IPC Handler
1. Add handler in `electron/main.ts`:
   ```typescript
   ipcMain.handle('my-handler', async (_event, args) => {
     // implementation
   });
   ```
2. Add method to `ElectronAPI` interface in `electron/preload.ts`
3. Add to `contextBridge.exposeInMainWorld` object in preload
4. Use in renderer: `await window.electronAPI.myHandler(args)`

### Adding a New Database Table/Field
1. Update schema in `electron/db.ts` → `initDatabase()`
2. Add corresponding CRUD functions
3. Add IPC handlers if renderer needs access
4. Delete existing database to test clean initialization

### Modifying UI Components
All UI components use shadcn/ui primitives. Check `src/components/ui/` for available components. They're based on Radix UI with Tailwind styling.

## Troubleshooting

### Database Errors
- Database is created on first run via `initDatabase()`
- If schema changes aren't applied, manually delete the .db file
- Check console for database path on startup

### Audio Permission Issues
- App needs microphone permissions from OS
- Check system settings if MediaRecorder fails

### OpenAI API Errors
- Verify API key is saved in Settings tab
- Check network connectivity
- Watch browser DevTools console for detailed error messages

## Build Output

Production builds create installers in `release/`:
- **macOS**: .dmg and .zip
- **Windows**: .exe (NSIS installer and portable)
- **Linux**: .AppImage and .deb

Distribution files include `dist/` (React build) and `dist-electron/` (compiled Electron code).
