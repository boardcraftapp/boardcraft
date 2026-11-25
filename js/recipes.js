// Recipes: your own saved recipes (shared by all your parties), and a menu for each party.
// Ingredients of every recipe on the menu flow into that party's shopping list,
// added together when two recipes need the same thing (2 lemons + 1 lemon = 3 lemons).
var FREE_RECIPE_LIMIT = 5;

// ---------- reading an ingredient line like "1 1/2 cups shredded cheddar" ----------
var UNIT_ALIASES = {
  cup: "cup", cups: "cup", c: "cup",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp", tbl: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp",
  ounce: "oz", ounces: "oz", oz: "oz",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  gram: "g", grams: "g", g: "g", kilogram: "kg", kilograms: "kg", kg: "kg",
  milliliter: "ml", milliliters: "ml", ml: "ml", liter: "l", liters: "l", l: "l",
  pint: "pint", pints: "pint", quart: "quart", quarts: "quart", gallon: "gallon", gallons: "gallon",
  can: "can", cans: "can", jar: "jar", jars: "jar", bottle: "bottle", bottles: "bottle",
  clove: "clove", cloves: "clove", package: "package", packages: "package", pkg: "package", packet: "package",
  bunch: "bunch", bunches: "bunch", slice: "slice", slices: "slice", stick: "stick", sticks: "stick",
  pinch: "pinch", pinches: "pinch", dash: "dash", dashes: "dash", head: "head", heads: "head",
  bag: "bag", bags: "bag", box: "box", boxes: "box", sprig: "sprig", sprigs: "sprig", block: "block", blocks: "block",
  loaf: "loaf", loaves: "loaf",
};
var UNIT_PLURAL = {
  cup: "cups", pint: "pints", quart: "quarts", gallon: "gallons", can: "cans", jar: "jars", bottle: "bottles",
  clove: "cloves", package: "packages", bunch: "bunches", slice: "slices", stick: "sticks", pinch: "pinches",
  dash: "dashes", head: "heads", bag: "bags", box: "boxes", sprig: "sprigs", block: "blocks", loaf: "loaves",
};
var FRACTION_CHARS = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };

function parseIngredient(line) {
  var s = String(line || "").trim().replace(/^[-•*]\s*/, "");
  if (!s) return null;
  s = s.replace(/(\d)?([½¼¾⅓⅔⅛⅜⅝⅞])/g, function (m, d, f) {
    return (d ? d + " " : "") + FRACTION_CHARS[f];
  });
  var qty = null;
  var m = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)(\s*(?:-|–|to)\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+))?\s*/.exec(s);
  if (m) {
    qty = m[1].split(/\s+/).reduce(function (a, part) {
      if (part.indexOf("/") > -1) {
        var f = part.split("/");
        return a + Number(f[0]) / (Number(f[1]) || 1);
      }
      return a + Number(part);
    }, 0);
    s = s.slice(m[0].length);
  }
  var unit = "";
  var um = /^([a-zA-Z]+)\.?(\s+|$)/.exec(s);
  if (um && qty !== null) {
    var w = um[1].toLowerCase();
    // "T" means tablespoon and "t" teaspoon in many family recipes
    if (um[1] === "T") w = "tbsp";
    else if (um[1] === "t") w = "tsp";
    if (UNIT_ALIASES[w]) {
      unit = UNIT_ALIASES[w];
      s = s.slice(um[0].length);
    }
  }
  s = s.replace(/^of\s+/i, "").trim();
  if (!s) return null;
  return { qty: qty, unit: unit, name: s };
}
function baseName(name) {
  return name.split(",")[0].replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}
function singular(word) {
  var w = word.toLowerCase();
  if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + "y";
  if (/(tomato|potato)es$/.test(w)) return w.slice(0, -2);
  if (/(ch|sh|x)es$/.test(w)) return w.slice(0, -2);
  if (/[^s]s$/.test(w) && w.length > 3) return w.slice(0, -1);
  return w;
}
function ingredientKey(unit, name) {
  var words = baseName(name).toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ");
  words[words.length - 1] = singular(words[words.length - 1]);
  return unit + "|" + words.join(" ");
}
var NICE_FRACTIONS = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
function fmtQty(q, unit) {
  if (q === null) return "";
  if (unit === "g" || unit === "ml") return String(Math.round(q));
  if (!unit && q >= 1) q = Math.ceil(q - 0.05); // you can't buy 4.5 eggs
  if (q >= 10) return String(Math.round(q));
  var whole = Math.floor(q);
  var frac = q - whole;
  var best = NICE_FRACTIONS[0];
  NICE_FRACTIONS.forEach(function (f) {
    if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  });
  if (best[0] === 1) return String(whole + 1);
  if (!whole) return best[1] || (q > 0 ? "⅛" : "0");
  return whole + (best[1] ? " " + best[1] : "");
}
function unitText(unit, q) {
  if (!unit) return "";
  return q !== null && q > 1 && UNIT_PLURAL[unit] ? UNIT_PLURAL[unit] : unit;
}

// ---------- saved recipes ----------
var Recipes = {
  all: function () {
    return Store.get("recipes", []);
  },
  find: function (id) {
    return (
      this.all().filter(function (r) {
        return r.id === id;
      })[0] || null
    );
  },
  save: function (r) {
    var arr = this.all();
    var i = arr.findIndex(function (x) {
      return x.id === r.id;
    });
    if (i > -1) arr[i] = r;
    else arr.push(r);
    Store.set("recipes", arr);
  },
  remove: function (id) {
    Store.set(
      "recipes",
      this.all().filter(function (r) {
        return r.id !== id;
      }),
    );
  },
  canAddMore: function () {
    return Account.hasExtras() || this.all().length < FREE_RECIPE_LIMIT;
  },
};

// ---------- this party's menu ----------
function getMenu() {
  return (Store.get("menu", []) || []).filter(function (e) {
    return Recipes.find(e.rid);
  });
}
function setMenu(m) {
  Store.set("menu", m);
}
function scaleOn() {
  return Account.hasExtras() && Store.get("menuScale", false);
}
function menuFactor(entry) {
  var r = Recipes.find(entry.rid);
  if (scaleOn() && r && r.servings > 0) return guests / r.servings;
  return entry.batches || 1;
}
function isOnMenu(rid) {
  return getMenu().some(function (e) {
    return e.rid === rid;
  });
}
function toggleMenu(rid) {
  var m = getMenu();
  if (isOnMenu(rid)) {
    m = m.filter(function (e) {
      return e.rid !== rid;
    });
    toast("Taken off the menu.");
  } else {
    m.push({ rid: rid, batches: 1 });
    toast("Added to the menu. Its ingredients are on your shopping list.");
  }
  setMenu(m);
  renderRecipes();
  renderMenuShopList();
}
function changeBatches(rid, d) {
  var m = getMenu().map(function (e) {
    if (e.rid === rid) e.batches = Math.max(1, Math.min(20, (e.batches || 1) + d));
    return e;
  });
  setMenu(m);
  renderRecipes();
  renderMenuShopList();
}
function toggleScale() {
  if (!Account.hasExtras()) {
    showExtras("Scaling recipes to your guest count");
    return;
  }
  Store.set("menuScale", !Store.get("menuScale", false));
  renderRecipes();
  renderMenuShopList();
}

// All ingredients from the menu, added together.
function menuIngredients() {
  var merged = {};
  var order = [];
  getMenu().forEach(function (entry) {
    var r = Recipes.find(entry.rid);
    if (!r) return;
    var f = menuFactor(entry);
    (r.ingredients || []).forEach(function (line) {
      var ing = parseIngredient(line);
      if (!ing) return;
      var key = ingredientKey(ing.unit, ing.name);
      if (!merged[key]) {
        merged[key] = { key: key, unit: ing.unit, qty: null, names: [], from: [] };
        order.push(key);
      }
      var it = merged[key];
      if (ing.qty !== null) it.qty = (it.qty || 0) + ing.qty * f;
      var bn = baseName(ing.name);
      if (it.names.indexOf(bn) === -1) it.names.push(bn);
      if (it.from.indexOf(r.name) === -1) it.from.push(r.name);
    });
  });
  return order.map(function (k) {
    var it = merged[k];
    var name = it.names[0];
    if (it.names.length > 1 || (it.qty !== null && it.qty > 1 && !it.unit)) {
      var plural = it.names.filter(function (n) {
        return /s$/i.test(n);
      })[0];
      if (it.qty !== null && it.qty > 1 && !it.unit && plural) name = plural;
      else if (it.names.length > 1) name = it.names[0];
    }
    var amount = it.qty === null ? "" : (fmtQty(it.qty, it.unit) + " " + unitText(it.unit, it.qty)).trim();
    return { key: it.key, name: name.charAt(0).toUpperCase() + name.slice(1), amount: amount, from: it.from };
  });
}

function renderMenuShopList() {
  var box = document.getElementById("menuList");
  var empty = document.getElementById("emptyMenu");
  if (!box) return;
  var items = menuIngredients();
  var checked = Store.get("menuChecked", {});
  if (!items.length) {
    box.innerHTML = "";
    empty.style.display = "block";
    updateShopStats();
    return;
  }
  empty.style.display = "none";
  box.innerHTML =
    '<div class="shop-category">' +
    items
      .map(function (it) {
        var k = encodeURIComponent(it.key).replace(/'/g, "%27");
        return (
          '<div class="shop-item' + (checked[it.key] ? " checked" : "") + '" onclick="toggleMenuCheck(decodeURIComponent(\'' + k + "'))\">" +
          '<div class="check-box"><svg class="chk" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg></div>' +
          '<span class="item-name">' + esc(it.name) + '<small class="item-from">' + esc(it.from.join(", ")) + "</small></span>" +
          '<span class="item-qty">' + esc(it.amount) + "</span></div>"
        );
      })
      .join("") +
    "</div>";
  updateShopStats();
}
function toggleMenuCheck(key) {
  var c = Store.get("menuChecked", {});
  if (c[key]) delete c[key];
  else c[key] = true;
  Store.set("menuChecked", c);
  renderMenuShopList();
}
function menuCounts() {
  var items = menuIngredients();
  var c = Store.get("menuChecked", {});
  return {
    total: items.length,
    checked: items.filter(function (i) {
      return c[i.key];
    }).length,
  };
}

// ---------- Recipes tab ----------
var editingRecipe = null; // id being edited, or "new"
var openRecipe = null; // id shown in full

function renderRecipes() {
  var el = document.getElementById("recipesBody");
  if (!el) return;
  var all = Recipes.all();
  var menu = getMenu();
  var extras = Account.hasExtras();
  var html = "";

  // the menu for this party
  html += '<div class="card menu-card"><div class="mix-head"><h3>Menu for ' + esc(Parties.active().name) + "</h3></div>";
  if (!menu.length) {
    html += '<p class="muted">Nothing on the menu yet. Tap <b>Add to menu</b> on any recipe below and its ingredients go straight to your shopping list.</p>';
  } else {
    html += '<div class="menu-list">';
    menu.forEach(function (e) {
      var r = Recipes.find(e.rid);
      var f = menuFactor(e);
      var right = scaleOn()
        ? '<span class="muted small">×' + fmtQty(f, "x") + " for " + guests + " guests</span>"
        : '<span class="stepper"><button onclick="changeBatches(\'' + r.id + "',-1)\" aria-label=\"Fewer batches\">−</button><span>" +
          (e.batches || 1) + (e.batches > 1 ? " batches" : " batch") + "</span><button onclick=\"changeBatches('" + r.id + "',1)\" aria-label=\"More batches\">+</button></span>";
      html +=
        '<div class="menu-row"><div><b>' + esc(r.name) + '</b><span class="muted small">Serves ' + esc(r.servings || "?") + " per batch</span></div>" + right +
        '<button class="x-btn" onclick="toggleMenu(\'' + r.id + '\')" aria-label="Take off the menu">×</button></div>';
    });
    html += "</div>";
  }
  html +=
    '<label class="check-row scale-row"><input type="checkbox" id="scaleToggle" ' + (scaleOn() ? "checked" : "") + ' onclick="event.preventDefault();toggleScale()"> Scale every recipe to my ' + guests + " guests" +
    (extras ? "" : ' <span class="extras-tag">' + icon("lock", 11) + " Extras</span>") + "</label>";
  if (menu.length) html += '<button class="btn primary" onclick="switchTab(\'shop\')">See my shopping list &rarr;</button>';
  html += "</div>";

  // the recipe library
  html +=
    '<div class="recipes-head"><h3 class="sec" style="margin:0">Your recipes</h3><span class="muted small">' +
    (extras ? all.length + " saved" : all.length + " of " + FREE_RECIPE_LIMIT + " free") +
    '</span><button class="btn primary sm" onclick="newRecipe()">' + icon("plus", 14) + " New recipe</button></div>";

  if (editingRecipe === "new") html += recipeFormHtml(null);

  if (!all.length && editingRecipe !== "new") {
    html +=
      '<div class="card empty-recipes"><p>Save your go-to dishes here: dips, sides, desserts, drinks. Add one to any party\'s menu and the shopping list fills itself in.</p>' +
      '<div class="row-gap"><button class="btn primary" onclick="newRecipe()">Add your first recipe</button><button class="btn" onclick="addSampleRecipe()">Try a sample recipe</button></div></div>';
  }

  all.forEach(function (r) {
    if (editingRecipe === r.id) {
      html += recipeFormHtml(r);
      return;
    }
    var on = isOnMenu(r.id);
    var isOpen = openRecipe === r.id;
    html +=
      '<div class="card recipe-card' + (on ? " on-menu" : "") + '">' +
      '<div class="recipe-top"><button class="recipe-name" onclick="toggleRecipeOpen(\'' + r.id + "')\">" + esc(r.name) +
      '<span class="muted small">Serves ' + esc(r.servings || "?") + " · " + (r.ingredients || []).length + " ingredients</span></button>" +
      '<button class="btn sm ' + (on ? "on" : "primary") + '" onclick="toggleMenu(\'' + r.id + "')\">" + (on ? "On the menu ✓" : "Add to menu") + "</button></div>";
    if (isOpen) {
      html +=
        '<div class="recipe-detail"><h4>Ingredients</h4><ul>' +
        (r.ingredients || []).map(function (i) {
          return "<li>" + esc(i) + "</li>";
        }).join("") +
        "</ul>" +
        (r.steps ? "<h4>Steps</h4><p class=\"pre\">" + esc(r.steps) + "</p>" : "") +
        '<div class="row-gap"><button class="btn sm" onclick="editRecipe(\'' + r.id + "')\">" + icon("edit", 14) + " Edit</button></div></div>";
    }
    html += "</div>";
  });
  el.innerHTML = html;
}
function recipeFormHtml(r) {
  r = r || { name: "", servings: 8, ingredients: [], steps: "" };
  var id = r.id || "new";
  return (
    '<form class="card recipe-form" onsubmit="return saveRecipe(event,\'' + id + "')\">" +
    "<h3>" + (r.id ? "Edit recipe" : "New recipe") + "</h3>" +
    '<div class="share-form-row"><label for="rfName">Recipe name</label><input id="rfName" maxlength="80" required value="' + esc(r.name) + '" placeholder="e.g. Hot honey whipped feta"></div>' +
    '<div class="share-form-row"><label for="rfServes">Serves how many?</label><input id="rfServes" type="number" inputmode="numeric" min="1" max="500" value="' + esc(r.servings || 8) + '" style="width:110px"></div>' +
    '<div class="share-form-row"><label for="rfIngredients">Ingredients, one per line</label><textarea id="rfIngredients" rows="7" maxlength="4000" placeholder="8 oz feta\n4 oz cream cheese\n2 tbsp hot honey\n1 lemon">' +
    esc((r.ingredients || []).join("\n")) + "</textarea>" +
    '<p class="card-hint" style="margin:4px 0 0">Start each line with the amount, like "2 cups flour" or "1 1/2 lb shrimp". Lines without an amount (like "salt to taste") are fine too.</p></div>' +
    '<div class="share-form-row"><label for="rfSteps">Steps (optional)</label><textarea id="rfSteps" rows="4" maxlength="6000">' + esc(r.steps || "") + "</textarea></div>" +
    '<div class="row-gap end">' +
    (r.id ? '<span id="rfDel"><button type="button" class="btn danger-link" onclick="askDeleteRecipe(\'' + r.id + '\')">' + icon("trash", 14) + " Delete</button></span>" : "") +
    '<button type="button" class="btn" onclick="cancelRecipe()">Cancel</button><button class="btn primary" type="submit">Save recipe</button></div></form>'
  );
}
function askDeleteRecipe(id) {
  document.getElementById("rfDel").innerHTML =
    'Delete this recipe? <button type="button" class="btn sm danger" onclick="deleteRecipe(\'' + id + '\')">Yes, delete</button>';
}
function newRecipe() {
  if (!Recipes.canAddMore()) {
    showExtras("Saving more than " + FREE_RECIPE_LIMIT + " recipes");
    return;
  }
  editingRecipe = "new";
  renderRecipes();
  var n = document.getElementById("rfName");
  if (n) n.focus();
}
function editRecipe(id) {
  editingRecipe = id;
  renderRecipes();
}
function cancelRecipe() {
  editingRecipe = null;
  renderRecipes();
}
function toggleRecipeOpen(id) {
  openRecipe = openRecipe === id ? null : id;
  renderRecipes();
}
function saveRecipe(ev, id) {
  ev.preventDefault();
  var r = id === "new" ? { id: "r" + Store.newId().slice(1) } : Recipes.find(id);
  if (!r) return false;
  r.name = document.getElementById("rfName").value.trim().slice(0, 80) || "Untitled recipe";
  r.servings = Math.max(1, Math.min(500, Math.round(Number(document.getElementById("rfServes").value) || 1)));
  r.ingredients = document
    .getElementById("rfIngredients")
    .value.split("\n")
    .map(function (s) {
      return s.trim().slice(0, 160);
    })
    .filter(Boolean)
    .slice(0, 80);
  r.steps = document.getElementById("rfSteps").value.trim();
  Recipes.save(r);
  editingRecipe = null;
  openRecipe = r.id;
  renderRecipes();
  renderMenuShopList();
  toast("Recipe saved.");
  return false;
}
function deleteRecipe(id) {
  Recipes.remove(id);
  setMenu(
    getMenu().filter(function (e) {
      return e.rid !== id;
    }),
  );
  editingRecipe = null;
  renderRecipes();
  renderMenuShopList();
  toast("Recipe deleted.");
}
function addSampleRecipe() {
  if (!Recipes.canAddMore()) {
    showExtras("Saving more than " + FREE_RECIPE_LIMIT + " recipes");
    return;
  }
  var r = {
    id: "r" + Store.newId().slice(1),
    name: "Hot honey whipped feta",
    servings: 8,
    ingredients: ["8 oz feta", "4 oz cream cheese, softened", "2 tbsp olive oil", "2 tbsp hot honey", "1 lemon", "1/4 cup chopped pistachios", "1 baguette"],
    steps:
      "Blend the feta, cream cheese, olive oil and the juice of half the lemon until smooth.\nSpread in a shallow bowl, drizzle with hot honey and top with pistachios and lemon zest.\nServe with sliced, toasted baguette.",
    sample: true,
  };
  Recipes.save(r);
  openRecipe = r.id;
  renderRecipes();
  toast("Sample recipe added. Edit or delete it any time.");
}
