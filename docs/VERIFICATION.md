# Verification · 2026-10-05

## Automated checks

`npm test` passed **37 checks** on the local Intel Mac with Node 25.3.0. Core checks cover input validation and behavior at meaningful boundaries; package checks build the standalone app, compare its public module exports with the source APIs and verify its classic-script entry point. Node 22/24 Linux and native Intel/arm64 Mac CI jobs are configured in `.github/workflows/ci.yml`. Their actual results are visible in [Actions](https://github.com/metealpkarvan/patch-atlas/actions).

## Browser acceptance

A real Playwright-controlled Chromium browser was used on macOS 15.8 Intel. Desktop 1440×1050 and mobile 390×844 layouts were captured and inspected. Complete flows covered fictional sample loading, creation/editing, state transitions, Turkish search where relevant, JSON download/restore, Markdown or calendar output, language/option translation, reload persistence, offline app-shell reload, text escaping and corrupt local archive protection. The checks completed without page script errors after fixes.

Confirmation and prompt functions are accepted by a test stub for automated flow continuity; these stubs are test-only and are not shipped in application code. The selected sample and the real prompt opening were also observed using native browser dialogs. This is implementation acceptance, not participant testing or a full accessibility audit.

A repeatable workflow script is provided in `scripts/browser-check.js`. To use it, create a fresh browser test session and serve `dist/`. It replaces the session's records with fictional data and accepts confirmations. With Playwright CLI, use `open http://127.0.0.1:8080/`, capture a snapshot, then `run-code --filename scripts/browser-check.js`; create `output/playwright/` first. The CLI is an optional verification tool, not an application dependency. Do not reuse a profile containing your real app records.

## Downloaded files

The built apps were opened directly with `file:` URLs in Chromium and independently loaded with a small WKWebView harness on this Mac. App boot, fictional sample interaction and record creation passed without a web server. The WebKit harness is an application-level local-file check, not a claim that every Safari version was exercised. Local-file storage behavior still varies by browser/location; backup advice remains necessary.

## Boundaries

The architecture checks run the rule engine and package build on native Mac CPUs. They do not certify every older macOS release, browser, display size, physical Mac, clipboard permission mode or VoiceOver flow. Offline support caches this app's assets, not outside articles. The project has no measured adoption, social benefit or productivity study. See RESEARCH.md for the next opt-in research steps.
