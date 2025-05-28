// popup.js (Combined Logic - URL Tools & Pixel Overlay with Icon Toolbar & Lock Fix)
document.addEventListener('DOMContentLoaded', () => {
    const EL_IDS = {
        addParamButton: 'addParam', paramNameSelect: 'paramNameSelect', paramNameCustom: 'paramNameCustom',
        paramValue: 'paramValue', clearParamsButton: 'clearParams', environmentSelect: 'environmentSelect',
        valueSuggestions: 'valueSuggestions', status: 'status', loadingSpinnerUrlTools: 'loadingSpinnerUrlTools',
        toggleSfmcUnwrapperButton: 'toggleSfmcUnwrapper',
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

    const DOMElements = {};
    for (const key in EL_IDS) { DOMElements[key] = document.getElementById(EL_IDS[key]); }

    const PREDEFINED_PARAMS = { names: ['debug','rtest','utm_source'], values: ['true','params','style','info','false','email'] };
    const MAX_SUGGESTIONS_STORED = 25; const MAX_SUGGESTIONS_DISPLAYED = 6;
    let statusClearTimer = null; const STATUS_CLEAR_DELAY_MS = 3500;

    function showStatus(message, isError=false, isOverlayStatus=false) {
        if (!DOMElements.status) { console.error("Popup Error: #status element missing!"); return; }
        const displayMessage = (typeof message === 'string' || message instanceof String) ? message.trim() : (isError ? "An error occurred." : "Done.");
        if (isError) console.error("Popup Status:", displayMessage); if (statusClearTimer) clearTimeout(statusClearTimer);
        DOMElements.status.textContent = displayMessage; DOMElements.status.className = '';
        if (isError) DOMElements.status.classList.add('error');
        else if (isOverlayStatus) DOMElements.status.classList.add('info');
        else DOMElements.status.classList.add('success');
        statusClearTimer = setTimeout(() => { if (DOMElements.status.textContent === displayMessage) { DOMElements.status.textContent = ''; DOMElements.status.className = ''; } }, STATUS_CLEAR_DELAY_MS);
    }
    function isValidHttpUrl(u) { try { const url=new URL(u);return['http:','https:'].includes(url.protocol); } catch(e){return false;} }
    async function getActiveValidTab() {
        try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); if (!tab) throw new Error('No active tab found.'); if (!tab.id) throw new Error('Could not get tab ID.'); if (!isValidHttpUrl(tab.url)) throw new Error('Page is not HTTP/HTTPS.'); return { tab, urlObject: new URL(tab.url) }; } catch (error) { showStatus(error.message || "Error getting active tab.", true); throw error; }
    }

    function setControlsDisabled(group, busy) {
        console.log(`[POPUP DEBUG] setControlsDisabled called for group: '${group}', busy: ${busy}`);
        let elementsToProcess; const spinner = group === 'urlTools' ? DOMElements.loadingSpinnerUrlTools : DOMElements.loadingSpinnerOverlay;
        if (group === 'urlTools') {
            elementsToProcess = [DOMElements.addParamButton, DOMElements.paramNameSelect, DOMElements.paramNameCustom, DOMElements.paramValue, DOMElements.clearParamsButton, DOMElements.envSelect];
            elementsToProcess.forEach(el => { if (el) el.disabled = busy; });
        } else if (group === 'overlay') {
            const mainOverlayInputs = [DOMElements.overlayPosX, DOMElements.overlayPosY, DOMElements.overlayOpacity, DOMElements.overlayScaleInput];
            const isLocked = currentOverlaySettings && currentOverlaySettings.locked;
            console.log(`[POPUP DEBUG] setControlsDisabled (overlay) - isLocked: ${isLocked}, current imageData: ${!!currentOverlaySettings.imageData}, busy: ${busy}`);
            mainOverlayInputs.forEach(el => { if (el) el.disabled = busy || isLocked; });
            if (DOMElements.imageUpload) DOMElements.imageUpload.disabled = busy || (isLocked && currentOverlaySettings.imageData);
            const noImageData = !currentOverlaySettings.imageData;
            if (DOMElements.iconToggleVisibility) DOMElements.iconToggleVisibility.disabled = busy || noImageData;
            if (DOMElements.iconToggleLock) DOMElements.iconToggleLock.disabled = busy || noImageData;
            if (DOMElements.resetOverlayButton) DOMElements.resetOverlayButton.disabled = busy || noImageData;
            console.log(`[POPUP DEBUG] setControlsDisabled (overlay) - PosX.disabled: ${DOMElements.overlayPosX ? DOMElements.overlayPosX.disabled : 'N/A'}`);
        }
        if (spinner) spinner.classList.toggle('active', busy);
    }

    // --- URL TOOLS LOGIC ---
    async function saveSuggestion(name,value){if(!name||!value)return;try{const t=await chrome.storage.sync.get([STORAGE_KEYS.paramNames,STORAGE_KEYS.paramValues]),e=new Set(t[STORAGE_KEYS.paramNames]||[]),o=new Set(t[STORAGE_KEYS.paramValues]||[]);let n=!1;e.has(name)||PREDEFINED_PARAMS.names.includes(name)||(e.add(name),n=!0),o.has(value)||PREDEFINED_PARAMS.values.includes(value)||(o.add(value),n=!0),n&&await chrome.storage.sync.set({[STORAGE_KEYS.paramNames]:[...e].sort().slice(-MAX_SUGGESTIONS_STORED),[STORAGE_KEYS.paramValues]:[...o].sort().slice(-MAX_SUGGESTIONS_STORED)})}catch(t){console.error("Error saving suggestion:",t),showStatus("Failed to save suggestion.",!0)}}
    async function updateParamNameDropdown(){if(!DOMElements.paramNameSelect)return;try{const t=await chrome.storage.sync.get([STORAGE_KEYS.paramNames]),e=t[STORAGE_KEYS.paramNames]||[],o=[...new Set([...PREDEFINED_PARAMS.names,...e])].sort(),n=DOMElements.paramNameCustom?DOMElements.paramNameCustom.value:"",s=DOMElements.paramNameSelect.value;DOMElements.paramNameSelect.innerHTML='<option value="">-- Select or type custom --</option>',o.forEach(t=>{const e=document.createElement("option");e.value=t,e.textContent=t,DOMElements.paramNameSelect.appendChild(e)}),n&&document.activeElement!==DOMElements.paramNameSelect?DOMElements.paramNameSelect.value="":o.includes(s)?DOMElements.paramNameSelect.value=s:DOMElements.paramNameCustom&&DOMElements.paramNameCustom.value&&(DOMElements.paramNameSelect.value="")}catch(t){console.error("Error loading name suggestions:",t),showStatus("Could not load name suggestions.",!0)}}
    async function renderValueSuggestions(){if(!DOMElements.valueSuggestions)return;try{const t=await chrome.storage.sync.get([STORAGE_KEYS.paramValues]),e=t[STORAGE_KEYS.paramValues]||[],o=[...new Set([...PREDEFINED_PARAMS.values,...e])].sort(),n=o.slice(0,MAX_SUGGESTIONS_DISPLAYED);DOMElements.valueSuggestions.innerHTML=n.length>0?"Suggestions: ":"<i>No value suggestions.</i>",n.forEach(t=>{const e=document.createElement("span");e.textContent=t,e.className="value-suggestion",e.dataset.value=t,e.title=`Use '${t}'`,DOMElements.valueSuggestions.appendChild(e),DOMElements.valueSuggestions.appendChild(document.createTextNode(" "))})}catch(t){console.error("Error loading value suggestions:",t),DOMElements.valueSuggestions.innerHTML="<i>Error loading.</i>"}}
    if(DOMElements.valueSuggestions)DOMElements.valueSuggestions.addEventListener("click",t=>{t.target.classList.contains("value-suggestion")&&DOMElements.paramValue&&(DOMElements.paramValue.value=t.target.dataset.value,DOMElements.paramValue.focus())});if(DOMElements.paramNameSelect)DOMElements.paramNameSelect.addEventListener("change",()=>{DOMElements.paramNameCustom&&""!==DOMElements.paramNameSelect.value&&(DOMElements.paramNameCustom.value="")});if(DOMElements.paramNameCustom)DOMElements.paramNameCustom.addEventListener("input",()=>{DOMElements.paramNameSelect&&""!==DOMElements.paramNameCustom.value&&(DOMElements.paramNameSelect.value="")});
    function detectPlatform(t){const e=t.toLowerCase();return e.includes("nextcar")?"nextcar":e.includes("enterpriseplatform")?"newcar":e.includes("a-car")||e.includes("my-car")?"acar":e.includes("fs.")?"fs":e.includes("retail.")?"retail":(console.log("[POPUP DEBUG] detectPlatform did not identify platform for hostname:",t),null)}
    function getHostForEnv(t){console.log("[POPUP DEBUG] getHostForEnv called with key:",t);const e={dev_nextcar:"dev-nextcar.rapp.com",qa_nextcar:"qa-nextcar.rapp.com",prod_nextcar:"prod-nextcar.rapp.com",usync_nextcar:"nextcar-usync-online.rapp.com",dev_newcar:"dev-ocj-enterpriseplatform.rapp.com",qa_newcar:"qa-ocj-enterpriseplatform.rapp.com",prod_newcar:"prod-ocj-enterpriseplatform.rapp.com",usync_newcar:"usync-online.rapp.com",dev_acar:"dev-a-car-my-car.rapp.com",qa_acar:"qa-a-car-my-car.rapp.com",prod_acar:"prod-a-car-my-car.rapp.com",usync_acar:"usync-online-a-car-my-car.rapp.com",dev_fs:"dev-fs.rapp.com",qa_fs:"qa-fs.rapp.com",prod_fs:"prod-fs.rapp.com",usync_fs:"usync-online-fs.rapp.com",dev_retail:"dev-retail.rapp.com",qa_retail:"qa-retail.rapp.com",prod_retail:"prod-retail.rapp.com",usync_retail:"retail-usync-online.rapp.com"},o=e[t];return console.log("[POPUP DEBUG] getHostForEnv returning host:",o,"for key:",t),o}
    if(DOMElements.addParamButton)DOMElements.addParamButton.addEventListener("click",async()=>{const t=DOMElements.paramNameSelect?DOMElements.paramNameSelect.value:"",e=DOMElements.paramNameCustom?DOMElements.paramNameCustom.value.trim():"",o=e||t,n=DOMElements.paramValue?DOMElements.paramValue.value.trim():"";if(!o)return showStatus("Param name required.",!0),(DOMElements.paramNameCustom||DOMElements.paramNameSelect)?.focus(),void 0;if(!n)return showStatus("Param value required.",!0),DOMElements.paramValue?.focus(),void 0;e&&/[&=?#]/.test(e)&&showStatus("Warning: Custom name has special chars.",!0),setControlsDisabled("urlTools",!0);try{const{tab:t,urlObject:e}=await getActiveValidTab(),s=o.split(",").map(t=>t.trim()).filter(Boolean),a=n.split(",").map(t=>t.trim()).filter(Boolean);if(!s.length||!a.length)return void showStatus("No valid names/values.",!0);let r=0;for(let t=0;t<Math.min(s.length,a.length);t++)e.searchParams.set(s[t],a[t]),await saveSuggestion(s[t],a[t]),r++;r>0?(await chrome.tabs.update(t.id,{url:e.toString()}),showStatus(`Added ${r} param(s).`,!1),DOMElements.paramNameCustom&&(DOMElements.paramNameCustom.value=""),DOMElements.paramValue&&(DOMElements.paramValue.value=""),DOMElements.paramNameSelect&&(DOMElements.paramNameSelect.value=""),await updateParamNameDropdown(),await renderValueSuggestions()):showStatus("No params added.",!0)}catch(t){console.error("Add param error:",t.message)}finally{setControlsDisabled("urlTools",!1)}});
    if(DOMElements.clearParamsButton)DOMElements.clearParamsButton.addEventListener("click",async()=>{setControlsDisabled("urlTools",!0);try{const{tab:t,urlObject:e}=await getActiveValidTab();if(!e.search)return void showStatus("No params to clear.",!1);e.search="",await chrome.tabs.update(t.id,{url:e.toString()}),showStatus("Params cleared.",!1)}catch(t){console.error("Clear params error:",t.message)}finally{setControlsDisabled("urlTools",!1)}});
    if(DOMElements.envSelect)DOMElements.envSelect.addEventListener("change",async t=>{const e=t.target.value;if(console.log("[POPUP DEBUG] EnvSelect 'change' event. Selected key:",e),!e)return console.log("[POPUP DEBUG] EnvSelect: No key selected, returning."),void 0;setControlsDisabled("urlTools",!0);try{await chrome.storage.sync.set({[STORAGE_KEYS.environment]:e}),console.log("[POPUP DEBUG] EnvSelect: Saved preference to storage:",e);const{tab:t,urlObject:o}=await getActiveValidTab();console.log("[POPUP DEBUG] EnvSelect: Got active valid tab. URL:",o.href);const n=getHostForEnv(e);if(!n)showStatus(`Unknown env key: ${e}`,!0),console.warn("[POPUP DEBUG] EnvSelect: newHost is undefined for key:",e);else if(o.hostname.toLowerCase()===n.toLowerCase())showStatus(`Already on ${e.split("_")[0]}.`,!1),console.log("[POPUP DEBUG] EnvSelect: Already on target host.");else{o.hostname=n,console.log("[POPUP DEBUG] EnvSelect: Attempting to update tab to new URL:",o.toString()),await chrome.tabs.update(t.id,{url:o.toString()}),showStatus(`Switched to ${e.split("_")[0]}.`,!1),console.log("[POPUP DEBUG] EnvSelect: Tab update initiated. Closing popup."),setTimeout(()=>window.close(),700)}}catch(t){DOMElements.status&&!DOMElements.status.textContent.trim()||showStatus(t.message||"Error switching environment.",!0),console.error("Popup: Env switch error caught:",t.message,t)}finally{document.visibilityState==="visible"&&DOMElements.addParamButton&&DOMElements.addParamButton.disabled?(console.log("[POPUP DEBUG] EnvSelect: 'finally' block, re-enabling URL tools controls."),setControlsDisabled("urlTools",!1)):console.log("[POPUP DEBUG] EnvSelect: 'finally' block, not re-enabling controls.")}});
    function updateSfmcUnwrapperButtonUI(t){if(!DOMElements.toggleSfmcUnwrapperButton)return;DOMElements.toggleSfmcUnwrapperButton.textContent=`SFMC Unwrapper: ${t?"ON":"OFF"}`,DOMElements.toggleSfmcUnwrapperButton.classList.toggle("enabled",t),DOMElements.toggleSfmcUnwrapperButton.classList.toggle("disabled",!t)}
    async function loadSfmcUnwrapperState(){if(!DOMElements.toggleSfmcUnwrapperButton)return;try{const t=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled);updateSfmcUnwrapperButtonUI(void 0!==t[STORAGE_KEYS.sfmcUnwrapperEnabled]?t[STORAGE_KEYS.sfmcUnwrapperEnabled]:!0)}catch(t){console.error("Error loading SFMC state:",t),updateSfmcUnwrapperButtonUI(!0)}}
    if(DOMElements.toggleSfmcUnwrapperButton)DOMElements.toggleSfmcUnwrapperButton.addEventListener("click",async()=>{try{const t=await chrome.storage.sync.get(STORAGE_KEYS.sfmcUnwrapperEnabled),e=!(void 0!==t[STORAGE_KEYS.sfmcUnwrapperEnabled]?t[STORAGE_KEYS.sfmcUnwrapperEnabled]:!0);await chrome.storage.sync.set({[STORAGE_KEYS.sfmcUnwrapperEnabled]:e}),updateSfmcUnwrapperButtonUI(e),showStatus(`SFMC Unwrapper ${e?"ENABLED":"DISABLED"}.`,!1)}catch(t){showStatus(t.message||"Error toggling SFMC.",!0)}});

    // --- PIXEL OVERLAY LOGIC ---
    let currentOverlaySettings = { x:0, y:0, opacity:1, scale:1, visible:true, locked:false, imageData:null };

    function updateOverlayControlsUI() {
        if (!DOMElements.overlayControls || !DOMElements.overlayIconToolbar || !DOMElements.overlayPosX || !DOMElements.overlayPosY || !DOMElements.overlayOpacity || !DOMElements.overlayOpacityValue || !DOMElements.overlayScaleInput || !DOMElements.iconToggleVisibility || !DOMElements.iconToggleLock ) { console.warn("Overlay Logic: UI elements missing for updateOverlayControlsUI"); return; }
        DOMElements.overlayPosX.value = currentOverlaySettings.x; DOMElements.overlayPosY.value = currentOverlaySettings.y;
        DOMElements.overlayOpacity.value = Math.round(currentOverlaySettings.opacity*100); DOMElements.overlayOpacityValue.textContent = Math.round(currentOverlaySettings.opacity*100);
        DOMElements.overlayScaleInput.value = currentOverlaySettings.scale.toFixed(2);
        if (DOMElements.iconToggleVisibility) {
            DOMElements.iconToggleVisibility.innerHTML = currentOverlaySettings.visible ? 'VIS' : '<span style="color:#999;text-decoration:line-through;">VIS</span>';
            DOMElements.iconToggleVisibility.title = currentOverlaySettings.visible ? "Hide Overlay" : "Show Overlay";
            DOMElements.iconToggleVisibility.classList.toggle('active-vis', currentOverlaySettings.visible); DOMElements.iconToggleVisibility.classList.toggle('inactive-vis', !currentOverlaySettings.visible);
        }
        if (DOMElements.iconToggleLock) {
            DOMElements.iconToggleLock.innerHTML = currentOverlaySettings.locked ? 'LCKD' : 'LOCK';
            DOMElements.iconToggleLock.title = currentOverlaySettings.locked ? "Unlock Controls" : "Lock Controls";
            DOMElements.iconToggleLock.classList.toggle('active-lock', currentOverlaySettings.locked); DOMElements.iconToggleLock.classList.toggle('inactive-lock', !currentOverlaySettings.locked);
        }
        const isOverlayCurrentlyBusy = DOMElements.loadingSpinnerOverlay ? DOMElements.loadingSpinnerOverlay.classList.contains('active') : false;
        setControlsDisabled('overlay', isOverlayCurrentlyBusy);
    }
    function showOverlayControls() {
        const show = !!currentOverlaySettings.imageData;
        if(DOMElements.overlayControls) DOMElements.overlayControls.style.display = show ? 'block' : 'none';
        if(DOMElements.overlayIconToolbar) DOMElements.overlayIconToolbar.style.display = show ? 'flex' : 'none';
    }
    async function sendMessageToOverlayContentScript(action, data = {}) {
        setControlsDisabled('overlay', true); // Indicate busy
        try {
            console.log("[POPUP DEBUG] Sending overlay message to background:", { source: 'toolkit-popup-overlay', action, ...data });
            const response = await chrome.runtime.sendMessage({ source: 'toolkit-popup-overlay', action, ...data });
            console.log("[POPUP DEBUG] Response from background/content for overlay:", response);
            if (response && response.error) showStatus("Overlay Error: " + response.error, true, true);
            else if (response && response.status) showStatus("Overlay: " + response.status, false, true);
        } catch (e) { showStatus(e.message || "Error controlling overlay.", true, true); }
        finally { setControlsDisabled('overlay', false); updateOverlayControlsUI(); }
    }

    if (DOMElements.imageUpload) DOMElements.imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                currentOverlaySettings.imageData = e.target.result; currentOverlaySettings.visible = true;
                currentOverlaySettings.scale = 1; currentOverlaySettings.x = 0; currentOverlaySettings.y = 0; currentOverlaySettings.opacity = 1; currentOverlaySettings.locked = false;
                const settingsToSave = { x:currentOverlaySettings.x, y:currentOverlaySettings.y, opacity:currentOverlaySettings.opacity, visible:currentOverlaySettings.visible, scale:currentOverlaySettings.scale, locked:currentOverlaySettings.locked };
                try {
                    await chrome.storage.local.set({ [STORAGE_KEYS.overlayImage]: currentOverlaySettings.imageData, [STORAGE_KEYS.overlaySettings]: settingsToSave });
                    updateOverlayControlsUI(); showOverlayControls();
                    sendMessageToOverlayContentScript('create', { imageData: currentOverlaySettings.imageData, settings: settingsToSave });
                } catch (storageError) { console.error("Error saving overlay data:", storageError); showStatus("Failed to save overlay image.", true, true); }
            };
            reader.onerror = () => { console.error("FileReader error."); showStatus("Error reading image file.", true, true); };
            reader.readAsDataURL(file);
        } else if (file) { showStatus("Please select valid image (PNG, JPG, etc).", true, true); DOMElements.imageUpload.value = ''; }
    });

    function handleOverlaySettingChange(key, value) {
        if (currentOverlaySettings.locked && !['visible', 'locked'].includes(key)) { showStatus("Controls are locked! Unlock to make changes.", true, true); updateOverlayControlsUI(); return; }
        currentOverlaySettings[key] = value;
        const settingsToSave = { x:currentOverlaySettings.x, y:currentOverlaySettings.y, opacity:currentOverlaySettings.opacity, visible:currentOverlaySettings.visible, scale:currentOverlaySettings.scale, locked:currentOverlaySettings.locked };
        console.log("[POPUP DEBUG] handleOverlaySettingChange. Key:", key, "Value:", value, "currentSettings:", JSON.stringify(currentOverlaySettings).substring(0,100)+"...");
        chrome.storage.local.set({ [STORAGE_KEYS.overlaySettings]: settingsToSave });
        sendMessageToOverlayContentScript('update', { settings: settingsToSave });
        updateOverlayControlsUI();
    }

    if(DOMElements.overlayPosX) DOMElements.overlayPosX.addEventListener('input',()=>handleOverlaySettingChange('x',parseInt(DOMElements.overlayPosX.value)||0));
    if(DOMElements.overlayPosY) DOMElements.overlayPosY.addEventListener('input',()=>handleOverlaySettingChange('y',parseInt(DOMElements.overlayPosY.value)||0));
    if(DOMElements.overlayOpacity) DOMElements.overlayOpacity.addEventListener('input',()=>{ const opac=parseInt(DOMElements.overlayOpacity.value)/100; if(DOMElements.overlayOpacityValue) DOMElements.overlayOpacityValue.textContent=DOMElements.overlayOpacity.value; handleOverlaySettingChange('opacity',opac); });
    if (DOMElements.overlayScaleInput) DOMElements.overlayScaleInput.addEventListener('input', () => {
        let newScale = parseFloat(DOMElements.overlayScaleInput.value); console.log("[POPUP DEBUG] Scale input changed. Raw:", DOMElements.overlayScaleInput.value, "Parsed:", newScale);
        if (isNaN(newScale) || newScale <= 0) { console.warn("[POPUP DEBUG] Invalid scale input:", DOMElements.overlayScaleInput.value); newScale = Math.max(parseFloat(DOMElements.overlayScaleInput.min) || 0.1, currentOverlaySettings.scale); DOMElements.overlayScaleInput.value = newScale.toFixed(2); }
        const minScale = parseFloat(DOMElements.overlayScaleInput.min) || 0.1; const maxScale = parseFloat(DOMElements.overlayScaleInput.max) || 5;
        newScale = Math.max(minScale, Math.min(maxScale, newScale)); if (newScale.toFixed(2) !== parseFloat(DOMElements.overlayScaleInput.value).toFixed(2)) { DOMElements.overlayScaleInput.value = newScale.toFixed(2); }
        handleOverlaySettingChange('scale', newScale);
    });
    if(DOMElements.iconToggleVisibility) DOMElements.iconToggleVisibility.addEventListener('click',()=>handleOverlaySettingChange('visible',!currentOverlaySettings.visible));
    if(DOMElements.iconToggleLock) DOMElements.iconToggleLock.addEventListener('click',()=>handleOverlaySettingChange('locked',!currentOverlaySettings.locked));
    if(DOMElements.resetOverlayButton) DOMElements.resetOverlayButton.addEventListener('click', async ()=>{
        try {
            await chrome.storage.local.remove([STORAGE_KEYS.overlayImage,STORAGE_KEYS.overlaySettings]);
            currentOverlaySettings = {x:0,y:0,opacity:1,scale:1,visible:false,locked:false,imageData:null}; if(DOMElements.imageUpload) DOMElements.imageUpload.value = '';
            updateOverlayControlsUI(); showOverlayControls(); sendMessageToOverlayContentScript('remove'); showStatus("Overlay removed.", false, true);
        } catch(e){ showStatus(e.message||"Failed to reset overlay.",true,true); }
    });

    async function loadInitialOverlayState() {
        if(!DOMElements.overlayControls && !DOMElements.overlayIconToolbar) return;
        try {
            const result = await chrome.storage.local.get([STORAGE_KEYS.overlayImage,STORAGE_KEYS.overlaySettings]);
            if(result[STORAGE_KEYS.overlayImage] && result[STORAGE_KEYS.overlaySettings]){
                currentOverlaySettings.imageData = result[STORAGE_KEYS.overlayImage]; const s = result[STORAGE_KEYS.overlaySettings];
                currentOverlaySettings.x = s.x||0; currentOverlaySettings.y = s.y||0;
                currentOverlaySettings.opacity = s.opacity !== undefined ? s.opacity : 1;
                currentOverlaySettings.visible = s.visible !== undefined ? s.visible : true;
                currentOverlaySettings.scale = s.scale !== undefined ? parseFloat(s.scale) : 1;
                currentOverlaySettings.locked = s.locked !== undefined ? s.locked : false;
                console.log("[POPUP DEBUG] loadInitialOverlayState - Loaded settings:", currentOverlaySettings);
            }
            // updateOverlayControlsUI and showOverlayControls are called AFTER settings are loaded
            // and will use the loaded currentOverlaySettings.locked state.
            updateOverlayControlsUI();
            showOverlayControls();
        } catch (e) { console.error("Error loading overlay state:", e); showStatus(e.message||"Error loading overlay state.",true,true); }
    }

    async function initializeApp() {
        // Set URL tools to busy initially, overlay controls' initial disabled state will be
        // handled by updateOverlayControlsUI after its state is loaded.
        setControlsDisabled('urlTools', true);
        if (DOMElements.imageUpload) DOMElements.imageUpload.disabled = true; // Disable initially until state is known

        let isInitialTabValidForUrlTools = false; let platformForEnvSelect = null;
        try {
            const { tab, urlObject } = await getActiveValidTab();
            isInitialTabValidForUrlTools = true; platformForEnvSelect = detectPlatform(urlObject.hostname);
        } catch (e) { /* getActiveValidTab shows status */ }
        await updateParamNameDropdown(); await renderValueSuggestions();
        if (isInitialTabValidForUrlTools) {
            setControlsDisabled('urlTools', false);
            if (DOMElements.envSelect) { /* ... (same env select init logic) ... */
                DOMElements.envSelect.value = ""; let firstVisibleOpt = null;
                Array.from(DOMElements.envSelect.options).forEach(opt => { const matches = platformForEnvSelect && opt.value && opt.value.endsWith(`_${platformForEnvSelect}`); const isPlaceholder = opt.value === ""; opt.hidden = !isPlaceholder && !matches && platformForEnvSelect; if(matches && !firstVisibleOpt) firstVisibleOpt = opt; });
                const store = await chrome.storage.sync.get(STORAGE_KEYS.environment); const savedEnv = store[STORAGE_KEYS.environment]; const savedOptNode = savedEnv ? DOMElements.envSelect.querySelector(`option[value="${savedEnv}"]`) : null;
                if(savedOptNode && !savedOptNode.hidden) DOMElements.envSelect.value = savedEnv;
                else if (firstVisibleOpt) DOMElements.envSelect.value = firstVisibleOpt.value;
                else if (savedOptNode) { Array.from(DOMElements.envSelect.options).forEach(o => o.hidden = (o.value === "")); DOMElements.envSelect.value = savedEnv; }
                console.log("[POPUP DEBUG] initializeApp - EnvSelect final value:", DOMElements.envSelect.value);
            }
        } else { if (DOMElements.envSelect) { /* ... (same fallback env select init logic) ... */
            Array.from(DOMElements.envSelect.options).forEach(o => o.hidden = (o.value === "")); const store = await chrome.storage.sync.get(STORAGE_KEYS.environment); const savedEnv = store[STORAGE_KEYS.environment];
            if (savedEnv && DOMElements.envSelect.querySelector(`option[value="${savedEnv}"]`)) DOMElements.envSelect.value = savedEnv; else DOMElements.envSelect.value = ""; console.log("[POPUP DEBUG] initializeApp (invalid tab) - EnvSelect final value:", DOMElements.envSelect.value); }
        }

        await loadSfmcUnwrapperState();
        await loadInitialOverlayState(); // This calls updateOverlayControlsUI which will set overlay controls disabled state

        if (DOMElements.imageUpload && !currentOverlaySettings.imageData) { // If no image is loaded, image upload should be enabled (unless busy)
            DOMElements.imageUpload.disabled = false;
        } else if (DOMElements.imageUpload && currentOverlaySettings.imageData && currentOverlaySettings.locked) {
             DOMElements.imageUpload.disabled = true;
        } else if (DOMElements.imageUpload) {
            DOMElements.imageUpload.disabled = false;
        }


        console.log("Toolkit Pro Popup initialized.");
    }
    initializeApp().catch(err => {
        console.error("App init failed:", err); showStatus(err.message || "Popup init failed badly.", true);
        setControlsDisabled('urlTools', false); setControlsDisabled('overlay', false);
    });
});