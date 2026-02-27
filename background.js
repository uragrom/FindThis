/**
 * FindThis — Background (Manifest V3)
 * v1.2: multi-panel, link preview context menu, hover preview support.
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
    panelOpacity: 1,
    useCustomColors: false,
    customBg: "#ffffff",
    customFg: "#333333",
    customHeader: "#f8f9fa",
    customAccent: "#1a73e8",
    middleClick: "close",
    searchEngine: "google",
    linksInPanel: "yes",
    hoverPreview: false,
    hoverDelay: 2,
    hoverAutoClose: false,
    allAutoClose: false
  };

  var settings = Object.assign({}, DEFAULTS);
  var hostTabIds = new Set();

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

  function createContextMenus() {
    try {
      browser.contextMenus.create({
        id: "findthis-search",
        title: i18n("ctxMenu"),
        contexts: ["selection"]
      });
    } catch (e) {}
    try {
      browser.contextMenus.create({
        id: "findthis-preview",
        title: i18n("ctxPreview"),
        contexts: ["link"]
      });
    } catch (e) {}
  }

  createContextMenus();
  browser.runtime.onInstalled.addListener(function () {
    browser.contextMenus.removeAll().then(createContextMenus).catch(createContextMenus);
  });

  browser.action.onClicked.addListener(function () {
    browser.runtime.openOptionsPage();
  });

  function ensureContentScript(tabId) {
    return Promise.all([
      browser.scripting.insertCSS({ target: { tabId: tabId }, files: ["content.css"] }).catch(function () {}),
      browser.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] }).catch(function () {})
    ]).catch(function () {});
  }

  browser.contextMenus.onClicked.addListener(function (info, tab) {
    if (!tab || !tab.id || !isInjectableTab(tab.url)) {
      if (info.menuItemId === "findthis-search" && info.selectionText) {
        try { browser.tabs.create({ url: getSearchUrl(info.selectionText.trim()) }); } catch (e) {}
      }
      return;
    }

    if (info.menuItemId === "findthis-search" && info.selectionText) {
      var query = info.selectionText.trim();
      if (!query) return;
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
        try { browser.tabs.create({ url: getSearchUrl(query) }); } catch (e) {}
      });
    }

    if (info.menuItemId === "findthis-preview" && info.linkUrl) {
      ensureContentScript(tab.id).then(function () {
        return new Promise(function (r) { setTimeout(r, 200); });
      }).then(function () {
        return browser.tabs.sendMessage(tab.id, {
          action: "openPreview",
          url: info.linkUrl,
          settings: settings
        });
      }).catch(function () {});
    }
  });

  browser.tabs.onCreated.addListener(function (tab) {
    if (!hostTabIds.size) return;
    if (!tab.openerTabId || !hostTabIds.has(tab.openerTabId)) return;

    if (settings.middleClick === "close") {
      browser.tabs.update(tab.id, { active: true }).catch(function () {});
      browser.tabs.sendMessage(tab.openerTabId, { action: "closeAllPanels" }).catch(function () {});
      hostTabIds.delete(tab.openerTabId);
    }
  });

  browser.tabs.onRemoved.addListener(function (tabId) {
    hostTabIds.delete(tabId);
  });

  browser.runtime.onMessage.addListener(function (msg, sender) {
    if (msg.action === "panelOpened" && sender.tab) {
      hostTabIds.add(sender.tab.id);
      return;
    }
    if (msg.action === "allPanelsClosed") {
      if (sender.tab) hostTabIds.delete(sender.tab.id);
      return;
    }
    if (msg.action === "openInNewTab" && msg.url) {
      if (msg.closePanel && sender.tab) {
        hostTabIds.delete(sender.tab.id);
      }
      try {
        browser.tabs.create({ url: msg.url, active: msg.activate !== false });
      } catch (e) {}
      return;
    }
    if (msg.action === "getSettings") {
      return Promise.resolve(settings);
    }
  });

  browser.webRequest.onHeadersReceived.addListener(
    function (details) {
      if (!hostTabIds.size) return;
      var headers = details.responseHeaders.filter(function (h) {
        var n = (h.name || "").toLowerCase();
        return n !== "x-frame-options" && n !== "frame-options";
      });
      return { responseHeaders: headers };
    },
    { urls: ["<all_urls>"] },
    ["blocking", "responseHeaders"]
  );
})();
