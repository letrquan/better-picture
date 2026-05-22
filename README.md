# Better Picture

Better Picture is a Chromium extension for Chrome and Microsoft Edge that mimics Picture-in-Picture with a custom floating mini-player. It is designed to keep subtitles visible when browser-native Picture-in-Picture does not include page captions.

## Features

- Detects the best visible video on the current page.
- Starts and stops from the extension toolbar popup.
- Opens a Document Picture-in-Picture mini-player outside the browser window when supported.
- Falls back to a draggable and resizable in-page mini-player when the browser blocks external PiP.
- Temporarily docks the active page video into the mini-player so streaming sites such as YouTube do not need a duplicated media stream.
- Renders subtitles from native HTML5 subtitle/caption tracks when available.
- Falls back to visible-caption DOM scanning, including YouTube caption containers, when native tracks are not exposed.
- Shows a clear message when captions cannot be detected.

## Install in Chrome or Edge

1. Open the browser extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select this project folder.
5. Pin **Better Picture** to the toolbar if you want quick access.

## Usage

1. Open a web page with a video.
2. Turn on captions/subtitles in the page video player when the site requires it.
3. Click the **Better Picture** toolbar icon.
4. Choose **Start mini-player**.
5. Use the mini-player controls:
   - **-10** jumps back 10 seconds.
   - **Play/Pause** controls the active page video.
   - **+10** jumps forward 10 seconds.
   - **X** closes Better Picture.
   - `ArrowLeft` and `ArrowRight` also jump back/forward 10 seconds while Better Picture is running.
   - `Space` toggles play/pause while Better Picture is running.
   - Drag the external Picture-in-Picture window outside the browser when Chrome or Edge opens it.
   - When the page fallback is used, drag the header to move the mini-player and drag the bottom-right corner to resize it.
   - Press `Escape` to close it.

## Subtitle support

Better Picture tries subtitle sources in this order:

1. Native `TextTrack` subtitles or captions from the selected `video` element.
2. Visible caption text from likely caption containers on the page.
3. A fallback unavailable message when no subtitle text can be detected.

Some streaming sites use DRM, canvas rendering, closed shadow DOM, or private caption systems. Better Picture does not bypass those restrictions, so captions may not be available on every site.

## Local demo

A lightweight demo is included in `demo/index.html` with local WebVTT captions in `demo/captions.vtt`.

To test it:

1. Load the unpacked extension.
2. Open `demo/index.html` in Chrome or Edge.
3. Start playing the video.
4. Open the Better Picture popup and click **Start mini-player**.
5. Confirm that the floating mini-player appears and displays the demo captions.
6. Try play/pause, drag, resize, close, and repeated start/stop actions.

The demo uses a public remote sample video from MDN and does not bundle copyrighted media.

## Known limitations

- Protected or site-managed videos may reject being moved into the custom mini-player.
- Chrome or Edge may require a fresh user gesture before opening the external Picture-in-Picture window, in which case Better Picture falls back to the in-page mini-player.
- Site-specific caption systems can prevent subtitle extraction.
- The visible-caption fallback is intentionally conservative to avoid showing unrelated page text.
- Browser extension pages, the Chrome Web Store, and some internal pages do not allow content scripts.

## Project structure

```text
better-picture/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── content.css
├── background.js
├── demo/
│   ├── index.html
│   └── captions.vtt
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
