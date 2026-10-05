# Patch Atlas

A local review desk for AI-written or human-written changes. Paste a unified diff, inspect exact old/new coordinates and keep your own review evidence.

[Open the app](https://metealpkarvan.github.io/patch-atlas/) · [Download 1.0.0](https://github.com/metealpkarvan/patch-atlas/releases/latest) · [Türkçe](README.tr.md)

![Patch Atlas working interface](docs/desktop.png)

## A complete small workflow

- Two-way Git/unified diff parsing with exact old/new line coordinates, quoted UTF-8 paths, renames, mode changes and explicit binary handling.
- Seven transparent attention-cue categories from file names and added text; a cue keeps its source line visible.
- A purpose field, file navigation, per-file checklists and reviewer notes that survive reloads.
- Markdown review records and JSON backups; changing the diff resets old checks after confirmation.

All three projects from this research round have Turkish and English interfaces, fictional examples, local data, JSON recovery and zero runtime dependencies. Each project is independently usable.

## Try it

1. Click **Sample** for a fictional three-file change.
2. Paste `git diff --no-ext-diff --no-color`, describe the purpose, then build the review map.
3. Select a file, read the change, write which checks you actually ran and what remains uncertain.
4. Download the review record or a complete JSON backup.

The live app is the easiest path. For a downloaded copy, extract `patch-atlas-v1.0.0.zip` and open **index.html** in a modern browser. The release contains a prebuilt classic JavaScript bundle, so you do not need Node.js, a server or an API key to try it. Keep the ZIP and verify it against `SHA256SUMS.txt` if you want to check download integrity.

Browser storage for a `file:` page varies by browser and file location. Use JSON backups before moving the folder or switching between the live and downloaded app. If local saving is unavailable, the app warns you and keeps working in the current session.

## Data and limits

The parser supports two-way unified text diffs, up to 500,000 characters, 12,000 lines and 80 files. It rejects combined merge diffs and incomplete hunks instead of silently presenting partial changes. Binary data is not decoded. Cues are lexical prompts, can be false positives and do not prove a defect or safe merge. No repository is scanned, code is not executed, and the app cannot observe CI or tests running.

Data remains in this browser's local storage and is unencrypted. There is no analytics, authentication, cloud sync or AI request. Clearing browser data can remove records. The app host receives ordinary page/asset requests; your saved text is not uploaded. External links are visited only on your action. A corrupt local archive blocks writes and offers the original bytes for recovery. A valid import asks before replacing data and downloads the current archive as a recovery copy first. Backup imports are bounded to 3 MB and the app's schema.

On HTTPS or localhost the interface is cached after its first online visit. This caches the app shell, not linked web pages. A downloaded copy runs from its own local files. Language changes translate controls without rewriting user content.

## Why build this?

The design comes from an exploratory snapshot of **three public X posts and eight Reddit threads**, accessed on 2026-10-05. Primary posts, partial-text limits, cached-date uncertainty, competing approaches and product hypotheses are explained in [Research](docs/RESEARCH.md) and the [full evidence ledger](docs/COMMUNITY-RESEARCH-2026-10-05.md). Posts do not establish adoption or measured effectiveness.

## Development and verification

```bash
npm test
npm run build
npm start
```

Tests/build require Node.js 22+; `npm start` uses Python 3 to serve `dist/` at localhost:8080. End users opening the release ZIP need neither runtime. There are **37 automated rule and packaging checks**. Browser acceptance also covers editing, exports, backup restore, data recovery, translations, mobile layout and offline reload; see [Verification](docs/VERIFICATION.md).

CI runs on Linux with Node 22/24 and native **Intel (x64) and Apple Silicon (arm64) Mac runners**. HTML/CSS/JavaScript runtime files use the browser on either processor and require no Rosetta. Browser acceptance on the local Intel Mac is a separate record, not proof of every browser or older macOS version.

[Architecture](docs/ARCHITECTURE.md) · [Design decisions](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md)

MIT © 2026 Mete Alp Karvan
