# FindThis

A Firefox extension that searches selected text in a floating mini-window without leaving the page.

## Installation

1. Open `about:debugging` in Firefox → "This Firefox" → "Load Temporary Add-on".
2. Select the `manifest.json` file from the FindThis folder.

## Usage

1. Select text on any page.
2. Right-click → **"Search in FindThis"**.
3. A floating panel appears near the selection with search results. You can:
   - **Drag** by the header bar.
   - **Resize** by pulling the bottom edge, right edge, or corner.
   - **Close** with the × button or Escape key.
   - **Copy URL** of the current search result.
   - **Open in tab** — moves the current page to a real browser tab.
   - **Middle-click** (scroll wheel) — configurable: opens tab & closes panel, or opens tab in background.

## Settings

Open extension settings (right-click extension icon → "Manage Extension" → "Preferences") to configure:

- **Theme**: Auto (system) / Light / Dark
- **Window size**: default width & height
- **Search engine**: Google, DuckDuckGo, Bing, Yandex
- **Middle click behavior**: close panel & switch to tab, or keep panel & open in background
- **Link interception**: open new tabs inside the mini-window or normally

## Tech Stack

- Firefox Manifest V3, Content Scripts, Background Script, Shadow DOM
- i18n: English (default) + Russian
- `webRequest.onHeadersReceived` strips `X-Frame-Options` for search engine domains
