// "Add your own food" on the Style tab: named shapes, and uploaded photos with the background removed.
// Photos are processed and kept on the visitor's own device (browser storage); they are never uploaded.
var CustomFood = (function () {
  var SHAPES = [
    { k: "circle", label: "Circle" },
    { k: "oval", label: "Oval" },
    { k: "square", label: "Square" },
    { k: "rectangle", label: "Rectangle" },
    { k: "bowl", label: "Small bowl" },
  ];
  var COLORS = ["#C0392B", "#E8A0A0", "#F4D35E", "#F5EBD7", "#8DB255", "#3E6B2F", "#7B3F61", "#E67E22", "#8B5A2B", "#FFFFFF"];
  var MAX_IMG = 512; // px, longest side of a stored cut-out
  // Each photo is kept under its own browser-storage key, so a full device only affects photos.
  var IMG_PREFIX = "boardcraft:img:";
  function readImage(id) {
    try {
      return localStorage.getItem(IMG_PREFIX + id);
    } catch (e) {
      return null;
    }
  }
  function writeImage(id, data) {
    try {
      localStorage.setItem(IMG_PREFIX + id, data);
      return true;
    } catch (e) {
      return false;
    }
  }
  var shapeState = { shape: "circle", color: COLORS[0] };
  var photo = null; // { canvas (original), cut (canvas), keepBg }

  function el(id) {
    return document.getElementById(id);
  }
  function close() {
    el("customPanel").innerHTML = "";
    el("customPanel").style.display = "none";
    photo = null;
  }
  function sizeField(id, val) {
    return (
      '<label class="size-field">Size (longest side)<span><input type="number" inputmode="decimal" min="1" max="36" step="0.5" id="' +
      id +
      '" value="' +
      val +
      '"> in</span></label>'
    );
  }
  function nameField(id, ph) {
    return (
      '<label class="size-field custom-name">Name<span><input type="text" maxlength="40" id="' + id + '" placeholder="' + ph + '"></span></label>'
    );
  }
  function readSize(id) {
    var v = parseFloat(el(id).value);
    return isFinite(v) ? Math.max(1, Math.min(36, Math.round(v * 2) / 2)) : 3;
  }

  // ---------- shapes ----------
  function openShape() {
    var shapes = SHAPES.map(function (s) {
      return (
        '<button class="preset-chip' + (s.k === shapeState.shape ? " active" : "") + '" onclick="CustomFood.pickShape(\'' + s.k + "')\">" + s.label + "</button>"
      );
    }).join("");
    var colors = COLORS.map(function (c) {
      return (
        '<button class="swatch' + (c === shapeState.color ? " active" : "") + '" style="background:' + c + '" aria-label="Color ' + c + '" onclick="CustomFood.pickColor(\'' + c + "')\"></button>"
      );
    }).join("");
    el("customPanel").innerHTML =
      '<div class="custom-card"><div class="custom-head"><strong>Add a named shape</strong><button class="btn sm" onclick="CustomFood.close()">Cancel</button></div>' +
      nameField("csName", "e.g. Marinated mozzarella") +
      '<div class="custom-row"><span class="custom-lbl">Shape</span>' + shapes + "</div>" +
      '<div class="custom-row"><span class="custom-lbl">Color</span>' + colors +
      '<input type="color" id="csColor" value="' + shapeState.color + '" onchange="CustomFood.pickColor(this.value)" aria-label="Pick any color"></div>' +
      '<div class="custom-row">' + sizeField("csSize", 3) + '<div class="custom-preview" id="csPreview"></div></div>' +
      '<div class="custom-actions"><button class="btn primary" onclick="CustomFood.addShape()">Add to board</button></div></div>';
    el("customPanel").style.display = "block";
    el("csName").addEventListener("input", previewShape);
    previewShape();
    el("csName").focus();
  }
  function previewShape() {
    var name = (el("csName") && el("csName").value.trim()) || "Your food";
    el("csPreview").innerHTML = '<div style="width:72px;height:72px;position:relative">' + shapeHtml({ shape: shapeState.shape, color: shapeState.color, item: name }, 72) + "</div>";
  }
  function textColor(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#2A1F14" : "#FFFFFF";
  }
  // The look of a named shape, drawn inside its square piece.
  function shapeHtml(p, sizePx) {
    var shape = p.shape || "circle";
    var w = 100, h = 100, radius = "50%";
    if (shape === "oval") { h = 66; }
    if (shape === "rectangle") { h = 60; radius = "8%"; }
    if (shape === "square") { radius = "8%"; }
    var color = /^#[0-9a-fA-F]{6}$/.test(p.color || "") ? p.color : "#E8DDD0";
    var style = "width:" + w + "%;height:" + h + "%;border-radius:" + radius + ";background:" + color + ";color:" + textColor(color) + ";font-size:" + Math.max(8, Math.min(15, sizePx / 7)) + "px";
    if (shape === "bowl")
      style += ";background:radial-gradient(circle at 50% 50%," + color + " 58%,#F7F3EC 60%,#E6DED2 72%,#CFC4B4 100%)";
    return '<div class="shape-piece" style="' + style + '"><span>' + esc(p.item || "") + "</span></div>";
  }
  function addShape() {
    var name = el("csName").value.trim().slice(0, 40);
    if (!name) {
      toast("Give your food a name first.");
      el("csName").focus();
      return;
    }
    StyleBoard.addCustom({ kind: "shape", item: name, shape: shapeState.shape, color: shapeState.color, size: readSize("csSize") });
    close();
    toast('"' + name + '" is on your board. Drag it where you like.');
  }

  // ---------- photos ----------
  function openPhoto() {
    el("customPanel").innerHTML =
      '<div class="custom-card"><div class="custom-head"><strong>Add your own food photo</strong><button class="btn sm" onclick="CustomFood.close()">Cancel</button></div>' +
      '<p class="custom-tip">Best results: shoot straight down, on a plain plate or parchment, in daylight. Your photo stays on this device.</p>' +
      '<div class="custom-row"><input type="file" accept="image/*" id="cpFile" onchange="CustomFood.loadPhoto(this)"></div>' +
      '<div id="cpEdit" style="display:none">' +
      '<div class="custom-row"><div class="checker" id="cpPreview"></div></div>' +
      '<div class="custom-row"><label class="check-row"><input type="checkbox" id="cpRemove" checked onchange="CustomFood.recut()"> Remove background</label>' +
      '<label class="range-inline">Strength <input type="range" id="cpStrength" min="5" max="80" value="32" oninput="CustomFood.recut()"></label></div>' +
      '<div class="custom-row">' + nameField("cpName", "e.g. Grandma's pimento cheese") + sizeField("cpSize", 4) + "</div>" +
      '<div class="custom-actions"><button class="btn primary" onclick="CustomFood.addPhoto()">Add to board</button></div></div></div>';
    el("customPanel").style.display = "block";
  }
  function loadPhoto(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast("Please choose a photo.");
      return;
    }
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var s = Math.min(1, MAX_IMG / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      photo = { canvas: c, cut: null };
      el("cpEdit").style.display = "block";
      if (!el("cpName").value) el("cpName").value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 40);
      recut();
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      toast("Sorry, that photo couldn't be opened. Try a JPG or PNG.");
    };
    img.src = url;
  }
  function recut() {
    if (!photo) return;
    var remove = el("cpRemove").checked;
    el("cpStrength").disabled = !remove;
    photo.cut = remove ? removeBackground(photo.canvas, Number(el("cpStrength").value)) : cropCopy(photo.canvas);
    var prev = el("cpPreview");
    prev.innerHTML = "";
    var shown = document.createElement("img");
    shown.src = photo.cut.toDataURL("image/png");
    prev.appendChild(shown);
  }
  function cropCopy(src) {
    var c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
    return c;
  }
  // Background removal that runs on the device: the background is taken to be the colour
  // around the photo's edges, and everything connected to the edges that is close to that
  // colour is made see-through, with a soft edge. Then the photo is cropped to the food.
  function removeBackground(src, strength) {
    var w = src.width, h = src.height;
    var ctx = src.getContext("2d");
    var data = ctx.getImageData(0, 0, w, h);
    var px = data.data;
    // average edge colour
    var r = 0, g = 0, b = 0, n = 0;
    function addPx(i) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
    for (var x = 0; x < w; x++) { addPx(x * 4); addPx(((h - 1) * w + x) * 4); }
    for (var y = 0; y < h; y++) { addPx(y * w * 4); addPx((y * w + w - 1) * 4); }
    r /= n; g /= n; b /= n;
    var tol = strength * 2.2; // colour distance counted as background
    var soft = 18;
    function dist(i) {
      var dr = px[i] - r, dg = px[i + 1] - g, db = px[i + 2] - b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }
    // flood fill from the edges
    var bg = new Uint8Array(w * h);
    var stack = [];
    function push(p) { if (!bg[p] && dist(p * 4) < tol + soft) { bg[p] = 1; stack.push(p); } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      var p = stack.pop(), px0 = p % w, py0 = (p - px0) / w;
      if (px0 > 0) push(p - 1);
      if (px0 < w - 1) push(p + 1);
      if (py0 > 0) push(p - w);
      if (py0 < h - 1) push(p + w);
    }
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var q = 0; q < w * h; q++) {
      var i = q * 4;
      if (bg[q]) {
        var d = dist(i);
        px[i + 3] = d <= tol ? 0 : Math.round(255 * Math.min(1, (d - tol) / soft));
      }
      if (px[i + 3] > 40) {
        var qx = q % w, qy = (q - qx) / w;
        if (qx < minX) minX = qx;
        if (qx > maxX) maxX = qx;
        if (qy < minY) minY = qy;
        if (qy > maxY) maxY = qy;
      }
    }
    var out = document.createElement("canvas");
    if (maxX < 0) {
      // everything was removed: strength too high, so keep the whole photo
      return cropCopy(src);
    }
    var tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").putImageData(data, 0, 0);
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(tmp, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
  function addPhoto() {
    if (!photo || !photo.cut) {
      toast("Choose a photo first.");
      return;
    }
    var name = el("cpName").value.trim().slice(0, 40) || "My food";
    var id = "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var dataUrl = photo.cut.toDataURL("image/webp", 0.85);
    if (dataUrl.indexOf("data:image/webp") !== 0) dataUrl = photo.cut.toDataURL("image/png");
    if (!writeImage(id, dataUrl)) {
      toast("This device is out of room for more photos. Remove one from your board, or use a named shape instead.");
      return;
    }
    StyleBoard.addCustom({ kind: "photo", item: name, imgId: id, size: readSize("cpSize") });
    close();
    toast('"' + name + '" is on your board. Drag it where you like.');
  }

  return {
    openShape: openShape,
    openPhoto: openPhoto,
    close: close,
    pickShape: function (k) {
      shapeState.shape = k;
      document.querySelectorAll("#customPanel .preset-chip").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("onclick").indexOf("'" + k + "'") > -1);
      });
      previewShape();
    },
    pickColor: function (c) {
      if (!/^#[0-9a-fA-F]{6}$/.test(c)) return;
      shapeState.color = c;
      document.querySelectorAll("#customPanel .swatch").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("onclick").indexOf(c) > -1);
      });
      el("csColor").value = c;
      previewShape();
    },
    addShape: addShape,
    loadPhoto: loadPhoto,
    recut: recut,
    addPhoto: addPhoto,
    shapeHtml: shapeHtml,
    imageSrc: function (id) {
      var s = readImage(id);
      return typeof s === "string" && /^data:image\/(png|webp|jpeg);base64,/.test(s) ? s : null;
    },
    forgetImage: function (id) {
      try {
        localStorage.removeItem(IMG_PREFIX + id);
      } catch (e) {}
    },
    removeBackground: removeBackground,
  };
})();
