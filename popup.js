document.addEventListener('DOMContentLoaded', () => {
    // Predefined suggestions for parameters
    const paramSuggestions = {
      names: ['debug', 'source', 'test', 'user'],
      values: ['true', 'false', 'extension', 'admin']
    };
  
    // --- Parameter Adding Logic ---
    const addParamButton = document.getElementById('addParam');
    addParamButton.addEventListener('click', () => {
      const paramNameSelect = document.getElementById('paramNameSelect').value;
      const paramNameCustom = document.getElementById('paramNameCustom').value.trim();
      const paramValue = document.getElementById('paramValue').value.trim();
      
      const paramName = paramNameCustom || paramNameSelect;
  
      if (paramName && paramValue) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          let currentUrl = new URL(tabs[0].url);
          const names = paramName.split(',');
          const values = paramValue.split(',');
          
          names.forEach((name, index) => {
            if (values[index]) {
              currentUrl.searchParams.set(name.trim(), values[index].trim());
              saveSuggestion(name.trim(), values[index].trim());
            }
          });
          
          chrome.tabs.update(tabs[0].id, { url: currentUrl.toString() });
          updateParamNameDropdown();
        });
      }
    });
  
    // --- Clear Parameters Logic ---
    const clearParamsButton = document.getElementById('clearParams');
    clearParamsButton.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let currentUrl = new URL(tabs[0].url);
        currentUrl.search = ''; // Remove all query parameters
        chrome.tabs.update(tabs[0].id, { url: currentUrl.toString() });
      });
    });
  
    // --- Environment Switching Logic ---
    const envSelect = document.getElementById('environmentSelect');
    chrome.storage.sync.get('environment', ({ environment }) => {
      if (environment) envSelect.value = environment;
      updateEnvironmentSelect();
    });
  
    envSelect.addEventListener('change', (e) => {
      const env = e.target.value;
      chrome.storage.sync.set({ environment: env });
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const url = new URL(tab.url);
        url.hostname = getHostForEnv(env);
        chrome.tabs.update(tab.id, { url: url.toString() });
      });
    });
  
    // --- Helper Functions ---
    function getHostForEnv(env) {
      const map = {
        dev: 'dev-nextcar.rapp.com',
        qa: 'qa-nextcar.rapp.com',
        prod: 'prod-nextcar.rapp.com',
        usync: 'nextcar-usync-online.rapp.com'
      };
      return map[env] || 'dev-nextcar.rapp.com';
    }
  
    function saveSuggestion(name, value) {
      chrome.storage.sync.get(['paramNames', 'paramValues'], (data) => {
        const names = data.paramNames || [];
        const values = data.paramValues || [];
        if (!names.includes(name)) names.push(name);
        if (!values.includes(value)) values.push(value);
        chrome.storage.sync.set({ paramNames: names, paramValues: values });
      });
    }
  
    function updateParamNameDropdown() {
      chrome.storage.sync.get(['paramNames'], (data) => {
        const select = document.getElementById('paramNameSelect');
        const savedNames = data.paramNames || [];
        const allNames = [...new Set([...paramSuggestions.names, ...savedNames])];
  
        select.innerHTML = '<option value="">-- Select or type custom --</option>';
        allNames.forEach(name => {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          select.appendChild(option);
        });
      });
    }
  
    function showValueSuggestions() {
      chrome.storage.sync.get(['paramValues'], (data) => {
        const valueSuggestions = [...(data.paramValues || []), ...paramSuggestions.values].slice(0, 5);
        const valueDiv = document.getElementById('valueSuggestions');
        valueDiv.innerHTML = 'Suggestions: ' + valueSuggestions.map(v => `<span onclick="document.getElementById('paramValue').value='${v}'">${v}</span>`).join(', ');
      });
    }
  
    function updateEnvironmentSelect() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentUrl = tabs[0].url;
        const select = document.getElementById('environmentSelect');
        
        if (currentUrl.includes('dev-nextcar.rapp.com')) select.value = 'dev';
        else if (currentUrl.includes('qa-nextcar.rapp.com')) select.value = 'qa';
        else if (currentUrl.includes('prod-nextcar.rapp.com')) select.value = 'prod';
        else if (currentUrl.includes('nextcar-usync-online.rapp.com')) select.value = 'usync';
      });
    }
  
    // Initialize UI
    updateParamNameDropdown();
    showValueSuggestions();
    updateEnvironmentSelect();
  });