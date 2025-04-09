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
          }
        });
        
        chrome.tabs.update(tabs[0].id, {url: currentUrl.toString()});
      });
    }
  });
  
  // Environment switching event listeners
  document.getElementById('devEnv').addEventListener('click', function() {
    switchEnvironment('dev');
  });
  
  document.getElementById('qaEnv').addEventListener('click', function() {
    switchEnvironment('qa');
  });
  
  document.getElementById('prodEnv').addEventListener('click', function() {
    switchEnvironment('prod');
  });
  
  document.getElementById('usyncEnv').addEventListener('click', function() {
    switchEnvironment('usync');
  });
  
  function switchEnvironment(targetEnv) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      let currentUrl = new URL(tabs[0].url);
      let newUrl = currentUrl.toString();
  
      // Define all environments
      const environments = {
        dev: 'https://dev-nextcar.rapp.com',
        qa: 'https://qa-nextcar.rapp.com',
        prod: 'https://prod-nextcar.rapp.com',
        usync: 'https://nextcar-usync-online.rapp.com'
      };
  
      // Get the current base URL (before the first '/')
      const currentBase = currentUrl.origin;
  
      // If the current URL matches one of the environments and isn't already the target
      if (Object.values(environments).includes(currentBase) && currentBase !== environments[targetEnv]) {
        // Replace the base URL with the target environment URL
        newUrl = currentUrl.href.replace(currentBase, environments[targetEnv]);
      }
  
      // Update the tab if the URL has changed
      if (newUrl !== currentUrl.href) {
        chrome.tabs.update(tabs[0].id, {url: newUrl});
      }
    });
  }
  
  // Highlight the current environment
  function updateButtonStates() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      const buttons = {
        dev: document.getElementById('devEnv'),
        qa: document.getElementById('qaEnv'),
        prod: document.getElementById('prodEnv'),
        usync: document.getElementById('usyncEnv')
      };
  
      // Remove 'active' class from all buttons
      Object.values(buttons).forEach(button => button.classList.remove('active'));
  
      // Highlight the correct button
      if (currentUrl.includes('dev-nextcar.rapp.com')) {
        buttons.dev.classList.add('active');
      } else if (currentUrl.includes('qa-nextcar.rapp.com')) {
        buttons.qa.classList.add('active');
      } else if (currentUrl.includes('prod-nextcar.rapp.com')) {
        buttons.prod.classList.add('active');
      } else if (currentUrl.includes('nextcar-usync-online.rapp.com')) {
        buttons.usync.classList.add('active');
      }
    });
  }
  
  // Update button states when popup loads
  document.addEventListener('DOMContentLoaded', updateButtonStates);