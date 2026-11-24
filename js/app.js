// ---------- saved state ----------
// Everything a visitor sets up is saved in their browser and restored on their next visit.
var MIX_KEYS = ["meat", "cheese", "cracker", "veg"];
var mix = { meat: 30, cheese: 25, cracker: 25, veg: 20 };
(function restore() {
  guests = Store.get("guests", guests);
  mealType = Store.get("mealType", mealType);
  costTier = Store.get("costTier", costTier);
  var m = Store.get("mix", null);
  if (m && MIX_KEYS.every(function (k) { return typeof m[k] === "number"; })) mix = m;
  boardSelected = Store.get("boardSelected", {});
  shopItems = Store.get("shopItems", {});
  generalItems = Store.get("generalItems", {});
  var custom = Store.get("customItems", {});
  Object.keys(custom).forEach(function (cat) {
    if (!boardItemDefs[cat]) return;
    custom[cat].forEach(function (item) {
      if (boardItemDefs[cat].items.indexOf(item) === -1) boardItemDefs[cat].items.push(item);
    });
  });
})();
function saveBoard() {
  Store.set("boardSelected", boardSelected);
}
function saveShop() {
  Store.set("shopItems", shopItems);
  Store.set("generalItems", generalItems);
}

// A small message that fades away, used instead of pop-up alerts.
function toast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(function () {
    t.classList.remove("show");
  }, 3200);
}

function switchTab(t) {
  var n = ["calc", "board", "visual", "community", "shop", "cost", "flavor", "tools", "export", "tips"];
  document.querySelectorAll(".tab").forEach(function (el, i) {
    el.classList.toggle("active", n[i] === t);
  });
  document.querySelectorAll(".panel").forEach(function (p) {
    p.classList.toggle("active", p.id === t);
  });
  if (t === "flavor") updateFlavor();
  if (t === "cost") renderCostRows();
  if (t === "export") buildExport();
  if (t === "visual") StyleBoard.render();
  if (t === "community") {
    updateShareCount();
    loadCommunity();
  }
  Store.set("tab", t);
}

// ---------- guests ----------
var MAX_GUESTS = 2000;
function setGuests(n) {
  n = Math.round(Number(n));
  if (!isFinite(n) || n < 1) n = 1;
  if (n > MAX_GUESTS) n = MAX_GUESTS;
  guests = n;
  var input = document.getElementById("guestNum");
  if (input && Number(input.value) !== n) input.value = n;
  Store.set("guests", guests);
  updateCalc();
}
function adjustGuests(d) {
  setGuests(guests + d);
}
function setMeal(type, el) {
  mealType = type;
  document.querySelectorAll(".meal-btn").forEach(function (b) {
    b.classList.toggle("active", b === el);
  });
  Store.set("mealType", mealType);
  updateCalc();
}

// ---------- mix sliders (always total 100%) ----------
// Moving one slider shares the difference among the other three, in proportion to their current values.
function setMix(key, value) {
  value = Math.max(0, Math.min(100, Math.round(Number(value))));
  var others = MIX_KEYS.filter(function (k) {
    return k !== key;
  });
  var rest = 100 - value;
  var otherTotal = others.reduce(function (a, k) {
    return a + mix[k];
  }, 0);
  var next = {};
  next[key] = value;
  others.forEach(function (k) {
    next[k] = otherTotal > 0 ? (mix[k] / otherTotal) * rest : rest / others.length;
  });
  // round to whole numbers while keeping the total at exactly 100
  var rounded = {};
  var sum = 0;
  MIX_KEYS.forEach(function (k) {
    rounded[k] = Math.floor(next[k]);
    sum += rounded[k];
  });
  others
    .slice()
    .sort(function (a, b) {
      return next[b] - Math.floor(next[b]) - (next[a] - Math.floor(next[a]));
    })
    .forEach(function (k) {
      if (sum < 100) {
        rounded[k]++;
        sum++;
      }
    });
  mix = rounded;
  Store.set("mix", mix);
  updateCalc();
}
function syncMixSliders() {
  MIX_KEYS.forEach(function (k) {
    var s = document.getElementById(k + "Slider");
    if (s && Number(s.value) !== mix[k]) s.value = mix[k];
    document.getElementById(k + "Pct").textContent = mix[k] + "%";
  });
}

// ---------- quantities ----------
// About 5 oz of food per guest for appetizers, more for a main or an all-day graze,
// split by the mix sliders. Crackers are counted at about 4 per ounce.
var OZ_PER_GUEST = 5;
function getQuantities() {
  var total = guests * OZ_PER_GUEST * mealMultipliers[mealType];
  var base = guests * mealMultipliers[mealType];
  return {
    meatOz: Math.round((total * mix.meat) / 100),
    cheeseOz: Math.round((total * mix.cheese) / 100),
    crackerCount: Math.round(((total * mix.cracker) / 100) * 4),
    produceOz: Math.round((total * mix.veg) / 100),
    accentsOz: Math.round(base * 0.5),
    spreadsCount: Math.round(Math.max(2, guests / 6)),
  };
}
function fmtOz(oz) {
  return oz >= 32 ? (oz / 16).toFixed(1).replace(/\.0$/, "") + " lb" : oz + " oz";
}
function updateCalc() {
  syncMixSliders();
  var q = getQuantities();
  document.getElementById("resultsGrid").innerHTML =
    '<div class="result-item hl"><span class="result-qty">' +
    fmtOz(q.meatOz) +
    '</span><span class="result-label">Cured meats</span></div><div class="result-item hl"><span class="result-qty">' +
    fmtOz(q.cheeseOz) +
    '</span><span class="result-label">Cheese</span></div><div class="result-item hl"><span class="result-qty">' +
    q.crackerCount +
    '</span><span class="result-label">Crackers</span></div><div class="result-item"><span class="result-qty">' +
    fmtOz(q.produceOz) +
    '</span><span class="result-label">Produce</span></div><div class="result-item"><span class="result-qty">' +
    fmtOz(q.accentsOz) +
    '</span><span class="result-label">Nuts &amp; sweets</span></div><div class="result-item"><span class="result-qty">' +
    q.spreadsCount +
    '</span><span class="result-label">Spreads (jars)</span></div>';
  document.getElementById("calcNote").textContent = mealNotes[mealType];
}
function initBoard() {
  var c = document.getElementById("boardSections");
  c.innerHTML = "";
  Object.keys(boardItemDefs).forEach(function (cat) {
    var def = boardItemDefs[cat];
    var sec = document.createElement("div");
    sec.className = "board-section";
    sec.innerHTML =
      "<h3>" +
      def.label +
      '</h3><div class="item-grid" id="' +
      cat +
      '-chips"></div><div class="add-custom-row"><input type="text" placeholder="Add custom..." id="custom-' +
      cat +
      "\" onkeydown=\"if(event.key==='Enter')addBoardCustom('" +
      cat +
      "')\"><button onclick=\"addBoardCustom('" +
      cat +
      "')\">+ Add</button></div>";
    c.appendChild(sec);
    def.items.forEach(function (item) {
      renderChip(cat, item);
    });
  });
}
function safeId(s) {
  return s.replace(/[^a-z0-9]/gi, "_");
}
function renderChip(cat, item) {
  var grid = document.getElementById(cat + "-chips");
  if (!grid) return;
  var key = cat + "::" + item;
  var chip = document.createElement("span");
  chip.className = "item-chip" + (boardSelected[key] ? " selected" : "");
  chip.textContent = item;
  chip.id = "chip-" + safeId(key);
  chip.onclick = (function (c, i, ch) {
    return function () {
      toggleBoardItem(c, i, ch);
    };
  })(cat, item, chip);
  grid.appendChild(chip);
}
function addBoardCustom(cat) {
  var input = document.getElementById("custom-" + cat);
  var val = input.value.trim().slice(0, 40);
  if (!val) return;
  if (boardItemDefs[cat].items.indexOf(val) === -1) {
    boardItemDefs[cat].items.push(val);
    renderChip(cat, val);
    var custom = Store.get("customItems", {});
    custom[cat] = (custom[cat] || []).concat([val]);
    Store.set("customItems", custom);
  }
  var key = cat + "::" + val;
  var chip = document.getElementById("chip-" + safeId(key));
  if (!boardSelected[key]) toggleBoardItem(cat, val, chip);
  input.value = "";
}
function toggleBoardItem(cat, item, chip) {
  var key = cat + "::" + item;
  if (boardSelected[key]) {
    delete boardSelected[key];
    if (chip) chip.classList.remove("selected");
  } else {
    boardSelected[key] = { cat: cat, item: item };
    if (chip) chip.classList.add("selected");
  }
  saveBoard();
  renderPreview();
}
function clearBoard() {
  boardSelected = {};
  document.querySelectorAll(".item-chip").forEach(function (c) {
    c.classList.remove("selected");
  });
  saveBoard();
  renderPreview();
}
function sendToShop() {
  var items = Object.values(boardSelected);
  if (!items.length) {
    toast("Pick some ingredients first.");
    return;
  }
  items.forEach(function (o) {
    addToShopList(o.item, o.cat, "");
  });
  updateShopStats();
  switchTab("shop");
}
function renderPreview() {
  var pb = document.getElementById("previewBoard");
  var items = Object.values(boardSelected);
  if (!items.length) {
    pb.innerHTML = '<span class="empty-board">Select items above to build your board</span>';
    return;
  }
  pb.innerHTML = items
    .map(function (o) {
      return '<span class="preview-tag ' + o.cat + '">' + o.item + "</span>";
    })
    .join("");
}
// ---------- community ----------
var communityLoaded = false,
  communityLoading = false,
  communityError = false;
var likedPosts = Store.get("likedPosts", {});
var pendingPhoto = null;
var AVATAR_COLORS = ["#9B4A1F", "#374A8B", "#4A6741", "#7B3FA0", "#2A7A6A", "#C17A3A"];
var OCCASION_STYLE = {
  "Holiday gathering": { emoji: "&#127876;", bg: "linear-gradient(135deg,#1a4a2e,#2d6b45)" },
  "Date night": { emoji: "&#128329;", bg: "linear-gradient(135deg,#2c1a3a,#4a2d6b)" },
  "Everyday grazing": { emoji: "&#9728;", bg: "linear-gradient(135deg,#C17A3A,#E0A85A)" },
  "Wedding / event": { emoji: "&#128141;", bg: "linear-gradient(135deg,#8B6914,#C9A44A)" },
};

function loadCommunity(force) {
  if ((communityLoaded && !force) || communityLoading) {
    renderCommunity();
    return;
  }
  communityLoading = true;
  renderCommunity();
  Community.list()
    .then(function (rows) {
      communityPosts = rows || [];
      communityLoaded = true;
      communityError = false;
    })
    .catch(function () {
      communityError = true;
    })
    .then(function () {
      communityLoading = false;
      renderCommunity();
    });
}
function toggleShareForm() {
  shareFormOpen = !shareFormOpen;
  document.getElementById("shareForm").style.display = shareFormOpen ? "block" : "none";
  updateShareCount();
}
function currentBoardItems() {
  var seen = {},
    out = [];
  Object.values(boardSelected)
    .concat(StyleBoard.itemsOnBoard())
    .forEach(function (o) {
      if (!seen[o.item]) {
        seen[o.item] = 1;
        out.push(o.item);
      }
    });
  return out;
}
function updateShareCount() {
  var el = document.getElementById("shareItemCount");
  if (!el) return;
  var count = currentBoardItems().length;
  el.textContent = count
    ? count + " item" + (count === 1 ? "" : "s") + " from your current board will be attached."
    : "No board items selected yet.";
}
function pickPhoto(input) {
  var file = input.files && input.files[0];
  var preview = document.getElementById("photoPreview");
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    toast("Please choose a photo (JPG or PNG).");
    input.value = "";
    return;
  }
  shrinkPhoto(file)
    .then(function (blob) {
      pendingPhoto = blob;
      preview.innerHTML =
        '<img src="' + URL.createObjectURL(blob) + '" alt="Your board photo"><button class="btn sm" onclick="clearPhoto()">Remove photo</button>';
    })
    .catch(function (e) {
      toast(e.message);
    });
}
function clearPhoto() {
  pendingPhoto = null;
  document.getElementById("sharePhoto").value = "";
  document.getElementById("photoPreview").innerHTML = "";
}
function submitShare() {
  var title = document.getElementById("shareTitle").value.trim();
  if (!title) {
    toast("Please give your board a name.");
    return;
  }
  var btn = document.getElementById("shareSubmit");
  btn.disabled = true;
  btn.textContent = "Posting...";
  var post = {
    title: title.slice(0, 80),
    handle: (document.getElementById("shareUser").value.trim() || "Anonymous").slice(0, 40),
    description: document.getElementById("shareDesc").value.trim().slice(0, 500) || null,
    occasion: document.getElementById("shareOccasion").value,
    items: currentBoardItems().slice(0, 80),
  };
  (pendingPhoto ? Community.uploadPhoto(pendingPhoto) : Promise.resolve(null))
    .then(function (url) {
      if (url) post.photo_url = url;
      return Community.create(post);
    })
    .then(function (row) {
      communityPosts.unshift(row);
      ["shareTitle", "shareUser", "shareDesc"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      clearPhoto();
      shareFormOpen = false;
      document.getElementById("shareForm").style.display = "none";
      renderCommunity();
      toast("Your board is posted!");
    })
    .catch(function () {
      toast("Sorry, that didn't post. Please check your connection and try again.");
    })
    .then(function () {
      btn.disabled = false;
      btn.innerHTML = "Post to community &rarr;";
    });
}
function renderCommunity() {
  var grid = document.getElementById("communityGrid");
  if (communityLoading && !communityPosts.length) {
    grid.innerHTML = '<div class="community-empty">Loading boards...</div>';
    return;
  }
  if (communityError && !communityPosts.length) {
    grid.innerHTML =
      '<div class="community-empty">Couldn\'t load community boards. <button class="btn sm" onclick="loadCommunity(true)">Try again</button></div>';
    return;
  }
  var filtered =
    activeFilter === "all"
      ? communityPosts
      : communityPosts.filter(function (p) {
          return p.occasion === activeFilter;
        });
  if (!filtered.length) {
    grid.innerHTML = '<div class="community-empty">No boards in this category yet. Be the first to share one!</div>';
    return;
  }
  grid.innerHTML = filtered
    .map(function (p, i) {
      var items = Array.isArray(p.items) ? p.items : [];
      var tags = items
        .slice(0, 3)
        .map(function (t) {
          return '<span class="community-tag">' + esc(t) + "</span>";
        })
        .join("");
      if (items.length > 3) tags += '<span class="community-tag">+' + (items.length - 3) + " more</span>";
      var handle = p.handle || "Anonymous";
      var initials = esc(handle.replace("@", "").substring(0, 2).toUpperCase());
      var style = OCCASION_STYLE[p.occasion] || { emoji: "&#129472;", bg: "linear-gradient(135deg,#9B4A1F,#C17A3A)" };
      var pic = p.photo_url
        ? '<img src="' + esc(p.photo_url) + '" alt="' + esc(p.title) + '" loading="lazy">'
        : '<span style="font-size:3rem">' + style.emoji + "</span>";
      var liked = !!likedPosts[p.id];
      return (
        '<div class="community-card"><div class="community-img" style="background:' +
        style.bg +
        '">' +
        pic +
        '<div class="community-img-overlay"><div class="avatar" style="background:' +
        AVATAR_COLORS[i % AVATAR_COLORS.length] +
        '">' +
        initials +
        '</div><span style="font-size:0.7rem;color:white;font-weight:500">' +
        esc(handle) +
        '</span></div></div><div class="community-meta"><div class="community-user"><span style="font-size:0.68rem;background:var(--warm);padding:2px 7px;border-radius:10px">' +
        esc(p.occasion || "") +
        "</span>" +
        (p.is_featured ? ' <span class="featured-tag">Example</span>' : "") +
        '</div><div class="community-title">' +
        esc(p.title) +
        "</div>" +
        (p.description
          ? '<div style="font-size:0.72rem;color:var(--medium);margin-bottom:6px;line-height:1.4">' + esc(p.description) + "</div>"
          : "") +
        '<div class="community-tags">' +
        tags +
        '</div><div class="community-actions"><button class="action-btn' +
        (liked ? " liked" : "") +
        '" onclick="toggleLike(\'' +
        esc(p.id) +
        "')\">&#9829; " +
        (p.likes_count || 0) +
        '</button><button class="action-btn" onclick="recreateBoard(\'' +
        esc(p.id) +
        "')\">&#8599; Recreate</button></div></div></div>"
      );
    })
    .join("");
}
function findPost(id) {
  for (var i = 0; i < communityPosts.length; i++) if (String(communityPosts[i].id) === String(id)) return communityPosts[i];
  return null;
}
function toggleLike(id) {
  var post = findPost(id);
  if (!post) return;
  var delta = likedPosts[id] ? -1 : 1;
  if (delta > 0) likedPosts[id] = 1;
  else delete likedPosts[id];
  post.likes_count = Math.max(0, (post.likes_count || 0) + delta);
  Store.set("likedPosts", likedPosts);
  renderCommunity();
  Community.like(id, delta).catch(function () {});
}
function recreateBoard(id) {
  var post = findPost(id);
  if (!post || !Array.isArray(post.items) || !post.items.length) return;
  boardSelected = {};
  document.querySelectorAll(".item-chip").forEach(function (c) {
    c.classList.remove("selected");
  });
  post.items.forEach(function (item) {
    var cat = Object.keys(boardItemDefs).find(function (c) {
      return boardItemDefs[c].items.indexOf(item) > -1;
    });
    if (!cat) return;
    boardSelected[cat + "::" + item] = { cat: cat, item: item };
    var chip = document.getElementById("chip-" + safeId(cat + "::" + item));
    if (chip) chip.classList.add("selected");
  });
  saveBoard();
  renderPreview();
  toast('"' + post.title + '" is loaded. Open the Board or Style tab to see it.');
}
function filterCommunity(filter, el) {
  activeFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  el.classList.add("active");
  renderCommunity();
}
// ---------- cost ----------
// One calculation feeds both the Cost tab and the Export summary, so the totals always match.
var COST_LINES = [
  { k: "meats", label: "Cured meats", unit: "lb" },
  { k: "cheeses", label: "Cheese", unit: "lb" },
  { k: "crackers", label: "Crackers & bread", unit: "box" },
  { k: "produce", label: "Produce & pickles", unit: "lb" },
  { k: "accents", label: "Nuts, sweets & accents", unit: "lb" },
  { k: "spreads", label: "Spreads & jams", unit: "jar" },
  { k: "specialty", label: "Specialty items", unit: "item" },
];
var CRACKERS_PER_BOX = 40;
function setTier(tier, el) {
  costTier = tier;
  document.querySelectorAll(".tier-btn").forEach(function (b) {
    b.classList.toggle("active", b === el);
  });
  Store.set("costTier", costTier);
  renderCostRows();
}
function getPrices() {
  if (costTier === "custom") {
    var saved = Store.get("customPrices", tierPrices.mid);
    var p = {};
    COST_LINES.forEach(function (c) {
      var el = document.getElementById("price_" + c.k);
      p[c.k] = el ? parseFloat(el.value) || 0 : Number(saved[c.k]) || 0;
    });
    return p;
  }
  return tierPrices[costTier] || tierPrices.mid;
}
function specialtyCount() {
  var n = Object.values(boardSelected).filter(function (o) {
    return o.cat === "specialty";
  }).length;
  // one of each specialty item per 15 guests
  return n * Math.max(1, Math.ceil(guests / 15));
}
function computeCost() {
  var p = getPrices(),
    q = getQuantities();
  var qty = {
    meats: q.meatOz / 16,
    cheeses: q.cheeseOz / 16,
    crackers: Math.ceil(q.crackerCount / CRACKERS_PER_BOX),
    produce: q.produceOz / 16,
    accents: q.accentsOz / 16,
    spreads: q.spreadsCount,
    specialty: specialtyCount(),
  };
  var total = 0;
  COST_LINES.forEach(function (c) {
    total += qty[c.k] * (p[c.k] || 0);
  });
  return { qty: qty, prices: p, total: total, perPerson: total / guests, buffered: total * 1.15 };
}
function qtyText(k, v) {
  if (k === "crackers") return v + (v === 1 ? " box" : " boxes");
  if (k === "spreads") return v + (v === 1 ? " jar" : " jars");
  if (k === "specialty") return v + (v === 1 ? " item" : " items");
  return v.toFixed(1) + " lb";
}
function renderCostRows() {
  var c = computeCost();
  var isCustom = costTier === "custom";
  document.querySelectorAll(".tier-btn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tier") === costTier);
  });
  document.getElementById("costRows").innerHTML = COST_LINES.map(function (l) {
    return (
      '<div class="cost-row"><label>' +
      l.label +
      '</label><span class="qty-label">' +
      qtyText(l.k, c.qty[l.k]) +
      '</span><span class="unit-label">$ per ' +
      l.unit +
      '</span><input class="price-input" id="price_' +
      l.k +
      '" type="number" inputmode="decimal" value="' +
      (c.prices[l.k] || 0) +
      '" min="0" step="0.5" oninput="onPriceInput()" ' +
      (isCustom ? "" : "readonly") +
      ' style="background:' +
      (isCustom ? "white" : "var(--warm)") +
      '"></div>'
    );
  }).join("");
  document.getElementById("costNote").textContent =
    (tierNotes[costTier] || "") +
    (c.qty.specialty ? "" : " Specialty items are only counted when you pick some in the Board tab.") +
    " A box of crackers is about " +
    CRACKERS_PER_BOX +
    " crackers.";
  updateCostSummary();
}
function onPriceInput() {
  if (costTier === "custom") Store.set("customPrices", getPrices());
  updateCostSummary();
  // update the line quantities too, without redrawing the inputs being typed in
}
function updateCostSummary() {
  var c = computeCost();
  document.getElementById("costSummary").innerHTML =
    '<div class="cost-card"><span class="cost-val">$' +
    c.total.toFixed(2) +
    '</span><span class="cost-lbl">Total est. cost</span></div><div class="cost-card accent"><span class="cost-val">$' +
    c.perPerson.toFixed(2) +
    '</span><span class="cost-lbl">Per person</span></div><div class="cost-card"><span class="cost-val">$' +
    c.buffered.toFixed(2) +
    '</span><span class="cost-lbl">With 15% buffer</span></div>';
}

// ---------- shopping list ----------
function addToShopList(name, cat, qty) {
  var key = name.toLowerCase();
  if (!shopItems[key]) shopItems[key] = { name: name, cat: cat, qty: qty, checked: false };
  saveShop();
  renderShopList();
}
function toggleCheck(key, list) {
  if (list === "board" && shopItems[key]) shopItems[key].checked = !shopItems[key].checked;
  if (list === "general" && generalItems[key]) generalItems[key].checked = !generalItems[key].checked;
  saveShop();
  renderShopList();
  renderGeneralList();
}
function clearChecked() {
  Object.keys(shopItems).forEach(function (k) {
    if (shopItems[k].checked) delete shopItems[k];
  });
  Object.keys(generalItems).forEach(function (k) {
    if (generalItems[k].checked) delete generalItems[k];
  });
  saveShop();
  renderShopList();
  renderGeneralList();
}
function addCustomItem(list) {
  if (list === "board") {
    var input = document.getElementById("newItemInput");
    var cat = document.getElementById("newItemCat").value;
    var name = input.value.trim().slice(0, 60);
    if (!name) return;
    addToShopList(name, cat, "");
    input.value = "";
  } else {
    var input2 = document.getElementById("generalItemInput");
    var name2 = input2.value.trim().slice(0, 60);
    if (!name2) return;
    var key = name2.toLowerCase();
    if (!generalItems[key]) generalItems[key] = { name: name2, checked: false };
    saveShop();
    renderGeneralList();
    input2.value = "";
  }
}
function renderShopList() {
  var cats = ["meats", "cheeses", "produce", "crackers", "accents", "spreads", "specialty", "other"];
  var catLabels = {
    meats: "Cured Meats",
    cheeses: "Cheeses",
    produce: "Produce & Pickles",
    crackers: "Crackers & Bread",
    accents: "Accents & Sweets",
    spreads: "Spreads",
    specialty: "Specialty Items",
    other: "Other",
  };
  var container = document.getElementById("shopList");
  var empty = document.getElementById("emptyShop");
  var items = Object.values(shopItems);
  if (!items.length) {
    container.innerHTML = "";
    empty.style.display = "block";
    updateShopStats();
    return;
  }
  empty.style.display = "none";
  var html = "";
  cats.forEach(function (cat) {
    var ci = items.filter(function (i) {
      return i.cat === cat;
    });
    if (!ci.length) return;
    html += '<div class="shop-category"><h4>' + catLabels[cat] + "</h4>";
    ci.forEach(function (item) {
      var k = encodeURIComponent(item.name.toLowerCase()).replace(/'/g, "%27");
      html +=
        '<div class="shop-item' +
        (item.checked ? " checked" : "") +
        '" onclick="toggleCheck(decodeURIComponent(\'' +
        k +
        '\'),\'board\')"><div class="check-box"><svg class="chk" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg></div><span class="item-name">' +
        esc(item.name) +
        '</span><span class="item-qty">' +
        esc(item.qty || "") +
        "</span></div>";
    });
    html += "</div>";
  });
  container.innerHTML = html;
  updateShopStats();
}
function renderGeneralList() {
  var container = document.getElementById("generalList");
  var empty = document.getElementById("emptyGeneral");
  var items = Object.values(generalItems);
  if (!items.length) {
    container.innerHTML = "";
    empty.style.display = "block";
    updateShopStats();
    return;
  }
  empty.style.display = "none";
  var html = '<div class="shop-category">';
  items.forEach(function (item) {
    var k = encodeURIComponent(item.name.toLowerCase()).replace(/'/g, "%27");
    html +=
      '<div class="shop-item' +
      (item.checked ? " checked" : "") +
      '" onclick="toggleCheck(decodeURIComponent(\'' +
      k +
      '\'),\'general\')"><div class="check-box"><svg class="chk" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg></div><span class="item-name">' +
      esc(item.name) +
      "</span></div>";
  });
  html += "</div>";
  container.innerHTML = html;
  updateShopStats();
}
function updateShopStats() {
  var all = Object.values(shopItems).concat(Object.values(generalItems));
  document.getElementById("totalItems").textContent = all.length;
  document.getElementById("checkedItems").textContent = all.filter(function (i) {
    return i.checked;
  }).length;
}
function updateFlavor() {
  var selected = Object.values(boardSelected);
  var counts = { meats: 0, cheeses: 0, produce: 0, crackers: 0, accents: 0, spreads: 0, specialty: 0 };
  selected.forEach(function (o) {
    if (counts[o.cat] !== undefined) counts[o.cat]++;
  });
  var totals = { salty: 0, savory: 0, smoky: 0, sweet: 0, acidic: 0, bitter: 0, creamy: 0, crunchy: 0 };
  Object.keys(counts).forEach(function (cat) {
    if (counts[cat] > 0 && flavorProfiles[cat])
      Object.keys(totals).forEach(function (f) {
        totals[f] += flavorProfiles[cat][f] * counts[cat];
      });
  });
  var maxVal = Math.max.apply(null, Object.values(totals).concat([1]));
  var flavors = ["salty", "savory", "smoky", "sweet", "acidic", "bitter", "creamy", "crunchy"];
  var html = "";
  flavors.forEach(function (f) {
    var pct = Math.round((totals[f] / maxVal) * 100);
    html +=
      '<div class="flavor-card"><div class="flavor-name">' +
      f.charAt(0).toUpperCase() +
      f.slice(1) +
      '</div><div class="flavor-bar-bg"><div class="flavor-bar" style="width:' +
      pct +
      "%;background:" +
      flavorColors[f] +
      '"></div></div><div class="flavor-score">' +
      (pct < 20 ? "Low" : pct < 50 ? "Moderate" : pct < 75 ? "Good" : "Strong") +
      "</div></div>";
  });
  document.getElementById("flavorGrid").innerHTML =
    html || '<p style="color:var(--medium);font-size:0.82rem">Build a board first.</p>';
  var low = flavors.filter(function (f) {
    return totals[f] < maxVal * 0.25;
  });
  var suggestions = {
    sweet: "Add honeycomb, figs, or dried apricots.",
    acidic: "Add cornichons, olives, or fresh berries.",
    crunchy: "Add variety crackers or marcona almonds.",
    creamy: "Include Brie, goat cheese, or a creamy spread.",
    smoky: "Add chorizo or smoked gouda.",
    salty: "Prosciutto, olives, or marinated feta.",
    savory: "More cured meats and aged cheeses.",
    bitter: "Dark chocolate, walnuts, or aged Parmigiano.",
  };
  var noteHtml = !selected.length
    ? '<span style="font-style:italic">Build a board to see your flavor balance.</span>'
    : low.length
      ? "<strong>Your board is light on:</strong> " +
        low.join(", ") +
        ".<br>" +
        low
          .map(function (f) {
            return suggestions[f];
          })
          .join(" ")
      : "<strong>Well balanced!</strong> Your board hits all the key flavor notes.";
  document.getElementById("balanceNote").innerHTML = noteHtml;
  var sugHtml =
    low.length && selected.length
      ? low
          .map(function (f) {
            return '<div style="padding:0.45rem 0;border-bottom:1px solid var(--light)">' + suggestions[f] + "</div>";
          })
          .join("")
      : selected.length
        ? '<span style="color:var(--green)">Well balanced!</span>'
        : '<span style="font-style:italic;color:var(--medium)">Select board items first.</span>';
  document.getElementById("balanceSuggestions").innerHTML = sugHtml;
}
function initTools() {
  var grid = document.getElementById("toolsGrid");
  toolsList.forEach(function (tool) {
    var card = document.createElement("div");
    card.className = "tool-card";
    card.innerHTML =
      '<div class="tool-icon">' +
      tool.icon +
      '</div><div class="tool-name">' +
      tool.name +
      '</div><div class="tool-desc">' +
      tool.desc +
      '</div><div style="font-size:0.68rem;color:var(--medium);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">' +
      tool.cat +
      "</div><button class=\"tool-link\" onclick=\"window.open('https://quinnandcogulfcoast.com/shop','_blank')\">Shop now &rarr;</button>";
    grid.appendChild(card);
  });
}
function buildExport() {
  var name = document.getElementById("eventName").value || "Charcuterie Board";
  var date = document.getElementById("eventDate").value || new Date().toLocaleDateString();
  var q = getQuantities();
  var selected = Object.values(boardSelected);
  var cost = computeCost();
  var total = cost.total;
  var cats = { meats: [], cheeses: [], produce: [], crackers: [], accents: [], spreads: [], specialty: [] };
  selected.forEach(function (o) {
    if (cats[o.cat]) cats[o.cat].push(o.item);
  });
  var catLabels = {
    meats: "Cured Meats",
    cheeses: "Cheeses",
    produce: "Produce & Pickles",
    crackers: "Crackers & Bread",
    accents: "Accents & Sweets",
    spreads: "Spreads & Dips",
    specialty: "Specialty Items",
  };
  var out =
    "BOARDCRAFT - " +
    name.toUpperCase() +
    "\nDate: " +
    date +
    "  |  Guests: " +
    guests +
    "  |  Style: " +
    mealType.charAt(0).toUpperCase() +
    mealType.slice(1) +
    "\n" +
    "━".repeat(42) +
    "\n\nBOARD ITEMS\n";
  Object.keys(cats).forEach(function (k) {
    if (cats[k].length) out += catLabels[k] + ": " + cats[k].join(", ") + "\n";
  });
  if (!selected.length) out += "(No items selected)\n";
  out +=
    "\nQUANTITIES\nCured meats: " +
    q.meatOz +
    " oz  |  Cheese: " +
    q.cheeseOz +
    " oz\nCrackers: " +
    q.crackerCount +
    " pieces  |  Produce: " +
    q.produceOz +
    " oz\nNuts & sweets: " +
    q.accentsOz +
    " oz  |  Spreads: " +
    q.spreadsCount +
    " jars\n\nESTIMATED COST\nTotal: $" +
    total.toFixed(2) +
    "  |  Per person: $" +
    (total / guests).toFixed(2) +
    "  |  With buffer: $" +
    (total * 1.15).toFixed(2) +
    "\n\nSHOPPING LIST\n";
  Object.values(shopItems).forEach(function (i) {
    out += "[ ] " + i.name + "\n";
  });
  var gen = Object.values(generalItems);
  if (gen.length) {
    out += "\nGENERAL LIST\n";
    gen.forEach(function (i) {
      out += "[ ] " + i.name + "\n";
    });
  }
  out += "\n- Generated by Boardcraft\n- Supplies: quinnandcogulfcoast.com/shop";
  document.getElementById("exportPreview").textContent = out;
}
function copyExport() {
  var text = document.getElementById("exportPreview").textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(showCopied);
  } else {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showCopied();
  }
}
function showCopied() {
  var n = document.getElementById("copyNotice");
  n.classList.add("show");
  setTimeout(function () {
    n.classList.remove("show");
  }, 2000);
}
function printExport() {
  var text = document.getElementById("exportPreview").textContent;
  var w = window.open("", "_blank");
  w.document.write(
    "<html><head><title>Boardcraft Export</title><style>body{font-family:monospace;padding:2rem;white-space:pre-wrap;font-size:14px;color:#2A1F14}</style></head><body>" +
      esc(text) +
      "</body></html>",
  );
  w.document.close();
  w.print();
}
function initTips() {
  var grid = document.getElementById("tipsGrid");
  tips.forEach(function (tip, i) {
    var card = document.createElement("div");
    card.className = "tip-card";
    var body = tip.content;
    if (tip.pairings)
      body +=
        '<div class="pairing-grid">' +
        tip.pairings
          .map(function (p) {
            return '<div class="pairing-item"><strong>' + p.cheese + "</strong><span>" + p.pair + "</span></div>";
          })
          .join("") +
        "</div>";
    card.innerHTML =
      '<div class="tip-header" onclick="toggleTip(' +
      i +
      ')"><div class="tip-icon-wrap" style="background:' +
      tip.bg +
      '">' +
      tip.icon +
      '</div><span class="tip-title">' +
      tip.title +
      '</span><span class="tip-arrow" id="arrow' +
      i +
      '">&#9654;</span></div><div class="tip-body" id="tipBody' +
      i +
      '">' +
      body +
      "</div>";
    grid.appendChild(card);
  });
}
function toggleTip(i) {
  var body = document.getElementById("tipBody" + i);
  var arrow = document.getElementById("arrow" + i);
  var open = body.classList.toggle("open");
  arrow.classList.toggle("open", open);
}

// ---------- start-up ----------
(function init() {
  document.getElementById("guestNum").value = guests;
  document.querySelectorAll(".meal-btn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-meal") === mealType);
  });
  ["eventName", "eventDate"].forEach(function (id) {
    var el = document.getElementById(id);
    el.value = Store.get(id, "");
    el.addEventListener("input", function () {
      Store.set(id, el.value);
    });
  });
  updateCalc();
  initBoard();
  renderPreview();
  renderShopList();
  renderGeneralList();
  initTools();
  initTips();
  var tab = Store.get("tab", "calc");
  if (tab !== "calc" && document.getElementById(tab)) switchTab(tab);
})();
