// options.js

document.addEventListener('DOMContentLoaded', () => {
    const nameList = document.getElementById('nameSuggestionsList');
    const valueList = document.getElementById('valueSuggestionsList');
    const clearAllButton = document.getElementById('clearAllButton');
    const statusDiv = document.getElementById('status');

    const STORAGE_KEYS = {
        paramNames: 'paramNames',
        paramValues: 'paramValues',
    };

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'green';
        setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    }

    async function loadSuggestions() {
        try {
            const data = await chrome.storage.sync.get([STORAGE_KEYS.paramNames, STORAGE_KEYS.paramValues]);
            const savedNames = data[STORAGE_KEYS.paramNames] || [];
            const savedValues = data[STORAGE_KEYS.paramValues] || [];

            populateList(nameList, savedNames, STORAGE_KEYS.paramNames);
            populateList(valueList, savedValues, STORAGE_KEYS.paramValues);
        } catch (error) {
            console.error("Error loading suggestions:", error);
            showStatus("Failed to load suggestions.", true);
        }
    }

    function populateList(listElement, items, storageKey) {
        listElement.innerHTML = ''; // Clear existing items
        if (items.length === 0) {
            listElement.innerHTML = '<li><i>No saved suggestions.</i></li>';
            return;
        }
        items.sort().forEach(item => {
            const li = document.createElement('li');
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            valueSpan.textContent = item;

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.dataset.item = item; // Store the item to delete
            deleteButton.dataset.key = storageKey; // Store which list it belongs to

            li.appendChild(valueSpan);
            li.appendChild(deleteButton);
            listElement.appendChild(li);
        });
    }

    async function deleteItem(itemToDelete, storageKey) {
        try {
            const data = await chrome.storage.sync.get(storageKey);
            const items = new Set(data[storageKey] || []);

            if (items.has(itemToDelete)) {
                items.delete(itemToDelete);
                await chrome.storage.sync.set({ [storageKey]: [...items].sort() });
                showStatus(`'${itemToDelete}' removed.`, false);
                await loadSuggestions(); // Reload lists
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            showStatus(`Failed to delete '${itemToDelete}'.`, true);
        }
    }

    // Event listener for all delete buttons (event delegation)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const item = e.target.dataset.item;
            const key = e.target.dataset.key;
            if (item && key) {
                deleteItem(item, key);
            }
        }
    });

    // Event listener for the "Clear All" button
    if (clearAllButton) {
        clearAllButton.addEventListener('click', async () => {
            if (confirm("Are you sure you want to clear ALL saved parameter names and values? This cannot be undone.")) {
                try {
                    await chrome.storage.sync.remove([STORAGE_KEYS.paramNames, STORAGE_KEYS.paramValues]);
                    showStatus("All suggestions cleared.", false);
                    await loadSuggestions(); // Reload lists (will show empty)
                } catch (error) {
                    console.error("Error clearing all suggestions:", error);
                    showStatus("Failed to clear all suggestions.", true);
                }
            }
        });
    }

    // Initial load
    loadSuggestions();
});