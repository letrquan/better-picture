# Better Picture

Better Picture is a Chromium extension for Chrome and Microsoft Edge. It creates a compact floating mini-player for the active page video, with subtitle support and focused controls for watching while you work in another window or tab.

The extension is built for sites where browser-native Picture-in-Picture is too limited, especially when captions disappear or when you want a small YouTube-style player with seek, volume, and skip controls.

## What It Does

- Finds the best visible video on the current page.
- Opens an external Document Picture-in-Picture window when the browser supports it.
- Falls back to a draggable, resizable in-page mini-player when external PiP is unavailable.
- Moves the original page video into the mini-player instead of creating a second media stream.
- Keeps the video responsive and contained when sites change source, size, or player styles.
- Shows captions from native subtitle/caption tracks when available.
- Falls back to visible caption text on the page, including YouTube caption containers.
- Provides a clean icon toolbar with play/pause, seek, volume, 10-second jumps, previous video, and next video.

## Install

1. Open your browser extension page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select this project folder.
5. Pin **Better Picture** to the toolbar for quick access.

## Use

1. Open a page with a video.
2. Turn on captions/subtitles in the page player if you want captions.
3. Click the **Better Picture** toolbar icon.
4. Choose **Start mini-player**.
5. Use the floating player controls.

## Mini-Player Controls

The top-right button closes the mini-player. The bottom toolbar contains the active playback controls:

| Control | Action |
| --- | --- |
| Previous | Clicks the page's previous-video control when one is available. |
| Back 10 | Jumps back 10 seconds. |
| Play/Pause | Controls the active page video. |
| Timeline | Drag to seek anywhere in the video. |
| Time | Shows current time and duration. |
| Forward 10 | Jumps forward 10 seconds. |
| Next | Clicks the page's next-video control when one is available. |
| Volume | Mute/unmute or adjust volume. |

Keyboard shortcuts while Better Picture is running:

| Shortcut | Action |
| --- | --- |
| `Space` | Play or pause. |
| `ArrowLeft` | Back 10 seconds. |
| `ArrowRight` | Forward 10 seconds. |
| `ArrowUp` | Raise volume. |
| `ArrowDown` | Lower volume. |
| `M` | Mute or unmute. |
| `Escape` | Close Better Picture. |

When the page fallback player is used, drag the top overlay area to move it and drag the bottom-right corner to resize it.

## Subtitle Support

Better Picture checks subtitle sources in this order:

1. Native `TextTrack` subtitles or captions on the selected `video` element.
2. Visible caption text from likely caption containers on the page.
3. A clear unavailable message when no caption text can be detected.

Some sites use DRM, canvas rendering, closed shadow DOM, or private caption systems. Better Picture does not bypass those restrictions, so captions are not guaranteed on every site.

## Previous and Next Video Support

Previous and next are best-effort controls. Better Picture looks for clickable previous/next controls exposed by the page, including common YouTube player buttons. If no matching control is available, those buttons stay disabled.

## Local Demo

A lightweight demo is included in `demo/index.html` with WebVTT captions in `demo/captions.vtt`.

To test it:

1. Load the unpacked extension.
2. Start a local server from this folder:

   ```powershell
   python -m http.server 8765 --bind 127.0.0.1
   ```

3. Open `http://127.0.0.1:8765/demo/index.html`.
4. Start the video.
5. Open the Better Picture popup and click **Start mini-player**.
6. Confirm the floating player opens, stays responsive, and shows the demo captions.

The demo uses a public remote sample video from MDN and does not bundle copyrighted media.

## Development Checks

Run these lightweight checks after editing:

```powershell
node --check content.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest json ok')"
```

## Project Structure

```text
better-picture/
|-- manifest.json
|-- popup.html
|-- popup.css
|-- popup.js
|-- content.js
|-- content.css
|-- background.js
|-- demo/
|   |-- index.html
|   `-- captions.vtt
`-- icons/
    |-- icon16.png
    |-- icon48.png
    `-- icon128.png
```

## Known Limitations

- Protected or site-managed videos may reject being moved into the custom mini-player.
- Chrome or Edge may require a fresh user gesture before opening the external Picture-in-Picture window.
- Site-specific caption systems can prevent subtitle extraction.
- Previous and next controls depend on the page exposing clickable controls.
- Browser extension pages, the Chrome Web Store, and some internal pages do not allow content scripts.
