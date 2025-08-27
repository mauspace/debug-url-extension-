// popup.js (Combined Logic - Readable URL Tools & Pixel Overlay with all features)
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT IDs & STORAGE KEYS ---
    const EL_IDS = {
        addParamButton: 'addParam', paramNameSelect: 'paramNameSelect', paramNameCustom: 'paramNameCustom',
        paramValue: 'paramValue', clearParamsButton: 'clearParams', environmentSelect: 'environmentSelect',
        valueSuggestions: 'valueSuggestions', status: 'status', loadingSpinnerUrlTools: 'loadingSpinnerUrlTools',
        toggleSfmcUnwrapperButton: 'toggleSfmcUnwrapper',
        htmlCheckerTextarea: 'htmlCheckerTextarea', htmlCheckerResult: 'htmlCheckerResult', checkHtmlButton: 'checkHtmlButton',
        rulerModeButton: 'rulerModeButton',
        imageUpload: 'imageUpload', overlayControls: 'overlayControls',
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

    // --- DOM ELEMENT REFERENCES ---
    const DOMElements = {};
    for (const key in EL_IDS) {
        DOMElements[key] = document.getElementById(EL_IDS[key]);
    }

    // --- SHARED STATE & CONFIG ---
    const PREDEFINED_PARAMS = {
        names: ['debug', 'rtest', 'forceflush', 'clearcache', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid'],
        values: ['true', 'params', 'section', 'info', 'false', 'social'],
    };
    const MAX_SUGGESTIONS_STORED = 25; const MAX_SUGGESTIONS_DISPLAYED = 6;
    let statusClearTimer = null; const STATUS_CLEAR_DELAY_MS = 3500;
    let currentOverlaySettings = { x: 0, y: 0, opacity: 1, scale: 1, visible: true, locked: false, imageData: null };

    // --- SHARED HELPER FUNCTIONS ---
    function showStatus(message, isError = false, targetDivId = 'status') {
        const targetDiv = DOMElements[targetDivId];
        if (!targetDiv) { console.error(`Popup Error: Status/Result div with ID '${targetDivId}' not found!`); return; }
        const displayMessage = (typeof message === 'string' || message instanceof String) ? message.trim() : (isError ? "An error occurred." : "Done.");
        if (isError) console.error("Popup Status/Result:", displayMessage);
        if (statusClearTimer && targetDivId === 'status') clearTimeout(statusClearTimer);
        targetDiv.innerHTML = displayMessage;
        targetDiv.className = '';
        if (isError) { targetDiv.classList.add('error'); } else { targetDiv.classList.add('success'); }
        if (targetDivId === 'status') {
            statusClearTimer = setTimeout(() => {
                if (DOMElements.status && DOMElements.status.innerHTML === displayMessage) {
                    DOMElements.status.innerHTML = ''; DOMElements.status.className = '';
                }
            }, STATUS_CLEAR_DELAY_MS);
        }
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
            if (!isValidHttpUrl(tab.url)) throw new Error('URL Tools require an HTTP/HTTPS page.');
            return { tab, urlObject: new URL(tab.url) };
        } catch (error) {
            showStatus(error.message || "Error getting active tab.", true);
            setControlsDisabled('urlTools', false);
            throw error;
        }
    }

    function setControlsDisabled(group, busy) {
        const spinner = group === 'urlTools' ? DOMElements.loadingSpinnerUrlTools : DOMElements.loadingSpinnerOverlay;
        if (group === 'urlTools') {
            [DOMElements.addParamButton, DOMElements.paramNameSelect, DOMElements.paramNameCustom, DOMElements.paramValue, DOMElements.clearParamsButton, DOMElements.environmentSelect]
            .forEach(el => { if (el) el.disabled = busy; });
        } else if (group === 'overlay') {
            const mainOverlayInputs = [DOMElements.overlayPosX, DOMElements.overlayPosY, DOMElements.overlayOpacity, DOMElements.overlayScaleInput];
            const isLocked = currentOverlaySettings && currentOverlaySettings.locked;
            const noImageData = currentOverlaySettings && !currentOverlaySettings.imageData;
            mainOverlayInputs.forEach(el => { if (el) el.disabled = busy || isLocked || noImageData; });
            if (DOMElements.imageUpload) DOMElements.imageUpload.disabled = busy || (isLocked && !noImageData);
            if (DOMElements.iconToggleVisibility) DOMElements.iconToggleVisibility.disabled = busy || noImageData;
            if (DOMElements.iconToggleLock) DOMElements.iconToggleLock.disabled = busy || noImageData;
            if (DOMElements.resetOverlayButton) DOMElements.resetOverlayButton.disabled = busy || noImageData;
        }
        if (DOMElements.rulerModeButton) DOMElements.rulerModeButton.disabled = busy;
        if (spinner) spinner.classList.toggle('active', busy);
    }

    // --- FEATURE LOGIC (DEFINITIONS ONLY) ---

    async function saveSuggestion(name, value) {
        if (!name || !value) return;
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramNames, STORAGE_KEYS.paramValues]);
            const namesSet = new Set(data[STORAGE_KEYS.paramNames] || []);
            const valuesSet = new Set(data[STORAGE_KEYS.paramValues] || []);
            let changed = false;
            if (!namesSet.has(name) && !PREDEFINED_PARAMS.names.includes(name)) { namesSet.add(name); changed = true; }
            if (!valuesSet.has(value) && !PREDEFINED_PARAMS.values.includes(value)) { valuesSet.add(value); changed = true; }
            if (changed) { await chrome.storage.sync.set({ [STORAGE_KEYS.paramNames]: [...namesSet].sort().slice(-MAX_SUGGESTIONS_STORED), [STORAGE_KEYS.paramValues]: [...valuesSet].sort().slice(-MAX_SUGGESTIONS_STORED) }); }
        } catch (error) { console.error("Error saving suggestion:", error); showStatus("Failed to save suggestion.", true); }
    }
    async function updateParamNameDropdown() {
        if (!DOMElements.paramNameSelect) return;
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramNames]);
            const savedNames = data[STORAGE_KEYS.paramNames] || [];
            const allNames = [...new Set([...PREDEFINED_PARAMS.names, ...savedNames])].sort();
            const currentCustomValue = DOMElements.paramNameCustom?.value || '';
            const currentSelectedValue = DOMElements.paramNameSelect.value;
            DOMElements.paramNameSelect.innerHTML = '<option value="">-- Select or type custom --</option>';
            allNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; DOMElements.paramNameSelect.appendChild(option); });
            if (currentCustomValue && document.activeElement !== DOMElements.paramNameSelect) DOMElements.paramNameSelect.value = "";
            else if (allNames.includes(currentSelectedValue)) DOMElements.paramNameSelect.value = currentSelectedValue;
            if (DOMElements.paramNameCustom && DOMElements.paramNameCustom.value) DOMElements.paramNameSelect.value = "";
        } catch (error) { console.error("Error loading name suggestions:", error); showStatus("Could not load name suggestions.", true); }
    }
    async function renderValueSuggestions() {
        if (!DOMElements.valueSuggestions) return;
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramValues]);
            const savedValues = data[STORAGE_KEYS.paramValues] || [];
            const allValues = [...new Set([...PREDEFINED_PARAMS.values, ...savedValues])].sort();
            const suggestionsToShow = allValues.slice(0, MAX_SUGGESTIONS_DISPLAYED);
            DOMElements.valueSuggestions.innerHTML = suggestionsToShow.length > 0 ? 'Suggestions: ' : '<i>No value suggestions.</i>';
            suggestionsToShow.forEach((value) => { const span = document.createElement('span'); span.textContent = value; span.className = 'value-suggestion'; span.dataset.value = value; span.title = `Use '${value}'`; DOMElements.valueSuggestions.appendChild(span); DOMElements.valueSuggestions.appendChild(document.createTextNode(' ')); });
        } catch (error) { console.error("Error loading value suggestions:", error); DOMElements.valueSuggestions.innerHTML = '<i>Error loading suggestions.</i>'; }
    }
    function detectPlatform(hostname) {
        const lowerHost = hostname.toLowerCase();
        if (lowerHost.includes('nextcar')) return 'nextcar';
        if (lowerHost.includes('enterpriseplatform')) return 'newcar';
        if (lowerHost.includes('a-car') || lowerHost.includes('my-car')) return 'acar';
        if (lowerHost.includes('fs.')) return 'fs';
        if (lowerHost.includes('retail.')) return 'retail';
        return null;
    }
    function getHostForEnv(envKey) {
        const environmentMap = {
            'dev_nextcar': 'dev-nextcar.rapp.com', 'qa_nextcar': 'qa-nextcar.rapp.com', 'prod_nextcar': 'prod-nextcar.rapp.com', 'usync_nextcar': 'nextcar-usync-online.rapp.com',
            'dev_newcar': 'dev-ocj-enterpriseplatform.rapp.com', 'qa_newcar': 'qa-ocj-enterpriseplatform.rapp.com', 'prod_newcar': 'prod-ocj-enterpriseplatform.rapp.com', 'usync_newcar': 'usync-online.rapp.com',
            'dev_acar': 'dev-a-car-my-car.rapp.com', 'qa_acar': 'qa-a-car-my-car.rapp.com', 'prod_acar': 'prod-a-car-my-car.rapp.com', 'usync_acar': 'usync-online-a-car-my-car.rapp.com',
            'dev_fs': 'dev-fs.rapp.com', 'qa_fs': 'qa-fs.rapp.com', 'prod_fs': 'prod-fs.rapp.com', 'usync_fs': 'usync-online-fs.rapp.com',
            'dev_retail': 'dev-retail.rapp.com', 'qa_retail': 'qa-retail.rapp.com', 'prod_retail': 'prod-retail.rapp.com', 'usync_retail': 'retail-usync-online.rapp.com',
        };
        return environmentMap[envKey];
    }
    function updateSfmcUnwrapperButtonUI(enabled) { if(!DOMElements.toggleSfmcUnwrapperButton)return;DOMElements.toggleSfmcUnwrapperButton.textContent=`SFMC Unwrapper: ${enabled?'ON':'OFF'}`;DOMElements.toggleSfmcUnwrapperButton.classList.toggle('enabled',enabled);DOMElements.toggleSfmcUnwrapperButton.classList.toggle('disabled',!enabled);}
    async function loadSfmcUnwrapperState() { if(!DOMElements.toggleSfmcUnwrapperButton)return;try{const d=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled);updateSfmcUnwrapperButtonUI(d[STORAGE_KEYS.sfmcUnwrapperEnabled]!==undefined?d[STORAGE_KEYS.sfmcUnwrapperEnabled]:true);}catch(e){console.error("Error loading SFMC state:",e);updateSfmcUnwrapperButtonUI(true);}}
    function checkHtmlTags() {
        const htmlInput = DOMElements.htmlCheckerTextarea?.value || '';
        if (!htmlInput.trim()) { showStatus("Please paste HTML code to check.", true, 'htmlCheckerResult'); return; }
        const openTags = []; const mismatches = []; const nestingErrors = []; const selfClosingTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']); const tagRegex = /<\s*(\/)?\s*([a-zA-Z0-9]+)[^>]*>/g; let match;
        while ((match = tagRegex.exec(htmlInput)) !== null) {
            const isClosing = match[1] === '/'; const tagName = match[2].toLowerCase(); const fullTag = match[0]; const lineNumber = htmlInput.substring(0, match.index).split('\n').length;
            if (isClosing) {
                const lastOpen = openTags.length > 0 ? openTags[openTags.length - 1] : null;
                if (lastOpen && lastOpen.element === tagName) { openTags.pop(); }
                else if (lastOpen && lastOpen.element !== tagName) { nestingErrors.push({ line: lineNumber, opening: lastOpen.full, closing: fullTag, expected: `</${lastOpen.element}>` }); const matchingIndex = openTags.findLastIndex(t => t.element === tagName); if (matchingIndex !== -1) openTags.splice(matchingIndex, 1); }
                else { mismatches.push({ tag: tagName, line: lineNumber }); }
            } else if (!selfClosingTags.has(tagName)) { openTags.push({ full: fullTag, element: tagName, line: lineNumber }); }
        }
        let message = '';
        if (openTags.length === 0 && mismatches.length === 0 && nestingErrors.length === 0) { message = '<p style="color: green; font-weight: bold;">Congratulations! No errors found.</p>'; }
        else {
            if (openTags.length > 0) { message += `<p><strong>Unclosed Tags (${openTags.length}):</strong></p><ul>`; openTags.forEach(tag => { message += `<li>Line ${tag.line}: ${tag.full.replace(/</g, '&lt;')}</li>`; }); message += '</ul>'; }
            if (mismatches.length > 0) { message += `<p><strong>Mismatched Closing Tags (${mismatches.length}):</strong></p><ul>`; mismatches.forEach(m => { message += `<li>Line ${m.line}: &lt;/${m.tag}&gt;</li>`; }); message += '</ul>'; }
            if (nestingErrors.length > 0) { message += `<p><strong>Nesting Errors (${nestingErrors.length}):</strong></p><ul>`; nestingErrors.forEach(error => { message += `<li>Line ${error.line}: Found ${error.opening.replace(/</g, '&lt;')}, but expected ${error.expected.replace(/</g, '&lt;')} first.</li>`; }); message += '</ul>'; }
        }
        showStatus(message, false, 'htmlCheckerResult');
    }
    async function sendMessageToContentScript(action, data = {}, source = 'toolkit-popup-overlay') {
        setControlsDisabled('overlay', true);
        try {
            const response = await chrome.runtime.sendMessage({ source, action, ...data });
            console.log("[POPUP] Response from background/content:", response);
            if (response && response.error) showStatus("Error: " + response.error, true);
            else if (response && response.status) showStatus("Tool: " + response.status, false);
        } catch (e) { showStatus(e.message || "Error controlling page tool.", true); }
        finally { setControlsDisabled('overlay', false); updateOverlayControlsUI(); }
    }
    function showOverlayControls() { if(DOMElements.overlayControls)DOMElements.overlayControls.style.display=currentOverlaySettings.imageData?"block":"none";if(DOMElements.overlayIconToolbar)DOMElements.overlayIconToolbar.style.display=currentOverlaySettings.imageData?"flex":"none"}
    function updateOverlayControlsUI() { if(!DOMElements.overlayControls||!DOMElements.overlayIconToolbar||!DOMElements.overlayPosX||!DOMElements.overlayPosY||!DOMElements.overlayOpacity||!DOMElements.overlayOpacityValue||!DOMElements.overlayScaleInput||!DOMElements.iconToggleVisibility||!DOMElements.iconToggleLock)return;DOMElements.overlayPosX.value=currentOverlaySettings.x;DOMElements.overlayPosY.value=currentOverlaySettings.y;DOMElements.overlayOpacity.value=Math.round(100*currentOverlaySettings.opacity);DOMElements.overlayOpacityValue.textContent=Math.round(100*currentOverlaySettings.opacity);DOMElements.overlayScaleInput.value=currentOverlaySettings.scale.toFixed(2);DOMElements.iconToggleVisibility.innerHTML=currentOverlaySettings.visible?"VIS":'<span style="color:#999;text-decoration:line-through;">VIS</span>';DOMElements.iconToggleVisibility.title=currentOverlaySettings.visible?"Hide Overlay":"Show Overlay";DOMElements.iconToggleVisibility.classList.toggle("active-vis",currentOverlaySettings.visible);DOMElements.iconToggleVisibility.classList.toggle("inactive-vis",!currentOverlaySettings.visible);DOMElements.iconToggleLock.innerHTML=currentOverlaySettings.locked?"LCKD":"LOCK";DOMElements.iconToggleLock.title=currentOverlaySettings.locked?"Unlock Controls":"Lock Controls";DOMElements.iconToggleLock.classList.toggle("active-lock",currentOverlaySettings.locked);DOMElements.iconToggleLock.classList.toggle("inactive-lock",!currentOverlaySettings.locked);const t=DOMElements.loadingSpinnerOverlay?.classList.contains("active")||false;setControlsDisabled("overlay",t)}
    function handleOverlaySettingChange(key, value) { if(currentOverlaySettings.locked&&!["visible","locked"].includes(key)){showStatus("Controls are locked! Unlock to make changes.",true);return}currentOverlaySettings[key]=value;const settingsToSave={x:currentOverlaySettings.x,y:currentOverlaySettings.y,opacity:currentOverlaySettings.opacity,visible:currentOverlaySettings.visible,scale:currentOverlaySettings.scale,locked:currentOverlaySettings.locked};chrome.storage.local.set({[STORAGE_KEYS.overlaySettings]:settingsToSave});sendMessageToContentScript("update",{settings:settingsToSave});updateOverlayControlsUI()}
    async function loadInitialOverlayState() { if(!DOMElements.overlayControls&&!DOMElements.overlayIconToolbar)return;try{const result=await chrome.storage.local.get([STORAGE_KEYS.overlayImage,STORAGE_KEYS.overlaySettings]);if(result[STORAGE_KEYS.overlayImage]&&result[STORAGE_KEYS.overlaySettings]){currentOverlaySettings.imageData=result[STORAGE_KEYS.overlayImage];const s=result[STORAGE_KEYS.overlaySettings];currentOverlaySettings.x=s.x||0;currentOverlaySettings.y=s.y||0;currentOverlaySettings.opacity=s.opacity!==undefined?s.opacity:1;currentOverlaySettings.visible=s.visible!==undefined?s.visible:true;currentOverlaySettings.scale=s.scale!==undefined?parseFloat(s.scale):1.0;currentOverlaySettings.locked=s.locked!==undefined?s.locked:false;}}catch(e){console.error("Error loading overlay state:",e),showStatus(e.message||"Error loading overlay state.",true)}};


    // --- MAIN INITIALIZATION & EVENT LISTENER ATTACHMENT ---
    async function initializeApp() {
        console.log("Toolkit Pro Popup: Initializing app...");

        // ATTACH ALL EVENT LISTENERS
        if (DOMElements.addParamButton) DOMElements.addParamButton.addEventListener('click', async () => {
            const paramNameToUse = (DOMElements.paramNameCustom?.value.trim() || DOMElements.paramNameSelect?.value) || '';
            const paramValueToUse = DOMElements.paramValue?.value.trim() || '';
            if (!paramNameToUse) { showStatus('Parameter name is required.', true); (DOMElements.paramNameCustom || DOMElements.paramNameSelect)?.focus(); return; }
            if (!paramValueToUse) { showStatus('Parameter value is required.', true); DOMElements.paramValue?.focus(); return; }
            setControlsDisabled('urlTools', true);
            try {
                const { tab, urlObject } = await getActiveValidTab();
                const names = paramNameToUse.split(',').map(s => s.trim()).filter(Boolean); const values = paramValueToUse.split(',').map(s => s.trim()).filter(Boolean);
                if (names.length === 0 || values.length === 0) { showStatus('No valid names or values provided.', true); return; }
                let paramsAddedCount = 0;
                for (let i = 0; i < Math.min(names.length, values.length); i++) { urlObject.searchParams.set(names[i], values[i]); await saveSuggestion(names[i], values[i]); paramsAddedCount++; }
                if (paramsAddedCount > 0) {
                    await chrome.tabs.update(tab.id, { url: urlObject.toString() }); showStatus(`Added ${paramsAddedCount} parameter(s).`, false);
                    if (DOMElements.paramNameCustom) DOMElements.paramNameCustom.value = ''; if (DOMElements.paramValue) DOMElements.paramValue.value = ''; if (DOMElements.paramNameSelect) DOMElements.paramNameSelect.value = '';
                    await updateParamNameDropdown(); await renderValueSuggestions();
                } else { showStatus('No parameters were added.', true); }
            } catch (error) { console.error("Add param error:", error.message); }
            finally { setControlsDisabled('urlTools', false); }
        });
        if (DOMElements.clearParamsButton) DOMElements.clearParamsButton.addEventListener('click', async () => {
            setControlsDisabled('urlTools', true);
            try {
                const { tab, urlObject } = await getActiveValidTab();
                if (!urlObject.search) { showStatus('No parameters to clear.', false); return; }
                urlObject.search = ''; await chrome.tabs.update(tab.id, { url: urlObject.toString() }); showStatus('Parameters cleared.', false);
            } catch (error) { console.error("Clear params error:", error.message); }
            finally { setControlsDisabled('urlTools', false); }
        });
        if (DOMElements.environmentSelect) {
            console.log("[DEBUG-ENV] Attaching 'change' listener to envSelect element:", DOMElements.environmentSelect);
            DOMElements.environmentSelect.addEventListener('change', async (e) => {
                const selectedEnvKey = e.target.value;
                console.log(`[DEBUG-ENV] EnvSelect 'change' event FIRED. Selected key: '${selectedEnvKey}'`);
                if (!selectedEnvKey) return;
                setControlsDisabled('urlTools', true);
                try {
                    await chrome.storage.sync.set({ [STORAGE_KEYS.environment]: selectedEnvKey });
                    const { tab, urlObject } = await getActiveValidTab();
                    const newHost = getHostForEnv(selectedEnvKey);
                    if (!newHost) { showStatus(`Unknown env key: ${selectedEnvKey}`, true); setControlsDisabled('urlTools', false); return; }
                    if (urlObject.hostname.toLowerCase() === newHost.toLowerCase()) { showStatus(`Already on ${selectedEnvKey.split('_')[0]}.`, false); setControlsDisabled('urlTools', false); return; }
                    urlObject.hostname = newHost;
                    await chrome.tabs.update(tab.id, { url: urlObject.toString() });
                    showStatus(`Switched to ${selectedEnvKey.split('_')[0]}.`, false);
                    setTimeout(() => window.close(), 700);
                } catch (error) {
                    console.error("Popup: Env switch error caught:", error.message);
                    if (document.visibilityState === 'visible') { setControlsDisabled('urlTools', false); }
                }
            });
        } else {
            console.error("[DEBUG-ENV] CRITICAL: DOMElements.environmentSelect was not found. Cannot attach listener.");
        }
        if (DOMElements.toggleSfmcUnwrapperButton) DOMElements.toggleSfmcUnwrapperButton.addEventListener('click', async () => { try{const d=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled);const n=!(d[STORAGE_KEYS.sfmcUnwrapperEnabled]!==undefined?d[STORAGE_KEYS.sfmcUnwrapperEnabled]:true);await chrome.storage.sync.set({[STORAGE_KEYS.sfmcUnwrapperEnabled]:n});updateSfmcUnwrapperButtonUI(n);showStatus(`SFMC Unwrapper ${n?'ENABLED':'DISABLED'}.`,false);}catch(e){showStatus(e.message||'Error toggling SFMC.',true);}});
        if (DOMElements.checkHtmlButton) DOMElements.checkHtmlButton.addEventListener('click', checkHtmlTags);
        if (DOMElements.rulerModeButton) DOMElements.rulerModeButton.addEventListener('click', () => { sendMessageToContentScript('toggleRulerMode'); window.close(); });
        if (DOMElements.imageUpload) DOMElements.imageUpload.addEventListener('change', (event) => { const file=event.target.files[0];if(file&&file.type.startsWith("image/")){const reader=new FileReader;reader.onload=async e=>{currentOverlaySettings={imageData:e.target.result,visible:true,scale:1,x:0,y:0,opacity:1,locked:false};const settingsToSave={x:0,y:0,opacity:1,scale:1,visible:true,locked:false};try{await chrome.storage.local.set({[STORAGE_KEYS.overlayImage]:currentOverlaySettings.imageData,[STORAGE_KEYS.overlaySettings]:settingsToSave});updateOverlayControlsUI();showOverlayControls();sendMessageToContentScript("create",{imageData:currentOverlaySettings.imageData,settings:settingsToSave})}catch(storageError){showStatus("Failed to save overlay image.",true);}};reader.onerror=()=>{showStatus("Error reading image file.",true);};reader.readAsDataURL(file)}else if(file){showStatus("Please select a valid image file.",true);DOMElements.imageUpload.value=""}});
        if (DOMElements.overlayPosX) DOMElements.overlayPosX.addEventListener("input", () => handleOverlaySettingChange("x", parseInt(DOMElements.overlayPosX.value) || 0));
        if (DOMElements.overlayPosY) DOMElements.overlayPosY.addEventListener("input", () => handleOverlaySettingChange("y", parseInt(DOMElements.overlayPosY.value) || 0));
        if (DOMElements.overlayOpacity) DOMElements.overlayOpacity.addEventListener("input", () => { const t = parseInt(DOMElements.overlayOpacity.value) / 100; if (DOMElements.overlayOpacityValue) DOMElements.overlayOpacityValue.textContent = DOMElements.overlayOpacity.value; handleOverlaySettingChange("opacity", t) });
        if (DOMElements.overlayScaleInput) DOMElements.overlayScaleInput.addEventListener("input", () => { let newScale = parseFloat(DOMElements.overlayScaleInput.value); const minScale = parseFloat(DOMElements.overlayScaleInput.min) || .1, maxScale = parseFloat(DOMElements.overlayScaleInput.max) || 5; (isNaN(newScale) || newScale < minScale ? newScale = minScale : newScale > maxScale && (newScale = maxScale), newScale.toFixed(2) !== parseFloat(DOMElements.overlayScaleInput.value).toFixed(2)) && (DOMElements.overlayScaleInput.value = newScale.toFixed(2)), handleOverlaySettingChange("scale", newScale) });
        if (DOMElements.iconToggleVisibility) DOMElements.iconToggleVisibility.addEventListener("click", () => handleOverlaySettingChange("visible", !currentOverlaySettings.visible));
        if (DOMElements.iconToggleLock) DOMElements.iconToggleLock.addEventListener("click", () => handleOverlaySettingChange("locked", !currentOverlaySettings.locked));
        if (DOMElements.resetOverlayButton) DOMElements.resetOverlayButton.addEventListener("click", async () => { try { await chrome.storage.local.remove([STORAGE_KEYS.overlayImage, STORAGE_KEYS.overlaySettings]), currentOverlaySettings = { x: 0, y: 0, opacity: 1, scale: 1, visible: false, locked: false, imageData: null }, DOMElements.imageUpload && (DOMElements.imageUpload.value = ""), updateOverlayControlsUI(), showOverlayControls(), sendMessageToContentScript("remove"), showStatus("Overlay removed.", false) } catch (e) { showStatus(e.message || "Failed to reset overlay.", true) } });
        
        // --- INITIAL UI STATE SETUP ---
        setControlsDisabled('urlTools', true);
        if (DOMElements.imageUpload) DOMElements.imageUpload.disabled = true;
        if (DOMElements.rulerModeButton) DOMElements.rulerModeButton.disabled = true;

        let isInitialTabValid = false;
        let platformForEnvSelect = null;
        try {
            const { tab, urlObject } = await getActiveValidTab();
            isInitialTabValid = true;
            platformForEnvSelect = detectPlatform(urlObject.hostname);
            setControlsDisabled('urlTools', false);
            if (DOMElements.rulerModeButton) DOMElements.rulerModeButton.disabled = false;
        } catch (e) {
            console.warn("initializeApp: Tab not valid for some tools. Error:", e.message);
            if (e.message && !e.message.includes("No active tab")) {
                if (DOMElements.rulerModeButton) DOMElements.rulerModeButton.disabled = false;
            }
        }

        await updateParamNameDropdown();
        await renderValueSuggestions();

        if (DOMElements.environmentSelect) {
            DOMElements.environmentSelect.value = "";
            let firstVisibleOpt = null;
            Array.from(DOMElements.environmentSelect.options).forEach(opt => {
                const matches = platformForEnvSelect && opt.value && opt.value.endsWith(`_${platformForEnvSelect}`);
                const isPlaceholder = opt.value === "";
                opt.hidden = !isPlaceholder && !matches && platformForEnvSelect;
                if (matches && !firstVisibleOpt) firstVisibleOpt = opt;
            });
            const store = await chrome.storage.sync.get(STORAGE_KEYS.environment);
            const savedEnv = store[STORAGE_KEYS.environment];
            const savedOptNode = savedEnv ? DOMElements.environmentSelect.querySelector(`option[value="${savedEnv}"]`) : null;
            if (savedOptNode && !savedOptNode.hidden) { DOMElements.environmentSelect.value = savedEnv; }
            else if (firstVisibleOpt) { DOMElements.environmentSelect.value = firstVisibleOpt.value; }
            else if (savedOptNode) { Array.from(DOMElements.environmentSelect.options).forEach(o => o.hidden = (o.value === "")); DOMElements.environmentSelect.value = savedEnv; }
        }

        await loadSfmcUnwrapperState();
        await loadInitialOverlayState();
        showOverlayControls();
        updateOverlayControlsUI();

        console.log("Toolkit Pro Popup initialized.");
    }
    initializeApp().catch(err => {
        console.error("App initialization failed catastrophically:", err);
        showStatus(err.message || "Popup init failed badly.", true);
        setControlsDisabled('urlTools', false);
        updateOverlayControlsUI();
    });
});