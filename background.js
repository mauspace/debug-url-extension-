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
        isSfmcUnwrapperEnabled = true;
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
        if (!isSfmcUnwrapperEnabled || details.method !== "GET" || details.type !== "main_frame" || !details.url || !details.tabId || details.tabId < 0) return;
        try {
            const currentUrl = new URL(details.url);
            if (currentUrl.hostname === SFMC_WRAPPER_HOST && currentUrl.pathname.startsWith(SFMC_WRAPPER_PREFIX_PATH)) {
                const wrappedUrlString = currentUrl.pathname.substring(SFMC_WRAPPER_PREFIX_PATH.length);
                if (!wrappedUrlString) {
                    console.warn(`SERVICE WORKER: Incomplete SFMC (no target): ${details.url}. Redirecting to about:blank.`);
                    try { await chrome.tabs.update(details.tabId, { url: "about:blank" }); } catch (e) { console.error(`SERVICE WORKER: Error redirecting to about:blank:`, e); }
                    return;
                }
                const decodedWrappedUrl = decodeURIComponent(wrappedUrlString);
                if (decodedWrappedUrl.startsWith("http://") || decodedWrappedUrl.startsWith("https://")) {
                    try {
                        new URL(decodedWrappedUrl);
                        console.log(`SERVICE WORKER: SFMC redirecting tab ${details.tabId} from ${details.url} to ${decodedWrappedUrl}`);
                        await chrome.tabs.update(details.tabId, { url: decodedWrappedUrl });
                    } catch (e) { console.warn(`SERVICE WORKER: SFMC - Invalid extracted URL "${decodedWrappedUrl}". Error: ${e.message}`); }
                } else { console.warn(`SERVICE WORKER: SFMC - Extracted part "${decodedWrappedUrl}" not HTTP(S).`); }
            }
        } catch (e) { console.error(`SERVICE WORKER: SFMC - Error processing URL "${details.url}": ${e.message}`); }
    },
    { urls: [`*://${SFMC_WRAPPER_HOST}${SFMC_WRAPPER_PREFIX_PATH}*`], types: ["main_frame"] }
);

// --- Pixel Overlay, Ruler, and Multi-View Message Handling ---
const OVERLAY_STORAGE_IMAGE_KEY = 'toolkitOverlayImage';
const OVERLAY_STORAGE_SETTINGS_KEY = 'toolkitOverlaySettings';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Message from content_overlay.js asking for its initial state
    if (request.source === 'toolkit-content-overlay' && request.action === 'getInitialOverlayState') {
        (async () => {
            try {
                const result = await chrome.storage.local.get([OVERLAY_STORAGE_IMAGE_KEY, OVERLAY_STORAGE_SETTINGS_KEY]);
                if (result[OVERLAY_STORAGE_IMAGE_KEY] && result[OVERLAY_STORAGE_SETTINGS_KEY]) {
                    sendResponse({ hasState: true, imageData: result[OVERLAY_STORAGE_IMAGE_KEY], settings: result[OVERLAY_STORAGE_SETTINGS_KEY] });
                } else { sendResponse({ hasState: false }); }
            } catch (e) { console.error("BG: Error getting overlay state for content script:", e); sendResponse({ hasState: false, error: e.message }); }
        })();
        return true; // Indicates asynchronous response
    }

    // Message from popup.js to control the overlay or ruler
    if (request.source === 'toolkit-popup-overlay' && sender.tab === undefined) {
        (async () => {
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (activeTab && activeTab.id && activeTab.url && (activeTab.url.startsWith('http:') || activeTab.url.startsWith('https:'))) {
                    try { await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content_overlay.js'] }); }
                    catch (injectionError) { console.warn("BG: content_overlay.js injection attempt info:", injectionError.message); }
                    const responseFromContent = await chrome.tabs.sendMessage(activeTab.id, request);
                    sendResponse(responseFromContent);
                } else { sendResponse({ error: "No active HTTP/S tab found for overlay." }); }
            } catch (e) { console.error("BG: Error handling overlay message to content script:", e); sendResponse({ error: "Background error forwarding to content script: " + e.message }); }
        })();
        return true; // Indicates asynchronous response
    }

    // Handler for Multi-View activation
    if (request.action === 'activateMultiView') {
        (async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                try {
                    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['multi-view.js'] });
                    await chrome.tabs.sendMessage(tab.id, { action: 'initMultiView', urls: request.urls });
                    sendResponse({ status: "Multi-View initiated" });
                } catch (e) { console.error("Failed to activate Multi-View:", e); sendResponse({ error: e.message }); }
            } else { sendResponse({ error: "No active tab found for Multi-View." }); }
        })();
        return true; // Indicates asynchronous response
    }

    // *** NEW HANDLER FOR SCROLL SYNCING ***
    if (request.action === 'syncScroll') {
        // A frame has scrolled. We need to broadcast this to all frames in the same tab.
        if (sender.tab && sender.tab.id) {
            // This sends the message to the main content script and all iframe content scripts in the tab.
            chrome.tabs.sendMessage(sender.tab.id, {
                action: 'applyScroll',
                scrollPos: request.scrollPos
            });
        }
        // This is a "fire and forget" message, so we don't need to return true or call sendResponse.
        return false;
    }
});

// --- Initial Startup Logic ---
(async () => {
  await loadInitialSfmcState();
  console.log("SERVICE WORKER (Toolkit Pro): Initial states processed and listeners attached.");
})();
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        console.log("SERVICE WORKER (Toolkit Pro): Extension first install detected.");
        await loadInitialSfmcState();
        await chrome.storage.local.remove([OVERLAY_STORAGE_IMAGE_KEY, OVERLAY_STORAGE_SETTINGS_KEY]);
        console.log("SERVICE WORKER (Toolkit Pro): Overlay storage cleared on install.");
    }
});