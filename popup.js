// popup.js (Combined Logic - Readable URL Tools & Pixel Overlay with all features)
document.addEventListener('DOMContentLoaded', () => {
    const EL_IDS = {
        addParamButton: 'addParam', paramNameSelect: 'paramNameSelect', paramNameCustom: 'paramNameCustom',
        paramValue: 'paramValue', clearParamsButton: 'clearParams', environmentSelect: 'environmentSelect',
        valueSuggestions: 'valueSuggestions', status: 'status', loadingSpinnerUrlTools: 'loadingSpinnerUrlTools',
        toggleSfmcUnwrapperButton: 'toggleSfmcUnwrapper', imageUpload: 'imageUpload', overlayControls: 'overlayControls',
        overlayIconToolbar: 'overlayIconToolbar', iconToggleVisibility: 'iconToggleVisibility', iconToggleLock: 'iconToggleLock',
        overlayPosX: 'overlayPosX', overlayPosY: 'overlayPosY', overlayOpacity: 'overlayOpacity',
        overlayOpacityValue: 'overlayOpacityValue', overlayScaleInput: 'overlayScaleInput',
        resetOverlayButton: 'resetOverlay', loadingSpinnerOverlay: 'loadingSpinnerOverlay'
    };
    const STORAGE_KEYS = {
        paramNames: 'paramNames', paramValues: 'paramValues', environment: 'environment',
        sfmcUnwrapperEnabled: 'sfmcUnwrapperEnabled', overlayImage: 'toolkitOverlayImage',
        overlaySettings: 'toolkitOverlaySettings'
    };

    const DOMElements = {};
    let criticalElementMissing = false;
    console.log("[POPUP JS] Starting to populate DOMElements...");
    for (const key in EL_IDS) {
        DOMElements[key] = document.getElementById(EL_IDS[key]);
        const criticalIds = ['status', 'addParam', 'paramNameSelect', 'paramNameCustom', 'paramValue', 'environmentSelect', 'imageUpload'];
        if (!DOMElements[key] && criticalIds.includes(key)) {
            console.error(`[POPUP JS CRITICAL] DOM Element for key '${key}' with ID '${EL_IDS[key]}' NOT FOUND.`);
            criticalElementMissing = true;
        } else if (!DOMElements[key] && key !== 'loadingSpinnerUrlTools' && key !== 'loadingSpinnerOverlay' && key !== 'overlayIconToolbar' && key !== 'overlayControls') {
            console.warn(`[POPUP JS WARNING] Optional DOM Element for key '${key}' with ID '${EL_IDS[key]}' not found.`);
        } else if (DOMElements[key] && key === 'environmentSelect') {
             console.log(`[POPUP JS] DOM Element for key 'environmentSelect' FOUND initially:`, DOMElements.environmentSelect);
        }
    }
    console.log("[POPUP JS] Finished populating DOMElements. Critical element missing:", criticalElementMissing);
    if (!DOMElements.environmentSelect) {
        console.error("[POPUP JS CRITICAL] DOMElements.environmentSelect is specifically NULL or UNDEFINED after population loop.");
        criticalElementMissing = true;
    }

    if (criticalElementMissing && !DOMElements.status) {
        alert("CRITICAL POPUP ERROR: Essential HTML elements are missing. Extension cannot function. Check console (Ctrl+Shift+J on popup).");
        return;
    } else if (criticalElementMissing) {
        // Try to show status if statusDiv itself exists
        if (DOMElements.status) {
            showStatus("Error: Popup HTML structure is broken. Check console.", true);
        }
        // Disable all interactable elements if possible to prevent further errors
        Object.keys(EL_IDS).forEach(key => {
            if (DOMElements[key] && typeof DOMElements[key].disabled !== 'undefined') {
                DOMElements[key].disabled = true;
            }
        });
        return; // Stop further script execution
    }

    // --- TRACE LOG POINT A ---
    console.log("[TRACE DOMElements.envSelect - Point A] Value:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);

    const PREDEFINED_PARAMS = {
        names: ['debug', 'rtest', 'forceflush', 'clearcache', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid'],
        values: ['true', 'params', 'style', 'section', 'info', 'false', '1', 'test'],
    };
    const MAX_SUGGESTIONS_STORED = 25; const MAX_SUGGESTIONS_DISPLAYED = 8;
    let statusClearTimer = null; const STATUS_CLEAR_DELAY_MS = 3500;

    // --- TRACE LOG POINT B ---
    console.log("[TRACE DOMElements.envSelect - Point B] After constants. Value:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);


    function showStatus(message, isError = false, isOverlayStatus = false) {
        if (!DOMElements.status) { console.error("Internal Popup Error: showStatus called but #status element is missing!"); return; }
        const displayMessage = (typeof message === 'string' || message instanceof String) ? message.trim() : (isError ? "An error occurred." : "Done.");
        if (isError) console.error("Popup Status:", displayMessage);
        if (statusClearTimer) clearTimeout(statusClearTimer);
        DOMElements.status.textContent = displayMessage; DOMElements.status.className = '';
        if (isError) DOMElements.status.classList.add('error');
        else if (isOverlayStatus) DOMElements.status.classList.add('info');
        else DOMElements.status.classList.add('success');
        statusClearTimer = setTimeout(() => {
            if (DOMElements.status && DOMElements.status.textContent === displayMessage) { DOMElements.status.textContent = ''; DOMElements.status.className = ''; }
        }, STATUS_CLEAR_DELAY_MS);
    }

    function isValidHttpUrl(urlString) {
        if (!urlString || typeof urlString !== 'string') return false;
        try { const url = new URL(urlString); return ['http:', 'https:'].includes(url.protocol); }
        catch (e) { return false; }
    }

    async function getActiveValidTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found.');
            if (!tab.id) throw new Error('Could not get tab ID.');
            if (!isValidHttpUrl(tab.url)) throw new Error('Page is not HTTP/HTTPS.');
            console.log("[DEBUG-ENV] getActiveValidTab: Success. Tab URL:", tab.url);
            return { tab, urlObject: new URL(tab.url) };
        } catch (error) {
            console.error("[DEBUG-ENV] getActiveValidTab Error:", error.message);
            showStatus(error.message || "Error getting active tab.", true);
            setControlsDisabled('urlTools', false);
            throw error;
        }
    }

    // CORRECTED setControlsDisabled from your last feedback
    function setControlsDisabled(group, busy) {
        console.log(`[POPUP DEBUG] setControlsDisabled called for group: '${group}', busy: ${busy}`);
        let elementsToProcess;
        const spinner = group === 'urlTools' ? DOMElements.loadingSpinnerUrlTools : DOMElements.loadingSpinnerOverlay;

        if (group === 'urlTools') {
            elementsToProcess = [
                DOMElements.addParamButton, DOMElements.paramNameSelect, DOMElements.paramNameCustom,
                DOMElements.paramValue, DOMElements.clearParamsButton, DOMElements.envSelect
            ];
            elementsToProcess.forEach(el => { if (el) el.disabled = busy; });
        } else if (group === 'overlay') {
            const mainOverlayInputs = [
                DOMElements.overlayPosX, DOMElements.overlayPosY,
                DOMElements.overlayOpacity, DOMElements.overlayScaleInput
            ];
            // Ensure currentOverlaySettings is defined before accessing its properties
            const isLocked = currentOverlaySettings && currentOverlaySettings.locked;
            const noImageData = currentOverlaySettings && !currentOverlaySettings.imageData;

            console.log(`[POPUP DEBUG] setControlsDisabled (overlay) - isLocked: ${isLocked}, noImageData: ${noImageData}, busy: ${busy}`);

            mainOverlayInputs.forEach(el => { if (el) el.disabled = busy || isLocked || noImageData; });

            if (DOMElements.imageUpload) { DOMElements.imageUpload.disabled = busy || (isLocked && !noImageData); } // Corrected: allow upload if no image even if "locked" (lock applies to existing)
            if (DOMElements.iconToggleVisibility) DOMElements.iconToggleVisibility.disabled = busy || noImageData;
            if (DOMElements.iconToggleLock) DOMElements.iconToggleLock.disabled = busy || noImageData; // Lock itself should be active if there's an image
            if (DOMElements.resetOverlayButton) DOMElements.resetOverlayButton.disabled = busy || noImageData;

            console.log(`[POPUP DEBUG] setControlsDisabled (overlay) results - PosX.disabled: ${DOMElements.overlayPosX ? DOMElements.overlayPosX.disabled : 'N/A'}, Upload.disabled: ${DOMElements.imageUpload ? DOMElements.imageUpload.disabled : 'N/A'}`);
        }
        if (spinner) spinner.classList.toggle('active', busy);
    }


    // --- TRACE LOG POINT C ---
    console.log("[TRACE DOMElements.envSelect - Point C] After core helper function definitions. Value:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);


    // --- URL TOOLS LOGIC ---
    async function saveSuggestion(name, value) {
        if (!name || !value) return;
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramNames, STORAGE_KEYS.paramValues]);
            const namesSet = new Set(data[STORAGE_KEYS.paramNames] || []);
            const valuesSet = new Set(data[STORAGE_KEYS.paramValues] || []);
            let changed = false;
            if (!namesSet.has(name) && !PREDEFINED_PARAMS.names.includes(name)) { namesSet.add(name); changed = true; }
            if (!valuesSet.has(value) && !PREDEFINED_PARAMS.values.includes(value)) { valuesSet.add(value); changed = true; }
            if (changed) {
                await chrome.storage.sync.set({
                    [STORAGE_KEYS.paramNames]: [...namesSet].sort().slice(-MAX_SUGGESTIONS_STORED),
                    [STORAGE_KEYS.paramValues]: [...valuesSet].sort().slice(-MAX_SUGGESTIONS_STORED)
                });
            }
        } catch (error) { console.error("Error saving suggestion:", error); showStatus("Failed to save suggestion.", true); }
    }

    async function updateParamNameDropdown() {
        if (!DOMElements.paramNameSelect) { console.warn("updateParamNameDropdown: paramNameSelect element not found."); return; }
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramNames]);
            const savedNames = data[STORAGE_KEYS.paramNames] || [];
            const allNames = [...new Set([...PREDEFINED_PARAMS.names, ...savedNames])].sort();
            const currentCustomValue = DOMElements.paramNameCustom ? DOMElements.paramNameCustom.value : '';
            const currentSelectedValue = DOMElements.paramNameSelect.value;
            DOMElements.paramNameSelect.innerHTML = '<option value="">-- Select or type custom --</option>';
            allNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; DOMElements.paramNameSelect.appendChild(option); });
            if (currentCustomValue && document.activeElement !== DOMElements.paramNameSelect) DOMElements.paramNameSelect.value = "";
            else if (allNames.includes(currentSelectedValue)) DOMElements.paramNameSelect.value = currentSelectedValue;
            if (DOMElements.paramNameCustom && DOMElements.paramNameCustom.value) DOMElements.paramNameSelect.value = "";
        } catch (error) { console.error("Error loading name suggestions:", error); showStatus("Could not load name suggestions.", true); }
    }

    async function renderValueSuggestions() {
        if (!DOMElements.valueSuggestions) { console.warn("renderValueSuggestions: valueSuggestions element not found."); return; }
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramValues]);
            const savedValues = data[STORAGE_KEYS.paramValues] || [];
            const allValues = [...new Set([...PREDEFINED_PARAMS.values, ...savedValues])].sort();
            const suggestionsToShow = allValues.slice(0, MAX_SUGGESTIONS_DISPLAYED);
            DOMElements.valueSuggestions.innerHTML = suggestionsToShow.length > 0 ? 'Suggestions: ' : '<i>No value suggestions.</i>';
            suggestionsToShow.forEach((value) => { const span = document.createElement('span'); span.textContent = value; span.className = 'value-suggestion'; span.dataset.value = value; span.title = `Use '${value}'`; DOMElements.valueSuggestions.appendChild(span); DOMElements.valueSuggestions.appendChild(document.createTextNode(' ')); });
        } catch (error) { console.error("Error loading value suggestions:", error); DOMElements.valueSuggestions.innerHTML = '<i>Error loading suggestions.</i>'; }
    }

    if (DOMElements.valueSuggestions) DOMElements.valueSuggestions.addEventListener('click', (e) => { if (e.target.classList.contains('value-suggestion') && DOMElements.paramValue) { DOMElements.paramValue.value = e.target.dataset.value; DOMElements.paramValue.focus(); } });
    if (DOMElements.paramNameSelect) DOMElements.paramNameSelect.addEventListener('change', () => { if (DOMElements.paramNameCustom && DOMElements.paramNameSelect.value !== "") DOMElements.paramNameCustom.value = ""; });
    if (DOMElements.paramNameCustom) DOMElements.paramNameCustom.addEventListener('input', () => { if (DOMElements.paramNameSelect && DOMElements.paramNameCustom.value !== "") DOMElements.paramNameSelect.value = ""; });

    function detectPlatform(hostname) { const lH=hostname.toLowerCase();if(lH.includes('nextcar'))return'nextcar';if(lH.includes('enterpriseplatform'))return'newcar';if(lH.includes('a-car')||lH.includes('my-car'))return'acar';if(lH.includes('fs.'))return'fs';if(lH.includes('retail.'))return'retail';console.log("[POPUP DEBUG] detectPlatform did not identify platform for hostname:",hostname);return null;}
    function getHostForEnv(envKey){ console.log("[POPUP DEBUG] getHostForEnv called with key:",envKey);const map={'dev_nextcar':'dev-nextcar.rapp.com','qa_nextcar':'qa-nextcar.rapp.com','prod_nextcar':'prod-nextcar.rapp.com','usync_nextcar':'nextcar-usync-online.rapp.com','dev_newcar':'dev-ocj-enterpriseplatform.rapp.com','qa_newcar':'qa-ocj-enterpriseplatform.rapp.com','prod_newcar':'prod-ocj-enterpriseplatform.rapp.com','usync_newcar':'usync-online.rapp.com','dev_acar':'dev-a-car-my-car.rapp.com','qa_acar':'qa-a-car-my-car.rapp.com','prod_acar':'prod-a-car-my-car.rapp.com','usync_acar':'usync-online-a-car-my-car.rapp.com','dev_fs':'dev-fs.rapp.com','qa_fs':'qa-fs.rapp.com','prod_fs':'prod-fs.rapp.com','usync_fs':'usync-online-fs.rapp.com','dev_retail':'dev-retail.rapp.com','qa_retail':'qa-retail.rapp.com','prod_retail':'prod-retail.rapp.com','usync_retail':'retail-usync-online.rapp.com',};const host=map[envKey];console.log("[POPUP DEBUG] getHostForEnv returning host:",host,"for key:",envKey);return host;}

    if(DOMElements.addParamButton)DOMElements.addParamButton.addEventListener('click',async()=>{ const pNS=DOMElements.paramNameSelect?.value||'';const pNC=DOMElements.paramNameCustom?.value.trim()||'';const pNTU=pNC||pNS;const pVTU=DOMElements.paramValue?.value.trim()||'';if(!pNTU){showStatus('Parameter name is required.',!0);(DOMElements.paramNameCustom||DOMElements.paramNameSelect)?.focus();return;}if(!pVTU){showStatus('Parameter value is required.',!0);DOMElements.paramValue?.focus();return;}if(pNC&&/[&=?#]/.test(pNC))showStatus('Warning: Custom name has special chars.',!0);setControlsDisabled('urlTools',!0);try{const{tab:t,urlObject:uO}=await getActiveValidTab();const n=pNTU.split(',').map(s=>s.trim()).filter(Boolean);const v=pVTU.split(',').map(s=>s.trim()).filter(Boolean);if(n.length===0||v.length===0){showStatus('No valid names or values provided.',!0);return;}let pAC=0;for(let i=0;i<Math.min(n.length,v.length);i++){uO.searchParams.set(n[i],v[i]);await saveSuggestion(n[i],v[i]);pAC++;}if(pAC>0){await chrome.tabs.update(t.id,{url:uO.toString()});showStatus(`Added ${pAC} parameter(s).`,!1);if(DOMElements.paramNameCustom)DOMElements.paramNameCustom.value='';if(DOMElements.paramValue)DOMElements.paramValue.value='';if(DOMElements.paramNameSelect)DOMElements.paramNameSelect.value='';await updateParamNameDropdown();await renderValueSuggestions();}else{showStatus('No parameters were added.',!0);}}catch(e){console.error("Add param error:",e.message);}finally{setControlsDisabled('urlTools',!1);}});
    if(DOMElements.clearParamsButton)DOMElements.clearParamsButton.addEventListener('click',async()=>{setControlsDisabled('urlTools',!0);try{const{tab:t,urlObject:uO}=await getActiveValidTab();if(!uO.search){showStatus('No parameters to clear.',!1);return;}uO.search='';await chrome.tabs.update(t.id,{url:uO.toString()});showStatus('Parameters cleared.',!1);}catch(e){console.error("Clear params error:",e.message);}finally{setControlsDisabled('urlTools',!1);}});

    // --- TRACE LOG POINT D ---
    console.log("[TRACE DOMElements.envSelect - Point D] After URL Tool functions and most URL listeners. Value IS:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);

    // Refined EnvSelect Listener
    console.log("[SUPER TRACE] IMMEDIATELY BEFORE envSelect listener IF. DOMElements.environmentSelect IS:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);
    const envSelectRefForListener = DOMElements.environmentSelect;
    console.log("[SUPER TRACE] Copied to envSelectRefForListener. Value IS:", envSelectRefForListener, "Type IS:", typeof envSelectRefForListener);

    if (envSelectRefForListener) {
        console.log("[DEBUG-ENV] Attaching 'change' listener to envSelect element. Element is:", envSelectRefForListener);
        envSelectRefForListener.addEventListener('change', async (e) => {
            const selectedEnvKey = e.target.value;
            console.log(`[DEBUG-ENV] EnvSelect 'change' event FIRED. Selected key: '${selectedEnvKey}'`);
            if (!selectedEnvKey) { console.log("[DEBUG-ENV] EnvSelect: No key selected (placeholder). Listener returning."); return; }
            setControlsDisabled('urlTools', true);let navigationAttempted = false;
            try {
                await chrome.storage.sync.set({ [STORAGE_KEYS.environment]: selectedEnvKey }); console.log("[DEBUG-ENV] EnvSelect: Saved preference to storage:", selectedEnvKey);
                const { tab, urlObject } = await getActiveValidTab(); console.log("[DEBUG-ENV] EnvSelect: getActiveValidTab() SUCCEEDED. Current URL:", urlObject.href);
                const newHost = getHostForEnv(selectedEnvKey);
                if (!newHost) { showStatus(`Unknown env key: ${selectedEnvKey}`,!0); console.warn("[DEBUG-ENV] EnvSelect: Condition '!newHost' is TRUE. newHost is undefined or empty."); setControlsDisabled('urlTools',!1); return; }
                console.log(`[DEBUG-ENV] EnvSelect: Comparing current hostname '${urlObject.hostname.toLowerCase()}' with newHost '${newHost.toLowerCase()}'`);
                if (urlObject.hostname.toLowerCase() === newHost.toLowerCase()) { showStatus(`Already on ${selectedEnvKey.split('_')[0]}.`,!1); console.log("[DEBUG-ENV] EnvSelect: Condition 'Already on target host' is TRUE."); setControlsDisabled('urlTools',!1); return; }
                urlObject.hostname = newHost; const finalUrlToNavigate = urlObject.toString(); console.log("[DEBUG-ENV] EnvSelect: Modified urlObject.hostname. Attempting to update tab to new URL:", finalUrlToNavigate); navigationAttempted = true;
                console.log(`[DEBUG-ENV] EnvSelect: Calling chrome.tabs.update(${tab.id}, { url: "${finalUrlToNavigate}" })`);
                await chrome.tabs.update(tab.id, { url: finalUrlToNavigate }); showStatus(`Switched to ${selectedEnvKey.split('_')[0]}.`,!1); console.log("[DEBUG-ENV] EnvSelect: chrome.tabs.update SUCCEEDED (promise resolved). Closing popup."); setTimeout(() => window.close(), 700);
            } catch (error) {
                console.error("[DEBUG-ENV] EnvSelect: Error caught in 'change' listener's try-catch block:", error.message, error);
                if (!navigationAttempted && (!DOMElements.status || !DOMElements.status.textContent.trim() || (DOMElements.status.textContent && !DOMElements.status.textContent.includes("HTTP/HTTPS") && !DOMElements.status.textContent.includes("No active tab")))) { showStatus(error.message || "Error preparing to switch environment.",!0); }
                else if (navigationAttempted && DOMElements.status && !DOMElements.status.textContent.includes("Switched to")) { showStatus(error.message || "Error during environment switch.",!0); }
                if (document.visibilityState === 'visible') setControlsDisabled('urlTools',!1);
            }
        });
        console.log("[DEBUG-ENV] 'change' listener ATTACHED to envSelect.");
    } else {
        console.error("[DEBUG-ENV] CRITICAL: envSelectRefForListener (snapshot of DOMElements.envSelect) is null at listener attachment time. Cannot attach 'change' listener.");
    }

    // --- TRACE LOG POINT E ---
    console.log("[TRACE DOMElements.envSelect - Point E] Before initializeApp. Value IS:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);

    function updateSfmcUnwrapperButtonUI(enabled){if(!DOMElements.toggleSfmcUnwrapperButton)return;DOMElements.toggleSfmcUnwrapperButton.textContent=`SFMC Unwrapper: ${enabled?'ON':'OFF'}`;DOMElements.toggleSfmcUnwrapperButton.classList.toggle('enabled',enabled);DOMElements.toggleSfmcUnwrapperButton.classList.toggle('disabled',!enabled);}
    async function loadSfmcUnwrapperState(){if(!DOMElements.toggleSfmcUnwrapperButton)return;try{const d=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled);updateSfmcUnwrapperButtonUI(d[STORAGE_KEYS.sfmcUnwrapperEnabled]!==undefined?d[STORAGE_KEYS.sfmcUnwrapperEnabled]:true);}catch(e){console.error("Error loading SFMC state:",e);updateSfmcUnwrapperButtonUI(true);}}
    if (DOMElements.toggleSfmcUnwrapperButton) { DOMElements.toggleSfmcUnwrapperButton.addEventListener('click', async () => { try{const d=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled);const n=!(d[STORAGE_KEYS.sfmcUnwrapperEnabled]!==undefined?d[STORAGE_KEYS.sfmcUnwrapperEnabled]:true);await chrome.storage.sync.set({[STORAGE_KEYS.sfmcUnwrapperEnabled]:n});updateSfmcUnwrapperButtonUI(n);showStatus(`SFMC Unwrapper ${n?'ENABLED':'DISABLED'}.`,false);}catch(e){showStatus(e.message||'Error toggling SFMC.',true);}}); }

    // --- PIXEL OVERLAY LOGIC ---
    let currentOverlaySettings={x:0,y:0,opacity:1,scale:1,visible:!0,locked:!1,imageData:null};function showOverlayControls(){if(DOMElements.overlayControls)DOMElements.overlayControls.style.display=currentOverlaySettings.imageData?"block":"none";if(DOMElements.overlayIconToolbar)DOMElements.overlayIconToolbar.style.display=currentOverlaySettings.imageData?"flex":"none"} function updateOverlayControlsUI(){if(!DOMElements.overlayControls||!DOMElements.overlayIconToolbar||!DOMElements.overlayPosX||!DOMElements.overlayPosY||!DOMElements.overlayOpacity||!DOMElements.overlayOpacityValue||!DOMElements.overlayScaleInput||!DOMElements.iconToggleVisibility||!DOMElements.iconToggleLock){console.warn("Overlay Logic: UI elements missing for updateOverlayControlsUI.");return}DOMElements.overlayPosX.value=currentOverlaySettings.x,DOMElements.overlayPosY.value=currentOverlaySettings.y,DOMElements.overlayOpacity.value=Math.round(100*currentOverlaySettings.opacity),DOMElements.overlayOpacityValue.textContent=Math.round(100*currentOverlaySettings.opacity),DOMElements.overlayScaleInput.value=currentOverlaySettings.scale.toFixed(2),DOMElements.iconToggleVisibility.innerHTML=currentOverlaySettings.visible?"VIS":'<span style="color:#999;text-decoration:line-through;">VIS</span>',DOMElements.iconToggleVisibility.title=currentOverlaySettings.visible?"Hide Overlay":"Show Overlay",DOMElements.iconToggleVisibility.classList.toggle("active-vis",currentOverlaySettings.visible),DOMElements.iconToggleVisibility.classList.toggle("inactive-vis",!currentOverlaySettings.visible),DOMElements.iconToggleLock.innerHTML=currentOverlaySettings.locked?"LCKD":"LOCK",DOMElements.iconToggleLock.title=currentOverlaySettings.locked?"Unlock Controls":"Lock Controls",DOMElements.iconToggleLock.classList.toggle("active-lock",currentOverlaySettings.locked),DOMElements.iconToggleLock.classList.toggle("inactive-lock",!currentOverlaySettings.locked);const t=DOMElements.loadingSpinnerOverlay?DOMElements.loadingSpinnerOverlay.classList.contains("active"):!1;setControlsDisabled("overlay",t)} async function sendMessageToOverlayContentScript(t,e={}){setControlsDisabled("overlay",!0);try{console.log("[POPUP DEBUG] Sending overlay message to background:",{source:"toolkit-popup-overlay",action:t,...e});const o=await chrome.runtime.sendMessage({source:"toolkit-popup-overlay",action:t,...e});console.log("[POPUP DEBUG] Response from background/content for overlay:",o),o&&o.error?showStatus("Overlay Error: "+o.error,!0,!0):o&&o.status&&showStatus("Overlay: "+o.status,!1,!0)}catch(t){showStatus(t.message||"Error controlling overlay.",!0,!0)}finally{setControlsDisabled("overlay",!1),updateOverlayControlsUI()}} if(DOMElements.imageUpload)DOMElements.imageUpload.addEventListener("change",t=>{const e=t.target.files[0];if(e&&e.type.startsWith("image/")){const t=new FileReader;t.onload=async o=>{currentOverlaySettings.imageData=o.target.result,currentOverlaySettings.visible=!0,currentOverlaySettings.scale=1,currentOverlaySettings.x=0,currentOverlaySettings.y=0,currentOverlaySettings.opacity=1,currentOverlaySettings.locked=!1;const n={x:currentOverlaySettings.x,y:currentOverlaySettings.y,opacity:currentOverlaySettings.opacity,visible:currentOverlaySettings.visible,scale:currentOverlaySettings.scale,locked:currentOverlaySettings.locked};try{await chrome.storage.local.set({[STORAGE_KEYS.overlayImage]:currentOverlaySettings.imageData,[STORAGE_KEYS.overlaySettings]:n}),updateOverlayControlsUI(),showOverlayControls(),sendMessageToOverlayContentScript("create",{imageData:currentOverlaySettings.imageData,settings:n})}catch(t){console.error("Error saving overlay data:",t),showStatus("Failed to save overlay image.",!0,!0)}};t.onerror=()=>{console.error("FileReader error."),showStatus("Error reading image file.",!0,!0)};t.readAsDataURL(e)}else e&&(showStatus("Please select valid image (PNG, JPG, etc).",!0,!0),DOMElements.imageUpload.value="")}); function handleOverlaySettingChange(t,e){if(currentOverlaySettings.locked&&!["visible","locked"].includes(t))return void showStatus("Controls are locked! Unlock to make changes.",!0,!0);currentOverlaySettings[t]=e;const o={x:currentOverlaySettings.x,y:currentOverlaySettings.y,opacity:currentOverlaySettings.opacity,visible:currentOverlaySettings.visible,scale:currentOverlaySettings.scale,locked:currentOverlaySettings.locked};console.log("[POPUP DEBUG] handleOverlaySettingChange. Key:",t,"Value:",e),chrome.storage.local.set({[STORAGE_KEYS.overlaySettings]:o}),sendMessageToOverlayContentScript("update",{settings:o}),updateOverlayControlsUI()} DOMElements.overlayPosX&&DOMElements.overlayPosX.addEventListener("input",()=>handleOverlaySettingChange("x",parseInt(DOMElements.overlayPosX.value)||0)),DOMElements.overlayPosY&&DOMElements.overlayPosY.addEventListener("input",()=>handleOverlaySettingChange("y",parseInt(DOMElements.overlayPosY.value)||0)),DOMElements.overlayOpacity&&DOMElements.overlayOpacity.addEventListener("input",()=>{const t=parseInt(DOMElements.overlayOpacity.value)/100;DOMElements.overlayOpacityValue&&(DOMElements.overlayOpacityValue.textContent=DOMElements.overlayOpacity.value),handleOverlaySettingChange("opacity",t)}),DOMElements.overlayScaleInput&&DOMElements.overlayScaleInput.addEventListener("input",()=>{let t=parseFloat(DOMElements.overlayScaleInput.value);const e=parseFloat(DOMElements.overlayScaleInput.min)||.1,o=parseFloat(DOMElements.overlayScaleInput.max)||5;(isNaN(t)||t<e?t=e:t>o&&(t=o),t.toFixed(2)!==parseFloat(DOMElements.overlayScaleInput.value).toFixed(2))&&(DOMElements.overlayScaleInput.value=t.toFixed(2)),handleOverlaySettingChange("scale",t)}),DOMElements.iconToggleVisibility&&DOMElements.iconToggleVisibility.addEventListener("click",()=>handleOverlaySettingChange("visible",!currentOverlaySettings.visible)),DOMElements.iconToggleLock&&DOMElements.iconToggleLock.addEventListener("click",()=>handleOverlaySettingChange("locked",!currentOverlaySettings.locked)),DOMElements.resetOverlayButton&&DOMElements.resetOverlayButton.addEventListener("click",async()=>{try{await chrome.storage.local.remove([STORAGE_KEYS.overlayImage,STORAGE_KEYS.overlaySettings]),currentOverlaySettings={x:0,y:0,opacity:1,scale:1,visible:!1,locked:!1,imageData:null},DOMElements.imageUpload&&(DOMElements.imageUpload.value=""),updateOverlayControlsUI(),showOverlayControls(),sendMessageToOverlayContentScript("remove"),showStatus("Overlay removed.",!1,!0)}catch(t){showStatus(t.message||"Failed to reset overlay.",!0,!0)}}); async function loadInitialOverlayState(){if(DOMElements.overlayControls||DOMElements.overlayIconToolbar)try{const t=await chrome.storage.local.get([STORAGE_KEYS.overlayImage,STORAGE_KEYS.overlaySettings]);if(t[STORAGE_KEYS.overlayImage]&&t[STORAGE_KEYS.overlaySettings]){currentOverlaySettings.imageData=t[STORAGE_KEYS.overlayImage];const e=t[STORAGE_KEYS.overlaySettings];currentOverlaySettings.x=e.x||0,currentOverlaySettings.y=e.y||0,currentOverlaySettings.opacity=void 0!==e.opacity?e.opacity:1,currentOverlaySettings.visible=void 0!==e.visible,currentOverlaySettings.scale=void 0!==e.scale?parseFloat(e.scale):1,currentOverlaySettings.locked=void 0!==e.locked&&e.locked,console.log("[POPUP DEBUG] loadInitialOverlayState - Loaded settings:",currentOverlaySettings)}}catch(t){console.error("Error loading overlay state:",t),showStatus(t.message||"Error loading overlay state.",!0,!0)}}


    // --- MAIN INITIALIZATION ---
    async function initializeApp() {
        console.log("[DEBUG-ENV] initializeApp: Starting.");
        console.log("[TRACE DOMElements.envSelect - Point F] Inside initializeApp START. Value IS:", DOMElements.environmentSelect, "Type IS:", typeof DOMElements.environmentSelect);

        setControlsDisabled('urlTools', true);
        if(DOMElements.imageUpload) DOMElements.imageUpload.disabled = true;

        let isInitialTabValidForUrlTools = false; let platformForEnvSelect = null;
        try {
            console.log("[DEBUG-ENV] initializeApp: Calling getActiveValidTab().");
            const { tab, urlObject } = await getActiveValidTab();
            isInitialTabValidForUrlTools = true;
            platformForEnvSelect = detectPlatform(urlObject.hostname);
            console.log("[DEBUG-ENV] initializeApp: getActiveValidTab() SUCCEEDED. Platform:", platformForEnvSelect);
            setControlsDisabled('urlTools', false);
        } catch (e) {
            console.warn("[DEBUG-ENV] initializeApp: getActiveValidTab() FAILED or threw. Error:", e.message);
        }

        console.log("[DEBUG-ENV] initializeApp: Calling updateParamNameDropdown() and renderValueSuggestions(). Value of envSelect before:", DOMElements.environmentSelect);
        await updateParamNameDropdown();
        await renderValueSuggestions();
        console.log("[DEBUG-ENV] initializeApp: Finished suggestion functions. Value of envSelect after:", DOMElements.environmentSelect);

        if (DOMElements.envSelect) {
            console.log("[DEBUG-ENV] initializeApp: Initializing envSelect dropdown. Platform detected for filtering:", platformForEnvSelect, "envSelect element:", DOMElements.envSelect);
            DOMElements.envSelect.value = ""; let firstVisibleOpt = null;
            Array.from(DOMElements.envSelect.options).forEach(opt => { const matches = platformForEnvSelect && opt.value && opt.value.endsWith(`_${platformForEnvSelect}`); const isPlaceholder = opt.value === ""; opt.hidden = !isPlaceholder && !matches && platformForEnvSelect; if(matches && !firstVisibleOpt) firstVisibleOpt = opt; });
            const store = await chrome.storage.sync.get(STORAGE_KEYS.environment); const savedEnv = store[STORAGE_KEYS.environment]; const savedOptNode = savedEnv ? DOMElements.envSelect.querySelector(`option[value="${savedEnv}"]`) : null;
            if(savedOptNode && !savedOptNode.hidden)DOMElements.envSelect.value = savedEnv;
            else if (firstVisibleOpt) DOMElements.envSelect.value = firstVisibleOpt.value;
            else if (savedOptNode) { Array.from(DOMElements.envSelect.options).forEach(o => o.hidden = (o.value === "")); DOMElements.envSelect.value = savedEnv; }
            else { DOMElements.envSelect.value = "";}
            console.log("[POPUP DEBUG] initializeApp - EnvSelect final initial value:", DOMElements.envSelect ? DOMElements.envSelect.value : 'N/A');
        } else {
            console.warn("[DEBUG-ENV] initializeApp: DOMElements.envSelect is null during envSelect init block (inside initializeApp). This should have been caught by criticalElementMissing.");
        }

        await loadSfmcUnwrapperState();
        await loadInitialOverlayState();
        showOverlayControls();
        updateOverlayControlsUI();

        console.log("Toolkit Pro Popup initialized.");
    }

    if (criticalElementMissing) {
        console.error("Popup script cannot fully initialize due to missing critical HTML elements. Review CRITICAL logs above.");
        if (DOMElements.status) {
             showStatus("Error: Popup HTML structure is broken. Check console.", true);
        }
    } else {
        console.log("[POPUP JS] All critical DOMElements appear to be found. Proceeding with initializeApp().");
        initializeApp().catch(err => {
            console.error("App initialization failed catastrophically:", err);
            showStatus(err.message || "Popup init failed badly.", true);
            setControlsDisabled('urlTools', false);
            updateOverlayControlsUI();
        });
    }
});