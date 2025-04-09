document.addEventListener('DOMContentLoaded', () => {
    const envSelect = document.getElementById('environmentSelect');
  
    // Load stored environment selection
    chrome.storage.sync.get('environment', ({ environment }) => {
      if (environment) envSelect.value = environment;
    });
  
    // Handle dropdown selection change
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
  
    function getHostForEnv(env) {
      const map = {
        dev: 'dev-nextcar.rapp.com',
        qa: 'qa-nextcar.rapp.com',
        prod: 'prod-nextcar.rapp.com',
        usync: 'nextcar-usync-online.rapp.com'
      };
      return map[env] || 'dev-nextcar.rapp.com';
    }
  });
  