chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

const SCAN_TYPE = "BETTER_PICTURE_SCAN_TABS";
const STATUS_TYPE = "BETTER_PICTURE_STATUS_REQUEST";

function sendMessageWithTimeout(tabId, message, timeoutMs = 150) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeoutMs);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

async function ensureContentScript(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content.css"]
  }).catch(() => {});

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

async function queryTabStatus(tab) {
  const url = tab.url || "";
  const isEligible = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
  
  if (!isEligible) {
    return null;
  }

  try {
    // Try sending a status request to already running content script
    const response = await sendMessageWithTimeout(tab.id, { type: STATUS_TYPE }, 150);
    return {
      tabId: tab.id,
      title: response?.pageTitle || tab.title || "Untitled",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || "",
      hasVideo: Boolean(response?.hasVideo),
      isRunning: Boolean(response?.isRunning),
      displayMode: response?.displayMode || "none",
      subtitleMode: response?.subtitleMode || "unknown"
    };
  } catch {
    // Message failed (content script might not be injected yet due to extension reload/install)
    // Try injecting it in the background as a fallback
    try {
      await ensureContentScript(tab.id);
      // Retry sending message after injection
      const response = await sendMessageWithTimeout(tab.id, { type: STATUS_TYPE }, 150);
      return {
        tabId: tab.id,
        title: response?.pageTitle || tab.title || "Untitled",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl || "",
        hasVideo: Boolean(response?.hasVideo),
        isRunning: Boolean(response?.isRunning),
        displayMode: response?.displayMode || "none",
        subtitleMode: response?.subtitleMode || "unknown"
      };
    } catch {
      return null;
    }
  }
}

async function scanAllTabs() {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(
    tabs.map((tab) => queryTabStatus(tab))
  );

  return results
    .map((result) => result.status === "fulfilled" ? result.value : null)
    .filter((entry) => entry !== null && entry.hasVideo);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== SCAN_TYPE) {
    return false;
  }

  // Use robust async IIFE for MV3 service workers to guarantee response delivery
  (async () => {
    try {
      const results = await scanAllTabs();
      sendResponse(results);
    } catch (error) {
      console.error("Better Picture tab scan failed.", error);
      sendResponse([]);
    }
  })();

  return true;
});
