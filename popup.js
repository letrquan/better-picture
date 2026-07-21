const MESSAGE_TYPES = {
  START: "BETTER_PICTURE_START",
  STOP: "BETTER_PICTURE_STOP",
  STATUS_REQUEST: "BETTER_PICTURE_STATUS_REQUEST",
  SCAN_TABS: "BETTER_PICTURE_SCAN_TABS"
};
const USER_GESTURE_START_EVENT = "better-picture-start-from-user-gesture";
const DEBUG_STORAGE_KEY = "debugLogging";
const DEBUG_PREFIX = "[Better Picture][popup]";
let debugLoggingEnabled = false;

function debugLog(event, details) {
  if (!debugLoggingEnabled) return;

  if (details === undefined) {
    console.debug(DEBUG_PREFIX, event);
  } else {
    console.debug(DEBUG_PREFIX, event, details);
  }
}

chrome.storage.local.get(DEBUG_STORAGE_KEY)
  .then((result) => {
    debugLoggingEnabled = Boolean(result?.[DEBUG_STORAGE_KEY]);
    debugLog("debug logging enabled");
  })
  .catch(() => {});

const controlSourceLabel = document.querySelector("#controlSourceLabel");
const resetToActiveButton = document.querySelector("#resetToActiveButton");
const selectedFavicon = document.querySelector("#selectedFavicon");
const selectedFaviconFallback = document.querySelector("#selectedFaviconFallback");
const selectedTitle = document.querySelector("#selectedTitle");
const selectedDomain = document.querySelector("#selectedDomain");
const statusElement = document.querySelector("#status");
const modeValueElement = document.querySelector("#modeValue");
const captionValueElement = document.querySelector("#captionValue");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");

const refreshButton = document.querySelector("#refreshButton");
const scanStatusElement = document.querySelector("#scanStatus");
const tabListElement = document.querySelector("#tabList");

let activeTab = null;
let controlledTab = null; // Can be activeTab or another tab selected by the user
let lastScanResults = [];

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

async function sendMessageToTab(tabId, type, details = {}) {
  const message = { type, ...details };

  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    await injectContentScript(tabId);
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function startDocumentPipFromPopup(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (eventName) => {
      document.dispatchEvent(new CustomEvent(eventName));
    },
    args: [USER_GESTURE_START_EVENT]
  });

  return sendMessageToTab(tabId, MESSAGE_TYPES.START, { requireDocumentPip: true });
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Local / Direct";
  }
}

function renderTabFavicon(favIconUrl, targetImg, targetFallback) {
  if (favIconUrl) {
    targetImg.src = favIconUrl;
    targetImg.style.display = "block";
    targetFallback.style.display = "none";
    targetImg.onerror = () => {
      targetImg.style.display = "none";
      targetFallback.style.display = "grid";
    };
  } else {
    targetImg.style.display = "none";
    targetFallback.style.display = "grid";
  }
}

function createListFavicon(favIconUrl) {
  if (favIconUrl) {
    const img = document.createElement("img");
    img.className = "popup__favicon";
    img.src = favIconUrl;
    img.alt = "";
    img.width = 16;
    img.height = 16;
    img.onerror = () => {
      img.replaceWith(createListFallbackFavicon());
    };
    return img;
  }
  return createListFallbackFavicon();
}

function createListFallbackFavicon() {
  const div = document.createElement("div");
  div.className = "popup__favicon-fallback";
  div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  return div;
}

function formatDisplayMode(displayMode) {
  if (displayMode === "documentPip") return "External";
  if (displayMode === "pageOverlay") return "In tab";
  return "Standby";
}

function formatSubtitleMode(subtitleMode) {
  if (subtitleMode === "textTrack") return "Track";
  if (subtitleMode === "captionDom") return "Page";
  if (subtitleMode === "unavailable") return "None";
  if (subtitleMode === "captionGap") return "Gap";
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

  if (response?.error) {
    setStatus(response.error, "error");
    return;
  }

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

async function refreshControlledStatus() {
  if (!controlledTab) return;

  try {
    const response = await sendMessageToTab(controlledTab.id, MESSAGE_TYPES.STATUS_REQUEST);
    renderStatus(response);
  } catch (error) {
    startButton.disabled = true;
    stopButton.disabled = true;
    setMeta("Blocked", "Unknown");
    setStatus("Better Picture cannot run on this page.", "error");
  }
}

function setScanStatus(message, state = "scanning") {
  if (message) {
    scanStatusElement.textContent = message;
    scanStatusElement.dataset.state = state;
  } else {
    scanStatusElement.textContent = "";
  }
}

async function scanTabs() {
  const startedAt = performance.now();
  setScanStatus("Scanning other tabs...", "scanning");
  tabListElement.replaceChildren();

  try {
    const tabs = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SCAN_TABS });
    lastScanResults = Array.isArray(tabs) ? tabs : [];
    debugLog("tab scan completed", {
      results: lastScanResults.length,
      durationMs: Math.round(performance.now() - startedAt)
    });
  } catch (error) {
    console.error("Better Picture scan failed.", error);
    lastScanResults = [];
  }

  // Filter out the active browser tab from the "Other Video Sources" list,
  // as it is already managed by the primary controller section.
  const otherVideoTabs = lastScanResults.filter(
    (tab) => tab.tabId !== activeTab.id
  );

  if (otherVideoTabs.length === 0) {
    setScanStatus("No other video tabs open.", "empty");
    return;
  }

  setScanStatus("");
  renderTabList(otherVideoTabs);
}

function renderTabList(tabs) {
  tabListElement.replaceChildren();

  // Sort: show running ones first
  const sorted = [...tabs].sort((a, b) => (b.isRunning ? 1 : 0) - (a.isRunning ? 1 : 0));

  sorted.forEach((tab) => {
    const li = document.createElement("li");
    li.className = "popup__tab-item" + (tab.isRunning ? " popup__tab-item--running" : "");
    li.setAttribute("role", "option");
    li.tabIndex = 0;

    const favicon = createListFavicon(tab.favIconUrl);

    const info = document.createElement("div");
    info.className = "popup__tab-info";

    const title = document.createElement("div");
    title.className = "popup__tab-title";
    title.textContent = tab.title || "Untitled";

    const domain = document.createElement("div");
    domain.className = "popup__tab-domain";
    domain.textContent = extractDomain(tab.url);

    info.append(title, domain);

    const indicator = document.createElement("div");
    indicator.className = "popup__tab-indicator";

    if (tab.isRunning) {
      const dot = document.createElement("div");
      dot.className = "popup__running-dot";
      indicator.append(dot);
    }

    li.append(favicon, info, indicator);

    const selectThisTab = () => {
      // Map background structure back to chrome.tabs structure
      selectControlledTab({
        id: tab.tabId,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl
      });
    };

    li.addEventListener("click", selectThisTab);
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectThisTab();
      }
    });

    tabListElement.append(li);
  });
}

function selectControlledTab(tab) {
  controlledTab = tab;

  // Render controlled tab details
  selectedTitle.textContent = tab.title || "Untitled";
  selectedDomain.textContent = extractDomain(tab.url);
  renderTabFavicon(tab.favIconUrl, selectedFavicon, selectedFaviconFallback);

  // Setup header label and reset button
  if (tab.id === activeTab.id) {
    controlSourceLabel.textContent = "Current Tab";
    resetToActiveButton.hidden = true;
  } else {
    controlSourceLabel.textContent = "Controlling Tab";
    resetToActiveButton.hidden = false;
  }

  // Setup checking state
  setStatus("Checking...", "checking");
  setMeta("Checking", "Checking");
  startButton.disabled = true;
  stopButton.disabled = true;

  refreshControlledStatus();
}

// ── Startup & Initialization ─────────────────────────────────

async function init() {
  try {
    // 1. Instantly query only the active tab in current window
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;

    if (!activeTab?.id) {
      throw new Error("No active tab.");
    }

    // 2. Select it instantly and query its status (instant startup!)
    selectControlledTab(activeTab);

    // 3. Concurrently scan other tabs in background
    scanTabs();
  } catch (error) {
    console.error("Initialization failed.", error);
    setStatus("Better Picture cannot load.", "error");
    startButton.disabled = true;
    stopButton.disabled = true;
  }
}

// ── Event Listeners ──────────────────────────────────────────

resetToActiveButton.addEventListener("click", () => {
  if (activeTab) {
    selectControlledTab(activeTab);
  }
});

refreshButton.addEventListener("click", () => {
  refreshButton.classList.remove("popup__icon-button--spinning");
  refreshButton.offsetHeight; // Trigger reflow
  refreshButton.classList.add("popup__icon-button--spinning");
  scanTabs();
});

startButton.addEventListener("click", async () => {
  if (!controlledTab?.id) return;

  startButton.disabled = true;
  setStatus("Starting Better Picture...", "checking");

  try {
    const res = await startDocumentPipFromPopup(controlledTab.id);
    debugLog("start response", {
      tabId: controlledTab.id,
      isRunning: Boolean(res?.isRunning),
      displayMode: res?.displayMode || "none",
      error: res?.error || null
    });
    renderStatus(res);
    // Refresh tab list to update active/running indicator dot
    scanTabs();
  } catch (error) {
    setStatus("Could not start on this page.", "error");
    await refreshControlledStatus();
  }
});

stopButton.addEventListener("click", async () => {
  if (!controlledTab?.id) return;

  stopButton.disabled = true;
  setStatus("Stopping Better Picture...", "checking");

  try {
    const res = await sendMessageToTab(controlledTab.id, MESSAGE_TYPES.STOP);
    debugLog("stop response", { tabId: controlledTab.id, isRunning: Boolean(res?.isRunning) });
    renderStatus(res);
    // Refresh tab list to update active/running indicator dot
    scanTabs();
  } catch (error) {
    setStatus("Could not stop on this page.", "error");
    await refreshControlledStatus();
  }
});

// Run startup
init();
