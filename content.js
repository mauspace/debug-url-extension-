// content_overlay.js
let overlayImageElement = null;
const OVERLAY_ID = 'pixel-perfect-overlay-image-from-toolkit'; // Unique ID

function createOrUpdateOverlay(imageData, settings) {
    if (!document.body) { // Wait for body to be available
        console.warn("Pixel Overlay: Document body not ready. Retrying...");
        setTimeout(() => createOrUpdateOverlay(imageData, settings), 100);
        return;
    }

    if (!overlayImageElement) {
        overlayImageElement = document.createElement('img');
        overlayImageElement.id = OVERLAY_ID;
        overlayImageElement.style.position = 'fixed';
        overlayImageElement.style.zIndex = '2147483640'; // High, but below some devtools
        overlayImageElement.style.pointerEvents = 'none';
        overlayImageElement.style.border = '1px dashed rgba(255,0,0,0.5)'; // Optional: for visibility when transparent
        document.body.appendChild(overlayImageElement);
        console.log("Pixel Overlay: Element created.");
    }

    if (imageData) { // Only update src if new image data is provided (string means data URL)
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
            overlayImageElement.src = imageData;
            console.log("Pixel Overlay: Image source updated.");
        }
    }
    applySettings(settings);
}

function applySettings(settings) {
    if (!overlayImageElement) return;
    if (!settings) {
        console.warn("Pixel Overlay: ApplySettings called with no settings.");
        return;
    }

    overlayImageElement.style.left = (settings.x || 0) + 'px';
    overlayImageElement.style.top = (settings.y || 0) + 'px';
    overlayImageElement.style.opacity = settings.opacity !== undefined ? settings.opacity : 1;
    overlayImageElement.style.display = settings.visible !== undefined ? (settings.visible ? 'block' : 'none') : 'block';
    console.log("Pixel Overlay: Settings applied", settings);
}

function removeOverlay() {
    if (overlayImageElement) {
        overlayImageElement.remove();
        overlayImageElement = null;
        console.log("Pixel Overlay: Element removed.");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Pixel Overlay (content_overlay.js) received message:", request);
    if (request.source === 'toolkit-popup-overlay') { // Filter messages for this feature
        switch (request.action) {
            case 'create':
            case 'update':
                createOrUpdateOverlay(request.imageData, request.settings);
                sendResponse({ status: "Overlay action processed: " + request.action });
                break;
            case 'remove':
                removeOverlay();
                sendResponse({ status: "Overlay removed" });
                break;
            default:
                sendResponse({ status: "Unknown overlay action" });
        }
    }
    return true; // For async response
});

// When content script loads, ask background for any saved overlay state for this tab
// This helps persist the overlay if the popup is closed and reopened, or page reloaded.
(async () => {
    try {
        const response = await chrome.runtime.sendMessage({
            source: 'toolkit-content-overlay', // Identify self
            action: 'getInitialOverlayState'
        });

        if (chrome.runtime.lastError) {
            console.warn("Pixel Overlay: Error getting initial state:", chrome.runtime.lastError.message);
            return;
        }

        if (response && response.hasState && response.settings && response.settings.visible) {
            console.log("Pixel Overlay: Applying initial state from background:", response);
            createOrUpdateOverlay(response.imageData, response.settings);
        } else {
            console.log("Pixel Overlay: No initial overlay state to apply or not visible.");
        }
    } catch (error) {
        console.warn("Pixel Overlay: Could not get initial state. Page might be restricted or background not ready.", error);
    }
})();

console.log("Pixel Overlay (content_overlay.js) loaded and listening.");