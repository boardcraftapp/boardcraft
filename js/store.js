// Saves and loads the visitor's work in their own browser, so a refresh doesn't lose it.
// Every read and write is wrapped, because private windows and blocked storage can throw.
var Store = (function () {
  var KEY = "boardcraft:v1";
  var data = {};
  try {
    data = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    data = {};
  }
  var timer = null;
  function flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }
  return {
    get: function (k, fallback) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : fallback;
    },
    set: function (k, v) {
      data[k] = v;
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    },
    flush: flush,
  };
})();
window.addEventListener("beforeunload", function () {
  Store.flush();
});

// Escapes text before it is put into the page, so names and descriptions people type can't inject code.
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
