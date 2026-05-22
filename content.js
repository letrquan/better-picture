(() => {
if (globalThis.__BETTER_PICTURE_CONTENT_LOADED__) {
  return;
}

globalThis.__BETTER_PICTURE_CONTENT_LOADED__ = true;

const BETTER_PICTURE_MESSAGE_TYPES = {
  START: "BETTER_PICTURE_START",
  STOP: "BETTER_PICTURE_STOP",
  STATUS_REQUEST: "BETTER_PICTURE_STATUS_REQUEST"
};

const ROOT_ID = "better-picture-root";
const MIN_PLAYER_WIDTH = 260;
const MIN_PLAYER_HEIGHT = 160;
const CAPTION_POLL_MS = 120;
const YOUTUBE_CAPTION_SEGMENT_SELECTOR = ".ytp-caption-window-container .ytp-caption-segment";
const YOUTUBE_CAPTION_SELECTOR = [
  ".ytp-caption-window-container .caption-window",
  ".ytp-caption-window-container .captions-text",
  YOUTUBE_CAPTION_SEGMENT_SELECTOR
].join(",");
const CAPTION_SELECTOR = [
  "[class*='caption' i]",
  "[class*='subtitle' i]",
  "[class*='subtitles' i]",
  "[class*='cue' i]",
  "[id*='caption' i]",
  "[id*='subtitle' i]",
  ".ytp-caption-segment",
  ".vjs-text-track-display",
  ".jw-text-track-display"
].join(",");
const UNAVAILABLE_SUBTITLE_MESSAGE = "No captions detected. Turn on subtitles in the video player if available.";
const DOCUMENT_PIP_STYLES = `
  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: #0b0d12;
    color-scheme: dark;
  }

  #${ROOT_ID} {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    min-width: 0;
    min-height: 0;
    color: #f5f7fb;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-sizing: border-box;
  }

  #${ROOT_ID} *,
  #${ROOT_ID} *::before,
  #${ROOT_ID} *::after {
    box-sizing: border-box;
  }

  .better-picture-player {
    display: grid;
    grid-template-rows: auto 1fr;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #111318;
  }

  .better-picture-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 42px;
    padding: 7px 8px 7px 12px;
    border-bottom: 1px solid rgba(229, 231, 235, 0.12);
    background: rgba(24, 27, 34, 0.96);
    user-select: none;
  }

  .better-picture-title {
    overflow: hidden;
    color: #f5f7fb;
    font-size: 12px;
    font-weight: 820;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .better-picture-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .better-picture-button {
    min-width: 34px;
    min-height: 30px;
    border: 1px solid rgba(229, 231, 235, 0.14);
    border-radius: 10px;
    padding: 5px 10px;
    background: #20242d;
    color: #f5f7fb;
    font: inherit;
    font-size: 12px;
    font-weight: 760;
    line-height: 1;
    cursor: pointer;
  }

  .better-picture-button--play {
    min-width: 52px;
  }

  .better-picture-button--seek {
    min-width: 38px;
    padding-right: 8px;
    padding-left: 8px;
    font-variant-numeric: tabular-nums;
  }

  .better-picture-button:hover {
    border-color: rgba(255, 255, 255, 0.22);
    background: #2a303b;
  }

  .better-picture-button:active {
    transform: translateY(1px) scale(0.99);
  }

  .better-picture-button:focus-visible {
    outline: 3px solid rgba(96, 165, 250, 0.68);
    outline-offset: 2px;
  }

  .better-picture-button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .better-picture-button:disabled:hover {
    border-color: rgba(229, 231, 235, 0.14);
    background: #20242d;
  }

  .better-picture-stage {
    position: relative;
    min-height: 0;
    background: #0b0d12;
  }

  .better-picture-video {
    display: block;
    position: static !important;
    width: 100%;
    height: 100%;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain;
    background: #0b0d12;
    transform: none !important;
  }

  .better-picture-subtitles {
    position: absolute;
    right: 16px;
    bottom: clamp(10px, 3%, 18px);
    left: 16px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    max-height: 34%;
    overflow: hidden;
    pointer-events: none;
    color: #ffffff;
    font-family: "Segoe UI Variable", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
    font-size: clamp(10px, 2vw, 14px);
    font-weight: 720;
    letter-spacing: 0;
    line-height: 1.22;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
    white-space: pre-line;
  }

  .better-picture-subtitle-line {
    display: block;
    width: fit-content;
    max-width: min(82%, 520px);
    padding: 0.2em 0.52em 0.28em;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 7px;
    background: rgba(8, 10, 15, 0.72);
    box-decoration-break: clone;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.07);
    overflow-wrap: anywhere;
    -webkit-box-decoration-break: clone;
  }

  .better-picture-subtitles[data-subtitle-mode="unavailable"] {
    right: 16px;
    left: 16px;
    display: block;
    width: fit-content;
    max-width: calc(100% - 32px);
    margin: 0 auto;
    padding: 6px 9px;
    border: 1px solid rgba(229, 231, 235, 0.12);
    border-radius: 9px;
    background: rgba(24, 27, 34, 0.86);
    color: #c9d0dc;
    font-size: 11px;
    font-weight: 680;
    text-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .better-picture-button {
      transition: none;
    }
  }
`;

let betterPicture = null;

function isFiniteDuration(video) {
  return Number.isFinite(video.duration) && video.duration > 0;
}

function isVisibleVideo(video) {
  const rect = video.getBoundingClientRect();
  const style = window.getComputedStyle(video);

  return rect.width >= 80 &&
    rect.height >= 45 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0;
}

function scoreVideo(video) {
  const rect = video.getBoundingClientRect();
  let score = rect.width * rect.height;

  if (!video.paused) {
    score += 1000000;
  }

  if (isFiniteDuration(video)) {
    score += 200000;
  }

  if (video.currentTime > 0) {
    score += 100000;
  }

  return score;
}

function findBestVideo() {
  return Array.from(document.querySelectorAll("video"))
    .filter(isVisibleVideo)
    .sort((first, second) => scoreVideo(second) - scoreVideo(first))[0] || null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCaptionText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function formatCueText(cue) {
  if (!cue) {
    return "";
  }

  const rawText = typeof cue.text === "string" ? cue.text : "";
  return normalizeCaptionText(rawText.replace(/<[^>]*>/g, " "));
}

function getActiveCueText(track) {
  if (!track?.activeCues?.length) {
    return "";
  }

  return Array.from(track.activeCues)
    .map(formatCueText)
    .filter(Boolean)
    .join("\n");
}

function getCandidateTextTracks(video) {
  return Array.from(video.textTracks || []).filter((track) => {
    const kind = track.kind?.toLowerCase();
    return kind === "subtitles" || kind === "captions";
  });
}

function hasUsableTextTrack(video) {
  return getCandidateTextTracks(video).length > 0;
}

function isVisibleCaptionElement(element) {
  if (!element || element.closest(`#${ROOT_ID}`)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const text = normalizeCaptionText(element.textContent || "");

  return text.length >= 2 &&
    text.length <= 300 &&
    rect.width > 20 &&
    rect.height > 8 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0;
}

function findVisibleCaptionTextBySelector(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(isVisibleCaptionElement)
    .map((element) => normalizeCaptionText(element.textContent || ""))
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)[0] || "";
}

function isCaptionElementCandidate(element) {
  if (!element || element.closest(`#${ROOT_ID}`)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const text = normalizeCaptionText(element.textContent || "");

  return text.length >= 2 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0;
}

function getCaptionElementText(element) {
  return normalizeCaptionText(element.textContent || "");
}

function findYouTubeCaptionText() {
  const segmentText = Array.from(document.querySelectorAll(YOUTUBE_CAPTION_SEGMENT_SELECTOR))
    .filter((element) => element && !element.closest(`#${ROOT_ID}`))
    .map(getCaptionElementText)
    .filter(Boolean)
    .join(" ");

  if (segmentText) {
    return normalizeCaptionText(segmentText);
  }

  return Array.from(document.querySelectorAll(YOUTUBE_CAPTION_SELECTOR))
    .filter(isCaptionElementCandidate)
    .map(getCaptionElementText)
    .filter(Boolean)
    .join("\n");
}

function findVisibleCaptionSegmentsText(selector) {
  const text = Array.from(document.querySelectorAll(selector))
    .filter(isCaptionElementCandidate)
    .map((element) => normalizeCaptionText(element.textContent || ""))
    .filter(Boolean)
    .join(" ");

  return normalizeCaptionText(text);
}

function findVisibleCaptionText() {
  return findYouTubeCaptionText() ||
    findVisibleCaptionSegmentsText(YOUTUBE_CAPTION_SEGMENT_SELECTOR) ||
    findVisibleCaptionTextBySelector(YOUTUBE_CAPTION_SELECTOR) ||
    findVisibleCaptionTextBySelector(CAPTION_SELECTOR);
}

function renderSubtitleText(subtitleLayer, text, mode) {
  const normalizedText = normalizeCaptionText(text || "");
  subtitleLayer.replaceChildren();
  subtitleLayer.dataset.subtitleMode = mode;

  if (!normalizedText) {
    subtitleLayer.textContent = mode === "captionGap" ? "" : UNAVAILABLE_SUBTITLE_MESSAGE;
    return;
  }

  if (mode === "unavailable") {
    subtitleLayer.textContent = UNAVAILABLE_SUBTITLE_MESSAGE;
    return;
  }

  const lines = text
    .split(/\n+/)
    .map(normalizeCaptionText)
    .filter(Boolean);

  const fragment = subtitleLayer.ownerDocument.createDocumentFragment();

  lines.forEach((line) => {
    const lineElement = subtitleLayer.ownerDocument.createElement("span");
    lineElement.className = "better-picture-subtitle-line";
    lineElement.textContent = line;
    fragment.append(lineElement);
  });

  subtitleLayer.append(fragment);
}

function createSubtitleController(video, subtitleLayer) {
  const tracks = getCandidateTextTracks(video);
  const listeners = [];
  const originalTrackModes = new Map();
  let fallbackInterval = 0;
  let mode = "unavailable";
  let hasDetectedCaption = false;

  const render = (text, nextMode) => {
    const normalizedText = normalizeCaptionText(text || "");

    if (normalizedText && nextMode !== "unavailable") {
      hasDetectedCaption = true;
    }

    mode = !normalizedText && hasDetectedCaption ? "captionGap" : nextMode;
    renderSubtitleText(subtitleLayer, text, mode);
  };

  const renderTextTracks = () => {
    const text = tracks
      .map(getActiveCueText)
      .filter(Boolean)
      .join("\n");

    if (text) {
      render(text, "textTrack");
      return;
    }

    const fallbackText = findVisibleCaptionText();
    render(fallbackText, fallbackText ? "captionDom" : "unavailable");
  };

  if (tracks.length > 0) {
    tracks.forEach((track) => {
      originalTrackModes.set(track, track.mode);

      if (track.mode !== "hidden") {
        track.mode = "hidden";
      }

      track.addEventListener("cuechange", renderTextTracks);
      listeners.push(() => track.removeEventListener("cuechange", renderTextTracks));
    });

    video.addEventListener("timeupdate", renderTextTracks);
    video.addEventListener("seeked", renderTextTracks);
    listeners.push(() => video.removeEventListener("timeupdate", renderTextTracks));
    listeners.push(() => video.removeEventListener("seeked", renderTextTracks));
    renderTextTracks();
  } else {
    const renderFallback = () => {
      const text = findVisibleCaptionText();
      render(text, text ? "captionDom" : "unavailable");
    };

    fallbackInterval = window.setInterval(renderFallback, CAPTION_POLL_MS);
    renderFallback();
  }

  return {
    getMode() {
      return mode;
    },
    cleanup() {
      listeners.forEach((removeListener) => removeListener());
      originalTrackModes.forEach((trackMode, track) => {
        track.mode = trackMode;
      });

      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
      }
    }
  };
}

function setImportantStyle(element, property, value) {
  element.style.setProperty(property, value, "important");
}

function dockSourceVideo(video, stage) {
  const parent = video.parentNode;
  const placeholder = document.createComment("better-picture-source-video");
  const originalStyle = video.getAttribute("style");
  const originalDisablePictureInPicture = video.disablePictureInPicture;
  const hadBetterPictureClass = video.classList.contains("better-picture-video");

  if (parent) {
    parent.insertBefore(placeholder, video);
  }

  video.classList.add("better-picture-video");
  video.disablePictureInPicture = true;
  setImportantStyle(video, "display", "block");
  setImportantStyle(video, "position", "static");
  setImportantStyle(video, "inset", "auto");
  setImportantStyle(video, "width", "100%");
  setImportantStyle(video, "height", "100%");
  setImportantStyle(video, "max-width", "none");
  setImportantStyle(video, "max-height", "none");
  setImportantStyle(video, "object-fit", "contain");
  setImportantStyle(video, "transform", "none");
  setImportantStyle(video, "background", "#0b0d12");
  stage.prepend(video);

  return {
    cleanup() {
      if (parent?.isConnected) {
        if (placeholder.parentNode) {
          parent.insertBefore(video, placeholder);
          placeholder.remove();
        } else {
          parent.append(video);
        }
      } else {
        video.remove();
      }

      if (!hadBetterPictureClass) {
        video.classList.remove("better-picture-video");
      }
      video.disablePictureInPicture = originalDisablePictureInPicture;

      if (originalStyle === null) {
        video.removeAttribute("style");
      } else {
        video.setAttribute("style", originalStyle);
      }
    }
  };
}

function getSeekBounds(video) {
  if (isFiniteDuration(video)) {
    return {
      start: 0,
      end: video.duration
    };
  }

  const seekable = video.seekable;

  if (!seekable?.length) {
    return null;
  }

  const start = seekable.start(0);
  const end = seekable.end(seekable.length - 1);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return { start, end };
}

function seekVideoBy(video, seconds) {
  const bounds = getSeekBounds(video);

  if (!bounds) {
    return false;
  }

  video.currentTime = clamp(video.currentTime + seconds, bounds.start, bounds.end);
  return true;
}

function isEditableTarget(target) {
  return Boolean(target?.isContentEditable) ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName);
}

function createMiniPlayer(video, options = {}) {
  const hostDocument = options.document || document;
  const hostWindow = options.window || window;
  const isDocumentPip = options.mode === "documentPip";
  const root = hostDocument.createElement("section");
  root.id = ROOT_ID;
  root.setAttribute("aria-label", "Better Picture mini-player");

  const player = hostDocument.createElement("div");
  player.className = "better-picture-player";

  const header = hostDocument.createElement("div");
  header.className = "better-picture-header";

  const title = hostDocument.createElement("div");
  title.className = "better-picture-title";
  title.textContent = isDocumentPip ? "Better Picture - External" : "Better Picture";

  const controls = hostDocument.createElement("div");
  controls.className = "better-picture-controls";

  const backButton = hostDocument.createElement("button");
  backButton.className = "better-picture-button better-picture-button--seek";
  backButton.type = "button";
  backButton.textContent = "-10";
  backButton.title = "Back 10 seconds";
  backButton.setAttribute("aria-label", "Back 10 seconds");

  const playButton = hostDocument.createElement("button");
  playButton.className = "better-picture-button better-picture-button--play";
  playButton.type = "button";

  const forwardButton = hostDocument.createElement("button");
  forwardButton.className = "better-picture-button better-picture-button--seek";
  forwardButton.type = "button";
  forwardButton.textContent = "+10";
  forwardButton.title = "Forward 10 seconds";
  forwardButton.setAttribute("aria-label", "Forward 10 seconds");

  const closeButton = hostDocument.createElement("button");
  closeButton.className = "better-picture-button";
  closeButton.type = "button";
  closeButton.textContent = "X";
  closeButton.setAttribute("aria-label", "Close Better Picture");

  const stage = hostDocument.createElement("div");
  stage.className = "better-picture-stage";

  const subtitleLayer = hostDocument.createElement("div");
  subtitleLayer.className = "better-picture-subtitles";
  subtitleLayer.textContent = UNAVAILABLE_SUBTITLE_MESSAGE;
  subtitleLayer.dataset.subtitleMode = "unavailable";

  const resizeHandle = hostDocument.createElement("div");
  resizeHandle.className = "better-picture-resize";
  resizeHandle.setAttribute("aria-hidden", "true");

  controls.append(backButton, playButton, forwardButton, closeButton);
  header.append(title, controls);
  stage.append(subtitleLayer);
  player.append(header, stage);

  if (!isDocumentPip) {
    player.append(resizeHandle);
  }

  root.append(player);
  (hostDocument.body || hostDocument.documentElement).append(root);

  const dockController = dockSourceVideo(video, stage);

  const syncTransportControls = () => {
    const bounds = getSeekBounds(video);
    const canSeek = Boolean(bounds);

    playButton.textContent = video.paused ? "Play" : "Pause";
    playButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    backButton.disabled = !canSeek || video.currentTime <= bounds.start + 0.25;
    forwardButton.disabled = !canSeek || video.currentTime >= bounds.end - 0.25;
  };

  const onPlayPauseClick = () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const onBackClick = () => {
    seekVideoBy(video, -10);
    syncTransportControls();
  };

  const onForwardClick = () => {
    seekVideoBy(video, 10);
    syncTransportControls();
  };

  const onCloseClick = () => stopBetterPicture();

  const onKeyDown = (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "Escape") {
      stopBetterPicture();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onBackClick();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onForwardClick();
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      onPlayPauseClick();
    }
  };

  const dragState = {
    dragging: false,
    offsetX: 0,
    offsetY: 0
  };

  const onHeaderPointerDown = (event) => {
    if (event.target.closest("button")) {
      return;
    }

    const rect = root.getBoundingClientRect();
    dragState.dragging = true;
    dragState.offsetX = event.clientX - rect.left;
    dragState.offsetY = event.clientY - rect.top;
    header.setPointerCapture(event.pointerId);
  };

  const onHeaderPointerMove = (event) => {
    if (!dragState.dragging) {
      return;
    }

    const nextLeft = clamp(event.clientX - dragState.offsetX, 8, hostWindow.innerWidth - root.offsetWidth - 8);
    const nextTop = clamp(event.clientY - dragState.offsetY, 8, hostWindow.innerHeight - root.offsetHeight - 8);
    root.style.left = `${nextLeft}px`;
    root.style.top = `${nextTop}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
  };

  const onHeaderPointerUp = (event) => {
    dragState.dragging = false;
    header.releasePointerCapture(event.pointerId);
  };

  const resizeState = {
    resizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  };

  const onResizePointerDown = (event) => {
    const rect = root.getBoundingClientRect();
    resizeState.resizing = true;
    resizeState.startX = event.clientX;
    resizeState.startY = event.clientY;
    resizeState.startWidth = rect.width;
    resizeState.startHeight = rect.height;
    resizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onResizePointerMove = (event) => {
    if (!resizeState.resizing) {
      return;
    }

    const maxWidth = Math.max(MIN_PLAYER_WIDTH, hostWindow.innerWidth - 16);
    const maxHeight = Math.max(MIN_PLAYER_HEIGHT, hostWindow.innerHeight - 16);
    const nextWidth = resizeState.startWidth + event.clientX - resizeState.startX;
    const nextHeight = resizeState.startHeight + event.clientY - resizeState.startY;

    root.style.width = `${clamp(nextWidth, MIN_PLAYER_WIDTH, maxWidth)}px`;
    root.style.height = `${clamp(nextHeight, MIN_PLAYER_HEIGHT, maxHeight)}px`;
  };

  const onResizePointerUp = (event) => {
    resizeState.resizing = false;
    resizeHandle.releasePointerCapture(event.pointerId);
  };

  backButton.addEventListener("click", onBackClick);
  playButton.addEventListener("click", onPlayPauseClick);
  forwardButton.addEventListener("click", onForwardClick);
  closeButton.addEventListener("click", onCloseClick);
  hostDocument.addEventListener("keydown", onKeyDown);

  if (!isDocumentPip) {
    header.addEventListener("pointerdown", onHeaderPointerDown);
    header.addEventListener("pointermove", onHeaderPointerMove);
    header.addEventListener("pointerup", onHeaderPointerUp);
    header.addEventListener("pointercancel", onHeaderPointerUp);
    resizeHandle.addEventListener("pointerdown", onResizePointerDown);
    resizeHandle.addEventListener("pointermove", onResizePointerMove);
    resizeHandle.addEventListener("pointerup", onResizePointerUp);
    resizeHandle.addEventListener("pointercancel", onResizePointerUp);
  }

  const syncEvents = ["play", "pause", "timeupdate", "seeked", "loadedmetadata", "durationchange"];
  syncEvents.forEach((eventName) => video.addEventListener(eventName, syncTransportControls));

  const subtitleController = createSubtitleController(video, subtitleLayer);
  syncTransportControls();

  return {
    root,
    video,
    subtitleLayer,
    displayMode: isDocumentPip ? "documentPip" : "pageOverlay",
    getSubtitleMode() {
      return subtitleController.getMode();
    },
    cleanup() {
      subtitleController.cleanup();
      syncEvents.forEach((eventName) => video.removeEventListener(eventName, syncTransportControls));
      backButton.removeEventListener("click", onBackClick);
      playButton.removeEventListener("click", onPlayPauseClick);
      forwardButton.removeEventListener("click", onForwardClick);
      closeButton.removeEventListener("click", onCloseClick);
      hostDocument.removeEventListener("keydown", onKeyDown);

      if (!isDocumentPip) {
        header.removeEventListener("pointerdown", onHeaderPointerDown);
        header.removeEventListener("pointermove", onHeaderPointerMove);
        header.removeEventListener("pointerup", onHeaderPointerUp);
        header.removeEventListener("pointercancel", onHeaderPointerUp);
        resizeHandle.removeEventListener("pointerdown", onResizePointerDown);
        resizeHandle.removeEventListener("pointermove", onResizePointerMove);
        resizeHandle.removeEventListener("pointerup", onResizePointerUp);
        resizeHandle.removeEventListener("pointercancel", onResizePointerUp);
      }

      dockController.cleanup();
      root.remove();
    }
  };
}

function canUseDocumentPip() {
  return Boolean(window.documentPictureInPicture?.requestWindow);
}

function prepareDocumentPipDocument(pipWindow) {
  const pipDocument = pipWindow.document;
  pipDocument.title = "Better Picture";

  const style = pipDocument.createElement("style");
  style.textContent = DOCUMENT_PIP_STYLES;
  pipDocument.head.append(style);

  return pipDocument;
}

function getDocumentPipSize(video) {
  const rect = video.getBoundingClientRect();
  const width = clamp(Math.round(rect.width || 420), MIN_PLAYER_WIDTH, 640);
  const videoRatio = rect.width > 0 && rect.height > 0 ? rect.height / rect.width : 9 / 16;
  const height = clamp(Math.round(width * videoRatio + 42), MIN_PLAYER_HEIGHT + 8, 420);

  return { width, height };
}

async function createDocumentPipMiniPlayer(video) {
  const pipWindow = await window.documentPictureInPicture.requestWindow(getDocumentPipSize(video));
  const pipDocument = prepareDocumentPipDocument(pipWindow);
  const miniPlayer = createMiniPlayer(video, {
    document: pipDocument,
    window: pipWindow,
    mode: "documentPip"
  });

  let cleaningUp = false;
  const onPageHide = () => {
    if (!cleaningUp) {
      stopBetterPicture();
    }
  };

  pipWindow.addEventListener("pagehide", onPageHide);

  return {
    ...miniPlayer,
    displayMode: "documentPip",
    cleanup() {
      cleaningUp = true;
      pipWindow.removeEventListener("pagehide", onPageHide);
      miniPlayer.cleanup();

      if (!pipWindow.closed) {
        pipWindow.close();
      }
    }
  };
}

async function startBetterPicture() {
  if (betterPicture) {
    return getStatus();
  }

  const video = findBestVideo();

  if (!video) {
    return getStatus();
  }

  if (canUseDocumentPip()) {
    try {
      betterPicture = await createDocumentPipMiniPlayer(video);
      return getStatus();
    } catch (error) {
      console.info("Better Picture could not open Document Picture-in-Picture. Falling back to the in-page player.", error);
    }
  }

  betterPicture = createMiniPlayer(video);
  return getStatus();
}

function stopBetterPicture() {
  if (betterPicture) {
    betterPicture.cleanup();
    betterPicture = null;
  }

  return getStatus();
}

function getStatus() {
  const video = betterPicture?.video || findBestVideo();
  const subtitleMode = betterPicture?.getSubtitleMode() || (video && hasUsableTextTrack(video) ? "textTrack" : "unavailable");

  return {
    hasVideo: Boolean(video),
    isRunning: Boolean(betterPicture),
    displayMode: betterPicture?.displayMode || "none",
    subtitleMode
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) {
    return false;
  }

  if (message.type === BETTER_PICTURE_MESSAGE_TYPES.START) {
    startBetterPicture()
      .then(sendResponse)
      .catch((error) => {
        console.error("Better Picture could not start.", error);
        sendResponse(getStatus());
      });
    return true;
  }

  if (message.type === BETTER_PICTURE_MESSAGE_TYPES.STOP) {
    sendResponse(stopBetterPicture());
    return true;
  }

  if (message.type === BETTER_PICTURE_MESSAGE_TYPES.STATUS_REQUEST) {
    sendResponse(getStatus());
    return true;
  }

  return false;
});
})();
