// Optional: Add parameters automatically on page navigation
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    // You can add logic here to automatically append parameters
    // to specific URLs if desired
  });