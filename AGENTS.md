# Agent Notes for Better Picture

## Project Overview

Better Picture is a small Manifest V3 Chromium extension for Chrome and Edge. It creates a caption-aware floating mini-player for the active page video.

The extension ships as plain files loaded directly by the browser. Playwright is installed as a development-only dependency for automated Chromium extension testing; there is no production bundler or framework.

## Essential Commands

Run lightweight syntax/config checks after JavaScript or manifest edits:

```powershell
node --check content.js
node --check popup.js
node --check background.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest json ok')"
```

Run the automated Chromium extension test:

```powershell
npm install
npx playwright install chromium
npm test
```

Run the local demo from the repository root:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then load the extension unpacked in Chrome or Edge and open:

```text
http://127.0.0.1:8765/demo/index.html
```

Manual extension loading is via `chrome://extensions` or `edge://extensions`, developer mode, **Load unpacked**, then select this folder.

## File Responsibilities

- `manifest.json` declares the MV3 extension, `activeTab` and `scripting` permissions, the popup, background service worker, and a document-idle content script on `<all_urls>`.
- `background.js` only initializes the action badge on install.
- `popup.html`, `popup.css`, and `popup.js` implement the browser-action popup.
- `content.js` contains almost all runtime behavior: video selection, mini-player creation, Document Picture-in-Picture, in-page fallback, caption extraction, playback controls, keyboard shortcuts, cleanup, and message handling.
- `content.css` styles only the in-page fallback mini-player injected into the host page.
- `demo/index.html` and `demo/captions.vtt` provide the manual caption test page.
- `tests/extension.spec.js`, `tests/fixture.html`, and `tests/fixture-server.js` provide the deterministic Playwright browser test.
- `icons/` contains extension icon assets referenced by `manifest.json`.

## Runtime Architecture and Flow

The popup and content script communicate through shared message type strings:

- `BETTER_PICTURE_START`
- `BETTER_PICTURE_STOP`
- `BETTER_PICTURE_STATUS_REQUEST`
- `BETTER_PICTURE_SCAN_TABS`

`BETTER_PICTURE_SCAN_TABS` is handled by the background service worker, not the content script.

Keep these strings in sync between `popup.js`, `content.js`, and `background.js`; there is no shared module system.

Popup flow:

1. On open, `popup.js` sends a `BETTER_PICTURE_SCAN_TABS` message to the background service worker.
2. The background worker queries all `http`/`https` tabs for video status by sending `BETTER_PICTURE_STATUS_REQUEST` to each and collecting responses.
3. The popup renders a tab picker view showing every tab with a detected video.
4. If only one tab has video, the popup auto-selects it and skips the picker.
5. Once the user selects a tab, the popup switches to a status/controls view for that specific tab.
6. Start/stop messages target the selected tab, not necessarily the currently active tab.
7. If Chrome reports a missing receiver, the popup injects `content.css` and `content.js` using `chrome.scripting`, then retries the message.
8. A "Back" button returns the user to the tab picker view and re-scans all tabs.

Content script flow:

1. A global guard `globalThis.__BETTER_PICTURE_CONTENT_LOADED__` prevents duplicate initialization when `popup.js` manually injects a content script into a tab that may already have one.
2. `findBestVideo()` scores visible `<video>` elements. Playing videos, finite-duration videos, current playback position, and larger rendered area all improve the score.
3. `startBetterPicture()` prefers `window.documentPictureInPicture.requestWindow()` when available.
4. If Document Picture-in-Picture fails, usually because of browser/user-gesture constraints, it logs an info message and falls back to an in-page overlay.
5. The selected source `<video>` is moved into the mini-player with a comment placeholder left at the original DOM position.
6. Cleanup moves the original video back, restores its inline style, controls state, `disablePictureInPicture`, text-track modes, listeners, timers, observers, and closes the PiP window if needed.

## Mini-Player Details and Gotchas

The implementation intentionally moves the original page video instead of cloning or streaming it. Any feature touching docking must preserve the placeholder-and-restore behavior in `dockSourceVideo()` or page playback can be broken after closing Better Picture.

`applyDockedVideoFit()` sets many inline styles with `!important` because host sites often fight video sizing with their own player CSS. Keep video fit changes centralized there and in `createVideoFitController()`.

`createVideoFitController()` uses `MutationObserver`, `ResizeObserver`, animation frames, and media events to re-apply video fit when sites mutate player attributes. Avoid adding one-off style fixes elsewhere unless they also clean up correctly.

The in-page mini-player uses `#better-picture-root` and a max z-index value in `content.css`. Do not use generic selectors outside that root because content CSS runs on every matched page.

Document Picture-in-Picture uses a separate document. Styles for that mode are embedded in the `DOCUMENT_PIP_STYLES` string inside `content.js`, not `content.css`. If visual changes affect both modes, update both `content.css` and `DOCUMENT_PIP_STYLES` where applicable.

The page-overlay player supports dragging from the header and resizing from the bottom-right handle. The Document PiP mode deliberately skips the resize handle and page-overlay drag listeners.

Controls auto-hide while the video is playing unless the user is scrubbing or navigating by keyboard. Preserve focus-visible behavior and the `prefers-reduced-motion` handling when changing controls.

## Caption Behavior

Caption detection order is:

1. Native `TextTrack` subtitles/captions on the selected video.
2. Visible page caption DOM, with special handling for YouTube caption segments.
3. The unavailable message.

Native caption tracks are switched to `hidden` so cues remain readable by script without showing the browser/site track UI inside the moved video. Original track modes are restored during cleanup.

`captionGap` means captions were previously detected but the current cue/page text is empty. The UI treats this differently from fully unavailable captions.

The fallback caption scanner intentionally excludes elements inside `#better-picture-root` to avoid reading Better Picture's own rendered subtitles.

## Adjacent Video Controls

Previous/next controls are best effort. `content.js` searches for exposed clickable controls with common selectors, including YouTube classes and `aria-label`/`title` patterns, then calls `.click()`. Buttons are disabled when no usable page control is currently found.

## Style and Naming Conventions

JavaScript uses plain browser APIs, `const`/`let`, async functions where needed, optional chaining, and two-space indentation. Functions are small and named for behavior (`findBestVideo`, `createMiniPlayer`, `syncTransportControls`).

CSS uses the `better-picture-` prefix for injected player classes and `popup__` BEM-style classes for popup UI. Keep injected-page CSS scoped to `#better-picture-root` or prefixed classes. The popup uses Inter font loaded from Google Fonts via a `<link>` tag in `popup.html`.

Accessibility patterns already present include `aria-label`, `aria-live`, native buttons, focus-visible outlines, keyboard shortcuts, and reduced-motion media queries. Preserve these patterns for new controls.

## Testing Approach

Run `npm test` for the automated Chromium extension test, then use syntax/config checks and manual browser verification for behavior not covered by the fixture.

Minimum manual checks after behavior changes:

1. Load the extension unpacked.
2. Serve and open `demo/index.html`.
3. Start the video and enable/open Better Picture from the popup.
4. Confirm a mini-player opens, the original video is docked, captions render from `demo/captions.vtt`, playback controls work, and closing restores the page video.
5. Reopen the popup on a restricted/internal page and confirm it reports that Better Picture cannot run instead of crashing.

For CSS or control-layout changes, verify both Document Picture-in-Picture and in-page fallback when possible. The fallback is easiest to exercise in a browser/version without Document Picture-in-Picture support or when `requestWindow()` fails.

## Non-Obvious Constraints

- Playwright is the only declared development dependency and is used exclusively for browser testing. The extension runtime remains dependency-free and unbundled.
- `manifest.json` now requests `tabs`, `activeTab`, and `scripting` permissions. The `tabs` permission enables cross-tab video scanning from the popup and background worker.
- The popup loads Inter font from Google Fonts via a `<link>` tag; this external resource requires network access from the popup page.
- `content_scripts.matches` is `<all_urls>`, so content-side code must tolerate arbitrary pages and missing/hostile media structures.
- Browser extension pages, Chrome Web Store pages, and browser internal pages will not accept content scripts; popup error handling should remain graceful.
- Some sites may reject moving protected/site-managed videos or hide captions in closed shadow DOM/canvas/private systems. The extension does not bypass those restrictions.
- The demo uses a remote MDN sample video and local WebVTT captions; the repository does not bundle video media.
