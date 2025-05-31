// content_overlay.js
let overlayImageElement = null;
const OVERLAY_ID = 'pixel-perfect-overlay-image-from-toolkit-pro'; // Ensure this is unique

function createOrUpdateOverlay(imageData, settings) {
    if (!document.body) { // Wait for body to be available
        console.warn("Pixel Overlay (Content): Document body not ready. Retrying...");
        setTimeout(() => createOrUpdateOverlay(imageData, settings), 100);
        return;
    }

    if (!overlayImageElement) {
        overlayImageElement = document.createElement('img');
        overlayImageElement.id = OVERLAY_ID;
        Object.assign(overlayImageElement.style, {
            position: 'fixed',
            zIndex: '2147483640', // Very high z-index
            pointerEvents: 'none', // So you can click through it
            border: '1px dashed rgba(255,0,0,0.3)', // Optional: for visibility
            imageRendering: 'pixelated', // For sharper pixels on zoom
            transformOrigin: 'top left' // Crucial for scale and position
        });
        document.body.appendChild(overlayImageElement);
        console.log("Pixel Overlay (Content): Element created.");
    }

    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image')) {
        overlayImageElement.src = imageData;
        console.log("Pixel Overlay (Content): Image source updated.");
    }
    // Always apply settings if provided, even if imageData isn't new (e.g. just position/opacity change)
    if (settings) {
        applySettings(settings);
    }
}

function applySettings(settings) {
    if (!overlayImageElement || !settings) {
        console.warn("Pixel Overlay (Content): applySettings called with no element or no settings.");
        return;
    }

    // Apply styles
    overlayImageElement.style.left = (settings.x || 0) + 'px';
    overlayImageElement.style.top = (settings.y || 0) + 'px';
    overlayImageElement.style.opacity = settings.opacity !== undefined ? settings.opacity : 1;
    overlayImageElement.style.display = settings.visible !== undefined ? (settings.visible ? 'block' : 'none') : 'block';

    const scaleValue = settings.scale !== undefined ? settings.scale : 1;
    overlayImageElement.style.transform = `scale(${scaleValue})`;

    console.log("Pixel Overlay (Content): Settings applied - ", JSON.stringify(settings).substring(0, 200) + "...", "Applied transform:", overlayImageElement.style.transform);
}

function removeOverlay() {
    if (overlayImageElement) {
        overlayImageElement.remove();
        overlayImageElement = null;
        console.log("Pixel Overlay (Content): Element removed.");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ensure messages are from our extension's popup (via background) for this feature
    if (request.source === 'toolkit-popup-overlay') {
        console.log("Pixel Overlay (Content) received message from popup:", request.action);
        switch (request.action) {
            case 'create':
            case 'update':
                createOrUpdateOverlay(request.imageData, request.settings);
                sendResponse({ status: "Overlay " + request.action + "d" });
                break;
            case 'remove':
                removeOverlay();
                sendResponse({ status: "Overlay removed" });
                break;
            default:
                sendResponse({ status: "Unknown overlay action: " + request.action });
        }
    }
    return true; // Indicates you wish to send a response asynchronously
});

// When content script loads, ask background for any saved overlay state for this tab
(async () => {
    try {
        console.log("Pixel Overlay (Content): Requesting initial state from background.");
        const response = await chrome.runtime.sendMessage({
            source: 'toolkit-content-overlay', // Identify self to background
            action: 'getInitialOverlayState'
        });

        if (chrome.runtime.lastError) {
            console.warn("Pixel Overlay (Content): Error getting initial state:", chrome.runtime.lastError.message);
            return;
        }

        if (response && response.hasState && response.settings) {
            // Only apply if it was meant to be visible, otherwise just keep the state ready.
            // The createOrUpdateOverlay will respect response.settings.visible
            console.log("Pixel Overlay (Content): Applying initial state from background:", response.settings);
            createOrUpdateOverlay(response.imageData, response.settings);
        } else {
            console.log("Pixel Overlay (Content): No initial overlay state to apply from background, or state indicates not visible.");
        }
    } catch (error) {
        console.warn("Pixel Overlay (Content): Could not get initial state from background. Page might be restricted or background not ready.", error);
    }
})();

console.log("Pixel Overlay (content_overlay.js) loaded and listening for messages.");