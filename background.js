// background.js (Service Worker for MV3)
console.log("SERVICE WORKER (Toolkit Pro): Script started.");

// --- SFMC Unwrapper ---
const SFMC_WRAPPER_HOST = "user-content.s4.sfmc-content.com";
const SFMC_WRAPPER_PREFIX_PATH = "/httpgetwrap|";
const STORAGE_KEY_SFMC_UNWRAPPER_ENABLED = 'sfmcUnwrapperEnabled';
let isSfmcUnwrapperEnabled = true;

async function loadInitialSfmcState() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY_SFMC_UNWRAPPER_ENABLED);
    isSfmcUnwrapperEnabled = data[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED] !== undefined ? data[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED] : true;
    if (data[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED] === undefined) {
      await chrome.storage.sync.set({ [STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]: true });
    }
    console.log('SERVICE WORKER: SFMC Unwrapper state loaded. Enabled:', isSfmcUnwrapperEnabled);
  } catch (error) {
    console.error('SERVICE WORKER: Error loading SFMC state:', error);
    isSfmcUnwrapperEnabled = true; // Fallback
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED]) {
    isSfmcUnwrapperEnabled = changes[STORAGE_KEY_SFMC_UNWRAPPER_ENABLED].newValue;
    console.log('SERVICE WORKER: SFMC Unwrapper state changed via storage. Now:', isSfmcUnwrapperEnabled);
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    if (!isSfmcUnwrapperEnabled) return;
    if (details.method !== "GET" || details.type !== "main_frame" || !details.url || !details.tabId || details.tabId < 0) return;

    try {
      const currentUrl = new URL(details.url);
      if (currentUrl.hostname === SFMC_WRAPPER_HOST && currentUrl.pathname.startsWith(SFMC_WRAPPER_PREFIX_PATH)) {
        const wrappedUrlString = currentUrl.pathname.substring(SFMC_WRAPPER_PREFIX_PATH.length);
        if (!wrappedUrlString) {
          console.warn(`SERVICE WORKER: Incomplete SFMC wrapper (no target URL). Original: ${details.url}. Redirecting to about:blank.`);
          try { await chrome.tabs.update(details.tabId, { url: "about:blank" }); }
          catch (e) { console.error(`SERVICE WORKER: Error redirecting incomplete SFMC URL to about:blank:`, e); }
          return;
        }
        const decodedWrappedUrl = decodeURIComponent(wrappedUrlString);
        if (decodedWrappedUrl.startsWith("http://") || decodedWrappedUrl.startsWith("https://")) {
          try {
            new URL(decodedWrappedUrl); // Validate URL structure
            console.log(`SERVICE WORKER: SFMC Unwrapper redirecting tab ${details.tabId} from ${details.url} to ${decodedWrappedUrl}`);
            await chrome.tabs.update(details.tabId, { url: decodedWrappedUrl });
          } catch (e) {
            console.warn(`SERVICE WORKER: SFMC - Extracted URL "${decodedWrappedUrl}" from "${details.url}" is not a valid parsable URL. Error: ${e.message}`);
          }
        } else {
          console.warn(`SERVICE WORKER: SFMC - Extracted part "${decodedWrappedUrl}" from "${details.url}" does not look like an HTTP(S) URL.`);
        }
      }
    } catch (e) {
      console.error(`SERVICE WORKER: SFMC - Error processing URL "${details.url}" for unwrapping: ${e.message}`);
    }
  },
  { urls: [`*://${SFMC_WRAPPER_HOST}${SFMC_WRAPPER_PREFIX_PATH}*`], types: ["main_frame"] }
);


// --- Pixel Overlay ---
const OVERLAY_STORAGE_IMAGE_KEY = 'toolkitOverlayImage';
const OVERLAY_STORAGE_SETTINGS_KEY = 'toolkitOverlaySettings';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Message from content_overlay.js asking for initial state
    if (request.source === 'toolkit-content-overlay' && request.action === 'getInitialOverlayState') {
        (async () => {
            try {
                const result = await chrome.storage.local.get([OVERLAY_STORAGE_IMAGE_KEY, OVERLAY_STORAGE_SETTINGS_KEY]);
                if (result[OVERLAY_STORAGE_IMAGE_KEY] && result[OVERLAY_STORAGE_SETTINGS_KEY]) {
                    sendResponse({ hasState: true, imageData: result[OVERLAY_STORAGE_IMAGE_KEY], settings: result[OVERLAY_STORAGE_SETTINGS_KEY] });
                } else {
                    sendResponse({ hasState: false });
                }
            } catch (e) {
                console.error("Background Script: Error getting overlay state for content script:", e);
                sendResponse({ hasState: false, error: e.message });
            }
        })();
        return true; // Indicates asynchronous response
    }

    // Message from popup.js to control the overlay
    // Check sender.tab is undefined to ensure it's from the popup (not a content script trying to impersonate)
    if (request.source === 'toolkit-popup-overlay' && sender.tab === undefined) {
        (async () => {
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab && activeTab.id && activeTab.url && (activeTab.url.startsWith('http:') || activeTab.url.startsWith('https:'))) {
                    // Ensure content script is injected before sending message
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['content_overlay.js']
                        });
                    } catch (injectionError) {
                        // This can happen if already injected or on restricted pages. Often benign.
                        console.warn("Background Script: content_overlay.js injection attempt info (might be already injected or page restricted):", injectionError.message);
                    }
                    // Forward the original request from popup to the content script
                    const responseFromContent = await chrome.tabs.sendMessage(activeTab.id, request);
                    sendResponse(responseFromContent); // Send content script's response back to popup
                } else {
                    sendResponse({ error: "No active HTTP/S tab found for overlay." });
                }
            } catch (e) {
                console.error("Background Script: Error handling overlay message to content script:", e);
                sendResponse({ error: "Background error forwarding to content script: " + e.message });
            }
        })();
        return true; // Indicates asynchronous response
    }
});

// Initialize all states when the service worker starts.
(async () => {
  await loadInitialSfmcState();
  console.log("SERVICE WORKER (Toolkit Pro): Initial states processed and listeners attached.");
})();

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("SERVICE WORKER (Toolkit Pro): Extension first install detected.");
    await loadInitialSfmcState(); // Ensure SFMC default
    // Clear any old overlay storage on fresh install
    await chrome.storage.local.remove([OVERLAY_STORAGE_IMAGE_KEY, OVERLAY_STORAGE_SETTINGS_KEY]);
    console.log("SERVICE WORKER (Toolkit Pro): Overlay storage cleared on install.");
  }
});