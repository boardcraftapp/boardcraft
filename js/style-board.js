// The Style tab: a to-scale picture of the visitor's board.
// Positions and sizes are stored in inches, so the layout survives a change of screen size,
// and every food photo is drawn at a realistic real-world size for the board the visitor entered.
var StyleBoard = (function () {
  var SHAPES = {
    round: { label: "Round", oneSize: true, sizeLabel: "Diameter", presets: [12, 14, 16, 18, 24] },
    oval: { label: "Oval", oneSize: false, presets: [[16, 10], [18, 12], [22, 14], [28, 16]] },
    square: { label: "Square", oneSize: true, sizeLabel: "Side", presets: [12, 14, 16, 20, 24] },
    rectangle: { label: "Rectangle", oneSize: false, presets: [[16, 10], [18, 12], [24, 12], [36, 16], [48, 24]] },
  };
  var MIN_IN = 6,
    MAX_IN = 120;

  var state = Store.get("style", null) || { shape: "oval", len: 18, wid: 12, pieces: [] };
  if (!SHAPES[state.shape]) state.shape = "oval";
  var selected = null; // uid of the selected piece
  var scale = 30; // pixels per inch, recalculated on render
  var drag = null;

  function save() {
    Store.set("style", state);
  }
  function el(id) {
    return document.getElementById(id);
  }
  function uid() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function foodFor(cat, item) {
    return FOOD[item] || FOOD[CATEGORY_FALLBACK[cat]] || { img: null, size: 3.5 };
  }
  // pick one of a food's photos for this piece, the same one every time
  function photoFor(f, id) {
    if (!f.alts || !f.alts.length) return f.img;
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return f.alts[Math.abs(h) % f.alts.length];
  }
  function clampSize(v) {
    v = parseFloat(v);
    if (!isFinite(v)) return null;
    return Math.max(MIN_IN, Math.min(MAX_IN, Math.round(v * 2) / 2));
  }

  // ---------- controls ----------
  function renderControls() {
    var shapeBtns = Object.keys(SHAPES)
      .map(function (k) {
        return (
          '<button class="vboard-btn' +
          (state.shape === k ? " active" : "") +
          '" onclick="StyleBoard.setShape(\'' +
          k +
          "')\">" +
          '<span class="shape-ico shape-' +
          k +
          '"></span>' +
          SHAPES[k].label +
          "</button>"
        );
      })
      .join("");
    el("vboardShapes").innerHTML = shapeBtns;
    var s = SHAPES[state.shape];
    var inputs = s.oneSize
      ? '<label class="size-field">' +
        s.sizeLabel +
        '<span><input type="number" inputmode="decimal" min="' +
        MIN_IN +
        '" max="' +
        MAX_IN +
        '" step="0.5" id="sizeLen" value="' +
        state.len +
        '" onchange="StyleBoard.setSize()"> in</span></label>'
      : '<label class="size-field">Length<span><input type="number" inputmode="decimal" min="' +
        MIN_IN +
        '" max="' +
        MAX_IN +
        '" step="0.5" id="sizeLen" value="' +
        state.len +
        '" onchange="StyleBoard.setSize()"> in</span></label><span class="size-x">&times;</span>' +
        '<label class="size-field">Width<span><input type="number" inputmode="decimal" min="' +
        MIN_IN +
        '" max="' +
        MAX_IN +
        '" step="0.5" id="sizeWid" value="' +
        state.wid +
        '" onchange="StyleBoard.setSize()"> in</span></label>';
    var presets = s.presets
      .map(function (p) {
        var l = Array.isArray(p) ? p[0] : p,
          w = Array.isArray(p) ? p[1] : p;
        var on = state.len === l && state.wid === w;
        return (
          '<button class="preset-chip' +
          (on ? " active" : "") +
          '" onclick="StyleBoard.setSize(' +
          l +
          "," +
          w +
          ')">' +
          (l === w ? l + '"' : l + '" &times; ' + w + '"') +
          "</button>"
        );
      })
      .join("");
    el("vboardSize").innerHTML =
      '<div class="size-inputs">' + inputs + '</div><div class="preset-row"><span>Common sizes:</span>' + presets + "</div>";
  }

  // Typing in a size box redraws only the board, so the box being typed in keeps its focus.
  function highlightPreset() {
    document.querySelectorAll("#vboardSize .preset-chip").forEach(function (b) {
      var m = b.getAttribute("onclick").match(/setSize\(([\d.]+),([\d.]+)\)/);
      b.classList.toggle("active", !!m && +m[1] === state.len && +m[2] === state.wid);
    });
  }

  // ---------- board ----------
  function boardPixelSize() {
    var wrap = el("vboardOuter");
    var avail = Math.max(240, (wrap.clientWidth || 600) - 16);
    var maxH = Math.max(260, Math.min(560, window.innerHeight * 0.62));
    var w = avail,
      h = (avail * state.wid) / state.len;
    if (h > maxH) {
      h = maxH;
      w = (h * state.len) / state.wid;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }

  function render(keepControls) {
    if (keepControls) highlightPreset();
    else renderControls();
    var canvas = el("vboardCanvas");
    var px = boardPixelSize();
    scale = px.w / state.len;
    canvas.className = "vboard-canvas wood shape-" + state.shape;
    canvas.style.width = px.w + "px";
    canvas.style.height = px.h + "px";
    // the visible wood grain gets finer on bigger boards, like real planks
    canvas.style.setProperty("--grain", Math.max(6, Math.round(scale * 1.1)) + "px");
    canvas.innerHTML = "";
    if (!state.pieces.length) {
      canvas.innerHTML =
        '<div class="vboard-empty"><p>' +
        (Object.keys(boardSelected).length
          ? 'Tap <strong>Load my board</strong> to place your ingredients.'
          : "Pick ingredients in the <strong>Board</strong> tab first, then come back here.") +
        "</p></div>";
    }
    state.pieces.forEach(function (p) {
      canvas.appendChild(renderPiece(p));
    });
    el("vboardDims").textContent =
      SHAPES[state.shape].label +
      " board, " +
      (SHAPES[state.shape].oneSize ? state.len + " in" : state.len + " × " + state.wid + " in");
    renderCoverage();
    renderToolbar();
    el("shareFromVisual").style.display = state.pieces.length ? "flex" : "none";
  }

  function renderPiece(p) {
    var d = document.createElement("div");
    d.className = "piece" + (p.uid === selected ? " selected" : "");
    d.dataset.uid = p.uid;
    var f = foodFor(p.cat, p.item);
    var sizePx = p.size * scale;
    d.style.width = sizePx + "px";
    d.style.height = sizePx + "px";
    d.style.left = p.x * scale - sizePx / 2 + "px";
    d.style.top = p.y * scale - sizePx / 2 + "px";
    d.style.transform = "rotate(" + (p.rot || 0) + "deg)";
    d.style.zIndex = p.z || 1;
    if (p.kind === "shape") {
      d.innerHTML = CustomFood.shapeHtml(p, sizePx);
    } else if (p.kind === "photo") {
      var src = CustomFood.imageSrc(p.imgId);
      d.innerHTML = src
        ? '<img src="' + src + '" alt="' + esc(p.item) + '" draggable="false">'
        : CustomFood.shapeHtml({ shape: "circle", color: "#E8DDD0", item: p.item }, sizePx);
    } else if (f.img) {
      d.innerHTML =
        '<img src="' + photoFor(f, p.uid) + '" alt="' + esc(p.item) + '" draggable="false" loading="lazy">';
    } else {
      // until a photo is added for this food, show its emoji at the same real-life size
      var ico = (typeof getEmoji === "function" ? getEmoji(p.cat, p.item) : "") || "";
      var bg = foodIcons[p.cat] ? foodIcons[p.cat].bg : "#FFF";
      d.innerHTML =
        '<div class="piece-fallback" style="background:' + bg + ";font-size:" + Math.round(sizePx * 0.5) + 'px">' + ico + "</div>";
    }
    d.innerHTML +=
      '<span class="piece-label">' +
      esc(p.item) +
      '</span><span class="piece-handle" title="Drag to resize"></span>';
    d.addEventListener("pointerdown", onPointerDown);
    return d;
  }

  function renderCoverage() {
    var boardArea =
      state.shape === "round" || state.shape === "oval"
        ? (Math.PI * state.len * state.wid) / 4
        : state.len * state.wid;
    // a cut-out photo fills roughly 60% of its square, so count that much of each piece
    var used = state.pieces.reduce(function (a, p) {
      return a + p.size * p.size * 0.6;
    }, 0);
    var pct = boardArea ? Math.round((used / boardArea) * 100) : 0;
    var msg = "";
    if (!state.pieces.length) msg = "";
    else if (pct < 45)
      msg =
        "About " + pct + "% of the board is covered. Looks a little sparse: make portions bigger, copy a few items, or try a smaller board.";
    else if (pct <= 95) msg = "About " + pct + "% of the board is covered. A nice, full board.";
    else
      msg =
        "About " + pct + "% of the board is covered. It's overflowing: try a bigger board or smaller portions.";
    el("vboardCoverage").textContent = msg;
  }

  function renderToolbar() {
    var bar = el("pieceToolbar");
    var p = find(selected);
    if (!p) {
      bar.innerHTML =
        '<span class="toolbar-hint">Tap a food to move, resize, turn, copy or remove it.</span>';
      return;
    }
    bar.innerHTML =
      "<strong>" +
      esc(p.item) +
      '</strong><span class="toolbar-size">' +
      p.size +
      ' in</span><button class="btn sm" onclick="StyleBoard.resize(-0.5)" aria-label="Smaller">&minus;</button><button class="btn sm" onclick="StyleBoard.resize(0.5)" aria-label="Bigger">+</button><button class="btn sm" onclick="StyleBoard.rotate()">Turn</button><button class="btn sm" onclick="StyleBoard.duplicate()">Copy</button><button class="btn sm" onclick="StyleBoard.remove()">Remove</button>';
  }

  function find(id) {
    for (var i = 0; i < state.pieces.length; i++) if (state.pieces[i].uid === id) return state.pieces[i];
    return null;
  }
  function topZ() {
    return state.pieces.reduce(function (a, p) {
      return Math.max(a, p.z || 1);
    }, 1);
  }

  // ---------- dragging and resizing ----------
  function onPointerDown(e) {
    var node = e.currentTarget;
    var p = find(node.dataset.uid);
    if (!p) return;
    e.preventDefault();
    selected = p.uid;
    p.z = topZ() + 1;
    var rect = el("vboardCanvas").getBoundingClientRect();
    var resizing = e.target.classList.contains("piece-handle");
    drag = {
      p: p,
      node: node,
      resizing: resizing,
      startX: e.clientX,
      startY: e.clientY,
      ox: p.x,
      oy: p.y,
      osize: p.size,
      rect: rect,
      moved: false,
    };
    node.setPointerCapture(e.pointerId);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerUp);
    document.querySelectorAll(".piece.selected").forEach(function (n) {
      n.classList.remove("selected");
    });
    node.classList.add("selected");
    node.style.zIndex = p.z;
    renderToolbar();
  }
  function onPointerMove(e) {
    if (!drag) return;
    var dx = (e.clientX - drag.startX) / scale,
      dy = (e.clientY - drag.startY) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 0.05) drag.moved = true;
    var p = drag.p;
    if (drag.resizing) {
      p.size = Math.max(1, Math.min(Math.max(state.len, state.wid), Math.round((drag.osize + Math.max(dx, dy) * 2) * 4) / 4));
    } else {
      p.x = Math.max(0, Math.min(state.len, drag.ox + dx));
      p.y = Math.max(0, Math.min(state.wid, drag.oy + dy));
    }
    var sizePx = p.size * scale;
    drag.node.style.width = sizePx + "px";
    drag.node.style.height = sizePx + "px";
    drag.node.style.left = p.x * scale - sizePx / 2 + "px";
    drag.node.style.top = p.y * scale - sizePx / 2 + "px";
    if (drag.resizing) renderToolbar();
  }
  function onPointerUp(e) {
    if (!drag) return;
    var n = drag.node;
    n.removeEventListener("pointermove", onPointerMove);
    n.removeEventListener("pointerup", onPointerUp);
    n.removeEventListener("pointercancel", onPointerUp);
    drag = null;
    save();
    renderCoverage();
    renderToolbar();
  }

  // ---------- arranging ----------
  // Spreads pieces evenly over the board: a sunflower pattern on round and oval boards,
  // a loose grid on square and rectangular ones. Biggest items go first.
  function arrange(pieces) {
    var n = pieces.length;
    if (!n) return;
    var order = pieces.slice().sort(function (a, b) {
      return b.size - a.size;
    });
    var cx = state.len / 2,
      cy = state.wid / 2;
    var avg = order.reduce(function (s, p) {
      return s + p.size;
    }, 0) / n;
    var mx = Math.max(0.5, cx - avg * 0.45),
      my = Math.max(0.5, cy - avg * 0.45);
    if (state.shape === "round" || state.shape === "oval") {
      order.forEach(function (p, i) {
        var r = n === 1 ? 0 : Math.sqrt((i + 0.5) / n);
        var ang = i * 2.399963 + 0.6;
        p.x = cx + Math.cos(ang) * r * mx;
        p.y = cy + Math.sin(ang) * r * my;
      });
    } else {
      var cols = Math.max(1, Math.round(Math.sqrt((n * state.len) / state.wid)));
      var rows = Math.ceil(n / cols);
      order.forEach(function (p, i) {
        var c = i % cols,
          r = Math.floor(i / cols);
        var inRow = r === rows - 1 ? n - r * cols : cols; // centre a short last row
        var offset = (cols - inRow) / 2;
        p.x = cx - mx + ((c + offset + 0.5) / cols) * 2 * mx + (Math.random() - 0.5) * avg * 0.15;
        p.y = cy - my + ((r + 0.5) / rows) * 2 * my + (Math.random() - 0.5) * avg * 0.15;
      });
    }
    order.forEach(function (p, i) {
      p.rot = Math.round(Math.random() * 30 - 15);
      p.z = i + 1;
    });
    keepInside();
  }
  function inside(x, y, margin) {
    if (state.shape === "round" || state.shape === "oval") {
      var a = state.len / 2 - margin,
        b = state.wid / 2 - margin;
      if (a <= 0 || b <= 0) return false;
      var dx = (x - state.len / 2) / a,
        dy = (y - state.wid / 2) / b;
      return dx * dx + dy * dy <= 1;
    }
    return x >= margin && x <= state.len - margin && y >= margin && y <= state.wid - margin;
  }

  function newPiece(cat, item) {
    return { uid: uid(), cat: cat, item: item, size: foodFor(cat, item).size, x: state.len / 2, y: state.wid / 2, rot: 0, z: 1 };
  }

  // ---------- public actions ----------
  return {
    render: render,
    setShape: function (k) {
      if (!SHAPES[k]) return;
      state.shape = k;
      if (SHAPES[k].oneSize) state.wid = state.len = Math.max(state.len, state.wid);
      else if (state.len === state.wid) state.wid = Math.max(MIN_IN, Math.round(state.len * 0.66));
      if (state.pieces.length) arrange(state.pieces);
      save();
      render();
    },
    setSize: function (l, w) {
      var s = SHAPES[state.shape];
      var fromInputs = l === undefined;
      if (fromInputs) {
        l = clampSize(el("sizeLen").value);
        w = s.oneSize ? l : clampSize(el("sizeWid").value);
      }
      if (!l || !w) return;
      if (w > l) {
        var t = l;
        l = w;
        w = t;
      }
      // keep food in the same relative spot when the board changes size
      var fx = l / state.len,
        fy = w / state.wid;
      state.pieces.forEach(function (p) {
        p.x *= fx;
        p.y *= fy;
      });
      state.len = l;
      state.wid = w;
      keepInside();
      save();
      if (fromInputs) {
        if (Number(el("sizeLen").value) !== l) el("sizeLen").value = l;
        if (el("sizeWid") && Number(el("sizeWid").value) !== w) el("sizeWid").value = w;
      }
      render(fromInputs);
    },
    loadFromBoard: function () {
      var have = {};
      state.pieces.forEach(function (p) {
        have[p.cat + "::" + p.item] = true;
      });
      var added = [];
      Object.values(boardSelected).forEach(function (o) {
        if (!have[o.cat + "::" + o.item]) added.push(newPiece(o.cat, o.item));
      });
      if (!added.length && !state.pieces.length) {
        render();
        return;
      }
      state.pieces = state.pieces.concat(added);
      if (added.length) arrange(state.pieces);
      save();
      render();
    },
    autoArrange: function () {
      arrange(state.pieces);
      save();
      render();
    },
    clear: function () {
      state.pieces = [];
      selected = null;
      save();
      render();
    },
    resize: function (d) {
      var p = find(selected);
      if (!p) return;
      p.size = Math.max(1, Math.round((p.size + d) * 2) / 2);
      save();
      render();
    },
    rotate: function () {
      var p = find(selected);
      if (!p) return;
      p.rot = ((p.rot || 0) + 45) % 360;
      save();
      render();
    },
    duplicate: function () {
      var p = find(selected);
      if (!p) return;
      var c = Object.assign({}, p, { uid: uid(), x: Math.min(state.len, p.x + p.size * 0.6), y: Math.min(state.wid, p.y + p.size * 0.3), z: topZ() + 1 });
      state.pieces.push(c);
      selected = c.uid;
      save();
      render();
    },
    remove: function () {
      var gone = find(selected);
      state.pieces = state.pieces.filter(function (p) {
        return p.uid !== selected;
      });
      // forget an uploaded photo once no piece on the board uses it
      if (gone && gone.imgId && !state.pieces.some(function (p) { return p.imgId === gone.imgId; }))
        CustomFood.forgetImage(gone.imgId);
      selected = null;
      save();
      render();
    },
    deselect: function (e) {
      if (e.target.id === "vboardCanvas" || e.target.classList.contains("vboard-outer")) {
        selected = null;
        document.querySelectorAll(".piece.selected").forEach(function (n) {
          n.classList.remove("selected");
        });
        renderToolbar();
      }
    },
    // Adds one of the visitor's own foods (a named shape or an uploaded photo) to the board.
    addCustom: function (piece) {
      var p = Object.assign({ uid: uid(), cat: "custom", rot: 0, z: topZ() + 1 }, piece);
      // drop it at the first free-ish spot near the middle
      p.x = state.len / 2 + (Math.random() - 0.5) * state.len * 0.3;
      p.y = state.wid / 2 + (Math.random() - 0.5) * state.wid * 0.3;
      state.pieces.push(p);
      selected = p.uid;
      keepInside();
      save();
      render();
    },
    itemsOnBoard: function () {
      return state.pieces.map(function (p) {
        return { cat: p.cat, item: p.item };
      });
    },
  };
  // Pulls any piece that ended up off the board back inside its outline.
  function keepInside() {
    state.pieces.forEach(function (p) {
      var m = Math.min(p.size * 0.3, Math.min(state.len, state.wid) / 4);
      if (state.shape === "round" || state.shape === "oval") {
        var cx = state.len / 2,
          cy = state.wid / 2,
          a = Math.max(0.5, cx - m),
          b = Math.max(0.5, cy - m);
        var dx = (p.x - cx) / a,
          dy = (p.y - cy) / b,
          r = Math.sqrt(dx * dx + dy * dy);
        if (r > 1) {
          p.x = cx + (dx / r) * a;
          p.y = cy + (dy / r) * b;
        }
      } else {
        p.x = Math.max(m, Math.min(state.len - m, p.x));
        p.y = Math.max(m, Math.min(state.wid - m, p.y));
      }
    });
  }
})();
window.addEventListener("resize", function () {
  if (document.getElementById("visual").classList.contains("active")) StyleBoard.render();
});
