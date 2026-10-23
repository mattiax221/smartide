# SmartIDE

Desktop IDE scaffold built with **Tauri 2** (Rust), **React + TypeScript + Vite**, and **Monaco Editor**. Layout mirrors VS Code (activity bar, sidebar explorer, editor tabs, bottom panel, status bar) with a Dark+ inspired theme.

AI coding foundations are stubbed: Settings UI for multi-provider API keys, plus secure encrypted storage commands on the Rust side. Provider chat/completion clients are not wired yet.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (npm)
- [Rust](https://rustup.rs/) stable **1.90+** (see `rust-toolchain.toml`)
- Tauri Linux deps (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf \
  build-essential curl wget file libssl-dev libgtk-3-dev
```

See [Tauri prerequisites](https://tauri.app/start/prerequisites/) for macOS / Windows.

## Setup

```bash
npm install
```

## Run locally

Frontend only (browser preview — API key storage needs Tauri):

```bash
npm run dev
```

Full desktop app:

```bash
npm run tauri dev
```

## Build

```bash
# Frontend production bundle
npm run build

# Desktop installers / binaries
npm run tauri build
```

## Project layout

```
src/                  React UI (shell, Monaco, settings)
src-tauri/            Rust / Tauri shell
  src/secrets.rs      AES-GCM API key store + OS keyring hooks
  src/lib.rs          Tauri commands
```

### Tauri commands (API keys)

| Command | Purpose |
|---------|---------|
| `list_ai_providers` | Known providers + whether a key is stored |
| `set_api_key` | Encrypt and persist a key |
| `get_api_key` | Reveal a stored key (settings only) |
| `delete_api_key` | Remove a key |
| `has_api_key` | Boolean check |

Providers stubbed: OpenAI, Anthropic, Google Gemini, Groq, OpenRouter, Ollama (local, no key).

## License

MIT (or as specified by the repository owner).
