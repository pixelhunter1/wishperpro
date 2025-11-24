# WishperPro

<div align="center">

**AI-Powered Voice Transcription with Smart Auto-Paste**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20%2B%20GPT--4-412991?logo=openai)](https://openai.com/)

[Download for macOS](https://github.com/pixelhunter1/wishperpro/releases) • [Download for Windows](https://github.com/pixelhunter1/wishperpro/releases) • [Download for Linux](https://github.com/pixelhunter1/wishperpro/releases)

</div>

---

## 🎯 What is WishperPro?

WishperPro is a powerful desktop application that transforms your voice into perfectly formatted text, instantly. Record your voice, and watch as it's transcribed, corrected, and automatically pasted **exactly where your cursor is** - in any application.

Perfect for:
- 📝 Writing emails and documents hands-free
- 💬 Quick voice notes that appear instantly
- 🌍 Real-time voice translation
- ⚡ Boosting productivity with voice commands

---

## ✨ Key Features

### 🎤 **Instant Voice-to-Text**
- **Push-to-Talk Recording**: Hold to record, release to transcribe
- **Floating Widget**: Always-on-top overlay with beautiful wave visualization
- **Global Hotkey**: Record from anywhere with `Cmd/Ctrl+X`
- **Works in Fullscreen**: Overlay stays visible even over fullscreen apps

### 🤖 **AI-Powered Processing**
- **Accurate Transcription**: Powered by OpenAI Whisper (Portuguese optimized)
- **Smart Correction**: Automatically fixes grammar and punctuation
- **Multi-Language Translation**: Translate to English, Spanish, French, German, Italian, and more
- **Context-Aware**: GPT-4 ensures natural, fluent results

### ⚡ **Seamless Integration**
- **Auto-Paste at Cursor**: Text appears instantly where you're typing
- **Clipboard Copy**: Automatically copies to clipboard as backup
- **Any Application**: Works with browsers, editors, chat apps, terminals - everywhere
- **macOS Optimized**: Native integration with system clipboard and shortcuts

### 📊 **Smart History**
- **Local SQLite Database**: All transcriptions saved locally
- **Search & Filter**: Find past transcriptions easily
- **Privacy First**: Nothing leaves your computer (except OpenAI API calls)
- **Export Ready**: Copy any past transcription with one click

---

## 🎬 How It Works

1. **Record**: Click the floating widget or press `Cmd/Ctrl+X`
2. **Speak**: The widget shows real-time audio waves as you talk
3. **Release**: AI transcribes and processes your speech
4. **Done**: Text appears instantly at your cursor position

**That's it!** No copy-pasting, no switching windows. Just speak and type.

---

## 🚀 Getting Started

### Download & Install

Choose the installer for your operating system from the [Releases page](https://github.com/pixelhunter1/wishperpro/releases):

#### **macOS** (Apple Silicon/M1/M2/M3)
1. Download `WishperPro-1.0.0-arm64.dmg`
2. Open the DMG file
3. Drag WishperPro to Applications folder
4. Launch WishperPro from Applications
5. If you see "WishperPro can't be opened" → Right-click → Open → Open

#### **Windows** (10/11)
**Option A: Installer (Recommended)**
1. Download `WishperPro Setup 1.0.0.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch WishperPro from Start Menu

**Option B: Portable**
1. Download `WishperPro 1.0.0.exe`
2. Run directly (no installation required)
3. Create a desktop shortcut if desired

#### **Linux** (Ubuntu/Debian/Fedora)
**Option A: AppImage (Universal)**
1. Download `WishperPro-1.0.0-arm64.AppImage`
2. Make it executable: `chmod +x WishperPro-1.0.0-arm64.AppImage`
3. Run: `./WishperPro-1.0.0-arm64.AppImage`
4. **Important**: Install xdotool for auto-paste: `sudo apt-get install xdotool`

**Option B: Debian/Ubuntu Package**
1. Download `wishperpro_1.0.0_arm64.deb`
2. Install: `sudo dpkg -i wishperpro_1.0.0_arm64.deb`
3. Fix dependencies if needed: `sudo apt-get install -f`
4. **Important**: Install xdotool: `sudo apt-get install xdotool`
5. Launch from Applications menu or run `wishperpro`

---

### For Developers

If you want to build from source:

```bash
# Clone the repository
git clone https://github.com/pixelhunter1/wishperpro.git
cd wishperpro

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for all platforms
npm run build:all
```

### Initial Setup

1. Launch the app
2. Go to **Settings** tab
3. Paste your OpenAI API Key
4. Choose your mode:
   - **Correct**: Fixes grammar in Portuguese
   - **Translate**: Translates to another language
5. (Optional) Customize the global hotkey

### Building for Production

```bash
# Full build with installers
npm run build

# Quick build (directory only, faster)
npm run build:dir
```

Installers will be in `release/`:
- **macOS**: `.dmg` and `.zip`
- **Windows**: `.exe` (NSIS installer + portable)
- **Linux**: `.AppImage` and `.deb`

---

## 💡 Usage Examples

### Writing Emails
1. Open your email client
2. Click in the message body
3. Press `Cmd+X` to start recording
4. Speak your message
5. Release - email text appears instantly

### Multilingual Communication
1. Set mode to **Translate**
2. Choose target language (e.g., English)
3. Speak in Portuguese
4. Get perfect English translation at cursor

### Voice Notes
1. Open any text editor
2. Use the floating widget to record
3. Build a document entirely with your voice

---

## ⚙️ Configuration

### Modes

**Correct Mode** (Default)
- Transcribes in Portuguese
- Fixes grammar, punctuation, and spelling
- Maintains original meaning and tone

**Translate Mode**
- Transcribes in Portuguese
- Translates to target language
- Natural, fluent output

### Supported Languages

- 🇬🇧 English
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇮🇹 Italian
- 🇵🇹 Portuguese (source)

### Customization

- **Hotkey**: Change in Settings (default: `Cmd/Ctrl+X`)
- **GPT Model**: Choose between GPT-4 variants
- **Whisper Model**: Select transcription quality
- **Overlay Position**: Drag the floating widget anywhere

---

## 🏗️ Architecture

WishperPro is built with modern web technologies:

### Frontend
- **React 19** with TypeScript for UI
- **Tailwind CSS 4** for styling
- **shadcn/ui** for beautiful components
- **Vite 7** for blazing fast builds

### Desktop
- **Electron 39** for cross-platform support
- **IPC** for secure main-renderer communication
- **Native Modules** for system integration

### Backend
- **SQLite** via better-sqlite3 for local storage
- **OpenAI Whisper API** for speech-to-text
- **OpenAI GPT-4 Turbo** for text processing

### Key Technical Features
- **Always-On-Top Overlay**: Screen-saver level window priority
- **Fullscreen Compatible**: Works over any app, even fullscreen
- **Clipboard Integration**: Auto-paste via system events
- **Background Processing**: Keeps running when minimized
- **Persistent Settings**: SQLite for reliable storage

---

## 📁 Project Structure

```
wishperpro/
├── electron/                 # Electron main process
│   ├── main.ts              # Application entry point
│   ├── preload.ts           # Main window context bridge
│   ├── overlay-preload.ts   # Overlay window bridge
│   ├── db.ts                # SQLite database layer
│   └── openai.ts            # OpenAI API integration
├── src/                     # React application
│   ├── components/          # UI components
│   │   ├── Recorder.tsx     # Main recording interface
│   │   ├── Settings.tsx     # Configuration panel
│   │   ├── History.tsx      # Transcription history
│   │   └── ui/              # shadcn/ui components
│   ├── overlay.tsx          # Floating widget
│   ├── App.tsx              # Main app component
│   └── main.tsx             # React entry point
├── build/                   # Build configuration
│   └── entitlements.mac.plist  # macOS permissions
├── docs/                    # Documentation
└── package.json             # Dependencies and scripts
```

---

## 🛠️ Development

### Prerequisites

```bash
# Install dependencies
npm install

# The postinstall script automatically rebuilds native modules
```

### Running Locally

```bash
# Development mode (with hot reload)
npm run dev

# Lint code
npm run lint
```

### Building

```bash
# Build for current platform only
npm run build        # Full build with installers
npm run build:dir    # Faster, directory only (no installers)

# Build for specific platforms (cross-platform)
npm run build:all    # Build for macOS, Windows, and Linux
npm run build:win    # Build for Windows only
npm run build:linux  # Build for Linux only
```

**Note:** Cross-platform builds may require additional setup:
- **Building for Windows on macOS/Linux**: Works out of the box
- **Building for Linux on macOS**: Requires Docker
- For best results, use platform-specific builds or CI/CD (GitHub Actions)

### Database Location

- **macOS**: `~/Library/Application Support/wishperpro/wishperpro.db`
- **Windows**: `%APPDATA%\wishperpro\wishperpro.db`
- **Linux**: `~/.config/wishperpro/wishperpro.db`

---

## 🔧 Troubleshooting

### Microphone Not Working

**macOS**: System Preferences → Security & Privacy → Microphone → Enable WishperPro
**Windows**: Settings → Privacy → Microphone → Allow apps to access your microphone
**Linux**: Check PulseAudio/ALSA permissions

### Auto-Paste Not Working

**macOS:**
- Ensure you've granted Accessibility permissions
- System Preferences → Security & Privacy → Accessibility → Enable WishperPro

**Windows:**
- Auto-paste uses PowerShell SendKeys (built-in, no setup required)
- Ensure the target application is active and accepts keyboard input

**Linux:**
- Auto-paste requires `xdotool` to be installed
- Install with: `sudo apt-get install xdotool` (Debian/Ubuntu)
- Or: `sudo yum install xdotool` (Fedora/RHEL)
- If xdotool is not installed, text will be copied to clipboard only

**General:**
- Ensure the target application accepts clipboard/keyboard input
- Click in the text field before recording for best results

### API Key Errors

- Verify your OpenAI API key is valid
- Check your OpenAI account has credits
- Ensure internet connectivity

### Native Module Build Errors

```bash
# Manually rebuild native modules
npx electron-rebuild
```

### App Won't Start

- Delete the database file (see locations above)
- Clear `dist/` and `dist-electron/` folders
- Reinstall dependencies: `rm -rf node_modules && npm install`

---

## 💰 Cost Estimate

WishperPro uses OpenAI's APIs. Typical usage costs:

| Usage | Whisper Cost | GPT-4 Cost | Total/Month |
|-------|-------------|------------|-------------|
| Light (30 min) | $0.18 | $0.30 | **~$0.50** |
| Moderate (1 hour) | $0.36 | $0.60 | **~$1.00** |
| Heavy (2 hours) | $0.72 | $1.20 | **~$2.00** |

**Whisper**: $0.006 per minute
**GPT-4 Turbo**: ~$0.01 per 1K tokens (varies by output length)

---

## 🔒 Privacy & Security

- ✅ **Local Storage**: All transcriptions stored locally in SQLite
- ✅ **No Tracking**: No analytics or telemetry
- ✅ **Secure API**: OpenAI API key stored locally, never shared
- ✅ **Open Source**: Full source code available for audit
- ⚠️ **Audio Processing**: Audio sent to OpenAI for transcription (encrypted in transit)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for Whisper and GPT-4 APIs
- **Electron** for cross-platform desktop framework
- **shadcn/ui** for beautiful React components
- **better-sqlite3** for reliable SQLite integration

---

## 📧 Support

Having issues? Open an issue on [GitHub Issues](https://github.com/pixelhunter1/wishperpro/issues)

---

<div align="center">

**Made with ❤️ and AI**

⭐ Star this repo if you find it useful!

</div>
