# Promptr

A small macOS menu bar app for saving, searching and reusing AI prompts. Press **⌃⌥P** from any app, type a few letters, and copy or paste the prompt straight into Claude, ChatGPT, Cursor or wherever you were typing.

Everything stays on your Mac: no account, no server, no network.

## Features

- **Menu bar utility** — no Dock icon; open from the menu bar icon (Open / Add Prompt / Quit) or the global shortcut **⌃⌥P**
- **Fuzzy search** across titles, tags and prompt text, tolerant of small typos (`reakt` finds React, `sqll` finds SQL)
- **One tag per prompt** with one-click filtering; pick an existing tag or create one from the dropdown
- **Favorites** — star prompts to keep them at the top, or show starred prompts only
- **Copy** with a verified clipboard write (multi-line text and Unicode preserved exactly)
- **Paste into App** — switches to Claude, Cursor, Notes or the app you came from and sends ⌘V
- **Keyboard-first**, light and dark mode, local SQLite storage

## Requirements

| | Version used | Notes |
|---|---|---|
| macOS | 13 Ventura+ (tested on 26) | Apple Silicon or Intel; 13 is Go 1.27's minimum |
| Xcode Command Line Tools | any recent | `xcode-select --install` |
| Go | 1.26+ (tested 1.27) | `brew install go` |
| Node.js | 20.9+ | required by Next.js 16 |
| Wails CLI | v2.17 | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |

Make sure Go's bin folder is on your `PATH` (add to `~/.zshrc`):

```bash
export PATH="$PATH:$HOME/go/bin"
```

Check everything with `wails doctor`.

## Run in development

```bash
wails dev
```

This starts the Next.js dev server on port 3210 and opens the app. Go changes rebuild automatically; after frontend changes press **⌘R** in the window. The same app is also reachable at http://localhost:34115 in a browser (handy for inspecting the UI; native features like paste only work in the real window).

## Build

Quick local build for your own Mac:

```bash
wails build
open build/bin/Promptr.app
```

Release build (universal app + DMG): see [Packaging and distribution](#packaging-and-distribution).

## Install (for people using a release)

1. Open `Promptr-<version>.dmg` and drag **Promptr** onto **Applications**.
2. Launch it from Applications or Spotlight. A **P** key icon appears in the menu bar; there is no Dock icon.
3. If macOS says the app "can't be opened" or is from an unidentified developer (unsigned builds only): open **System Settings → Privacy & Security**, scroll down and click **Open Anyway** next to Promptr, then confirm. You only need to do this once.
4. The first time you use **Paste into App**, allow Promptr under **Accessibility** when prompted.

## Using Promptr

| Key | Action |
|---|---|
| ⌃⌥P | Show / hide Promptr from anywhere |
| ↑ ↓ | Move through results |
| ↩ | Copy the selected prompt |
| ⌘C | Copy the selected prompt (copies your text selection instead if you have one) |
| ⌘↩ | Paste the selected prompt into the target app |
| ⌘K | Focus the search box |
| ⌘N | New prompt |
| ⌘E | Edit the selected prompt (or double-click it) |
| ⌘↩ (in the form) | Save |
| Esc | Clear search → clear tag filters → hide window; in the form: cancel |
| ⌫ (empty search) | Remove the last tag filter |

- Click a tag (in the bar under the search or on a prompt) to filter; click again to remove.
- Click the menu bar icon for **Open Promptr**, **Add Prompt** and **Quit**.
- Click ☆ on a prompt to star it; starred prompts stay at the top. The ☆ button at the end of the tag bar shows starred prompts only.
- The **…** button on a prompt has Edit, Copy, Star and Delete.
- Clicking another app hides Promptr, except while the add/edit form is open.

### Paste into App

Click **Paste into App** on a prompt to choose the target: the app you were just using is listed first, followed by Claude, ChatGPT, Cursor, VS Code and the other supported apps you have installed. Pick one with the mouse, ↑ ↓ and ↩, or ⌘1–⌘9. Your choice is remembered, and **⌘↩** pastes straight into it without opening the chooser.

Pasting needs **Accessibility** permission (System Settings → Privacy & Security → Accessibility), because macOS only lets approved apps send keystrokes. The first time you paste, Promptr shows a banner with an **Open Settings** button.

What Promptr does: copies the prompt, brings the target app to the front, waits until macOS confirms it is frontmost, hides itself and sends ⌘V. The text lands in whichever field has focus in that app. Promptr cannot confirm the text arrived (Electron apps don't expose that reliably), so if anything along the way fails it stays open, says why, and leaves the prompt on your clipboard.

It deliberately won't auto-paste a multi-line prompt into a terminal (each line could run as a command), and it won't open an app that isn't running.

## Your data

Prompts and settings live in a SQLite database at:

```
~/Library/Application Support/Promptr/prompts.db
```

Back it up by copying that file while Promptr is quit. To start over with the sample prompts, quit Promptr and delete `prompts.db*` in that folder.

Inspect it while the app runs:

```bash
sqlite3 ~/Library/Application\ Support/Promptr/prompts.db "SELECT id, title, updated_at FROM prompts ORDER BY updated_at DESC;"
```

## Troubleshooting

**Paste stopped working after a rebuild.** Development builds are signed ad hoc, so macOS treats every rebuild as a new app and the old Accessibility entry silently stops applying. Remove Promptr from the Accessibility list with **–**, then use **Open Settings** in Promptr again. A properly signed release build doesn't have this problem.

**The menu bar icon is missing.** On notched MacBooks a crowded menu bar hides icons behind the notch, and macOS 26 can switch app icons off in System Settings → Menu Bar. You can always open Promptr with ⌃⌥P or by launching it again from Spotlight.

**"Shortcut unavailable" in the header.** Another app already registered ⌃⌥P. Hover the label for details.

**"Couldn't load your prompts".** The database folder isn't readable or writable. Fix the permissions on `~/Library/Application Support/Promptr` and press **Try again**.

## Project structure

```
main.go                     Wails options: window, menus, embedded frontend
app.go                      App lifecycle and wiring (database, clipboard, paste service, macOS callbacks)
bindings_*.go               Thin methods the frontend calls: prompts, paste, window
internal/
  store/                    SQLite: migrations, validation, prompts, settings (+ tests)
  paste/                    Paste targets and the paste workflow, behind a System interface (+ tests with a fake Mac)
  clipboard/                Verified copy: write, read back, compare (+ tests)
  macos/                    Objective-C via cgo: menu bar, hotkey, window, app switching, Accessibility, ⌘V
  applog/                   Small file logger (~/Library/Logs/Promptr)
frontend/
  app/                      Next.js entry (layout, page, global styles)
  components/
    launcher/               Main window: composition, header, list, footer, banner, toast
    prompt/                 Prompt row and its … menu
    editor/                 Add/Edit form and the tag picker
    filters/                Search bar and tag filter bar
    paste/                  Paste-into-app chooser
    ui/                     Shared pieces: buttons, chips, keycaps, dialogs, empty states
  hooks/                    State and behavior: data, filters, actions, notices, shortcuts, window events
  lib/
    api/                    The only code that calls Go (wraps the generated bindings)
    prompts/                Pure logic: types, validation, search, colors and icons
  wailsjs/                  Generated Go bindings — do not edit; `wails dev/build` regenerate them
build/                      App icon and Info.plist templates used by `wails build`
scripts/package.sh          Release build: checks, universal app, signing, DMG, checksum, optional notarization
```

### How it fits together

- The Next.js UI is exported to plain static files (`output: "export"`) and embedded into the Go binary with `//go:embed`; there is no Next.js server at runtime.
- The UI calls Go through Wails bindings (`frontend/wailsjs/go/main/App`), which return Promises.
- Wails v2 has no tray or global-shortcut API, so `internal/macos` uses `NSStatusItem` and Carbon's `RegisterEventHotKey` (no Accessibility permission needed for the shortcut).
- The database schema is versioned with SQLite's `PRAGMA user_version`; each migration in `internal/store/migrations.go` runs once, in a transaction.

## Packaging and distribution

`scripts/package.sh` runs the checks, builds a **universal** app (Apple Silicon + Intel), signs it, wraps it in a DMG with an Applications shortcut, and writes a SHA-256 checksum. It never uploads anything unless you set `NOTARY_PROFILE` (which sends the DMG to Apple for notarization).

```bash
./scripts/package.sh
```

Output:

```
build/bin/Promptr.app            universal app (x86_64 + arm64)
dist/Promptr-<version>.dmg       installer image
dist/Promptr-<version>.dmg.sha256
```

The version comes from `info.productVersion` in `wails.json`. Bump it there before each release.

The script also sets `-mmacosx-version-min=13.0` so the binary and `Info.plist` agree on the real minimum (Go 1.27 targets macOS 13), and builds with `-trimpath -ldflags "-s -w"` so no local paths or debug symbols end up in the app.

### Code signing and notarization

macOS decides whether to trust a downloaded app based on its signature:

| Signature | What it costs | What users see after downloading |
|---|---|---|
| **Ad hoc** (default, `SIGN_IDENTITY` unset) | Free | "Apple could not verify…" — they must use **Open Anyway** in Privacy & Security once. Fine for yourself and a few friends. |
| **Developer ID**, not notarized | Apple Developer Program, $99/year | Blocked the same way as ad hoc — Gatekeeper has required notarization since macOS 10.15. |
| **Developer ID + notarized + stapled** | Same membership | Opens normally, like any app from the web. Use this for public releases. |

Ad hoc signing also means every rebuild looks like a new app to macOS, which is why the Accessibility permission has to be re-granted after rebuilding. A Developer ID signature keeps the same identity across versions.

To sign and notarize once you have a Developer ID Application certificate in your keychain:

```bash
# one-time: store notarization credentials in the keychain (use an app-specific password from appleid.apple.com)
xcrun notarytool store-credentials promptbar-notary --apple-id you@example.com --team-id TEAMID

# each release
SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" NOTARY_PROFILE=promptbar-notary ./scripts/package.sh
```

The script signs with the hardened runtime and a secure timestamp (both required for notarization), submits the DMG with `notarytool`, waits for Apple's verdict, and staples the ticket so it works offline. Promptr needs no extra entitlements: it isn't sandboxed, WebKit's JavaScript engine runs in Apple's own processes, and Accessibility is granted by the user rather than declared.

Check a finished build:

```bash
codesign -dv --verbose=2 build/bin/Promptr.app
spctl -a -vv build/bin/Promptr.app        # "accepted" only for notarized Developer ID builds
xcrun stapler validate dist/Promptr-1.0.0.dmg
```

### Publishing a GitHub Release (manual)

These commands publish to GitHub, so run them yourself when you're ready. They assume the project is already a GitHub repository.

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 dist/Promptr-1.0.0.dmg dist/Promptr-1.0.0.dmg.sha256 \
  --title "Promptr 1.0.0" \
  --notes "First release. Requires macOS 13 or later (Apple Silicon or Intel). See the README for install steps."
```

For unsigned builds, include the **Open Anyway** step from [Install](#install-for-people-using-a-release) in the release notes.

### Clean-Mac test checklist

Test on a Mac (or a fresh macOS user account) that has never had Promptr, Go, Node or Wails:

- [ ] Download the DMG from the release page in Safari (so it gets the quarantine flag real users get)
- [ ] `shasum -a 256 Promptr-1.0.0.dmg` matches the published `.sha256`
- [ ] DMG opens and shows Promptr next to an Applications shortcut; drag to install
- [ ] First launch: unsigned → **Open Anyway** works; notarized → opens with only the standard "downloaded from the internet" prompt
- [ ] No Dock icon; menu bar icon appears; ⌃⌥P toggles the window
- [ ] Seven sample prompts appear; `~/Library/Application Support/Promptr/prompts.db` is created
- [ ] Add, edit, delete, search and tag filtering work; changes survive quit and relaunch
- [ ] Copy works; paste works after granting Accessibility
- [ ] Works on both an Apple Silicon and an Intel Mac (or Intel via `arch -x86_64`)
- [ ] macOS 12 or older refuses to open it with a "requires macOS 13" message instead of crashing
- [ ] Quit from the menu bar icon; deleting the app from Applications and the data folder removes everything

## Tests

```bash
go test ./...
cd frontend && npx tsc --noEmit
```

The Go tests cover storage, validation, Unicode normalisation, migrations and persistence across reopen. UI and native behaviour are covered by the manual checklist below.

## Manual test checklist

**Launch and window**
- [ ] No Dock icon; **P** key icon in the menu bar
- [ ] ⌃⌥P shows Promptr over the current app and focuses search; ⌃⌥P again hides it
- [ ] Icon click toggles; right-click shows Open / Quit
- [ ] Clicking another app hides Promptr; it stays open while the form is open
- [ ] Opens on the current Space and over fullscreen apps
- [ ] Light and dark mode both look right

**Prompts**
- [ ] Add, edit, delete; empty title/prompt and duplicate titles (any case, including accents) are rejected
- [ ] Each prompt has one tag: picking from the dropdown selects it and closes the menu; tags normalise (`React` → `react`, spaces → hyphens), 24 characters max
- [ ] Unsaved changes: Esc warns once, second Esc discards; saving an unchanged prompt just closes
- [ ] A 20,000-character prompt with a long URL displays without overflow and searches without lag
- [ ] Quit and relaunch: all changes are still there

**Search and tags**
- [ ] `deb`, `reakt`, `sqll`, `eror` find the expected prompts
- [ ] Tag filter + search combine; empty state offers **Search all tags** / **Clear search**
- [ ] Esc and ⌫ clear search and filters in order

**Copy and paste**
- [ ] ↩ and ⌘C copy; `pbpaste | cat -vet` shows tabs, line breaks and emoji intact
- [ ] ⌘↩ pastes into Claude, Cursor and Notes (after granting Accessibility)
- [ ] Target not running → "isn't open" message, prompt on clipboard
- [ ] Multi-line prompt to Terminal is refused and copied instead
- [ ] Without Accessibility: banner with **Open Settings**

## License

Private project.
