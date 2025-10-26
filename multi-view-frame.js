// multi-view-frame.js
let isProgrammaticScroll = false;

window.addEventListener('scroll', () => {
    if (isProgrammaticScroll) return; // Don't broadcast scrolls we received from others
    chrome.runtime.sendMessage({
        action: 'syncScroll',
        scrollPos: { x: window.scrollX, y: window.scrollY }
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'applyScroll') {
        // Check if we need to scroll to avoid unnecessary events and loops
        if (window.scrollY !== request.scrollPos.y || window.scrollX !== request.scrollPos.x) {
            isProgrammaticScroll = true;
            window.scrollTo(request.scrollPos.x, request.scrollPos.y);
            // Reset the flag after a short delay
            setTimeout(() => { isProgrammaticScroll = false; }, 150);
        }
    }
});