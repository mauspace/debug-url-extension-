// content_overlay.js
let overlayImageElement = null;
const OVERLAY_ID = 'pixel-perfect-overlay-image-from-toolkit-pro';

function createOrUpdateOverlay(imageData, settings) {
    if (!document.body) { setTimeout(() => createOrUpdateOverlay(imageData, settings), 100); return; }
    if (!overlayImageElement) {
        overlayImageElement = document.createElement('img');
        overlayImageElement.id = OVERLAY_ID;
        Object.assign(overlayImageElement.style, {
            position: 'fixed', zIndex: '2147483640', pointerEvents: 'none',
            border: '1px dashed rgba(255,0,0,0.3)', imageRendering: 'pixelated',
            transformOrigin: 'top left'
        });
        document.body.appendChild(overlayImageElement);
        console.log("Pixel Overlay (Content): Element created.");
    }
    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image')) {
        overlayImageElement.src = imageData; console.log("Pixel Overlay (Content): Image source updated.");
    }
    if (settings) applySettings(settings);
}

function applySettings(settings) {
    if (!overlayImageElement || !settings) { console.warn("Pixel Overlay (Content): applySettings missing element or settings."); return; }
    const scaleValue = settings.scale !== undefined ? settings.scale : 1;
    Object.assign(overlayImageElement.style, {
        left: (settings.x || 0) + 'px', top: (settings.y || 0) + 'px',
        opacity: settings.opacity !== undefined ? settings.opacity : 1,
        display: settings.visible !== undefined ? (settings.visible ? 'block' : 'none') : 'block',
        transform: `scale(${scaleValue})`
    });
}

function removeOverlay() {
    if (overlayImageElement) { overlayImageElement.remove(); overlayImageElement = null; console.log("Pixel Overlay (Content): Element removed."); }
}

// --- NEW: RULER MODE LOGIC ---
let isRulerModeActive = false;
let isDrawingRuler = false;
let rulerStartX = 0;
let rulerStartY = 0;
const RULER_ELEMENT_ID = 'toolkit-pro-ruler-box';
const RULER_LABEL_CLASS = 'toolkit-pro-ruler-label';

let rulerElements = {
    box: null, labelTopLeft: null, labelTopRight: null,
    labelBottomLeft: null, labelBottomRight: null,
    labelWidth: null, labelHeight: null,
};

function toggleRulerMode() {
    if (isRulerModeActive) { deactivateRulerMode(); } else { activateRulerMode(); }
}

function activateRulerMode() {
    if (isRulerModeActive) return; isRulerModeActive = true;
    console.log("Pixel Overlay (Content): Activating Ruler Mode.");
    if (overlayImageElement) overlayImageElement.style.display = 'none';
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousedown', handleRulerMouseDown, true);
    document.addEventListener('mousemove', handleRulerMouseMove, true);
    document.addEventListener('mouseup', handleRulerMouseUp, true);
    window.addEventListener('keydown', handleRulerKeyDown, true);
}

function deactivateRulerMode() {
    if (!isRulerModeActive) return; isRulerModeActive = false; isDrawingRuler = false;
    console.log("Pixel Overlay (Content): Deactivating Ruler Mode.");
    document.body.style.cursor = 'default';
    document.removeEventListener('mousedown', handleRulerMouseDown, true);
    document.removeEventListener('mousemove', handleRulerMouseMove, true);
    document.removeEventListener('mouseup', handleRulerMouseUp, true);
    window.removeEventListener('keydown', handleRulerKeyDown, true);
    for (const key in rulerElements) {
        if (rulerElements[key]) { rulerElements[key].remove(); rulerElements[key] = null; }
    }
    chrome.runtime.sendMessage({ source: 'toolkit-content-overlay', action: 'getInitialOverlayState' }, (response) => {
        if (response && response.hasState && response.settings) { applySettings(response.settings); }
    });
}

function createRulerElements() {
    if (rulerElements.box) return;
    const commonStyle = {
        position: 'fixed', zIndex: '2147483645', pointerEvents: 'none', fontFamily: 'monospace',
        fontSize: '12px', fontWeight: 'bold', padding: '2px 4px', backgroundColor: 'white',
        color: 'black', borderRadius: '2px', border: '1px solid #aaa',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', whiteSpace: 'nowrap'
    };
    rulerElements.box = document.createElement('div'); rulerElements.box.id = RULER_ELEMENT_ID;
    Object.assign(rulerElements.box.style, {
        position: 'fixed', zIndex: '2147483644', border: '1px solid rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none', display: 'none'
    });
    rulerElements.labelTopLeft = document.createElement('div'); rulerElements.labelTopRight = document.createElement('div');
    rulerElements.labelBottomLeft = document.createElement('div'); rulerElements.labelBottomRight = document.createElement('div');
    rulerElements.labelWidth = document.createElement('div'); rulerElements.labelHeight = document.createElement('div');
    for (const key in rulerElements) {
        if (key !== 'box' && rulerElements[key]) {
            rulerElements[key].className = RULER_LABEL_CLASS;
            Object.assign(rulerElements[key].style, commonStyle);
            rulerElements[key].style.display = 'none';
        }
    }
    document.body.append(rulerElements.box, rulerElements.labelTopLeft, rulerElements.labelTopRight, rulerElements.labelBottomLeft, rulerElements.labelBottomRight, rulerElements.labelWidth, rulerElements.labelHeight);
}

function handleRulerMouseDown(event) {
    if (!isRulerModeActive || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    isDrawingRuler = true; rulerStartX = event.clientX; rulerStartY = event.clientY;
    createRulerElements();
    Object.assign(rulerElements.box.style, { left: `${rulerStartX}px`, top: `${rulerStartY}px`, width: '0px', height: '0px', display: 'block' });
    for(const key in rulerElements) { if(key !== 'box' && rulerElements[key]) rulerElements[key].style.display = 'block'; }
    updateRulerLabels(event.clientX, event.clientY);
}

function handleRulerMouseMove(event) {
    if (!isDrawingRuler) return;
    event.preventDefault(); event.stopPropagation();
    const currentX = event.clientX; const currentY = event.clientY;
    const left = Math.min(currentX, rulerStartX); const top = Math.min(currentY, rulerStartY);
    const width = Math.abs(currentX - rulerStartX); const height = Math.abs(currentY - rulerStartY);
    Object.assign(rulerElements.box.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    updateRulerLabels(currentX, currentY);
}

function handleRulerMouseUp(event) {
    if (!isDrawingRuler) return;
    event.preventDefault(); event.stopPropagation();
    isDrawingRuler = false;
}

function handleRulerKeyDown(event) {
    if (isRulerModeActive && event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); deactivateRulerMode();
    }
}

function updateRulerLabels(currentX, currentY) {
    const startX = rulerStartX; const startY = rulerStartY;
    const endX = currentX; const endY = currentY;
    const left = Math.min(startX, endX); const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX); const height = Math.abs(endY - startY);
    const offset = 5;
    rulerElements.labelTopLeft.innerHTML = `(x) ${startX}px<br>(y) ${startY}px`;
    rulerElements.labelTopLeft.style.left = `${left - rulerElements.labelTopLeft.offsetWidth - offset}px`;
    rulerElements.labelTopLeft.style.top = `${top - offset}px`;
    rulerElements.labelBottomRight.innerHTML = `(x) ${endX}px<br>(y) ${endY}px`;
    rulerElements.labelBottomRight.style.left = `${left + width + offset}px`;
    rulerElements.labelBottomRight.style.top = `${top + height + offset - rulerElements.labelBottomRight.offsetHeight}px`;
    rulerElements.labelWidth.textContent = `(w) ${width}px`;
    rulerElements.labelWidth.style.left = `${left + (width / 2) - (rulerElements.labelWidth.offsetWidth / 2)}px`;
    rulerElements.labelWidth.style.top = `${top - rulerElements.labelWidth.offsetHeight - offset}px`;
    rulerElements.labelHeight.textContent = `(h) ${height}px`;
    rulerElements.labelHeight.style.left = `${left + width + offset}px`;
    rulerElements.labelHeight.style.top = `${top + (height / 2) - (rulerElements.labelHeight.offsetHeight / 2)}px`;
}

// --- Message Listener Update ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.source === 'toolkit-popup-overlay') {
        console.log("Pixel Overlay (Content) received message from popup:", request.action);
        switch (request.action) {
            case 'create': case 'update': deactivateRulerMode(); createOrUpdateOverlay(request.imageData, request.settings); sendResponse({ status: "Overlay action processed" }); break;
            case 'remove': deactivateRulerMode(); removeOverlay(); sendResponse({ status: "Overlay removed" }); break;
            case 'toggleRulerMode': toggleRulerMode(); sendResponse({ status: "Ruler mode toggled" }); break;
            default: sendResponse({ status: "Unknown overlay action" });
        }
    }
    return true;
});

(async () => {
    try {
        const response = await chrome.runtime.sendMessage({ source: 'toolkit-content-overlay', action: 'getInitialOverlayState' });
        if (response && response.hasState && response.settings) createOrUpdateOverlay(response.imageData, response.settings);
    } catch (error) { console.warn("Pixel Overlay (Content): Could not get initial state from background.", error); }
})();
console.log("Pixel Overlay (content_overlay.js) loaded and listening for messages.");