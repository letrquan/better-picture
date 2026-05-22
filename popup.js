const MESSAGE_TYPES = {
  START: "BETTER_PICTURE_START",
  STOP: "BETTER_PICTURE_STOP",
  STATUS_REQUEST: "BETTER_PICTURE_STATUS_REQUEST"
};

const statusElement = document.querySelector("#status");
const modeValueElement = document.querySelector("#modeValue");
const captionValueElement = document.querySelector("#captionValue");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isMissingContentScriptError(error) {
  const message = String(error?.message || "");
  return message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection");
}

async function injectContentScript(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content.css"]
  }).catch(() => {});

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

async function sendMessageToActiveTab(type) {
  const tab = await getActiveTab();

  if (!tab?.id) {
    throw new Error("No active tab is available.");
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, { type });
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    await injectContentScript(tab.id);
    return chrome.tabs.sendMessage(tab.id, { type });
  }
}

function formatDisplayMode(displayMode) {
  if (displayMode === "documentPip") {
    return "External";
  }

  if (displayMode === "pageOverlay") {
    return "In tab";
  }

  return "Standby";
}

function formatSubtitleMode(subtitleMode) {
  if (subtitleMode === "textTrack") {
    return "Track";
  }

  if (subtitleMode === "captionDom") {
    return "Page";
  }

  if (subtitleMode === "unavailable") {
    return "None";
  }

  if (subtitleMode === "captionGap") {
    return "Gap";
  }

  return "Unknown";
}

function setStatus(message, state = "ready") {
  statusElement.textContent = message;
  statusElement.dataset.state = state;
}

function setMeta(mode, captions) {
  modeValueElement.textContent = mode;
  captionValueElement.textContent = captions;
}

function renderStatus(response) {
  const hasVideo = Boolean(response?.hasVideo);
  const isRunning = Boolean(response?.isRunning);
  const subtitleMode = response?.subtitleMode || "unknown";
  const displayMode = response?.displayMode || "none";

  startButton.disabled = !hasVideo || isRunning;
  stopButton.disabled = !isRunning;
  setMeta(formatDisplayMode(displayMode), formatSubtitleMode(subtitleMode));

  if (!hasVideo) {
    setStatus("No playable video found on this page.", "error");
    return;
  }

  if (isRunning) {
    const location = displayMode === "documentPip" ? "outside the browser" : "inside this tab";
    setStatus(`Running ${location}. Captions: ${formatSubtitleMode(subtitleMode)}.`, "running");
    return;
  }

  setStatus("Video found. Ready to start.", "ready");
}

async function refreshStatus() {
  try {
    const response = await sendMessageToActiveTab(MESSAGE_TYPES.STATUS_REQUEST);
    renderStatus(response);
  } catch (error) {
    startButton.disabled = true;
    stopButton.disabled = true;
    setMeta("Blocked", "Unknown");
    setStatus("Better Picture cannot run on this page.", "error");
  }
}

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  setStatus("Starting Better Picture...", "checking");

  try {
    renderStatus(await sendMessageToActiveTab(MESSAGE_TYPES.START));
  } catch (error) {
    setStatus("Could not start on this page.", "error");
    await refreshStatus();
  }
});

stopButton.addEventListener("click", async () => {
  stopButton.disabled = true;
  setStatus("Stopping Better Picture...", "checking");

  try {
    renderStatus(await sendMessageToActiveTab(MESSAGE_TYPES.STOP));
  } catch (error) {
    setStatus("Could not stop on this page.", "error");
    await refreshStatus();
  }
});

refreshStatus();
