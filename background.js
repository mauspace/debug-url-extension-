chrome.runtime.onInstalled.addListener(() => {
    // Initialize settings when extension is installed
    chrome.storage.sync.get(["headerVersion", "footerVersion", "sidebarVersion", "environment"], function(result) {
      const { headerVersion, footerVersion, sidebarVersion, environment } = result;
  
      // Your logic here to handle version data and environment
      console.log(result);
    });
  });
  
  // Using declarativeNetRequest to modify the URL dynamically
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.log(info);
  });
  