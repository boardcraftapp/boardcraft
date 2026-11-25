// Saves and loads the visitor's work in their own browser, so a refresh doesn't lose it.
// Every read and write is wrapped, because private windows and blocked storage can throw.
//
// Work is kept per party: each party has its own guest count, board, shopping list, menu and notes.
// A few things are shared by every party (saved recipes, likes, the Extras flag, the party list itself);
// those are listed in GLOBAL_KEYS. Everything else is stored inside the party that is open right now.
var Store = (function () {
  var KEY = "boardcraft:v1";
  var GLOBAL_KEYS = {
    parties: 1,
    activeParty: 1,
    recipes: 1,
    customItems: 1,
    likedPosts: 1,
    hasExtras: 1,
    tab: 1,
  };
  var data = {};
  try {
    data = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    data = {};
  }

  function newId() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function has(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  // First visit after the party update: everything saved so far becomes the first party.
  (function migrate() {
    if (Array.isArray(data.parties) && data.parties.length && data.p) {
      if (!data.activeParty || !data.p[data.activeParty]) data.activeParty = data.parties[0].id;
      return;
    }
    var id = newId();
    var bucket = {};
    Object.keys(data).forEach(function (k) {
      if (!GLOBAL_KEYS[k] && k !== "p") {
        bucket[k] = data[k];
        delete data[k];
      }
    });
    data.parties = [
      {
        id: id,
        name: (bucket.eventName || "").trim() || "My first party",
        date: "",
        time: "",
        place: "",
        created: Date.now(),
      },
    ];
    data.activeParty = id;
    data.p = {};
    data.p[id] = bucket;
  })();

  function bucket(id) {
    id = id || data.activeParty;
    if (!data.p[id]) data.p[id] = {};
    return data.p[id];
  }

  var timer = null;
  function flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function later() {
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  }

  return {
    get: function (k, fallback) {
      var src = GLOBAL_KEYS[k] ? data : bucket();
      return has(src, k) ? src[k] : fallback;
    },
    set: function (k, v) {
      (GLOBAL_KEYS[k] ? data : bucket())[k] = v;
      later();
    },
    // Read one saved value from a party that isn't open (used for the party list on Home).
    getFor: function (partyId, k, fallback) {
      var b = data.p[partyId] || {};
      return has(b, k) ? b[k] : fallback;
    },
    setFor: function (partyId, k, v) {
      bucket(partyId)[k] = v;
      later();
    },
    copyParty: function (fromId, toId) {
      data.p[toId] = JSON.parse(JSON.stringify(data.p[fromId] || {}));
      later();
    },
    dropParty: function (id) {
      delete data.p[id];
      later();
    },
    newId: newId,
    flush: flush,
  };
})();
window.addEventListener("beforeunload", function () {
  Store.flush();
});
window.addEventListener("pagehide", function () {
  Store.flush();
});

// Escapes text before it is put into the page, so names and descriptions people type can't inject code.
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
