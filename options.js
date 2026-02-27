(function () {
  "use strict";

  var DEFAULTS = {
    theme: "auto",
    panelWidth: 520,
    panelHeight: 420,
    middleClick: "close",
    searchEngine: "google",
    linksInPanel: "yes",
    hoverPreview: false,
    hoverDelay: 2
  };

  function msg(id) {
    return browser.i18n.getMessage(id) || id;
  }

  function translatePage() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var text = msg(key);
      if (text) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = text;
        else el.textContent = text;
      }
    });
    document.title = msg("optTitle");
  }

  function loadSettings() {
    return browser.storage.local.get(DEFAULTS).then(function (s) {
      document.querySelector('input[name="theme"][value="' + s.theme + '"]').checked = true;
      document.getElementById("panelWidth").value = s.panelWidth;
      document.getElementById("panelHeight").value = s.panelHeight;
      document.querySelector('input[name="middleClick"][value="' + s.middleClick + '"]').checked = true;
      document.getElementById("searchEngine").value = s.searchEngine;
      document.querySelector('input[name="linksInPanel"][value="' + s.linksInPanel + '"]').checked = true;
      document.getElementById("hoverPreview").checked = !!s.hoverPreview;
      document.getElementById("hoverDelay").value = s.hoverDelay;
    });
  }

  function saveSettings() {
    var data = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      panelWidth: parseInt(document.getElementById("panelWidth").value, 10) || DEFAULTS.panelWidth,
      panelHeight: parseInt(document.getElementById("panelHeight").value, 10) || DEFAULTS.panelHeight,
      middleClick: document.querySelector('input[name="middleClick"]:checked').value,
      searchEngine: document.getElementById("searchEngine").value,
      linksInPanel: document.querySelector('input[name="linksInPanel"]:checked').value,
      hoverPreview: document.getElementById("hoverPreview").checked,
      hoverDelay: parseFloat(document.getElementById("hoverDelay").value) || DEFAULTS.hoverDelay
    };
    data.panelWidth = Math.max(300, Math.min(1200, data.panelWidth));
    data.panelHeight = Math.max(250, Math.min(900, data.panelHeight));
    data.hoverDelay = Math.max(0.5, Math.min(10, data.hoverDelay));
    return browser.storage.local.set(data).then(function () {
      showToast();
    });
  }

  function resetSettings() {
    return browser.storage.local.set(DEFAULTS).then(function () {
      return loadSettings();
    }).then(function () {
      showToast();
    });
  }

  function showToast() {
    var t = document.getElementById("toast");
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2000);
  }

  translatePage();
  loadSettings();
  document.getElementById("btnSave").addEventListener("click", saveSettings);
  document.getElementById("btnReset").addEventListener("click", resetSettings);
})();
