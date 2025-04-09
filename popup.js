// Predefined suggestions for parameters
const paramSuggestions = {
    names: ['debug', 'source', 'test', 'user'],
    values: ['true', 'false', 'extension', 'admin']
  };
  
  // Add parameter functionality
  document.getElementById('addParam').addEventListener('click', function() {
    const paramName = document.getElementById('paramName').value;
    const paramValue = document.getElementById('paramValue').value;
  
    if (paramName && paramValue) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let currentUrl = new URL(tabs[0].url);
        const names = paramName.split(',');
        const values = paramValue.split(',');
        
        names.forEach((name, index) => {
          if (values[index]) {
            currentUrl.searchParams.set(name.trim(), values[index].trim());
            saveSuggestion(name.trim(), values[index].trim()); // Save for future suggestions
          }
        });
        
        chrome.tabs.update(tabs[0].id, {url: currentUrl.toString()});
      });
    }
  });
  
  // Environment switching
  ['devEnv', 'qaEnv', 'prodEnv', 'usyncEnv'].forEach(env => {
    document.getElementById(env).addEventListener('click', function() {
      switchEnvironment(env.replace('Env', ''));
    });
  });
  
  function switchEnvironment(targetEnv) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let currentUrl = new URL(tabs[0].url);
      const environments = {
        dev: 'https://dev-nextcar.rapp.com',
        qa: 'https://qa-nextcar.rapp.com',
        prod: 'https://prod-nextcar.rapp.com',
        usync: 'https://nextcar-usync-online.rapp.com'
      };
  
      const currentBase = currentUrl.origin;
      if (Object.values(environments).includes(currentBase) && currentBase !== environments[targetEnv]) {
        const newUrl = currentUrl.href.replace(currentBase, environments[targetEnv]);
        chrome.tabs.update(tabs[0].id, {url: newUrl});
      }
    });
  }
  
  // Save suggestions to storage
  function saveSuggestion(name, value) {
    chrome.storage.sync.get(['paramNames', 'paramValues'], function(data) {
      const names = data.paramNames || [];
      const values = data.paramValues || [];
      if (!names.includes(name)) names.push(name);
      if (!values.includes(value)) values.push(value);
      chrome.storage.sync.set({paramNames: names, paramValues: values});
    });
  }
  
  // Display suggestions
  function showSuggestions() {
    chrome.storage.sync.get(['paramNames', 'paramValues'], function(data) {
      const nameSuggestions = [...(data.paramNames || []), ...paramSuggestions.names].slice(0, 5);
      const valueSuggestions = [...(data.paramValues || []), ...paramSuggestions.values].slice(0, 5);
  
      const nameDiv = document.getElementById('nameSuggestions');
      const valueDiv = document.getElementById('valueSuggestions');
      nameDiv.innerHTML = 'Suggestions: ' + nameSuggestions.map(n => `<span onclick="document.getElementById('paramName').value='${n}'">${n}</span>`).join(', ');
      valueDiv.innerHTML = 'Suggestions: ' + valueSuggestions.map(v => `<span onclick="document.getElementById('paramValue').value='${v}'">${v}</span>`).join(', ');
    });
  }
  
  // Highlight current environment
  function updateButtonStates() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      const buttons = {
        dev: document.getElementById('devEnv'),
        qa: document.getElementById('qaEnv'),
        prod: document.getElementById('prodEnv'),
        usync: document.getElementById('usyncEnv')
      };
  
      Object.values(buttons).forEach(button => button.classList.remove('active'));
      if (currentUrl.includes('dev-nextcar.rapp.com')) buttons.dev.classList.add('active');
      else if (currentUrl.includes('qa-nextcar.rapp.com')) buttons.qa.classList.add('active');
      else if (currentUrl.includes('prod-nextcar.rapp.com')) buttons.prod.classList.add('active');
      else if (currentUrl.includes('nextcar-usync-online.rapp.com')) buttons.usync.classList.add('active');
    });
  }
  
  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    updateButtonStates();
    showSuggestions();
  });