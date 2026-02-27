(function () {
  "use strict";

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

  function msg(id) { return browser.i18n.getMessage(id) || id; }

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

  function updateColorRowState() {
    var on = document.getElementById("useCustomColors").checked;
    document.getElementById("colorRow").classList.toggle("disabled", !on);
  }

  function updateOpacityLabel() {
    document.getElementById("opacityValue").textContent = document.getElementById("panelOpacity").value;
  }

  function loadSettings() {
    return browser.storage.local.get(DEFAULTS).then(function (s) {
      document.querySelector('input[name="theme"][value="' + s.theme + '"]').checked = true;
      document.getElementById("panelWidth").value = s.panelWidth;
      document.getElementById("panelHeight").value = s.panelHeight;
      document.getElementById("panelOpacity").value = s.panelOpacity;
      updateOpacityLabel();
      document.getElementById("useCustomColors").checked = !!s.useCustomColors;
      document.getElementById("customBg").value = s.customBg;
      document.getElementById("customFg").value = s.customFg;
      document.getElementById("customHeader").value = s.customHeader;
      document.getElementById("customAccent").value = s.customAccent;
      updateColorRowState();
      document.querySelector('input[name="middleClick"][value="' + s.middleClick + '"]').checked = true;
      document.getElementById("searchEngine").value = s.searchEngine;
      document.querySelector('input[name="linksInPanel"][value="' + s.linksInPanel + '"]').checked = true;
      document.getElementById("hoverPreview").checked = !!s.hoverPreview;
      document.getElementById("hoverDelay").value = s.hoverDelay;
      document.getElementById("hoverAutoClose").checked = !!s.hoverAutoClose;
      document.getElementById("allAutoClose").checked = !!s.allAutoClose;
    });
  }

  function saveSettings() {
    var data = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      panelWidth: parseInt(document.getElementById("panelWidth").value, 10) || DEFAULTS.panelWidth,
      panelHeight: parseInt(document.getElementById("panelHeight").value, 10) || DEFAULTS.panelHeight,
      panelOpacity: parseFloat(document.getElementById("panelOpacity").value) || 1,
      useCustomColors: document.getElementById("useCustomColors").checked,
      customBg: document.getElementById("customBg").value,
      customFg: document.getElementById("customFg").value,
      customHeader: document.getElementById("customHeader").value,
      customAccent: document.getElementById("customAccent").value,
      middleClick: document.querySelector('input[name="middleClick"]:checked').value,
      searchEngine: document.getElementById("searchEngine").value,
      linksInPanel: document.querySelector('input[name="linksInPanel"]:checked').value,
      hoverPreview: document.getElementById("hoverPreview").checked,
      hoverDelay: parseFloat(document.getElementById("hoverDelay").value) || DEFAULTS.hoverDelay,
      hoverAutoClose: document.getElementById("hoverAutoClose").checked,
      allAutoClose: document.getElementById("allAutoClose").checked
    };
    data.panelWidth = Math.max(300, Math.min(1200, data.panelWidth));
    data.panelHeight = Math.max(250, Math.min(900, data.panelHeight));
    data.hoverDelay = Math.max(0.5, Math.min(10, data.hoverDelay));
    data.panelOpacity = Math.max(0.3, Math.min(1, data.panelOpacity));
    return browser.storage.local.set(data).then(showToast);
  }

  function resetSettings() {
    return browser.storage.local.set(DEFAULTS).then(loadSettings).then(showToast);
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
  document.getElementById("useCustomColors").addEventListener("change", updateColorRowState);
  document.getElementById("panelOpacity").addEventListener("input", updateOpacityLabel);
})();
