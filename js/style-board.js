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

  function render() {
    renderControls();
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
        '<div class="vboard-empty">' +
        (Object.keys(boardSelected).length
          ? 'Tap <strong>Load my board</strong> to place your ingredients.'
          : "Pick ingredients in the <strong>Board</strong> tab first, then come back here.") +
        "</div>";
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
    if (f.img) {
      d.innerHTML =
        '<img src="' + f.img + '" alt="' + esc(p.item) + '" draggable="false" loading="lazy">';
    } else {
      d.innerHTML = '<div class="piece-fallback">' + esc(p.item) + "</div>";
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
  // Places pieces on a gentle spiral from the middle outwards, biggest items first,
  // keeping every piece inside the board's shape.
  function arrange(pieces) {
    var cx = state.len / 2,
      cy = state.wid / 2;
    var order = pieces.slice().sort(function (a, b) {
      return b.size - a.size;
    });
    var placed = [];
    order.forEach(function (p, i) {
      var best = null;
      for (var t = 0; t < 900; t++) {
        var ang = t * 2.399963; // golden angle
        var r = Math.sqrt(t / 900);
        var x = cx + Math.cos(ang) * r * (state.len / 2 - p.size * 0.4);
        var y = cy + Math.sin(ang) * r * (state.wid / 2 - p.size * 0.4);
        if (!inside(x, y, p.size * 0.35)) continue;
        var overlap = placed.reduce(function (a, q) {
          var dist = Math.hypot(q.x - x, q.y - y);
          var need = (q.size + p.size) * 0.4;
          return a + Math.max(0, need - dist);
        }, 0);
        if (!best || overlap < best.o - 0.01) best = { x: x, y: y, o: overlap };
        if (overlap === 0) break;
      }
      if (best) {
        p.x = best.x;
        p.y = best.y;
      } else {
        p.x = cx;
        p.y = cy;
      }
      p.rot = Math.round(Math.random() * 30 - 15);
      p.z = i + 1;
      placed.push(p);
    });
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
      keepInside();
      save();
      render();
    },
    setSize: function (l, w) {
      var s = SHAPES[state.shape];
      if (l === undefined) {
        l = clampSize(el("sizeLen").value);
        w = s.oneSize ? l : clampSize(el("sizeWid").value);
      }
      if (!l || !w) {
        render();
        return;
      }
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
      render();
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
      state.pieces = state.pieces.filter(function (p) {
        return p.uid !== selected;
      });
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
    itemsOnBoard: function () {
      return state.pieces.map(function (p) {
        return { cat: p.cat, item: p.item };
      });
    },
  };
  function keepInside() {
    state.pieces.forEach(function (p) {
      p.x = Math.max(0, Math.min(state.len, p.x));
      p.y = Math.max(0, Math.min(state.wid, p.y));
    });
  }
})();
window.addEventListener("resize", function () {
  if (document.getElementById("visual").classList.contains("active")) StyleBoard.render();
});
