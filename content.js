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

const SVG_NS = "http://www.w3.org/2000/svg";
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
const ADJACENT_VIDEO_CONTROL_SELECTORS = {
  previous: [
    ".ytp-prev-button",
    "button[aria-label*='Previous' i]",
    "button[aria-label*='Prev' i]",
    "button[title*='Previous' i]",
    "button[title*='Prev' i]",
    "[role='button'][aria-label*='Previous' i]",
    "[role='button'][aria-label*='Prev' i]"
  ],
  next: [
    ".ytp-next-button",
    "button[aria-label*='Next' i]",
    "button[title*='Next' i]",
    "[role='button'][aria-label*='Next' i]"
  ]
};
const UNAVAILABLE_SUBTITLE_MESSAGE = "No captions detected. Turn on subtitles in the video player if available.";
const BUTTON_ICONS = {
  play: {
    paths: [
      { d: "M8 5v14l11-7z", fill: "currentColor", stroke: "none" }
    ]
  },
  pause: {
    paths: [
      { d: "M7 5h3v14H7zM14 5h3v14h-3z", fill: "currentColor", stroke: "none" }
    ]
  },
  close: {
    paths: [
      { d: "M6 6l12 12M18 6L6 18" }
    ]
  },
  previous: {
    paths: [
      { d: "M6 5v14" },
      { d: "M18 6l-9 6 9 6z", fill: "currentColor", stroke: "none" }
    ]
  },
  next: {
    paths: [
      { d: "M18 5v14" },
      { d: "M6 6l9 6-9 6z", fill: "currentColor", stroke: "none" }
    ]
  },
  rewind10: {
    paths: [
      { d: "M9 7H4V2" },
      { d: "M5 7a8 8 0 1 1-1.7 8.1" }
    ],
    text: { x: "8", y: "16", value: "10" }
  },
  forward10: {
    paths: [
      { d: "M15 7h5V2" },
      { d: "M19 7a8 8 0 1 0 1.7 8.1" }
    ],
    text: { x: "8", y: "16", value: "10" }
  },
  volume: {
    paths: [
      { d: "M4 10v4h4l5 4V6l-5 4H4z", fill: "currentColor", stroke: "none" },
      { d: "M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" }
    ]
  },
  muted: {
    paths: [
      { d: "M4 10v4h4l5 4V6l-5 4H4z", fill: "currentColor", stroke: "none" },
      { d: "M17 9l4 6M21 9l-4 6" }
    ]
  }
};
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
    position: relative;
    display: grid;
    grid-template-rows: 1fr;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #111318;
  }

  .better-picture-header {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    min-height: 48px;
    padding: 8px;
    background: linear-gradient(to bottom, rgba(8, 10, 15, 0.72), rgba(8, 10, 15, 0));
    user-select: none;
  }

  .better-picture-title {
    display: none;
  }

  .better-picture-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .better-picture-button {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 30px;
    min-width: 34px;
    min-height: 30px;
    border: 1px solid rgba(229, 231, 235, 0.14);
    border-radius: 999px;
    padding: 0;
    background: #20242d;
    color: #f5f7fb;
    font: inherit;
    font-size: 12px;
    font-weight: 760;
    line-height: 1;
    cursor: pointer;
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
    min-width: 0;
    overflow: hidden;
    background: #0b0d12;
  }

  .better-picture-icon {
    display: block;
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  .better-picture-icon text {
    fill: currentColor;
    stroke: none;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 0;
  }

  .better-picture-video {
    display: block;
    position: static !important;
    width: 100%;
    height: 100%;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain;
    object-position: center center;
    background: #0b0d12;
    transform: none !important;
  }

  .better-picture-subtitles {
    position: absolute;
    right: 16px;
    bottom: clamp(54px, 18%, 78px);
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

  .better-picture-controlbar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: auto auto auto minmax(46px, 1fr) auto auto auto auto minmax(44px, 64px);
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 9px 10px 10px;
    background: linear-gradient(to top, rgba(8, 10, 15, 0.94), rgba(8, 10, 15, 0.44));
  }

  .better-picture-time {
    min-width: 64px;
    color: #e5e7eb;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
  }

  .better-picture-range {
    width: 100%;
    min-width: 0;
    accent-color: #f5f7fb;
    cursor: pointer;
  }

  .better-picture-range:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .better-picture-button--compact {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
  }

  .better-picture-volume {
    width: 64px;
  }

  @media (max-width: 380px) {
    .better-picture-controlbar {
      grid-template-columns: auto auto auto minmax(42px, 1fr) auto auto auto;
      gap: 6px;
    }

    .better-picture-time {
      min-width: 54px;
      font-size: 10px;
    }

    .better-picture-button--mute,
    .better-picture-volume {
      display: none;
    }
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

function applyDockedVideoFit(video) {
  video.controls = false;
  setImportantStyle(video, "display", "block");
  setImportantStyle(video, "position", "static");
  setImportantStyle(video, "inset", "auto");
  setImportantStyle(video, "width", "100%");
  setImportantStyle(video, "height", "100%");
  setImportantStyle(video, "min-width", "0");
  setImportantStyle(video, "min-height", "0");
  setImportantStyle(video, "max-width", "none");
  setImportantStyle(video, "max-height", "none");
  setImportantStyle(video, "object-fit", "contain");
  setImportantStyle(video, "object-position", "center center");
  setImportantStyle(video, "transform", "none");
  setImportantStyle(video, "background", "#0b0d12");
}

function createVideoFitController(video, stage, hostWindow = window) {
  let animationFrame = 0;
  let isApplying = false;
  let resizeObserver = null;

  const apply = () => {
    animationFrame = 0;
    isApplying = true;
    applyDockedVideoFit(video);
    stage.style.setProperty("min-width", "0");
    stage.style.setProperty("min-height", "0");
    stage.style.setProperty("overflow", "hidden");
    isApplying = false;
  };

  const scheduleApply = () => {
    if (animationFrame) {
      return;
    }

    animationFrame = hostWindow.requestAnimationFrame(apply);
  };

  const Observer = hostWindow.MutationObserver || MutationObserver;
  const observer = new Observer(() => {
    if (!isApplying) {
      scheduleApply();
    }
  });

  observer.observe(video, {
    attributes: true,
    attributeFilter: ["class", "controls", "height", "style", "width"]
  });

  const fitEvents = ["loadedmetadata", "loadeddata", "durationchange", "emptied", "resize"];
  fitEvents.forEach((eventName) => video.addEventListener(eventName, scheduleApply));

  if (hostWindow.ResizeObserver) {
    resizeObserver = new hostWindow.ResizeObserver(scheduleApply);
    resizeObserver.observe(stage);
  }

  apply();

  return {
    cleanup() {
      if (animationFrame) {
        hostWindow.cancelAnimationFrame(animationFrame);
      }

      observer.disconnect();
      resizeObserver?.disconnect();
      fitEvents.forEach((eventName) => video.removeEventListener(eventName, scheduleApply));
    }
  };
}

function dockSourceVideo(video, stage) {
  const parent = video.parentNode;
  const placeholder = document.createComment("better-picture-source-video");
  const originalStyle = video.getAttribute("style");
  const originalControls = video.controls;
  const originalDisablePictureInPicture = video.disablePictureInPicture;
  const hadBetterPictureClass = video.classList.contains("better-picture-video");

  if (parent) {
    parent.insertBefore(placeholder, video);
  }

  video.classList.add("better-picture-video");
  video.disablePictureInPicture = true;
  applyDockedVideoFit(video);
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
      video.controls = originalControls;

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

function isUsableAdjacentVideoControl(element) {
  if (!element || element.closest(`#${ROOT_ID}`)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0 &&
    !element.disabled &&
    element.getAttribute("aria-disabled") !== "true";
}

function findAdjacentVideoControl(direction) {
  const selectors = ADJACENT_VIDEO_CONTROL_SELECTORS[direction] || [];

  for (const selector of selectors) {
    const control = Array.from(document.querySelectorAll(selector)).find(isUsableAdjacentVideoControl);

    if (control) {
      return control;
    }
  }

  return null;
}

function triggerAdjacentVideo(direction) {
  const control = findAdjacentVideoControl(direction);

  if (!control) {
    return false;
  }

  control.click();
  return true;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const roundedSeconds = Math.floor(seconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const remainingSeconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function createIcon(documentContext, iconName) {
  const icon = BUTTON_ICONS[iconName];
  const svg = documentContext.createElementNS(SVG_NS, "svg");
  svg.classList.add("better-picture-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  icon.paths.forEach((pathDefinition) => {
    const path = documentContext.createElementNS(SVG_NS, "path");

    Object.entries(pathDefinition).forEach(([attribute, value]) => {
      path.setAttribute(attribute, value);
    });

    svg.append(path);
  });

  if (icon.text) {
    const text = documentContext.createElementNS(SVG_NS, "text");
    text.setAttribute("x", icon.text.x);
    text.setAttribute("y", icon.text.y);
    text.textContent = icon.text.value;
    svg.append(text);
  }

  return svg;
}

function setButtonIcon(button, iconName, label) {
  if (button.dataset.iconName !== iconName) {
    button.replaceChildren(createIcon(button.ownerDocument, iconName));
    button.dataset.iconName = iconName;
  }

  button.title = label;
  button.setAttribute("aria-label", label);
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
  title.textContent = "";

  const controls = hostDocument.createElement("div");
  controls.className = "better-picture-controls";

  const previousButton = hostDocument.createElement("button");
  previousButton.className = "better-picture-button better-picture-button--compact better-picture-button--adjacent";
  previousButton.type = "button";
  setButtonIcon(previousButton, "previous", "Previous video");

  const backButton = hostDocument.createElement("button");
  backButton.className = "better-picture-button better-picture-button--compact better-picture-button--seek";
  backButton.type = "button";
  setButtonIcon(backButton, "rewind10", "Back 10 seconds");

  const playButton = hostDocument.createElement("button");
  playButton.className = "better-picture-button better-picture-button--compact better-picture-button--play";
  playButton.type = "button";

  const forwardButton = hostDocument.createElement("button");
  forwardButton.className = "better-picture-button better-picture-button--compact better-picture-button--seek";
  forwardButton.type = "button";
  setButtonIcon(forwardButton, "forward10", "Forward 10 seconds");

  const nextButton = hostDocument.createElement("button");
  nextButton.className = "better-picture-button better-picture-button--compact better-picture-button--adjacent";
  nextButton.type = "button";
  setButtonIcon(nextButton, "next", "Next video");

  const closeButton = hostDocument.createElement("button");
  closeButton.className = "better-picture-button";
  closeButton.type = "button";
  setButtonIcon(closeButton, "close", "Close Better Picture");

  const stage = hostDocument.createElement("div");
  stage.className = "better-picture-stage";

  const subtitleLayer = hostDocument.createElement("div");
  subtitleLayer.className = "better-picture-subtitles";
  subtitleLayer.textContent = UNAVAILABLE_SUBTITLE_MESSAGE;
  subtitleLayer.dataset.subtitleMode = "unavailable";

  const controlBar = hostDocument.createElement("div");
  controlBar.className = "better-picture-controlbar";

  const seekRange = hostDocument.createElement("input");
  seekRange.className = "better-picture-range better-picture-seekbar";
  seekRange.type = "range";
  seekRange.min = "0";
  seekRange.max = "1";
  seekRange.step = "0.1";
  seekRange.value = "0";
  seekRange.setAttribute("aria-label", "Seek video");

  const timeLabel = hostDocument.createElement("div");
  timeLabel.className = "better-picture-time";
  timeLabel.textContent = "--:-- / --:--";

  const muteButton = hostDocument.createElement("button");
  muteButton.className = "better-picture-button better-picture-button--compact better-picture-button--mute";
  muteButton.type = "button";

  const volumeRange = hostDocument.createElement("input");
  volumeRange.className = "better-picture-range better-picture-volume";
  volumeRange.type = "range";
  volumeRange.min = "0";
  volumeRange.max = "1";
  volumeRange.step = "0.01";
  volumeRange.value = String(video.muted ? 0 : video.volume);
  volumeRange.setAttribute("aria-label", "Volume");

  const resizeHandle = hostDocument.createElement("div");
  resizeHandle.className = "better-picture-resize";
  resizeHandle.setAttribute("aria-hidden", "true");

  controls.append(closeButton);
  header.append(controls);
  controlBar.append(previousButton, backButton, playButton, seekRange, timeLabel, forwardButton, nextButton, muteButton, volumeRange);
  stage.append(subtitleLayer, controlBar);
  player.append(header, stage);

  if (!isDocumentPip) {
    player.append(resizeHandle);
  }

  root.append(player);
  (hostDocument.body || hostDocument.documentElement).append(root);

  const dockController = dockSourceVideo(video, stage);
  const videoFitController = createVideoFitController(video, stage, hostWindow);
  let isScrubbing = false;

  const syncTransportControls = () => {
    const bounds = getSeekBounds(video);
    const canSeek = Boolean(bounds);

    setButtonIcon(playButton, video.paused ? "play" : "pause", video.paused ? "Play video" : "Pause video");
    backButton.disabled = !canSeek || video.currentTime <= bounds.start + 0.25;
    forwardButton.disabled = !canSeek || video.currentTime >= bounds.end - 0.25;

    seekRange.disabled = !canSeek;
    previousButton.disabled = !findAdjacentVideoControl("previous");
    nextButton.disabled = !findAdjacentVideoControl("next");

    if (canSeek) {
      seekRange.min = String(bounds.start);
      seekRange.max = String(bounds.end);

      if (!isScrubbing) {
        seekRange.value = String(clamp(video.currentTime, bounds.start, bounds.end));
      }

      timeLabel.textContent = `${formatTime(video.currentTime - bounds.start)} / ${formatTime(bounds.end - bounds.start)}`;
    } else {
      seekRange.min = "0";
      seekRange.max = "1";
      seekRange.value = "0";
      timeLabel.textContent = `${formatTime(video.currentTime)} / --:--`;
    }
  };

  const syncVolumeControls = () => {
    const audibleVolume = video.muted ? 0 : video.volume;
    volumeRange.value = String(audibleVolume);
    setButtonIcon(
      muteButton,
      video.muted || video.volume === 0 ? "muted" : "volume",
      video.muted || video.volume === 0 ? "Unmute video" : "Mute video"
    );
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

  const onPreviousVideoClick = () => {
    if (triggerAdjacentVideo("previous")) {
      syncTransportControls();
    }
  };

  const onNextVideoClick = () => {
    if (triggerAdjacentVideo("next")) {
      syncTransportControls();
    }
  };

  const onSeekPointerDown = () => {
    isScrubbing = true;
  };

  const onSeekPointerUp = () => {
    isScrubbing = false;
    syncTransportControls();
  };

  const onSeekInput = () => {
    const bounds = getSeekBounds(video);

    if (!bounds) {
      return;
    }

    video.currentTime = clamp(Number(seekRange.value), bounds.start, bounds.end);
    timeLabel.textContent = `${formatTime(video.currentTime - bounds.start)} / ${formatTime(bounds.end - bounds.start)}`;
  };

  const onMuteClick = () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;

      if (video.volume === 0) {
        video.volume = 0.5;
      }
    } else {
      video.muted = true;
    }

    syncVolumeControls();
  };

  const onVolumeInput = () => {
    const nextVolume = clamp(Number(volumeRange.value), 0, 1);
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    syncVolumeControls();
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

    if (event.key === "ArrowUp") {
      event.preventDefault();
      video.muted = false;
      video.volume = clamp(video.volume + 0.05, 0, 1);
      syncVolumeControls();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      video.volume = clamp(video.volume - 0.05, 0, 1);
      video.muted = video.volume === 0;
      syncVolumeControls();
      return;
    }

    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      onMuteClick();
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
  previousButton.addEventListener("click", onPreviousVideoClick);
  nextButton.addEventListener("click", onNextVideoClick);
  closeButton.addEventListener("click", onCloseClick);
  seekRange.addEventListener("pointerdown", onSeekPointerDown);
  seekRange.addEventListener("pointerup", onSeekPointerUp);
  seekRange.addEventListener("pointercancel", onSeekPointerUp);
  seekRange.addEventListener("input", onSeekInput);
  muteButton.addEventListener("click", onMuteClick);
  volumeRange.addEventListener("input", onVolumeInput);
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

  const syncEvents = ["play", "pause", "timeupdate", "seeked", "loadedmetadata", "durationchange", "progress"];
  syncEvents.forEach((eventName) => video.addEventListener(eventName, syncTransportControls));
  video.addEventListener("volumechange", syncVolumeControls);

  const subtitleController = createSubtitleController(video, subtitleLayer);
  syncTransportControls();
  syncVolumeControls();

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
      videoFitController.cleanup();
      syncEvents.forEach((eventName) => video.removeEventListener(eventName, syncTransportControls));
      video.removeEventListener("volumechange", syncVolumeControls);
      backButton.removeEventListener("click", onBackClick);
      playButton.removeEventListener("click", onPlayPauseClick);
      forwardButton.removeEventListener("click", onForwardClick);
      previousButton.removeEventListener("click", onPreviousVideoClick);
      nextButton.removeEventListener("click", onNextVideoClick);
      closeButton.removeEventListener("click", onCloseClick);
      seekRange.removeEventListener("pointerdown", onSeekPointerDown);
      seekRange.removeEventListener("pointerup", onSeekPointerUp);
      seekRange.removeEventListener("pointercancel", onSeekPointerUp);
      seekRange.removeEventListener("input", onSeekInput);
      muteButton.removeEventListener("click", onMuteClick);
      volumeRange.removeEventListener("input", onVolumeInput);
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
