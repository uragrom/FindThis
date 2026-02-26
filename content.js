/**
 * FindThis — Content Script
 *
 * Middle-click on header → open current URL in tab (handled here).
 * Middle-click on links inside iframe → Firefox opens tab natively,
 *   background.js handles the rest via tabs.onCreated.
 */
(function () {
  "use strict";
  if (window.__findThisLoaded) return;
  window.__findThisLoaded = true;

  var CONTAINER_ID = "findthis-root";
  var shadowRef = null;
  var currentSettings = {
    theme: "auto", panelWidth: 520, panelHeight: 420, middleClick: "close"
  };

  function m(id) { try { return browser.i18n.getMessage(id) || id; } catch (e) { return id; } }
  function escapeHtml(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function notifyBg(action, data) {
    try { browser.runtime.sendMessage(Object.assign({ action: action }, data || {})); } catch (e) {}
  }

  function destroyPanel() {
    var el = document.getElementById(CONTAINER_ID);
    if (el) el.remove();
    shadowRef = null;
    notifyBg("panelClosed");
  }

  function isDark(theme) {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function createPanel(searchUrl, selectionText, settings) {
    currentSettings = Object.assign(currentSettings, settings || {});
    destroyPanel();

    var dark = isDark(currentSettings.theme);
    var pw = currentSettings.panelWidth || 520;
    var ph = currentSettings.panelHeight || 420;

    var host = document.createElement("div");
    host.id = CONTAINER_ID;
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
    (document.body || document.documentElement).appendChild(host);

    var shadow = host.attachShadow({ mode: "open" });
    shadowRef = shadow;

    var c = dark
      ? { bg:"#2b2b2b", header:"#333", border:"#444", fg:"#ddd", fg2:"#aaa", btnBg:"#3a3a3a", btnBorder:"#555",
          btnHover:"#4a4a4a", closeBg:"#444", closeHover:"#555", body:"#252525", loader:"#333",
          spinBorder:"#444", spinTop:"#6eaaff", accent:"#6eaaff", resize:"rgba(110,170,255,.1)" }
      : { bg:"#fff", header:"#f8f9fa", border:"#e0e3e6", fg:"#333", fg2:"#666", btnBg:"#fff", btnBorder:"#d0d5da",
          btnHover:"#e9ecef", closeBg:"transparent", closeHover:"#dee2e6", body:"#f1f3f4", loader:"#fff",
          spinBorder:"#e0e3e6", spinTop:"#1a73e8", accent:"#1a73e8", resize:"rgba(26,115,232,.08)" };

    var style = document.createElement("style");
    style.textContent = [
      ":host{position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none}",
      ".ft{position:fixed;width:"+pw+"px;height:"+ph+"px;min-width:300px;min-height:260px;background:"+c.bg+";border-radius:12px;" +
        "box-shadow:0 12px 40px rgba(0,0,0,"+(dark?.35:.18)+"),0 0 0 1px "+c.border+";" +
        "display:flex;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto;z-index:2147483647}",
      ".hd{display:flex;align-items:center;justify-content:space-between;padding:7px 8px 7px 12px;" +
        "background:"+c.header+";border-bottom:1px solid "+c.border+";cursor:move;user-select:none;flex-shrink:0}",
      ".ti{display:flex;align-items:center;gap:7px;color:"+c.fg+";font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:55%}",
      ".ti svg{width:16px;height:16px;flex-shrink:0;stroke:"+c.accent+"}",
      ".btns{display:flex;align-items:center;gap:4px}",
      ".btn{padding:4px 9px;font-size:11px;border:1px solid "+c.btnBorder+";background:"+c.btnBg+";" +
        "border-radius:6px;cursor:pointer;color:"+c.fg2+";transition:background .12s}",
      ".btn:hover{background:"+c.btnHover+"}",
      ".cls{width:26px;height:26px;border:none;background:"+c.closeBg+";border-radius:6px;" +
        "cursor:pointer;color:"+c.fg2+";font-size:18px;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s}",
      ".cls:hover{background:"+c.closeHover+";color:"+c.fg+"}",
      ".bd{flex:1;position:relative;min-height:0;background:"+c.body+"}",
      ".ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:"+c.loader+";z-index:1;transition:opacity .2s}",
      ".ld.h{opacity:0;pointer-events:none}",
      ".sp{width:36px;height:36px;border:3px solid "+c.spinBorder+";border-top-color:"+c.spinTop+";border-radius:50%;animation:s .7s linear infinite}",
      "@keyframes s{to{transform:rotate(360deg)}}",
      "iframe{width:100%;height:100%;border:none;display:block}",
      ".rz-b{position:absolute;bottom:0;left:0;right:0;height:7px;cursor:ns-resize;z-index:2}",
      ".rz-b:hover{background:"+c.resize+"}",
      ".rz-r{position:absolute;top:0;right:0;bottom:0;width:7px;cursor:ew-resize;z-index:2}",
      ".rz-r:hover{background:"+c.resize+"}",
      ".rz-c{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;z-index:3}",
      ".rz-c:hover{background:"+c.resize+";border-radius:0 0 10px 0}",
      ".cp{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:"+c.header+";color:"+c.fg+";" +
        "padding:4px 14px;border-radius:6px;font-size:12px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:5;border:1px solid "+c.border+"}"
    ].join("\n");
    shadow.appendChild(style);

    var panel = document.createElement("div"); panel.className = "ft";
    var header = document.createElement("div"); header.className = "hd";

    var title = document.createElement("span"); title.className = "ti";
    title.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> ' +
      escapeHtml(m("searchLabel").replace("$TEXT$", selectionText));
    header.appendChild(title);

    var btns = document.createElement("span"); btns.className = "btns";

    var copyBtn = document.createElement("button"); copyBtn.className = "btn"; copyBtn.textContent = m("copyUrl");
    btns.appendChild(copyBtn);

    var openBtn = document.createElement("button"); openBtn.className = "btn"; openBtn.textContent = m("openInTab");
    btns.appendChild(openBtn);

    var closeBtn = document.createElement("button"); closeBtn.className = "cls"; closeBtn.innerHTML = "&#215;"; closeBtn.title = m("close");
    btns.appendChild(closeBtn);

    header.appendChild(btns);
    panel.appendChild(header);

    var body = document.createElement("div"); body.className = "bd";

    var loader = document.createElement("div"); loader.className = "ld";
    loader.innerHTML = '<div class="sp"></div>';
    body.appendChild(loader);

    var copiedToast = document.createElement("div"); copiedToast.className = "cp"; copiedToast.textContent = m("copied");
    body.appendChild(copiedToast);

    var iframe = document.createElement("iframe");
    iframe.src = searchUrl; iframe.title = "FindThis";
    iframe.addEventListener("load", function () { loader.classList.add("h"); });
    body.appendChild(iframe);

    var rzB = document.createElement("div"); rzB.className = "rz-b"; body.appendChild(rzB);
    var rzR = document.createElement("div"); rzR.className = "rz-r"; body.appendChild(rzR);
    var rzC = document.createElement("div"); rzC.className = "rz-c"; body.appendChild(rzC);

    panel.appendChild(body);
    shadow.appendChild(panel);

    // Position
    var sel = document.getSelection();
    if (sel && sel.rangeCount > 0) {
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.left, window.innerWidth - pw));
      var y = rect.bottom + 12;
      if (y + ph > window.innerHeight) y = Math.max(0, rect.top - ph - 12);
      panel.style.left = x + "px"; panel.style.top = y + "px";
    } else {
      panel.style.left = (window.innerWidth - pw) / 2 + "px";
      panel.style.top = (window.innerHeight - ph) / 2 + "px";
    }

    // --- Drag (left button only) ---
    header.addEventListener("mousedown", function (e) {
      if (e.button !== 0 || e.target.closest(".cls") || e.target.closest(".btn")) return;
      var sx = e.clientX, sy = e.clientY;
      var sl = parseFloat(panel.style.left) || 0, st = parseFloat(panel.style.top) || 0;
      function mv(e2) { panel.style.left = (sl + e2.clientX - sx) + "px"; panel.style.top = (st + e2.clientY - sy) + "px"; }
      function up() { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); }
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
    });

    // --- Resize ---
    function resizer(handle, axis) {
      handle.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return; e.preventDefault();
        var sy = e.clientY, sx = e.clientX, sw = panel.offsetWidth, sh = panel.offsetHeight;
        function mv(e2) {
          if (axis === "y" || axis === "xy") panel.style.height = Math.max(260, Math.min(window.innerHeight - 40, sh + e2.clientY - sy)) + "px";
          if (axis === "x" || axis === "xy") panel.style.width = Math.max(300, Math.min(window.innerWidth - 40, sw + e2.clientX - sx)) + "px";
        }
        function up() { document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); }
        document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
      });
    }
    resizer(rzB, "y"); resizer(rzR, "x"); resizer(rzC, "xy");

    // --- Close ---
    closeBtn.addEventListener("click", destroyPanel);

    // --- Copy URL ---
    copyBtn.addEventListener("click", function () {
      var url = iframe.src;
      if (!url || url === "about:blank") return;
      navigator.clipboard.writeText(url).then(function () {
        copiedToast.style.opacity = "1";
        setTimeout(function () { copiedToast.style.opacity = "0"; }, 1200);
      }).catch(function () {});
    });

    // --- Open in tab (button) ---
    function openInTab(activate, closeWin) {
      var url = iframe.src;
      if (!url || url === "about:blank") return;
      notifyBg("openInNewTab", { url: url, activate: activate, closePanel: closeWin });
      if (closeWin) destroyPanel();
    }
    openBtn.addEventListener("click", function () { openInTab(true, true); });

    // --- Middle click on HEADER (mouseup with button 1) ---
    // Prevent browser auto-scroll on middle mousedown
    header.addEventListener("mousedown", function (e) {
      if (e.button === 1) e.preventDefault();
    });
    header.addEventListener("mouseup", function (e) {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      if (currentSettings.middleClick === "close") {
        openInTab(true, true);
      } else {
        openInTab(false, false);
      }
    });

    // --- Escape ---
    function onKey(e) { if (e.key === "Escape") { destroyPanel(); document.removeEventListener("keydown", onKey); } }
    document.addEventListener("keydown", onKey);

    notifyBg("panelOpened");
  }

  browser.runtime.onMessage.addListener(function (msg) {
    if (msg.action === "openFindThis" && msg.searchUrl) {
      if (document.body) {
        createPanel(msg.searchUrl, msg.selectionText || "", msg.settings);
      } else {
        document.addEventListener("DOMContentLoaded", function () {
          createPanel(msg.searchUrl, msg.selectionText || "", msg.settings);
        });
      }
      return Promise.resolve({ ok: true });
    }
    if (msg.action === "closePanel") {
      destroyPanel();
      return Promise.resolve({ ok: true });
    }
  });
})();
