# Venice AI — macOS Desktop App

A native macOS wrapper for [venice.ai](https://venice.ai) — the privacy-first AI platform. Stays logged in, opens straight to chat, and never touches your data.

![Venice AI App](assets/preview.png)

---

## Why This Exists

Venice AI is one of the only AI platforms that genuinely doesn't log your conversations or use them for training. There's no official desktop app, so every session starts in a browser tab. This app fixes that — it's a proper `.app` that lives in your Applications folder, remembers your login, and opens instantly to the chat interface.

---

## Privacy

This app is a thin shell around the Venice AI website. It adds **zero** tracking of its own:

- **No telemetry, no analytics, no phoning home** — the wrapper code has nothing that phones anywhere except `venice.ai`
- **All traffic goes directly to venice.ai** — no proxies, no middlemen, same as using a browser
- **Session data stays on your Mac** — login cookies are stored only in `~/Library/Application Support/Venice AI/`, sandboxed to this app
- **Venice AI itself doesn't log your chats** — that's the whole point of using Venice. Conversations are processed on-device or on privacy-preserving infrastructure and are not stored or used for training
- **Open source** — every line of code in this repo is readable. There's nothing hidden

The only data stored locally is your window size/position (`window-state.json` in the app's support folder) so the window reopens where you left it.

---

## Features

- Opens directly to `venice.ai/chat/agent`
- Stays logged in between launches (persistent session)
- Native macOS menu bar (Edit, View, Go, Window)
- Keyboard shortcuts: `Cmd+N` new chat · `Cmd+[/]` back/forward · `Cmd+R` reload · `Cmd+=/−` zoom
- Remembers window size and position
- External links open in your default browser instead of breaking the app
- Built on Electron 33 with `nodeIntegration: false` and `contextIsolation: true`

---

## Install (Pre-built)

> **Requires macOS with Apple Silicon (M1/M2/M3/M4)**

1. Go to [Releases](../../releases) and download `Venice.AI.app.zip`
2. Unzip and drag `Venice AI.app` to your `/Applications` folder
3. Right-click the app → **Open** the first time (since it's not notarized)
4. Log in to your Venice AI account — you'll stay logged in from now on

---

## Build From Source

**Requirements:** Node.js 18+ and npm

```bash
# Clone
git clone https://github.com/tandracchi/venice-ai-mac.git
cd venice-ai-mac

# Install dependencies
npm install

# Build the .app
npm run build

# Move to Applications
cp -R "dist/Venice AI-darwin-arm64/Venice AI.app" /Applications/
```

The built app will be at `dist/Venice AI-darwin-arm64/Venice AI.app`.

### Intel Mac

Change the `--arch` flag in `package.json`:

```json
"build": "electron-packager . 'Venice AI' --platform=darwin --arch=x64 ..."
```

### Universal (Intel + Apple Silicon)

```json
"build": "electron-packager . 'Venice AI' --platform=darwin --arch=universal ..."
```

---

## Project Structure

```
venice-ai-mac/
├── main.js              # Electron main process — window, menus, session
├── package.json         # Dependencies and build script
├── generate-icon.js     # Script that generated the icon PNGs (for reference)
└── assets/
    └── icon.icns        # App icon (official Venice AI logo)
```

---

## How It Works

`main.js` creates a `BrowserWindow` that loads `https://venice.ai/chat/agent` using a **persistent Electron session** (`partition: 'persist:venice'`). This is the key to staying logged in — Electron stores the session cookies in the app's support directory on disk, so they survive between launches exactly like a browser profile would.

Security posture:
- `nodeIntegration: false` — the Venice website cannot access Node.js or your filesystem
- `contextIsolation: true` — the renderer and main process are strictly separated
- External URLs (anything not `venice.ai`) are intercepted and forwarded to your system browser instead of opening a new Electron window

---

## License

MIT — do whatever you want with it.

---

*Not affiliated with Venice AI. Built because the web app is great and deserved a proper Mac home.*
