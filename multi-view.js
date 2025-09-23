// multi-view.js

// This script should only run once. Add a guard to prevent multiple injections.
if (window.isMultiViewInjected) {
    // Already here, maybe just listen for new messages
} else {
    window.isMultiViewInjected = true;

    function initMultiView(urls) {
        // If a view already exists, remove it first
        const existingContainer = document.getElementById('toolkit-multiview-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create the main container
        const container = document.createElement('div');
        container.id = 'toolkit-multiview-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '2147483647', // Max z-index
            backgroundColor: '#333',
            display: 'flex',
            gap: '5px',
            padding: '40px 5px 5px 5px',
            boxSizing: 'border-box'
        });

        // Create iframes
        const devFrame = createIframe('Dev', urls.dev);
        const qaFrame = createIframe('QA', urls.qa);
        const prodFrame = createIframe('Prod', urls.prod);

        // Create a close button / header
        const header = document.createElement('div');
        Object.assign(header.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '40px',
            backgroundColor: '#1a1a1a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 15px',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif'
        });
        
        const title = document.createElement('span');
        title.textContent = 'Multi-Environment View';
        title.style.fontWeight = 'bold';

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Exit Multi-View (Esc)';
        Object.assign(closeButton.style, {
            padding: '5px 10px',
            cursor: 'pointer',
            border: '1px solid #555',
            backgroundColor: '#444',
            color: 'white',
            borderRadius: '4px'
        });

        closeButton.onclick = () => {
            container.remove();
            document.body.style.overflow = 'auto'; // Restore scrolling
        };

        header.appendChild(title);
        header.appendChild(closeButton);

        // Add everything to the container
        container.appendChild(header);
        container.appendChild(devFrame);
        container.appendChild(qaFrame);
        container.appendChild(prodFrame);

        // Add container to the page and hide body scrollbar
        document.body.appendChild(container);
        document.body.style.overflow = 'hidden';
    }

    function createIframe(label, src) {
        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            border: '1px solid #555'
        });

        const labelDiv = document.createElement('div');
        labelDiv.textContent = label;
        Object.assign(labelDiv.style, {
            position: 'absolute',
            top: '5px',
            left: '5px',
            padding: '3px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '3px',
            zIndex: '1'
        });

        const iframe = document.createElement('iframe');
        iframe.src = src;
        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none'
        });

        wrapper.appendChild(labelDiv);
        wrapper.appendChild(iframe);
        return wrapper;
    }

    // Listen for the initialization message from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'initMultiView') {
            initMultiView(request.urls);
            sendResponse({ status: "Multi-View displayed" });
        }
    });

    // Add Esc key listener to exit
    window.addEventListener('keydown', (event) => {
        const container = document.getElementById('toolkit-multiview-container');
        if (event.key === 'Escape' && container) {
            container.remove();
            document.body.style.overflow = 'auto';
        }
    });

    console.log("Multi-View content script loaded.");
}