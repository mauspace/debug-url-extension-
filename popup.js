document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element IDs ---
  const EL_IDS = {
    addParamButton: 'addParam',
    paramNameSelect: 'paramNameSelect',
    paramNameCustom: 'paramNameCustom',
    paramValue: 'paramValue',
    clearParamsButton: 'clearParams',
    environmentSelect: 'environmentSelect',
    valueSuggestions: 'valueSuggestions',
    status: 'status', // For user feedback
  };

  // --- Get DOM Elements ---
  const addParamButton = document.getElementById(EL_IDS.addParamButton);
  const paramNameSelect = document.getElementById(EL_IDS.paramNameSelect);
  const paramNameCustom = document.getElementById(EL_IDS.paramNameCustom);
  const paramValueInput = document.getElementById(EL_IDS.paramValue);
  const clearParamsButton = document.getElementById(EL_IDS.clearParamsButton);
  const envSelect = document.getElementById(EL_IDS.environmentSelect);
  const valueSuggestionsDiv = document.getElementById(EL_IDS.valueSuggestions);
  const statusDiv = document.getElementById(EL_IDS.status);

  // --- Configuration & State ---
  const paramSuggestions = {
    names: ['debug', 'rtest'],
    values: ['true', 'params', 'style', 'section', 'info'],
  };
  let statusClearTimer = null;
  const STATUS_CLEAR_DELAY_MS = 3000;

  // --- Helper Functions ---

  /**
   * Displays a status message to the user and logs it. Clears after a delay.
   * @param {string} message The message to display.
   * @param {boolean} [isError=false] If true, displays as an error.
   */
  function showStatus(message, isError = false) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
        console.warn('showStatus called with empty or invalid message.');
        return;
    }
    const trimmedMessage = message.trim();
    if (isError) { console.error("Status:", trimmedMessage); }
    else { console.log("Status:", trimmedMessage); }

    if (statusDiv) {
        if (statusClearTimer) { clearTimeout(statusClearTimer); statusClearTimer = null; }
        statusDiv.textContent = trimmedMessage;
        statusDiv.style.color = isError ? 'red' : 'green'; // Adjust styling as needed
        statusClearTimer = setTimeout(() => {
            const currentStatusDiv = document.getElementById(EL_IDS.status);
            // Only clear if the message is still the one we set
            if (currentStatusDiv && currentStatusDiv.textContent === trimmedMessage) {
                 currentStatusDiv.textContent = '';
                 currentStatusDiv.style.color = '';
            }
            statusClearTimer = null;
        }, STATUS_CLEAR_DELAY_MS);
    } else {
        console.warn(`Status display element with ID "${EL_IDS.status}" not found.`);
    }
  }

  /**
   * Checks if a string is a valid, usable HTTP/HTTPS URL.
   * @param {string} urlString The string to validate.
   * @returns {boolean} True if valid, false otherwise.
   */
  function isValidUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') {
        console.warn('isValidUrl received invalid input type:', urlString);
        return false;
    }
    try {
      const url = new URL(urlString);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (e) {
      console.warn(`isValidUrl check failed for "${urlString}": ${e.message}`);
      return false;
    }
  }

  /**
   * Gets the corresponding hostname for a given environment key.
   * @param {string} env The environment key.
   * @returns {string} The hostname.
   */
  function getHostForEnv(env) {
    const map = {
      dev: 'dev-nextcar.rapp.com',
      qa: 'qa-nextcar.rapp.com',
      prod: 'prod-nextcar.rapp.com',
      usync: 'nextcar-usync-online.rapp.com',
    };
    return map[env] || map.dev; // Default to dev
  }

  /**
   * Saves parameter name and value suggestions to storage. Updates UI.
   * @param {string} name The parameter name.
   * @param {string} value The parameter value.
   */
  function saveSuggestion(name, value) {
    if (!name || !value) return;
    chrome.storage.sync.get(['paramNames', 'paramValues'], (data) => {
       if (chrome.runtime.lastError) { console.error("Error getting storage suggestions:", chrome.runtime.lastError.message); return; }
      const namesSet = new Set(data.paramNames || []);
      const valuesSet = new Set(data.paramValues || []);
      let changed = false;
      if (!namesSet.has(name)) { namesSet.add(name); changed = true; }
      if (!valuesSet.has(value)) { valuesSet.add(value); changed = true; }
      if (changed) {
        chrome.storage.sync.set({ paramNames: [...namesSet].sort(), paramValues: [...valuesSet].sort() }, () => {
             if (chrome.runtime.lastError) { console.error("Error saving suggestions:", chrome.runtime.lastError.message); showStatus("Failed to save suggestions.", true); }
             else { console.log("Suggestions saved:", { name, value }); updateParamNameDropdown(); showValueSuggestions(); }
        });
      }
    });
  }

  /** Updates the parameter name dropdown. */
  function updateParamNameDropdown() {
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

 /** Shows parameter value suggestions as clickable spans. */
 function showValueSuggestions() {
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

  /** Logs detailed info about the queried tab object for debugging. */
  function logTabDetails(context, currentTab) {
      console.group(`Debugging Tab Info (${context})`);
      console.log("  Timestamp:", new Date().toISOString());
      console.log("  currentTab exists:", !!currentTab);
      if (currentTab) {
          console.log("  currentTab.id:", currentTab.id);
          console.log("  currentTab.url:", currentTab.url);
          console.log("  typeof currentTab.url:", typeof currentTab.url);
          console.log("  currentTab.status:", currentTab.status); // Important for the fix
          console.log("  currentTab.title:", currentTab.title);
      } else {
          console.log("  currentTab object is missing or falsy.");
      }
      console.groupEnd();
  }


  /** Updates the environment dropdown based on the current tab's hostname. */
  function updateEnvironmentSelect() {
    if (!envSelect) { console.error('Environment select dropdown element not found.'); return; }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) { console.warn(`Query Tab Error (updateEnvSelect): ${chrome.runtime.lastError.message}.`); return; }
        if (!tabs || tabs.length === 0) { console.warn('No active tab found (updateEnvSelect).'); return; }
        const currentTab = tabs[0];
        logTabDetails('updateEnvironmentSelect', currentTab);

        // Validate URL *and* status (allow loading here for initial detection)
        if (!currentTab || typeof currentTab.url !== 'string' || currentTab.url === '') {
             console.warn('URL check failed in updateEnvironmentSelect. Cannot determine environment.');
             return;
        }
        // We might get a URL even if status is loading, proceed cautiously
        const currentUrl = currentTab.url;

        if (!isValidUrl(currentUrl)) {
            console.warn(`Current tab URL "${currentUrl}" is not valid HTTP/HTTPS (updateEnvSelect).`);
            return;
        }

        try {
            const url = new URL(currentUrl); const hostname = url.hostname.toLowerCase();
            const environmentHostMap = {
                 dev: 'dev-nextcar.rapp.com', qa: 'qa-nextcar.rapp.com',
                 prod: 'prod-nextcar.rapp.com', usync: 'nextcar-usync-online.rapp.com' };
            let detectedEnvKey = null;
            for (const envKey in environmentHostMap) { if (hostname.includes(environmentHostMap[envKey])) { detectedEnvKey = envKey; break; } }
            if (detectedEnvKey) {
                const optionExists = Array.from(envSelect.options).some(o => o.value === detectedEnvKey);
                if (optionExists) {
                    if (envSelect.value !== detectedEnvKey) { envSelect.value = detectedEnvKey; console.log(`Env select updated to '${detectedEnvKey}' by URL.`); }
                    else { console.log(`Env select already matches URL ('${detectedEnvKey}').`); }
                } else { console.warn(`Detected env '${detectedEnvKey}', but no matching option found.`); }
            } else { console.log('URL does not match known environments (updateEnvSelect).'); }
        } catch (error) { console.error(`Error processing URL "${currentUrl}" (updateEnvSelect):`, error); }
    });
}


  // --- Event Listeners ---

  // Add Parameter Button Click
  if (addParamButton) {
    addParamButton.addEventListener('click', () => {
      const paramNameSelectedValue = paramNameSelect.value;
      const paramNameCustomValue = paramNameCustom.value.trim();
      const paramValue = paramValueInput.value.trim();
      const paramNameToUse = paramNameCustomValue || paramNameSelectedValue;

      if (!paramNameToUse) { showStatus('Parameter name is required.', true); paramNameCustom.focus(); return; }
      if (!paramValue) { showStatus('Parameter value is required.', true); paramValueInput.focus(); return; }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) { showStatus(`Query Tab Error (addParam): ${chrome.runtime.lastError.message}`, true); return; }
        if (!tabs || tabs.length === 0) { showStatus('No active tab found (addParam).', true); return; }
        const currentTab = tabs[0];
        logTabDetails('addParam', currentTab);

        // Validation for Add Param (still requires 'complete' status for reliable URL)
         if (!currentTab ||
             typeof currentTab.url !== 'string' ||
             currentTab.url === '' ||
             currentTab.status !== 'complete') // Check status here too
        {
            const errorMsg = (currentTab && currentTab.status === 'loading')
                ? 'Tab is still loading. Please wait and try adding params again.'
                : 'Cannot get a valid URL from the current tab (or tab is not ready).';
            showStatus(errorMsg, true);
            console.error("URL/Status Validation Failed! (addParam)", { tabExists: !!currentTab, url: currentTab?.url, urlType: typeof currentTab?.url, status: currentTab?.status });
            return;
        }
        const tabId = currentTab.id;
        const tabUrl = currentTab.url;
        if (!tabId) { showStatus('Could not get tab ID (addParam).', true); return; }

        if (!isValidUrl(tabUrl)) { showStatus(`Current tab URL is not valid HTTP/HTTPS: ${tabUrl}`, true); return; }

        try {
          let currentUrl = new URL(tabUrl);
          const names = paramNameToUse.split(',').map(s => s.trim()).filter(Boolean);
          const values = paramValue.split(',').map(s => s.trim()).filter(Boolean);
          if (names.length === 0 || values.length === 0) { showStatus('No valid names or values provided.', true); return; }
          const pairsToAdd = Math.min(names.length, values.length); let paramsAddedCount = 0;
          for(let i = 0; i < pairsToAdd; i++) {
               const name = names[i]; const value = values[i];
               currentUrl.searchParams.set(name, value); saveSuggestion(name, value); paramsAddedCount++;
          }
          if (paramsAddedCount > 0) {
              chrome.tabs.update(tabId, { url: currentUrl.toString() }, () => {
                  if (chrome.runtime.lastError) { showStatus(`Error updating tab: ${chrome.runtime.lastError.message}`, true); }
                  else { showStatus(`Added ${paramsAddedCount} parameter(s).`, false); paramNameCustom.value = ''; paramValueInput.value = ''; paramNameSelect.value = ''; }
              });
          } else { showStatus('No valid parameter pairs found to add.', true); }
        } catch (error) { showStatus(`Error processing parameters: ${error.message}`, true); }
      });
    });
  }

  // Clear Parameters Button Click
  if (clearParamsButton) {
    clearParamsButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) { showStatus(`Query Tab Error (clearParams): ${chrome.runtime.lastError.message}`, true); return; }
          if (!tabs || tabs.length === 0) { showStatus('No active tab found (clearParams).', true); return; }
          const currentTab = tabs[0];
          logTabDetails('clearParams', currentTab);

          // Validation for Clear Params (also requires 'complete' status)
          if (!currentTab ||
              typeof currentTab.url !== 'string' ||
              currentTab.url === '' ||
              currentTab.status !== 'complete') // Check status
          {
              const errorMsg = (currentTab && currentTab.status === 'loading')
                  ? 'Tab is still loading. Please wait and try clearing params again.'
                  : 'Cannot get a valid URL from the current tab (or tab is not ready).';
              showStatus(errorMsg, true);
              console.error("URL/Status Validation Failed! (clearParams)", { tabExists: !!currentTab, url: currentTab?.url, urlType: typeof currentTab?.url, status: currentTab?.status });
              return;
          }
          const tabId = currentTab.id;
          const tabUrl = currentTab.url;
          if (!tabId) { showStatus('Could not get tab ID (clearParams).', true); return; }

          if (!isValidUrl(tabUrl)) { showStatus(`Current tab URL is not valid HTTP/HTTPS: ${tabUrl}`, true); return; }

          try {
            let currentUrl = new URL(tabUrl);
            if (currentUrl.search === '') { showStatus('No parameters to clear.', false); return; }
            currentUrl.search = '';
            chrome.tabs.update(tabId, { url: currentUrl.toString() }, () => {
                 if (chrome.runtime.lastError) { showStatus(`Error clearing params: ${chrome.runtime.lastError.message}`, true); }
                 else { showStatus('Parameters cleared.', false); }
            });
          } catch (error) { showStatus(`Error preparing to clear params: ${error.message}`, true); }
      });
    });
  }

  // Environment Select Change
  if (envSelect) {
    envSelect.addEventListener('change', (e) => {
      const selectedEnv = e.target.value;
      if (!selectedEnv) { showStatus("Please select a valid environment.", true); return; }

      chrome.storage.sync.set({ environment: selectedEnv }, () => {
          if (chrome.runtime.lastError) { console.error("Error saving env preference:", chrome.runtime.lastError.message); }
          else { console.log("Env preference saved:", selectedEnv); }
      });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) { showStatus(`Query Tab Error (envChange): ${chrome.runtime.lastError.message}`, true); return; }
          if (!tabs || tabs.length === 0) { showStatus('No active tab found (envChange).', true); return; }
          const currentTab = tabs[0];
          logTabDetails('envChange', currentTab);

          // ** CORE FIX: VALIDATION CHECK INCLUDES STATUS **
          if (!currentTab ||
              typeof currentTab.url !== 'string' ||
              currentTab.url === '' ||
              currentTab.status !== 'complete') // <-- THE IMPORTANT CHECK
          {
              const errorMsg = (currentTab && currentTab.status === 'loading')
                  ? 'Tab is still loading from previous action. Please wait a moment and try again.'
                  : 'Cannot get a valid URL from the current tab (or tab is not ready).';
              showStatus(errorMsg, true);
              console.error("URL/Status Validation Failed! (envChange)", {
                  tabExists: !!currentTab, url: currentTab?.url,
                  urlType: typeof currentTab?.url, status: currentTab?.status
              });
              return; // Stop execution
          }
          // ** END FIX **

          const tabId = currentTab.id;
          const tabUrl = currentTab.url;
          if (!tabId) { showStatus('Could not get tab ID (envChange).', true); return; }

          if (!isValidUrl(tabUrl)) { showStatus(`Current tab URL is not valid HTTP/HTTPS: ${tabUrl}`, true); return; }

          try {
            const url = new URL(tabUrl); const newHost = getHostForEnv(selectedEnv);
            if (url.hostname.toLowerCase() === newHost) { showStatus(`Already on ${selectedEnv} (${newHost}).`, false); return; }
            url.hostname = newHost;
            chrome.tabs.update(tabId, { url: url.toString() }, () => {
                 if (chrome.runtime.lastError) { showStatus(`Error switching env: ${chrome.runtime.lastError.message}`, true); }
                 else { showStatus(`Switched to ${selectedEnv}.`, false); }
            });
          } catch (error) { showStatus(`Error preparing to switch env: ${error.message}`, true); }
      });
    });
  }

  // Value Suggestions Click Handler (Event Delegation)
  if (valueSuggestionsDiv) {
    valueSuggestionsDiv.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('value-suggestion')) {
          const value = e.target.dataset.value;
          if (value !== undefined && paramValueInput) { paramValueInput.value = value; paramValueInput.focus(); }
      }
    });
  }


  // --- Initialization ---
  function initializePopup() {
    chrome.storage.sync.get('environment', ({ environment }) => {
      if (chrome.runtime.lastError) { console.error("Error getting saved env:", chrome.runtime.lastError.message); }
      else if (environment && envSelect) {
          const optionExists = Array.from(envSelect.options).some(o => o.value === environment);
          if (optionExists) { envSelect.value = environment; console.log(`Set env dropdown to saved pref: ${environment}`); }
          else { console.warn(`Saved env pref '${environment}' not in options.`); }
      }
      updateEnvironmentSelect(); // Update based on current URL after setting pref
    });

    updateParamNameDropdown();
    showValueSuggestions();
    console.log("Popup initialized at", new Date().toLocaleTimeString());
  }

  initializePopup();

}); // End DOMContentLoaded