document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element IDs ---
  const EL_IDS = {
    addParamButton: 'addParam',
    paramNameSelect: 'paramNameSelect',
    paramNameCustom: 'paramNameCustom',
    paramValue: 'paramValue',
    clearParamsButton: 'clearParams',
    environmentSelect: 'environmentSelect', // Keep only one reference
    valueSuggestions: 'valueSuggestions',
    status: 'status',
    loadingSpinner: 'loadingSpinner' // Assuming spinner HTML/CSS is still desired
  };

  // --- Get DOM Elements ---
  const addParamButton = document.getElementById(EL_IDS.addParamButton);
  const paramNameSelect = document.getElementById(EL_IDS.paramNameSelect);
  const paramNameCustom = document.getElementById(EL_IDS.paramNameCustom);
  const paramValueInput = document.getElementById(EL_IDS.paramValue);
  const clearParamsButton = document.getElementById(EL_IDS.clearParamsButton);
  const envSelect = document.getElementById(EL_IDS.environmentSelect); // Use this one consistently
  const valueSuggestionsDiv = document.getElementById(EL_IDS.valueSuggestions);
  const statusDiv = document.getElementById(EL_IDS.status);
  const loadingSpinner = document.getElementById(EL_IDS.loadingSpinner); // Get spinner

  // --- Configuration & State ---
  const paramSuggestions = {
    names: ['debug', 'rtest'],
    values: ['true', 'params', 'style', 'section', 'info'],
  };
  const MAX_SUGGESTIONS = 20;
  let statusClearTimer = null;
  const STATUS_CLEAR_DELAY_MS = 3000;
  let isOperating = false; // Bring back for potential re-integration

  // --- Helper Functions ---

   /** Disables/Enables form controls AND toggles spinner */
   function setControlsDisabled(disabled) {
    // ...(same as previous spinner version)...
      if (addParamButton) addParamButton.disabled = disabled;
      if (clearParamsButton) clearParamsButton.disabled = disabled;
      if (envSelect) envSelect.disabled = disabled;
      if (paramNameSelect) paramNameSelect.disabled = disabled;
      if (paramNameCustom) paramNameCustom.disabled = disabled;
      if (paramValueInput) paramValueInput.disabled = disabled;
      isOperating = disabled;

      if (loadingSpinner) {
          if (disabled) { loadingSpinner.classList.add('active'); }
          else { loadingSpinner.classList.remove('active'); }
      }
  }

  function showStatus(message, isError = false) {
    // ...(same as previous spinner version)...
     if (!message || typeof message !== 'string' || message.trim() === '') { return; }
    const trimmedMessage = message.trim();
    if (isError) { console.error("Status:", trimmedMessage); } else { console.log("Status:", trimmedMessage); }
    if (statusDiv) {
        if (statusClearTimer) { clearTimeout(statusClearTimer); statusClearTimer = null; }
        statusDiv.textContent = trimmedMessage;
        statusDiv.style.color = isError ? 'red' : 'green';
        statusClearTimer = setTimeout(() => {
            const currentStatusDiv = document.getElementById(EL_IDS.status);
            if (currentStatusDiv && currentStatusDiv.textContent === trimmedMessage) {
                 currentStatusDiv.textContent = ''; currentStatusDiv.style.color = '';
            }
            statusClearTimer = null;
        }, STATUS_CLEAR_DELAY_MS);
    } else { console.warn(`Status element "${EL_IDS.status}" not found.`); }
  }

  function isValidUrl(urlString) {
    // ...(same as previous spinner version)...
    if (!urlString || typeof urlString !== 'string') { return false; }
    try {
      const url = new URL(urlString); return ['http:', 'https:'].includes(url.protocol);
    } catch (e) { return false; }
  }

  /** Detect platform from hostname */
  function detectPlatform(hostname) {
    const lowerHost = hostname.toLowerCase(); // Ensure case-insensitive matching
    if (lowerHost.includes('nextcar')) return 'nextcar';
    if (lowerHost.includes('enterpriseplatform')) return 'newcar'; // Original logic
    if (lowerHost.includes('a-car') || lowerHost.includes('my-car')) return 'acar';
    if (lowerHost.includes('fs.')) return 'fs'; // Added dot for specificity? Adjust if needed.
    if (lowerHost.includes('retail.')) return 'retail'; // Added dot for specificity? Adjust if needed.
    return null;
  }

  /** Gets the corresponding hostname for a given environment key. */
  function getHostForEnv(env) {
    const map = {
        // Keys should match the <option> values exactly
        dev_nextcar: 'dev-nextcar.rapp.com',
        qa_nextcar: 'qa-nextcar.rapp.com',
        prod_nextcar: 'prod-nextcar.rapp.com',
        usync_nextcar: 'nextcar-usync-online.rapp.com',

        dev_newcar: 'dev-ocj-enterpriseplatform.rapp.com',
        qa_newcar: 'qa-ocj-enterpriseplatform.rapp.com',
        prod_newcar: 'prod-ocj-enterpriseplatform.rapp.com',
        usync_newcar: 'usync-online.rapp.com', // Verify this hostname if needed

        dev_acar: 'dev-a-car-my-car.rapp.com',
        qa_acar_usync: 'qa-a-car-my-car.rapp.com',
        prod_acar: 'prod-a-car-my-car.rapp.com',
        usync_acar: 'usync-online-a-car-my-car.rapp.com',

        dev_fs: 'dev-fs.rapp.com',
        qa_fs: 'qa-fs.rapp.com',
        prod_fs: 'prod-fs.rapp.com',
        usync_fs: 'usync-online-fs.rapp.com',

        dev_retail: 'dev-retail.rapp.com',
        qa_retail: 'qa-retail.rapp.com',
        prod_retail: 'prod-retail.rapp.com',
        usync_retail: 'retail-usync-online.rapp.com',
    };
    // No default needed if filtering works correctly and selection is handled.
    // If a key is passed that isn't here, it will return undefined.
    return map[env];
  }

  // --- Functions related to suggestions (saveSuggestion, updateParamNameDropdown, showValueSuggestions)
  // remain the same as the previous spinner version ---
  function saveSuggestion(name, value) { /* ... same ... */
        if (!name || !value) return;
        chrome.storage.sync.get(['paramNames', 'paramValues'], (data) => {
        if (chrome.runtime.lastError) { console.error("Error getting storage suggestions:", chrome.runtime.lastError.message); return; }
        const namesSet = new Set(data.paramNames || []);
        const valuesSet = new Set(data.paramValues || []);
        let changed = false;
        if (!namesSet.has(name)) { namesSet.add(name); changed = true; }
        if (!valuesSet.has(value)) { valuesSet.add(value); changed = true; }
        if (changed) {
             // Add limit logic if needed
            let namesArr = [...namesSet].sort();
            let valuesArr = [...valuesSet].sort();
            if (namesArr.length > MAX_SUGGESTIONS) namesArr = namesArr.slice(namesArr.length - MAX_SUGGESTIONS);
             if (valuesArr.length > MAX_SUGGESTIONS) valuesArr = valuesArr.slice(valuesArr.length - MAX_SUGGESTIONS);

            chrome.storage.sync.set({ paramNames: namesArr, paramValues: valuesArr }, () => {
                if (chrome.runtime.lastError) { console.error("Error saving suggestions:", chrome.runtime.lastError.message); showStatus("Failed to save suggestions.", true); }
                else { console.log("Suggestions saved:", { name, value }); updateParamNameDropdown(); showValueSuggestions(); }
            });
        }
        });
    }
  function updateParamNameDropdown() { /* ... same ... */
        if (!paramNameSelect) return;
        chrome.storage.sync.get(['paramNames'], (data) => {
        if (chrome.runtime.lastError) { console.error("Error getting paramNames:", chrome.runtime.lastError.message); showStatus("Could not load name suggestions.", true); return; }
        const savedNames = data.paramNames || [];
        const allNames = [...new Set([...paramSuggestions.names, ...savedNames])].sort();
        const currentSelectedValue = paramNameSelect.value;
        paramNameSelect.innerHTML = '<option value="">-- Select or type custom --</option>';
        allNames.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; paramNameSelect.appendChild(option); });
        if (allNames.includes(currentSelectedValue)) { paramNameSelect.value = currentSelectedValue; }
        });
    }
  function showValueSuggestions() { /* ... same ... */
        if (!valueSuggestionsDiv) return;
        chrome.storage.sync.get(['paramValues'], (data) => {
            if (chrome.runtime.lastError) { console.error("Error getting paramValues:", chrome.runtime.lastError.message); valueSuggestionsDiv.textContent = 'Error loading value suggestions.'; valueSuggestionsDiv.style.color = 'red'; return; }
            const savedValues = data.paramValues || [];
            const allValues = [...new Set([...paramSuggestions.values, ...savedValues])].sort();
            const suggestionsToShow = allValues.slice(0, 5);
            valueSuggestionsDiv.innerHTML = 'Suggestions: '; valueSuggestionsDiv.style.color = '';
            if (suggestionsToShow.length === 0) { const i = document.createElement('i'); i.textContent = 'None yet'; valueSuggestionsDiv.appendChild(i); return; }
            suggestionsToShow.forEach((value, index) => {
                const span = document.createElement('span'); span.textContent = value; span.className = 'value-suggestion'; span.dataset.value = value;
                span.style.cssText = 'cursor: pointer; text-decoration: underline; margin-left: 5px;'; span.title = `Click to use '${value}'`;
                valueSuggestionsDiv.appendChild(span);
                if (index < suggestionsToShow.length - 1) { valueSuggestionsDiv.appendChild(document.createTextNode(', ')); }
            });
        });
    }

  function logTabDetails(context, currentTab) { /* ... same ... */
        console.group(`Debugging Tab Info (${context})`);
        console.log("  Timestamp:", new Date().toISOString());
        console.log("  currentTab exists:", !!currentTab);
        if (currentTab) {
            console.log("  currentTab.id:", currentTab.id);
            console.log("  currentTab.url:", currentTab.url);
            console.log("  typeof currentTab.url:", typeof currentTab.url);
            console.log("  currentTab.status:", currentTab.status);
            console.log("  currentTab.title:", currentTab.title);
        } else {
            console.log("  currentTab object is missing or falsy.");
        }
        console.groupEnd();
    }

   // Re-introduce getActiveValidTab for robustness
   function getActiveValidTab(onSuccess, onError) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          let errorMsg = null; let currentTab = null; let tabUrl = null;
          if (chrome.runtime.lastError) { errorMsg = `Query Tab Error: ${chrome.runtime.lastError.message}`; }
          else if (!tabs || tabs.length === 0) { errorMsg = 'No active tab found.'; }
          else {
              currentTab = tabs[0]; logTabDetails('getActiveValidTab', currentTab);
              if (!currentTab || typeof currentTab.url !== 'string' || currentTab.url === '') { errorMsg = 'Cannot get URL from the current tab.'; }
              else if (!isValidUrl(currentTab.url)) { errorMsg = 'Current tab is not a valid HTTP/HTTPS URL.'; }
              else if (currentTab.status !== 'complete') { errorMsg = (currentTab.status === 'loading') ? 'Tab is still loading. Please wait.' : `Tab status is not complete (${currentTab.status}).`; }
              else if (!currentTab.id) { errorMsg = 'Could not get tab ID.'; }
              else { try { tabUrl = new URL(currentTab.url); } catch (e) { errorMsg = `Error parsing validated URL: ${e.message}`; } }
          }
          if (errorMsg) { onError(errorMsg); setControlsDisabled(false); } // Re-enable on error
          else if (currentTab && tabUrl) { onSuccess(currentTab, tabUrl); } // Success
          else { onError("Unexpected error validating tab."); setControlsDisabled(false); } // Re-enable on error
      });
   }


  // --- Event Listeners (Re-integrate robustness) ---

  // Add Parameter Button Click
  if (addParamButton) {
    addParamButton.addEventListener('click', () => {
        if (isOperating) return;
        // ... (Input validation logic same as previous spinner version) ...
        const paramNameSelectedValue = paramNameSelect.value;
        const paramNameCustomValue = paramNameCustom.value.trim();
        const paramValue = paramValueInput.value.trim();
        let paramNameToUse = paramNameCustomValue || paramNameSelectedValue;
        if (!paramNameToUse) { showStatus('Parameter name is required.', true); paramNameCustom.focus(); return; }
        if (!paramValue) { showStatus('Parameter value is required.', true); paramValueInput.focus(); return; }
        if (paramNameCustomValue && /[&=?#]/.test(paramNameCustomValue)) { showStatus('Warning: Custom parameter name contains special chars.', true); }

        setControlsDisabled(true); // Show spinner

        getActiveValidTab(
            (tab, urlObject) => { // onSuccess Validation
                try {
                    // ... (Logic to split names/values, encode, set params, save suggestion - same as spinner version) ...
                    const names = paramNameToUse.split(',').map(s => s.trim()).filter(Boolean);
                    const values = paramValue.split(',').map(s => s.trim()).filter(Boolean);
                    if (names.length === 0 || values.length === 0) { showStatus('No valid names or values provided.', true); setControlsDisabled(false); return; }
                    const pairsToAdd = Math.min(names.length, values.length); let paramsAddedCount = 0;
                    for(let i = 0; i < pairsToAdd; i++) {
                        const name = names[i]; const encodedValue = encodeURIComponent(values[i]);
                        urlObject.searchParams.set(name, encodedValue); saveSuggestion(name, values[i]); paramsAddedCount++;
                    }
                    if (paramsAddedCount > 0) {
                        chrome.tabs.update(tab.id, { url: urlObject.toString() }, () => {
                            if (chrome.runtime.lastError) { showStatus(`Error updating tab: ${chrome.runtime.lastError.message}`, true); }
                            else { showStatus(`Added ${paramsAddedCount} parameter(s).`, false); paramNameCustom.value = ''; paramValueInput.value = ''; paramNameSelect.value = ''; }
                            setControlsDisabled(false); // Hide spinner after update attempt
                        });
                    } else { showStatus('No valid parameter pairs found.', true); setControlsDisabled(false); } // Hide spinner
                } catch (error) { showStatus(`Error processing parameters: ${error.message}`, true); setControlsDisabled(false); } // Hide spinner
            },
            (errorMsg) => { showStatus(errorMsg, true); /* getActiveValidTab hides spinner */ }
        );
    });
  }

  // Clear Parameters Button Click
  if (clearParamsButton) {
     clearParamsButton.addEventListener('click', () => {
         if (isOperating) return;
         setControlsDisabled(true); // Show spinner
         getActiveValidTab(
             (tab, urlObject) => { // onSuccess Validation
                 try {
                    // ... (Logic to clear params - same as spinner version) ...
                    if (urlObject.search === '') { showStatus('No parameters to clear.', false); setControlsDisabled(false); return; }
                    urlObject.search = '';
                    chrome.tabs.update(tab.id, { url: urlObject.toString() }, () => {
                        if (chrome.runtime.lastError) { showStatus(`Error clearing params: ${chrome.runtime.lastError.message}`, true); }
                        else { showStatus('Parameters cleared.', false); }
                        setControlsDisabled(false); // Hide spinner after update attempt
                    });
                 } catch (error) { showStatus(`Error preparing to clear params: ${error.message}`, true); setControlsDisabled(false); } // Hide spinner
             },
             (errorMsg) => { showStatus(errorMsg, true); /* getActiveValidTab hides spinner */ }
         );
     });
  }

  // Environment Select Change (Robust version)
  if (envSelect) {
    envSelect.addEventListener('change', (e) => {
        if (isOperating) { // Prevent overlapping operations
             console.warn("Operation in progress, ignoring env change.");
             // Find the previously selected option (might need state) and reset? Difficult. Better to rely on disabling.
             return;
         }
      const selectedEnv = e.target.value; // The key like 'dev_nextcar'
      if (!selectedEnv) { return; } // Ignore placeholder selection

      // Save preference (async, no need to wait)
      chrome.storage.sync.set({ environment: selectedEnv }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving env preference:", chrome.runtime.lastError.message);
            // Maybe show a non-critical status?
        } else { console.log("Env preference saved:", selectedEnv); }
      });

      setControlsDisabled(true); // Show spinner

      getActiveValidTab(
          (tab, urlObject) => { // onSuccess Validation
              try {
                  const newHost = getHostForEnv(selectedEnv);
                  if (!newHost) { // Check if the key was valid in our map
                      showStatus(`Unknown environment key: ${selectedEnv}`, true);
                      setControlsDisabled(false); return;
                  }

                  // Check if already on the target host
                  if (urlObject.hostname.toLowerCase() === newHost.toLowerCase()) {
                       showStatus(`Already on ${selectedEnv.split('_')[0]} (${newHost}).`, false); // Show simpler name
                       setControlsDisabled(false); return;
                  }

                  urlObject.hostname = newHost;
                  chrome.tabs.update(tab.id, { url: urlObject.toString() }, () => {
                      if (chrome.runtime.lastError) {
                          showStatus(`Error switching environment: ${chrome.runtime.lastError.message}`, true);
                           setControlsDisabled(false); // Hide spinner on error
                      } else {
                           console.log(`Switched to ${selectedEnv}. Closing popup.`);
                           window.close(); // Close popup on success
                           // No need to hide spinner as popup closes
                      }
                  });
              } catch (error) {
                  showStatus(`Error preparing to switch env: ${error.message}`, true);
                  setControlsDisabled(false); // Hide spinner on error
              }
          },
          (errorMsg) => { // onError Validation
              showStatus(errorMsg, true);
              // getActiveValidTab handles hiding spinner on validation error
          }
      );
    });
  }

  // Value Suggestions Click Handler (Event Delegation)
  if (valueSuggestionsDiv) {
    valueSuggestionsDiv.addEventListener('click', (e) => {
        // ... (same as before) ...
         if (e.target && e.target.classList.contains('value-suggestion')) {
          const value = e.target.dataset.value;
          if (value !== undefined && paramValueInput) { paramValueInput.value = value; paramValueInput.focus(); }
        }
    });
  }


  // --- Initialization ---
  function initializePopup() {
    // Need to get tab info first to filter dropdown
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let currentUrl = null;
        let tabHostname = null;
        let platformKey = null;
        let isInitialTabValid = false;

        // 1. Validate the initial tab
        if (tabs && tabs.length > 0 && isValidUrl(tabs[0].url)) {
             try {
                 currentUrl = new URL(tabs[0].url);
                 tabHostname = currentUrl.hostname;
                 platformKey = detectPlatform(tabHostname); // Use tab's hostname
                 isInitialTabValid = true;
             } catch (e) { console.error("Error parsing initial URL:", e); }
        }

        // 2. Filter dropdown based on platform (if applicable)
        if (envSelect && platformKey) {
             console.log(`Detected platform: ${platformKey} from host: ${tabHostname}`);
             let firstVisibleOption = null;
             Array.from(envSelect.options).forEach(option => {
                // Hide if value is empty OR doesn't end with the platform key
                if (!option.value || !option.value.endsWith(`_${platformKey}`)) {
                    option.hidden = true;
                } else {
                    option.hidden = false;
                    if (!firstVisibleOption) {
                        firstVisibleOption = option; // Track the first one we make visible
                    }
                }
             });
             // Automatically select the first *visible* option in the filtered list
             if (firstVisibleOption) {
                 envSelect.value = firstVisibleOption.value;
                 console.log(`Set initial env select to first visible: ${firstVisibleOption.value}`);
             } else {
                  console.log(`No options visible for platform ${platformKey}.`);
                  // Maybe select the placeholder or leave as is?
                  envSelect.value = ""; // Select placeholder if nothing matches
             }
        } else if (envSelect) {
             // No platform detected or no envSelect, make all non-empty options visible
             console.log("No specific platform detected or envSelect missing, showing all.");
             Array.from(envSelect.options).forEach(option => {
                 option.hidden = !option.value; // Hide only the placeholder
             });
             envSelect.value = ""; // Default to placeholder
        }

        // 3. Handle controls disabling/enabling based on tab validity
        if (!isInitialTabValid) {
            showStatus("Extension only works on HTTP/HTTPS tabs.", false);
            setControlsDisabled(true); // Disable controls
        } else {
            setControlsDisabled(false); // Ensure controls are enabled

            // 4. Try to load and apply saved environment preference *after* filtering
            // This might override the auto-selection based on platform if the saved pref is still visible
            chrome.storage.sync.get('environment', ({ environment }) => {
                 if (chrome.runtime.lastError) { console.error("Error getting saved env:", chrome.runtime.lastError.message); }
                 else if (environment && envSelect) {
                     const optionToSelect = envSelect.querySelector(`option[value="${environment}"]`);
                     // Only select saved pref if it's *visible* after filtering
                     if (optionToSelect && !optionToSelect.hidden) {
                         envSelect.value = environment;
                         console.log(`Set env dropdown to saved pref (visible): ${environment}`);
                     } else if (optionToSelect) {
                          console.log(`Saved pref '${environment}' is hidden for current platform, ignoring.`);
                     } else {
                         console.warn(`Saved env pref '${environment}' not in options at all.`);
                     }
                 }
            });
        }

        // 5. Load suggestions (can happen regardless of tab validity)
        updateParamNameDropdown();
        showValueSuggestions();
        console.log("Popup initialized at", new Date().toLocaleTimeString());
    });
  }

  initializePopup();

}); // End DOMContentLoaded