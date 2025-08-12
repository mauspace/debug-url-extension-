// content_script.js (Handles both Overlay and Ruler features)
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
        console.log("Content Script: Overlay Element created.");
    }
    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image')) {
        overlayImageElement.src = imageData;
        console.log("Content Script: Overlay source updated.");
    }
    if (settings) applySettings(settings);
}

function applySettings(settings) {
    if (!overlayImageElement || !settings) { return; }
    const scaleValue = settings.scale !== undefined ? settings.scale : 1;
    Object.assign(overlayImageElement.style, {
        left: (settings.x || 0) + 'px', top: (settings.y || 0) + 'px',
        opacity: settings.opacity !== undefined ? settings.opacity : 1,
        display: settings.visible !== undefined ? (settings.visible ? 'block' : 'none') : 'block',
        transform: `scale(${scaleValue})`
    });
}

function removeOverlay() {
    if (overlayImageElement) { overlayImageElement.remove(); overlayImageElement = null; }
}


// --- RULER MODE LOGIC ---
let isRulerModeActive = false; let isDrawingRuler = false; let rulerStartX = 0; let rulerStartY = 0;
const RULER_ELEMENT_ID = 'toolkit-pro-ruler-box'; const RULER_LABEL_CLASS = 'toolkit-pro-ruler-label';
let rulerElements = { box: null, labelTopLeft: null, labelTopRight: null, labelBottomLeft: null, labelBottomRight: null, labelWidth: null, labelHeight: null };

function toggleRulerMode() { if (isRulerModeActive) { deactivateRulerMode(); } else { activateRulerMode(); } }

function activateRulerMode() {
    if (isRulerModeActive) return; isRulerModeActive = true;
    console.log("Content Script: Activating Ruler Mode.");
    if (overlayImageElement) overlayImageElement.style.display = 'none';
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousedown', handleRulerMouseDown, true);
    document.addEventListener('mousemove', handleRulerMouseMove, true);
    document.addEventListener('mouseup', handleRulerMouseUp, true);
    window.addEventListener('keydown', handleRulerKeyDown, true);
}

function deactivateRulerMode() {
    if (!isRulerModeActive) return; isRulerModeActive = false; isDrawingRuler = false;
    console.log("Content Script: Deactivating Ruler Mode.");
    document.body.style.cursor = 'default';
    document.removeEventListener('mousedown', handleRulerMouseDown, true);
    document.removeEventListener('mousemove', handleRulerMouseMove, true);
    document.removeEventListener('mouseup', handleRulerMouseUp, true);
    window.removeEventListener('keydown', handleRulerKeyDown, true);
    for (const key in rulerElements) { if (rulerElements[key]) { rulerElements[key].remove(); rulerElements[key] = null; } }
    chrome.runtime.sendMessage({ source: 'toolkit-content-script', action: 'getInitialOverlayState' }, (response) => {
        if (response && response.hasState && response.settings) { applySettings(response.settings); }
    });
}

function createRulerElements() {
    if (rulerElements.box) return;
    const commonStyle = { position: 'fixed', zIndex: '2147483645', pointerEvents: 'none', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', padding: '2px 4px', backgroundColor: 'white', color: 'black', borderRadius: '2px', border: '1px solid #aaa', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' };
    rulerElements.box = document.createElement('div'); rulerElements.box.id = RULER_ELEMENT_ID;
    Object.assign(rulerElements.box.style, { position: 'fixed', zIndex: '2147483644', border: '1px solid rgba(255, 255, 255, 0.8)', backgroundColor: 'rgba(0, 123, 255, 0.2)', boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.5)', pointerEvents: 'none', display: 'none' });
    Object.keys(rulerElements).forEach(key => { if (key !== 'box') { rulerElements[key] = document.createElement('div'); rulerElements[key].className = RULER_LABEL_CLASS; Object.assign(rulerElements[key].style, commonStyle); rulerElements[key].style.display = 'none'; } });
    document.body.append(...Object.values(rulerElements));
}

function handleRulerMouseDown(event) { if (!isRulerModeActive || event.button !== 0) return; event.preventDefault(); event.stopPropagation(); isDrawingRuler = true; rulerStartX = event.clientX; rulerStartY = event.clientY; createRulerElements(); Object.assign(rulerElements.box.style, { left: `${rulerStartX}px`, top: `${rulerStartY}px`, width: '0px', height: '0px', display: 'block' }); for(const key in rulerElements) { if(key !== 'box' && rulerElements[key]) rulerElements[key].style.display = 'block'; } updateRulerLabels(event.clientX, event.clientY); }
function handleRulerMouseMove(event) { if (!isDrawingRuler) return; event.preventDefault(); event.stopPropagation(); const cX = event.clientX; const cY = event.clientY; const l = Math.min(cX, rulerStartX); const t = Math.min(cY, rulerStartY); const w = Math.abs(cX - rulerStartX); const h = Math.abs(cY - rulerStartY); Object.assign(rulerElements.box.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` }); updateRulerLabels(cX, cY); }
function handleRulerMouseUp(event) { if (!isDrawingRuler) return; event.preventDefault(); event.stopPropagation(); isDrawingRuler = false; }
function handleRulerKeyDown(event) { if (isRulerModeActive && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); deactivateRulerMode(); } }
function updateRulerLabels(currentX, currentY) { const sX = rulerStartX, sY = rulerStartY, eX = currentX, eY = currentY, l = Math.min(sX, eX), t = Math.min(sY, eY), w = Math.abs(eX - sX), h = Math.abs(eY - sY), o = 5; rulerElements.labelTopLeft.innerHTML = `(x) ${sX}px<br>(y) ${sY}px`; rulerElements.labelTopLeft.style.left = `${l - rulerElements.labelTopLeft.offsetWidth - o}px`; rulerElements.labelTopLeft.style.top = `${t - o}px`; rulerElements.labelBottomRight.innerHTML = `(x) ${eX}px<br>(y) ${eY}px`; rulerElements.labelBottomRight.style.left = `${l + w + o}px`; rulerElements.labelBottomRight.style.top = `${t + h + o - rulerElements.labelBottomRight.offsetHeight}px`; rulerElements.labelWidth.textContent = `(w) ${w}px`; rulerElements.labelWidth.style.left = `${l + (w / 2) - (rulerElements.labelWidth.offsetWidth / 2)}px`; rulerElements.labelWidth.style.top = `${t - rulerElements.labelWidth.offsetHeight - o}px`; rulerElements.labelHeight.textContent = `(h) ${h}px`; rulerElements.labelHeight.style.left = `${l + w + o}px`; rulerElements.labelHeight.style.top = `${t + (h / 2) - (rulerElements.labelHeight.offsetHeight / 2)}px`; }


// --- MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.source && request.source.startsWith('toolkit-popup')) {
        console.log("Content Script received message from popup:", request.action);
        switch (request.action) {
            case 'create': case 'update': deactivateRulerMode(); createOrUpdateOverlay(request.imageData, request.settings); sendResponse({ status: "Overlay action processed" }); break;
            case 'remove': deactivateRulerMode(); removeOverlay(); sendResponse({ status: "Overlay removed" }); break;
            case 'toggleRulerMode': toggleRulerMode(); sendResponse({ status: "Ruler mode toggled" }); break;
            default: sendResponse({ status: "Unknown action" });
        }
    }
    return true;
});

// --- INITIALIZATION ---
(async () => {
    try {
        const response = await chrome.runtime.sendMessage({ source: 'toolkit-content-script', action: 'getInitialOverlayState' });
        if (response && response.hasState && response.settings) createOrUpdateOverlay(response.imageData, response.settings);
    } catch (error) { console.warn("Content Script: Could not get initial state from background.", error); }
})();
console.log("Web Dev Toolkit (content_script.js) loaded and listening.");