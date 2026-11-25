// Parties: each party has its own details (name, date, time, place, guests) and its own
// board, shopping list, menu and notes. The Home tab shows the open party and everything you can plan for it.
var FREE_PARTY_LIMIT = 1;

var Parties = (function () {
  function list() {
    return Store.get("parties", []);
  }
  function save(arr) {
    Store.set("parties", arr);
  }
  function find(id) {
    return (
      list().filter(function (p) {
        return p.id === id;
      })[0] || null
    );
  }
  function active() {
    return find(Store.get("activeParty")) || list()[0];
  }
  function update(id, fields) {
    var arr = list().map(function (p) {
      return p.id === id ? Object.assign({}, p, fields) : p;
    });
    save(arr);
  }
  function open(id) {
    Store.set("activeParty", id);
    Store.set("tab", "home");
    Store.flush();
    location.reload();
  }
  function canAddMore() {
    return Account.hasExtras() || list().length < FREE_PARTY_LIMIT;
  }
  return {
    list: list,
    find: find,
    active: active,
    update: update,
    open: open,
    canAddMore: canAddMore,
    create: function (fields, copyFromId) {
      var id = Store.newId();
      var p = Object.assign({ id: id, name: "New party", date: "", time: "", place: "", created: Date.now() }, fields);
      p.id = id;
      save(list().concat([p]));
      if (copyFromId) Store.copyParty(copyFromId, id);
      return id;
    },
    remove: function (id) {
      var arr = list().filter(function (p) {
        return p.id !== id;
      });
      Store.dropParty(id);
      if (!arr.length) {
        var nid = Store.newId();
        arr = [{ id: nid, name: "My party", date: "", time: "", place: "", created: Date.now() }];
      }
      save(arr);
      return arr[0].id;
    },
  };
})();

// ---------- dates ----------
function partyDate(p) {
  if (!p || !p.date) return null;
  var parts = p.date.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
function daysUntil(p) {
  var d = partyDate(p);
  if (!d) return null;
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - today) / 86400000);
}
function fmtTime(t) {
  if (!t) return "";
  var m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  var h = Number(m[1]);
  var ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + (m[2] === "00" ? "" : ":" + m[2]) + " " + ap;
}
function partyMeta(p, guestCount) {
  var bits = [];
  var d = partyDate(p);
  if (d) bits.push(d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
  if (p.time) bits.push(fmtTime(p.time));
  if (p.place) bits.push(p.place);
  if (guestCount) bits.push(guestCount + (guestCount === 1 ? " guest" : " guests"));
  return bits.join(" · ");
}

// ---------- Home ----------
var HOME_TILES = [
  { tab: "calc", label: "Quantities", icon: "qty", color: "lemon" },
  { tab: "board", label: "Board builder", icon: "board", color: "tangerine" },
  { tab: "visual", label: "Style board", icon: "style", color: "lilac", extras: true },
  { tab: "recipes", label: "Recipes", icon: "recipes", color: "berry" },
  { tab: "shop", label: "Shopping list", icon: "shop", color: "mint" },
  { tab: "cost", label: "Cost", icon: "cost", color: "ink" },
  { soon: true, label: "Guests & RSVPs", icon: "guests" },
  { soon: true, label: "Inspiration", icon: "inspo" },
  { tab: "tips", label: "Tips & ideas", icon: "tips", color: "sky" },
];

function renderHome() {
  var el = document.getElementById("home");
  if (!el) return;
  var p = Parties.active();
  var days = daysUntil(p);
  var countdown =
    days === null
      ? ""
      : days > 0
        ? '<div class="count">' + days + "<span>" + (days === 1 ? "day" : "days") + "</span></div>"
        : days === 0
          ? '<div class="count">Today!</div>'
          : '<div class="count done">Done</div>';
  var meta = partyMeta(p, guests);
  var others = Parties.list().filter(function (o) {
    return o.id !== p.id;
  });
  var menuCount = (Store.get("menu", []) || []).length;
  var boardCount = Object.keys(boardSelected).length;

  var tiles = HOME_TILES.map(function (t) {
    if (t.soon)
      return '<div class="tile soon" aria-disabled="true">' + icon(t.icon, 24) + "<b>" + t.label + "</b><small>Coming soon</small></div>";
    var locked = t.extras && !Account.hasExtras();
    return (
      '<button class="tile c-' + t.color + '" onclick="switchTab(\'' + t.tab + "')\">" + icon(t.icon, 24) + "<b>" + t.label + "</b>" +
      (locked ? '<small class="tile-lock">' + icon("lock", 12) + " Extras</small>" : "") +
      "</button>"
    );
  }).join("");

  var tip = tips[new Date().getDate() % tips.length];
  var tipText = String(tip.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!tipText && tip.pairings) tipText = tip.pairings.slice(0, 2).map(function (x) { return x.cheese + " with " + x.pair; }).join(". ") + ".";

  el.innerHTML =
    '<p class="hello">Let\'s get this party planned!</p>' +
    '<section class="event">' +
    countdown +
    "<small>" + (others.length ? "Planning now" : "Your party") + "</small>" +
    '<h2 class="event-name">' + esc(p.name) + "</h2>" +
    '<div class="event-meta">' + (meta ? esc(meta) : "Add a date, time and place so we can count down with you.") + "</div>" +
    '<div class="event-stats"><span>' + boardCount + " board item" + (boardCount === 1 ? "" : "s") + "</span><span>" + menuCount + " recipe" + (menuCount === 1 ? "" : "s") + " on the menu</span></div>" +
    '<div class="event-actions"><button class="pill-btn" onclick="openPartyForm(\'edit\')">' + icon("edit", 15) + " Edit details</button>" +
    '<button class="pill-btn" onclick="copyParty()">' + icon("copy", 15) + " Copy party" + (Account.hasExtras() ? "" : " " + icon("lock", 12)) + "</button></div>" +
    "</section>" +
    '<div class="party-switch">' +
    others
      .map(function (o) {
        var dd = partyDate(o);
        return (
          '<button class="party-chip" onclick="Parties.open(\'' + esc(o.id) + "')\"><b>" + esc(o.name) + "</b><span>" +
          (dd ? dd.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No date yet") +
          "</span></button>"
        );
      })
      .join("") +
    '<button class="party-chip add" onclick="newParty()">' + icon("plus", 16) + "<b>New party</b>" +
    (Parties.canAddMore() ? "" : "<span>" + icon("lock", 11) + " Extras</span>") +
    "</button></div>" +
    '<h3 class="sec">Plan it</h3><div class="tiles">' + tiles + "</div>" +
    '<h3 class="sec">Notes &amp; ideas</h3>' +
    '<div class="card notes-card"><textarea id="partyNotes" rows="4" maxlength="5000" placeholder="Theme ideas, who\'s bringing what, things not to forget..."></textarea><p class="card-hint" style="margin:6px 0 0">Saved automatically for this party.</p></div>' +
    '<div class="tip-box"><b>Tip of the day</b>' + esc(tipText) + ' <button class="acct-link" onclick="switchTab(\'tips\')">More tips</button></div>';

  var notes = document.getElementById("partyNotes");
  notes.value = Store.get("notes", "");
  notes.addEventListener("input", function () {
    Store.set("notes", notes.value);
  });
  var label = document.getElementById("partyNow");
  if (label) label.textContent = p.name;
}

// ---------- party form (new / edit) ----------
var partyFormMode = "edit";
function openPartyForm(mode) {
  partyFormMode = mode;
  var p = mode === "edit" ? Parties.active() : { name: "", date: "", time: "", place: "" };
  document.getElementById("partyFormTitle").textContent = mode === "edit" ? "Party details" : "New party";
  document.getElementById("pfName").value = p.name || "";
  document.getElementById("pfDate").value = p.date || "";
  document.getElementById("pfTime").value = p.time || "";
  document.getElementById("pfPlace").value = p.place || "";
  document.getElementById("pfGuests").value = mode === "edit" ? guests : 12;
  document.getElementById("pfDeleteRow").style.display = mode === "edit" ? "" : "none";
  document.getElementById("pfConfirm").style.display = "none";
  document.getElementById("partyModal").classList.add("open");
  setTimeout(function () {
    document.getElementById("pfName").focus();
  }, 50);
}
function closePartyForm() {
  document.getElementById("partyModal").classList.remove("open");
}
function savePartyForm(ev) {
  if (ev) ev.preventDefault();
  var fields = {
    name: document.getElementById("pfName").value.trim().slice(0, 60) || "My party",
    date: document.getElementById("pfDate").value,
    time: document.getElementById("pfTime").value,
    place: document.getElementById("pfPlace").value.trim().slice(0, 80),
  };
  var g = Math.max(1, Math.min(MAX_GUESTS, Math.round(Number(document.getElementById("pfGuests").value) || 12)));
  if (partyFormMode === "edit") {
    Parties.update(Parties.active().id, fields);
    setGuests(g);
    closePartyForm();
    renderHome();
    toast("Party details saved.");
  } else {
    var id = Parties.create(fields);
    Store.setFor(id, "guests", g);
    Parties.open(id);
  }
  return false;
}
function newParty() {
  if (!Parties.canAddMore()) {
    showExtras("Planning more than one party");
    return;
  }
  openPartyForm("new");
}
function copyParty() {
  if (!Account.hasExtras()) {
    showExtras("Copying a party");
    return;
  }
  var p = Parties.active();
  var id = Parties.create({ name: (p.name + " (copy)").slice(0, 60), place: p.place, time: p.time, date: "" }, p.id);
  Store.setFor(id, "notes", Store.getFor(p.id, "notes", ""));
  toast("Copied. Opening your new party...");
  setTimeout(function () {
    Parties.open(id);
  }, 600);
}
function askDeleteParty() {
  document.getElementById("pfConfirm").style.display = "";
}
function deleteParty() {
  var next = Parties.remove(Parties.active().id);
  Parties.open(next);
}

// ---------- Extras pop-up (used when a free limit is reached) ----------
function showExtras(what) {
  document.getElementById("extrasBody").innerHTML = paywallHtml(what);
  document.getElementById("extrasModal").classList.add("open");
}
function closeExtras() {
  document.getElementById("extrasModal").classList.remove("open");
}
