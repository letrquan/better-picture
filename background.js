chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

const SCAN_TYPE = "BETTER_PICTURE_SCAN_TABS";
const STATUS_TYPE = "BETTER_PICTURE_STATUS_REQUEST";
const DEBUG_STORAGE_KEY = "debugLogging";
const DEBUG_PREFIX = "[Better Picture][background]";
const YOUTUBE_RESULT_LIMIT = 20;
let debugLoggingEnabled = false;
let activeScanPromise = null;

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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[DEBUG_STORAGE_KEY]) return;
  debugLoggingEnabled = Boolean(changes[DEBUG_STORAGE_KEY].newValue);
  debugLog("debug logging enabled");
});

function sendMessageWithTimeout(tabId, message, timeoutMs = 250) {
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

async function loadContentScript(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content.css"]
  }).catch(() => {});

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

async function detectVideoWithoutContentScript(tabId) {
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Array.from(document.querySelectorAll("video")).some((video) => {
      const rect = video.getBoundingClientRect();
      const style = getComputedStyle(video);
      return rect.width >= 80 && rect.height >= 45 &&
        style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
    })
  });

  return Boolean(injectionResult?.result);
}

async function queryTabStatus(tab) {
  const url = tab.url || "";
  const isEligible = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");

  if (!isEligible) return null;

  try {
    const response = await sendMessageWithTimeout(tab.id, { type: STATUS_TYPE });
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
  } catch (error) {
    // After an extension reload, probe first and load the full content script
    // only in tabs where a visible video is actually present.
    try {
      const hasVideo = await detectVideoWithoutContentScript(tab.id);
      if (hasVideo) {
        await loadContentScript(tab.id);
      }
      debugLog("tab probed without content script", {
        tabId: tab.id,
        hasVideo,
        contentScriptLoaded: hasVideo
      });
      return {
        tabId: tab.id,
        title: tab.title || "Untitled",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl || "",
        hasVideo,
        isRunning: false,
        displayMode: "none",
        subtitleMode: "unknown"
      };
    } catch (probeError) {
      debugLog("tab status unavailable", {
        tabId: tab.id,
        message: probeError?.message || error?.message || "Unknown error"
      });
      return null;
    }
  }
}

async function performTabScan() {
  const startedAt = performance.now();
  const tabs = await chrome.tabs.query({});
  const results = await Promise.allSettled(tabs.map((tab) => queryTabStatus(tab)));
  const videoTabs = results
    .map((result) => result.status === "fulfilled" ? result.value : null)
    .filter((entry) => entry !== null && entry.hasVideo);

  debugLog("tab scan completed", {
    scannedTabs: tabs.length,
    videoTabs: videoTabs.length,
    durationMs: Math.round(performance.now() - startedAt)
  });
  return videoTabs;
}

function scanAllTabs() {
  if (activeScanPromise) {
    debugLog("reusing active tab scan");
    return activeScanPromise;
  }

  activeScanPromise = performTabScan().finally(() => {
    activeScanPromise = null;
  });
  return activeScanPromise;
}

// ── YouTube Scraping & Parse Helpers for Service Worker ──────

function decodeHtmlEntities(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function getYouTubeText(value) {
  if (typeof value?.simpleText === "string") {
    return value.simpleText;
  }

  if (Array.isArray(value?.runs)) {
    return value.runs.map((run) => run.text || "").join("");
  }

  return "";
}

function collectYouTubeVideoRenderers(value, results = [], seenVideoIds = new Set()) {
  if (!value || typeof value !== "object" || results.length >= YOUTUBE_RESULT_LIMIT) return results;

  const renderer = value.videoRenderer || value.compactVideoRenderer || value.gridVideoRenderer;
  if (renderer?.videoId && !seenVideoIds.has(renderer.videoId)) {
    seenVideoIds.add(renderer.videoId);
    results.push(renderer);
  }

  for (const child of Object.values(value)) {
    if (results.length >= YOUTUBE_RESULT_LIMIT) break;
    if (Array.isArray(child)) {
      for (const item of child) {
        collectYouTubeVideoRenderers(item, results, seenVideoIds);
        if (results.length >= YOUTUBE_RESULT_LIMIT) break;
      }
    } else if (child && typeof child === "object") {
      collectYouTubeVideoRenderers(child, results, seenVideoIds);
    }
  }

  return results;
}

function parseYouTubeInitialData(html) {
  const match = html.match(/(?:var\s+ytInitialData\s*=\s*|window\["ytInitialData"\]\s*=\s*)(\{.+?\});\s*(?:<\/script>|var\s+meta|window\["ytInitialPlayerResponse"\])/s);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function searchYouTubeScrape(query) {
  const startedAt = performance.now();
  const searchUrl = new URL("https://www.youtube.com/results");
  searchUrl.searchParams.set("search_query", query);
  searchUrl.searchParams.set("sp", "EgIQAQ=="); // Filter for videos

  const response = await fetch(searchUrl.toString());
  if (!response.ok) {
    throw new Error(`YouTube search failed with status ${response.status}`);
  }

  const html = await response.text();
  const initialData = parseYouTubeInitialData(html);
  const renderers = collectYouTubeVideoRenderers(initialData);
  debugLog("YouTube results parsed", {
    results: renderers.length,
    durationMs: Math.round(performance.now() - startedAt)
  });

  return renderers.map((renderer) => {
    const thumbnail = renderer.thumbnail?.thumbnails?.at(-1) || renderer.thumbnail?.thumbnails?.[0] || {};
    return {
      videoId: renderer.videoId,
      title: decodeHtmlEntities(getYouTubeText(renderer.title) || "Untitled video"),
      channelTitle: decodeHtmlEntities(getYouTubeText(renderer.ownerText) || getYouTubeText(renderer.shortBylineText) || "YouTube"),
      thumbnailUrl: thumbnail.url || "",
      publishedAt: ""
    };
  });
}

async function getYouTubeRecommendationsScrape() {
  const startedAt = performance.now();
  const response = await fetch("https://www.youtube.com/");
  if (!response.ok) {
    throw new Error(`YouTube home fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  const initialData = parseYouTubeInitialData(html);
  const renderers = collectYouTubeVideoRenderers(initialData);
  debugLog("YouTube results parsed", {
    results: renderers.length,
    durationMs: Math.round(performance.now() - startedAt)
  });

  return renderers.map((renderer) => {
    const thumbnail = renderer.thumbnail?.thumbnails?.at(-1) || renderer.thumbnail?.thumbnails?.[0] || {};
    return {
      videoId: renderer.videoId,
      title: decodeHtmlEntities(getYouTubeText(renderer.title) || "Untitled video"),
      channelTitle: decodeHtmlEntities(getYouTubeText(renderer.ownerText) || getYouTubeText(renderer.shortBylineText) || "YouTube"),
      thumbnailUrl: thumbnail.url || "",
      publishedAt: ""
    };
  });
}

// ── Message Routing ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === SCAN_TYPE) {
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
  }

  if (message?.type === "BETTER_PICTURE_YOUTUBE_SEARCH") {
    (async () => {
      try {
        if (message.action === "setAutostart") {
          await chrome.storage.local.set({
            autostartUrl: message.url,
            autostartTimestamp: message.timestamp || Date.now()
          });
          sendResponse({ ok: true });
        } else if (message.action === "getAndClearAutostart") {
          const data = await chrome.storage.local.get(["autostartUrl", "autostartTimestamp"]);
          await chrome.storage.local.remove(["autostartUrl", "autostartTimestamp"]);
          sendResponse({
            url: data.autostartUrl,
            timestamp: data.autostartTimestamp
          });
        } else if (message.action === "search") {
          const items = await searchYouTubeScrape(message.query);
          sendResponse({ items });
        } else if (message.action === "getRecommendations") {
          const items = await getYouTubeRecommendationsScrape();
          sendResponse({ items });
        } else {
          sendResponse({ error: "Unknown action" });
        }
      } catch (error) {
        console.error("YouTube search message error:", error);
        sendResponse({ error: error.message || String(error) });
      }
    })();
    return true;
  }

  return false;
});
