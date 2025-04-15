🎯 Purpose
Your Chrome extension helps developers quickly manipulate URL parameters in the browser’s address bar — super useful for debugging or testing different environments and feature flags in web apps.

🧠 Core Features
🌍 Environment Detection

Automatically detects the current environment (e.g., dev, staging, prod) based on the domain of the active tab.

Likely uses some logic like checking if the URL includes keywords like localhost, dev., staging., or prod..

📝 URL Parameter Manipulation

Lets users add, update, or remove query parameters (e.g., ?debug=true or ?user=test123) from the current tab's URL in real time.

Updates the URL without reloading unnecessarily unless required.

💾 Smart Suggestions (Persistence)

Remembers commonly used parameter names and values using chrome.storage.sync.

These suggestions can autofill when a user starts typing.

🧹 Clear All Parameters

One-click button to remove all query parameters from the current tab’s URL.

💬 Real-time Feedback

Displays toast-like messages or status to the user (e.g., “Parameter added”, “URL updated”, “No environment detected”).

🧱 Tech Stack & APIs
Chrome Extension APIs

chrome.tabs: Get the current tab’s URL and update it.

chrome.storage.sync: Save and sync suggestion data across browser sessions.

Frontend

A UI likely built with HTML + CSS + JavaScript (maybe React or Vanilla JS).

Drop-downs for environment selection and autofill fields for parameters.

Logic

Parses and serializes query parameters using the URLSearchParams API.

📦 Typical Workflow
You open the extension while on a webpage.

It auto-detects the environment.

You type/select a parameter (e.g., featureFlag=true).

It updates the current tab’s URL.

You get a confirmation message.

Suggestions update over time based on usage.

🔮 Possible Extras (If not already added)
Keyboard shortcuts to toggle environments.

Sync state with the clipboard (copy full URL).

Save favorite parameter sets per environment.
