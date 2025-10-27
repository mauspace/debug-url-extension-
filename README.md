Of course. Here is a comprehensive `README.md` file suitable for a GitHub repository, documenting the `popup.js` script. It is structured to be useful for both new contributors and users trying to understand the extension's functionality.

---

# Toolkit Pro Extension: Popup UI Logic (`popup.js`)

This document provides a detailed overview of `popup.js`, the core script responsible for managing the user interface and logic within the Toolkit Pro browser extension's popup window.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
  - [URL Parameter Tools](#url-parameter-tools)
  - [Environment Switcher](#environment-switcher)
  - [Pixel Perfect Overlay](#pixel-perfect-overlay)
  - [Page Interaction Tools](#page-interaction-tools)
  - [Code Utilities](#code-utilities)
  - [UI & Settings](#ui--settings)
- [Technical Architecture](#technical-architecture)
  - [Initialization Flow](#initialization-flow)
  - [DOM Management](#dom-management)
  - [State Management](#state-management)
  - [Asynchronous Operations](#asynchronous-operations)
  - [Inter-Script Communication](#inter-script-communication)
- [Key Functions & Responsibilities](#key-functions--responsibilities)
- [Contribution Guide](#contribution-guide)

## Overview

`popup.js` is an all-in-one script that serves as the central controller for the extension's popup. It is written in plain JavaScript, leveraging modern features like `async/await` to interact with Chrome Extension APIs. Its primary responsibilities are to render the UI, handle user input, manage application state, and communicate with content scripts and the background service worker to execute tasks on the active web page.

## Core Features

The script orchestrates a suite of powerful developer tools, each with its own UI section in the popup.

### URL Parameter Tools

-   **Add Parameters:** Allows users to add or modify query parameters on the current page's URL. It supports adding multiple parameters at once (comma-separated) and reloads the tab with the new URL.
-   **Clear Parameters:** A one-click button to remove all query parameters from the URL.
-   **Smart Suggestions:** Remembers previously used parameter names and values, providing clickable suggestions to speed up repetitive tasks. Predefined common parameters (`debug`, `utm_source`, etc.) are also included.

### Environment Switcher

-   **Automatic Platform Detection:** Intelligently identifies the current web platform (e.g., `nextcar`, `acar`, `fs`) based on the active tab's hostname.
-   **Context-Aware Dropdown:** The environment selection dropdown is dynamically filtered to show only relevant environments (Dev, QA, Prod, U-Sync) for the detected platform, reducing clutter.
-   **Seamless Navigation:** Selecting an environment constructs the new URL and navigates the tab, preserving the page path and query parameters.

### Pixel Perfect Overlay

-   **Image Upload:** Users can upload a local design mockup (PNG, JPG, etc.).
-   **On-Page Overlay:** The image is rendered as a semi-transparent overlay on the active web page.
-   **Full Transformation Controls:** The popup provides real-time controls to adjust the overlay's:
    -   X/Y Position
    -   Opacity (0-100%)
    -   Scale (zoom in/out)
    -   Visibility (show/hide)
-   **Lock Functionality:** The overlay's position and properties can be locked to prevent accidental changes while working.
-   **State Persistence:** The uploaded image and its settings are saved to `chrome.storage.local`, automatically restoring the overlay when you revisit a page or restart the browser.

### Page Interaction Tools

-   **Ruler Mode:** Toggles an on-page measurement tool (managed by a content script) for checking dimensions and alignment.
-   **Multi-View:** A productivity feature that opens the current page across three environments (Dev, QA, Prod) in a new, side-by-side window for easy comparison.

### Code Utilities

-   **HTML Tag Checker:** A simple validator where users can paste HTML code. It checks for unclosed, mismatched, and improperly nested tags and reports the results directly in the popup.
-   **SFMC Unwrapper:** A toggle switch to enable or disable the automatic unwrapping of Salesforce Marketing Cloud tracking URLs.

### UI & Settings

-   **Dark/Light Theme:** A theme toggle for the popup's interface, with the user's preference saved and synced across devices.
-   **Options Page Link:** A convenient link to open the extension's main options page.

## Technical Architecture

### Initialization Flow

1.  The script executes upon the `DOMContentLoaded` event, ensuring the HTML structure is ready.
2.  The main `initializeApp()` function is called.
3.  **Theme Loading:** The saved theme is loaded and applied first to prevent a flash of unstyled content.
4.  **Event Listeners:** All event listeners for buttons, inputs, and selects are attached.
5.  **Initial State Setup:**
    -   UI controls are initially disabled.
    -   The script attempts to get the active tab's URL.
    -   If the tab is valid (HTTP/HTTPS), URL-dependent tools are enabled.
    -   Saved data for URL suggestions, SFMC settings, and the pixel overlay are loaded from `chrome.storage`.
    -   The UI is updated to reflect the loaded state (e.g., populating dropdowns, setting slider values).

### DOM Management

-   A constant object, `EL_IDS`, centralizes all HTML element IDs.
-   On startup, a `DOMElements` object is populated with direct references to these elements, avoiding repeated `document.getElementById()` calls.

### State Management

The script uses a combination of in-memory and persistent storage:

-   **`chrome.storage.sync`:** Used for small, user-specific settings that should sync across browsers.
    -   `toolkitTheme`: The selected UI theme ('light' or 'dark').
    -   `paramNames`, `paramValues`: Lists of user-submitted URL parameter suggestions.
    -   `environment`: The last selected environment.
    -   `sfmcUnwrapperEnabled`: The state of the SFMC unwrapper toggle.
-   **`chrome.storage.local`:** Used for larger, machine-specific data that should not be synced.
    -   `toolkitOverlayImage`: The base64-encoded string of the uploaded overlay image.
    -   `toolkitOverlaySettings`: An object containing the overlay's position, opacity, scale, visibility, and lock state.
-   **In-Memory State:** The `currentOverlaySettings` object holds the live state of the pixel overlay while the popup is open, providing a single source of truth for the UI controls.

### Asynchronous Operations

The script makes extensive use of `async/await` to handle the asynchronous nature of Chrome Extension APIs (`chrome.tabs.query`, `chrome.storage.get`, `chrome.tabs.update`). This improves code readability and simplifies error handling with `try...catch` blocks.

### Inter-Script Communication

`popup.js` acts as a command center, delegating actions to other parts of the extension:

-   **Content Scripts:** It uses `chrome.runtime.sendMessage` to send commands like `toggleRulerMode`, `create` (overlay), `update` (overlay), and `remove` (overlay).
-   **Background Script (Service Worker):** It sends messages to the background script for tasks that require broader permissions or a longer lifecycle, such as `activateMultiView` which creates a new window.

## Key Functions & Responsibilities

-   `initializeApp()`: The main entry point that orchestrates the entire setup process.
-   `getActiveValidTab()`: A critical helper function that safely retrieves the active tab and validates its URL, providing a standardized error-handling mechanism.
-   `showStatus()`: A centralized utility for displaying success, error, or informational messages to the user.
-   `setControlsDisabled()`: Manages the enabled/disabled state of UI elements and toggles loading spinners to provide visual feedback during operations.
-   `handleOverlaySettingChange()`: A handler function that updates the in-memory state, saves changes to storage, and sends an update message to the content script whenever an overlay control is adjusted.
-   `loadInitialOverlayState()`: Loads the saved image and settings from storage and sends a command to the content script to re-create the overlay if it exists.

## Contribution Guide

To work on this file:

1.  **Understand the Flow:** Start by tracing the `initializeApp()` function to see how the UI is built and state is loaded.
2.  **Adding UI Elements:**
    -   Add the new HTML element with a unique ID in `popup.html`.
    -   Add the ID to the `EL_IDS` constant object.
    -   The element will now be available in the `DOMElements` object for use.
    -   Attach any necessary event listeners within `initializeApp()`.
3.  **Modifying Logic:** Locate the relevant event listener or function block for the feature you wish to change. All logic is self-contained within this file or dispatched via `sendMessage`.
4.  **State and Storage:** If you add a new setting, decide whether it should be synced (`chrome.storage.sync`) or local (`chrome.storage.local`) and create a corresponding key in the `STORAGE_KEYS` constant.