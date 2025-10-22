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
        overlayImageElement.src = imageData;
        console.log("Pixel Overlay (Content): Image source updated.");
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

let isRulerModeActive=!1,isDrawingRuler=!1,rulerStartX=0,rulerStartY=0;const RULER_ELEMENT_ID='toolkit-pro-ruler-box',RULER_LABEL_CLASS='toolkit-pro-ruler-label';let rulerElements={box:null,labelTopLeft:null,labelTopRight:null,labelBottomLeft:null,labelBottomRight:null,labelWidth:null,labelHeight:null};function toggleRulerMode(){isRulerModeActive?deactivateRulerMode():activateRulerMode()}function activateRulerMode(){if(isRulerModeActive)return;isRulerModeActive=!0;console.log("Pixel Overlay (Content): Activating Ruler Mode.");if(overlayImageElement)overlayImageElement.style.display='none';document.body.style.cursor='crosshair';document.addEventListener('mousedown',handleRulerMouseDown,!0);document.addEventListener('mousemove',handleRulerMouseMove,!0);document.addEventListener('mouseup',handleRulerMouseUp,!0);window.addEventListener('keydown',handleRulerKeyDown,!0)}function deactivateRulerMode(){if(!isRulerModeActive)return;isRulerModeActive=!1;isDrawingRuler=!1;console.log("Pixel Overlay (Content): Deactivating Ruler Mode.");document.body.style.cursor='default';document.removeEventListener('mousedown',handleRulerMouseDown,!0);document.removeEventListener('mousemove',handleRulerMouseMove,!0);document.removeEventListener('mouseup',handleRulerMouseUp,!0);window.removeEventListener('keydown',handleRulerKeyDown,!0);for(const k in rulerElements){if(rulerElements[k]){rulerElements[k].remove();rulerElements[k]=null}}chrome.runtime.sendMessage({source:'toolkit-content-overlay',action:'getInitialOverlayState'},r=>{if(chrome.runtime.lastError){console.warn("Could not get overlay state on ruler deactivate:",chrome.runtime.lastError.message);return}if(r&&r.hasState&&r.settings)applySettings(r.settings)})}function createRulerElements(){if(rulerElements.box)return;const cS={position:'fixed',zIndex:'2147483645',pointerEvents:'none',fontFamily:'monospace',fontSize:'12px',fontWeight:'bold',padding:'2px 4px',backgroundColor:'white',color:'black',borderRadius:'2px',border:'1px solid #aaa',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',whiteSpace:'nowrap'};rulerElements.box=document.createElement('div');rulerElements.box.id=RULER_ELEMENT_ID;Object.assign(rulerElements.box.style,{position:'fixed',zIndex:'2147483644',border:'1px solid rgba(255, 255, 255, 0.8)',backgroundColor:'rgba(0, 123, 255, 0.2)',boxShadow:'0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.5)',pointerEvents:'none',display:'none'});rulerElements.labelTopLeft=document.createElement('div');rulerElements.labelTopRight=document.createElement('div');rulerElements.labelBottomLeft=document.createElement('div');rulerElements.labelBottomRight=document.createElement('div');rulerElements.labelWidth=document.createElement('div');rulerElements.labelHeight=document.createElement('div');for(const k in rulerElements){if(k!=='box'&&rulerElements[k]){rulerElements[k].className=RULER_LABEL_CLASS;Object.assign(rulerElements[k].style,cS);rulerElements[k].style.display='none'}}document.body.append(rulerElements.box,rulerElements.labelTopLeft,rulerElements.labelTopRight,rulerElements.labelBottomLeft,rulerElements.labelBottomRight,rulerElements.labelWidth,rulerElements.labelHeight)}function handleRulerMouseDown(e){if(!isRulerModeActive||e.button!==0)return;e.preventDefault();e.stopPropagation();isDrawingRuler=!0;rulerStartX=e.clientX;rulerStartY=e.clientY;createRulerElements();Object.assign(rulerElements.box.style,{left:`${rulerStartX}px`,top:`${rulerStartY}px`,width:'0px',height:'0px',display:'block'});for(const k in rulerElements){if(k!=='box'&&rulerElements[k])rulerElements[k].style.display='block'}updateRulerLabels(e.clientX,e.clientY)}function handleRulerMouseMove(e){if(!isDrawingRuler)return;e.preventDefault();e.stopPropagation();const cX=e.clientX;const cY=e.clientY;const l=Math.min(cX,rulerStartX);const t=Math.min(cY,rulerStartY);const w=Math.abs(cX-rulerStartX);const h=Math.abs(cY-rulerStartY);Object.assign(rulerElements.box.style,{left:`${l}px`,top:`${t}px`,width:`${w}px`,height:`${h}px`});updateRulerLabels(cX,cY)}function handleRulerMouseUp(e){if(!isDrawingRuler)return;e.preventDefault();e.stopPropagation();isDrawingRuler=!1}function handleRulerKeyDown(e){if(isRulerModeActive&&e.key==='Escape'){e.preventDefault();e.stopPropagation();deactivateRulerMode()}}function updateRulerLabels(cX,cY){const sX=rulerStartX;const sY=rulerStartY;const eX=cX;const eY=cY;const l=Math.min(sX,eX);const t=Math.min(sY,eY);const w=Math.abs(eX-sX);const h=Math.abs(eY-sY);const o=5;rulerElements.labelTopLeft.innerHTML=`(x) ${sX}px<br>(y) ${sY}px`;rulerElements.labelTopLeft.style.left=`${l-rulerElements.labelTopLeft.offsetWidth-o}px`;rulerElements.labelTopLeft.style.top=`${t-o}px`;rulerElements.labelBottomRight.innerHTML=`(x) ${eX}px<br>(y) ${eY}px`;rulerElements.labelBottomRight.style.left=`${l+w+o}px`;rulerElements.labelBottomRight.style.top=`${t+h+o-rulerElements.labelBottomRight.offsetHeight}px`;rulerElements.labelWidth.textContent=`(w) ${w}px`;rulerElements.labelWidth.style.left=`${l+(w/2)-(rulerElements.labelWidth.offsetWidth/2)}px`;rulerElements.labelWidth.style.top=`${t-rulerElements.labelWidth.offsetHeight-o}px`;rulerElements.labelHeight.textContent=`(h) ${h}px`;rulerElements.labelHeight.style.left=`${l+w+o}px`;rulerElements.labelHeight.style.top=`${t+(h/2)-(rulerElements.labelHeight.offsetHeight/2)}px`}
chrome.runtime.onMessage.addListener((r,S,sR)=>{if(r.source==='toolkit-popup-overlay'){console.log("Pixel Overlay (Content) received message from popup:",r.action);switch(r.action){case'create':case'update':deactivateRulerMode();createOrUpdateOverlay(r.imageData,r.settings);sR({status:"Overlay action processed"});break;case'remove':deactivateRulerMode();removeOverlay();sR({status:"Overlay removed"});break;case'toggleRulerMode':toggleRulerMode();sR({status:"Ruler mode toggled"});break;default:sR({status:"Unknown overlay action"})}}return!0});
(async()=>{try{const r=await chrome.runtime.sendMessage({source:'toolkit-content-overlay',action:'getInitialOverlayState'});if(r&&r.hasState&&r.settings)createOrUpdateOverlay(r.imageData,r.settings)}catch(e){console.warn("Pixel Overlay (Content): Could not get initial state from background.",e)}})();console.log("Pixel Overlay (content_overlay.js) loaded and listening for messages.");