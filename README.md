# SNATCH

YouTube video downloader with a retro hacker terminal aesthetic.

Built with Tauri 2 + Rust backend and React frontend. Features CRT scanlines, matrix rain effects, three color themes, embedded video player, batch queue downloads, i18n (en/ru), and selective audit logging.

![SNATCH Screenshot](src-tauri/icons/icon.png)

## Features

- **Single & batch downloads** — paste a URL or queue multiple videos
- **Quality presets** — Best, 4K, 1080p, 720p, 480p, Audio Only (MP3)
- **Embedded video player** — preview downloaded videos without leaving the app
- **Download history** — searchable log with 500-entry FIFO eviction
- **Clipboard watcher** — auto-detects YouTube URLs from clipboard
- **Three color themes** — green, amber, cyan with CRT scanline and matrix rain effects
- **i18n** — English and Russian
- **Audit logging** — selective logging of high-risk operations (cookies, file access, history clear)
- **Dependency check** — verifies yt-dlp and ffmpeg availability on startup

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Tauri 2 |
| Backend | Rust (tokio) |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand |
| Components | shadcn/ui |
| Bundler | Vite |

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) in PATH
- [ffmpeg](https://ffmpeg.org/) in PATH

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

Produces platform-specific installers in `src-tauri/target/release/bundle/`.

## Project Structure

```
src/                  # React frontend
  components/         # UI components (layout, features, shared)
  hooks/              # React hooks (useSettings, useHistory, useQueue, useI18n)
  lib/                # Types, constants, bindings, i18n dictionaries
  pages/              # Page components (Download, Queue, History, Settings, About)

src-tauri/            # Rust backend
  src/commands/       # Tauri command handlers
  src/services/       # Business logic (ytdlp, settings, history, clipboard, audit)
  src/models/         # Data structures
  src/validators/     # Input validation (URL, path, flags)
```

## Security

- NewType validators (`ValidatedUrl`, `SafePath`) for compile-time enforcement
- yt-dlp flag whitelist — only safe flags are allowed
- Path scope checking — downloads restricted to allowed directories
- Audit log for high-risk commands with hashed URLs
- No secrets in frontend — all sensitive operations in Rust backend

## Author

**supostat** — [byigor.dev](https://byigor.dev) | [GitHub](https://github.com/supostat)

## License

MIT
