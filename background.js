/**
 * FindThis — Background (Manifest V3)
 *
 * Middle-click on links inside the iframe:
 *   Firefox natively opens a new tab. We catch it via tabs.onCreated
 *   (openerTabId === host tab) and apply the middleClick setting.
 */
(function () {
  "use strict";

  var ENGINES = {
    google:     "https://www.google.com/search?q=",
    duckduckgo: "https://duckduckgo.com/?q=",
    bing:       "https://www.bing.com/search?q=",
    yandex:     "https://yandex.ru/search/?text="
  };

  var DEFAULTS = {
    theme: "auto",
    panelWidth: 520,
    panelHeight: 420,
    middleClick: "close",
    searchEngine: "google",
    linksInPanel: "yes"
  };

  var settings = Object.assign({}, DEFAULTS);
  var findThisHostTabId = null;

  function loadSettings() {
    return browser.storage.local.get(DEFAULTS).then(function (s) {
      settings = s;
    }).catch(function () {});
  }

  loadSettings();
  browser.storage.onChanged.addListener(function () { loadSettings(); });

  function i18n(id) { return browser.i18n.getMessage(id) || id; }

  function getSearchUrl(query) {
    var base = ENGINES[settings.searchEngine] || ENGINES.google;
    return base + encodeURIComponent(query);
  }

  function isInjectableTab(url) {
    if (!url) return false;
    return url.startsWith("http://") || url.startsWith("https://");
  }

  function openSearchInNewTab(query) {
    try { browser.tabs.create({ url: getSearchUrl(query) }); } catch (e) {}
  }

  function createContextMenu() {
    try {
      browser.contextMenus.create({
        id: "findthis-search",
        title: i18n("ctxMenu"),
        contexts: ["selection"]
      });
    } catch (e) {}
  }

  createContextMenu();
  browser.runtime.onInstalled.addListener(function () {
    browser.contextMenus.removeAll().then(createContextMenu).catch(createContextMenu);
  });

  browser.action.onClicked.addListener(function () {
    browser.runtime.openOptionsPage();
  });

  function clearHostTab() {
    findThisHostTabId = null;
  }

  function ensureContentScript(tabId) {
    return Promise.all([
      browser.scripting.insertCSS({ target: { tabId: tabId }, files: ["content.css"] }).catch(function () {}),
      browser.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] }).catch(function () {})
    ]).catch(function () {});
  }

  browser.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId !== "findthis-search" || !info.selectionText) return;
    var query = (info.selectionText || "").trim();
    if (!query) return;

    if (!tab || !tab.id || !isInjectableTab(tab.url)) {
      openSearchInNewTab(query);
      return;
    }

    ensureContentScript(tab.id).then(function () {
      return new Promise(function (r) { setTimeout(r, 200); });
    }).then(function () {
      return browser.tabs.sendMessage(tab.id, {
        action: "openFindThis",
        searchUrl: getSearchUrl(query),
        selectionText: query,
        settings: settings
      });
    }).catch(function () {
      openSearchInNewTab(query);
    });
  });

  // When a link inside the iframe is middle-clicked, Firefox creates a new tab.
  // We detect it here and apply the user's middleClick preference.
  browser.tabs.onCreated.addListener(function (tab) {
    if (findThisHostTabId == null) return;
    if (tab.openerTabId !== findThisHostTabId) return;

    if (settings.middleClick === "close") {
      // Activate the new tab and close the panel
      browser.tabs.update(tab.id, { active: true }).catch(function () {});
      browser.tabs.sendMessage(findThisHostTabId, { action: "closePanel" }).catch(function () {});
      clearHostTab();
    }
    // If "background" — tab already opens in background, panel stays. Nothing to do.
  });

  browser.tabs.onRemoved.addListener(function (tabId) {
    if (tabId === findThisHostTabId) clearHostTab();
  });

  browser.runtime.onMessage.addListener(function (msg, sender) {
    if (msg.action === "panelOpened" && sender.tab) {
      findThisHostTabId = sender.tab.id;
      return;
    }
    if (msg.action === "panelClosed") {
      if (sender.tab && sender.tab.id === findThisHostTabId) clearHostTab();
      return;
    }
    if (msg.action === "openInNewTab" && msg.url) {
      var hostId = findThisHostTabId;
      if (msg.closePanel) clearHostTab();
      try {
        browser.tabs.create({ url: msg.url, active: msg.activate !== false });
      } catch (e) {}
      if (msg.closePanel && sender.tab) {
        browser.tabs.sendMessage(sender.tab.id, { action: "closePanel" }).catch(function () {});
      }
      return;
    }
    if (msg.action === "getSettings") {
      return Promise.resolve(settings);
    }
  });

  browser.webRequest.onHeadersReceived.addListener(
    function (details) {
      var headers = details.responseHeaders.filter(function (h) {
        var n = (h.name || "").toLowerCase();
        return n !== "x-frame-options" && n !== "frame-options";
      });
      return { responseHeaders: headers };
    },
    { urls: ["*://*.google.com/*", "*://*.google.ru/*", "*://*.duckduckgo.com/*", "*://*.bing.com/*", "*://*.yandex.ru/*", "*://*.yandex.com/*"] },
    ["blocking", "responseHeaders"]
  );
})();
