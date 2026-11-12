# Private Property Companion

A separate local-first desktop companion built around the “This Is Private Property” meme. It stays above your other windows, opens chat from the character, and uses Ollama on your computer for replies. The first photo is the default look; Mainframe has four switchable profiles.

The supplied startup MP3 plays on launch by default. Turn it off in **Mainframe → Voice**. Chat and user-managed memories are saved locally. The app never falls back to a cloud model.

## Run on macOS

Requirements: macOS 12+ and [Node.js 20 or later](https://nodejs.org/).

```sh
git clone https://github.com/polents/private-property-companion.git
cd private-property-companion
bash ./run-mac.sh
```

The first run installs Electron dependencies on your Mac. Keep Terminal open while the companion starts. You can also run `npm install` and `npm start` yourself.

## Run on Windows PC

Requirements: Windows 10/11 and [Node.js 20 or later](https://nodejs.org/).

Open PowerShell in the cloned folder:

```powershell
git clone https://github.com/polents/private-property-companion.git
cd private-property-companion
powershell -NoProfile -ExecutionPolicy Bypass -File .\run-windows.ps1
```

Or use `npm install` followed by `npm start`.

## Local AI setup

Install and start [Ollama](https://ollama.com), then download the preferred model:

```sh
ollama pull gemma4:e4b
```

In **Mainframe → Brain**, recheck the local connection, select an installed model, or enter a different Ollama model tag. If Ollama or the chosen model is missing, the app shows setup steps. It contacts only `http://127.0.0.1:11434`; it does not send chat or memories to a hosted service.

## Controls

- Left-click **Talk to him** or the portrait to chat; right-click the character for the context menu.
- Open **Mainframe** to pick one of four looks, set the character scale, tune personality and check-in frequency, select the local Ollama model, and manage memories.
- Use **Quiet mode** or set proactivity to **OFF** to stop spontaneous remarks.
- The tray icon can show or hide the companion. Closing Mainframe hides that window while leaving the pet running.
- Chat, memories, and preferences are stored under Electron's local app data folder. The app does not read your screen.

## Downloadable installers

The GitHub Actions workflow builds a macOS DMG/ZIP and a Windows installer for version tags. When a release is published, get the installer under **Releases → Assets**. To build locally, use `npm run dist:mac` on macOS or `npm run dist:win` on Windows.

The macOS release build is universal for Intel and Apple Silicon. Windows releases target x64; Windows ARM can run the x64 package under emulation.

## Languages

GitHub also shows its automatic **Languages** breakdown near the repository sidebar.

| Language | Used for |
| --- | --- |
| JavaScript | Electron windows, local Ollama connection, persistence, and interaction |
| HTML | Pet, chat, and Mainframe structure |
| CSS | Cyberpunk theme, layout, idle motion, and glitch details |
| PowerShell | Windows launch helper |
| Bash | macOS launch helper |
| YAML | Cross-platform GitHub Actions release builds |
| JSON | Electron and package configuration |

## Credits and media

- **polents** — concept and user-supplied photos/audio.
- **OpenAI Codex** — implementation assistance.

The photos and startup audio were provided by the project owner for this companion. They are included as supplied and are not relicensed by the application source license.

## Troubleshooting

### `npm` or `node` is not recognized

Install Node.js 20 or newer, close and reopen Terminal/PowerShell, then run the launch command again.

### Chat says Ollama is unavailable

Start the Ollama app, check **Mainframe → Brain**, and install the model with `ollama pull gemma4:e4b`. The companion waits for local Ollama; it never switches to cloud AI.

### I see the character but the music is silent

Open **Mainframe → Voice**, use **Play startup sound** to check it, and confirm the **Play supplied MP3 on launch** toggle is on. Check system output volume as well.
