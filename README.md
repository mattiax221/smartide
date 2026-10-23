# SmartIDE

Desktop IDE scaffold: **Tauri 2 + Rust**, **React / TypeScript / Vite**, **Monaco**. Glass charcoal + yellow UI, **custom title bar** (no OS chrome), Open Folder + real file edit/save, multi-provider AI chat (keys encrypted on the host).

Product roadmap (A→Z, Italian): Cursor Project store → `docs/roadmap.md`.

**Windows tip:** after pull, rebuild with `npm run tauri dev`. Hover labels use in-app tooltips (portal). Use **Open Folder** or `Ctrl+O`; save with `Ctrl+S`.

## Prerequisites

| Platform | Requirements |
|----------|----------------|
| **All** | [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/) **1.90+** (`rust-toolchain.toml`) |
| **Linux** | WebKitGTK / GTK (see below) |
| **macOS** | Xcode CLT (`xcode-select --install`) |
| **Windows** | **MSVC Build Tools** with **Desktop development with C++** (provides `link.exe`). Install via [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Also WebView2 (usually present on Win10/11). |

### Linux packages (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf \
  build-essential curl wget file libssl-dev libgtk-3-dev
```

Full guide: [Tauri prerequisites](https://tauri.app/start/prerequisites/).

### Windows: `link.exe` not found

Rust’s MSVC toolchain needs the Visual C++ linker. If `tauri build` / `cargo build` fails with `linker link.exe not found`:

1. Install **Build Tools for Visual Studio**
2. Select workload **Desktop development with C++**
3. Open **“x64 Native Tools Command Prompt for VS”** (or ensure the MSVC environment is on `PATH`)
4. Re-run `npm run tauri dev`

Alternatively: `rustup default stable-x86_64-pc-windows-gnu` + MinGW (not the recommended Tauri path).

## Setup

After every pull (required — new deps break Vite until install):

```bash
npm install
```

## Dev / build checklist

```bash
# 1) Frontend only (no secure key vault / ai_chat)
npm run dev

# 2) Desktop app (preferred)
npm run tauri dev

# 3) Typecheck + Vite production bundle
npm run build

# 4) Native binary + installers
npm run tauri build
```

| Check | Linux | macOS | Windows |
|-------|-------|-------|---------|
| `npm run build` | yes | yes | yes |
| `npm run tauri dev` | needs WebKitGTK | needs CLT | needs MSVC + WebView2 |
| `npm run tauri build` | deb/rpm/AppImage | `.app` / dmg (sign later) | MSI/NSIS (sign later) |

Rust logs: set `RUST_LOG=info` (or `smartide_lib=debug`) when running `tauri dev`.

## Project layout

```
src/                  React UI
  state/store.tsx     Lightweight IDE store (tabs, workspace, AI, settings, toasts)
  components/ui/      Shared Button / Input / Select / EmptyState / Toast
src-tauri/            Rust host
  src/secrets.rs      Encrypted API keys
  src/ai.rs           Multi-provider chat
  src/lib.rs          Commands + tracing logs
```

### Tauri commands

| Command | Purpose |
|---------|---------|
| `list_ai_providers` | Providers + key presence |
| `set_api_key` / `get_api_key` / `delete_api_key` / `has_api_key` | Secure key CRUD |
| `list_ai_models` | Default models |
| `ai_chat` | Chat completions (keys stay on host) |

Providers: Ollama, Groq, Gemini, OpenRouter, OpenAI, Anthropic. Spark icon → chat; open editor file is attached as context.

## License

MIT (or as specified by the repository owner).
