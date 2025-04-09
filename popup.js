document.getElementById("version-form").addEventListener("submit", function(event) {
    event.preventDefault();
  
    const headerVersion = document.getElementById("header-version").value;
    const footerVersion = document.getElementById("footer-version").value;
    const sidebarVersion = document.getElementById("sidebar-version").value;
    const environment = document.getElementById("environment").value;  // Get selected environment
  
    // Save the versions and environment to chrome storage
    chrome.storage.sync.set({
      headerVersion,
      footerVersion,
      sidebarVersion,
      environment  // Store the selected environment (dev/qa/prod/sync)
    }, function() {
      alert("Versions and environment saved!");
    });
  });
  