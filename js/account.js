// Sign-in and BoardCraft Extras.
// People sign in with an emailed link (no passwords), using Supabase Auth.
// Extras ($14.99, one-time) unlock unlimited parties and recipes, recipe scaling, the Style board,
// Export & print, and sharing to Community.
// Who has Extras is decided in the database (table extras_buyers, checked by has_extras()),
// so it can't be switched on from the browser.

// Paste the Stripe Payment Link here once it exists (starts with https://buy.stripe.com/).
var EXTRAS_PAYMENT_LINK = "https://buy.stripe.com/14AfZh4nMg287Wu4CJ7ss00";
// NOTE: the Stripe payment link above still charges $9.99. Update the price in Stripe before launch.
var EXTRAS_PRICE = "$14.99";
// Contact email shown in the footer (needed by Stripe). Empty until Lynn picks one.
var CONTACT_EMAIL = "lynn@quinnandcogulfcoast.com";

var Account = (function () {
  var KEY = "boardcraft:session";
  var session = null; // {access_token, refresh_token, expires_at, email}
  var extras = false;
  var listeners = [];

  function load() {
    try {
      session = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      session = null;
    }
  }
  function save() {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }
  function emailFromToken(t) {
    try {
      var p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return p.email || "";
    } catch (e) {
      return "";
    }
  }
  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn();
      } catch (e) {}
    });
  }

  // The emailed link brings people back with their sign-in in the address (#access_token=...).
  function readLinkFromAddress() {
    var hash = location.hash.replace(/^#/, "");
    if (!hash) return null;
    var q = new URLSearchParams(hash);
    if (q.get("error_description")) {
      clearAddress();
      return { error: q.get("error_description") };
    }
    if (!q.get("access_token")) return null;
    session = {
      access_token: q.get("access_token"),
      refresh_token: q.get("refresh_token"),
      expires_at: Number(q.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(q.get("expires_in") || 3600),
      email: emailFromToken(q.get("access_token")),
    };
    save();
    clearAddress();
    return { signedIn: true };
  }
  function clearAddress() {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (e) {
      location.hash = "";
    }
  }

  function refreshIfNeeded() {
    if (!session) return Promise.resolve(null);
    if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve(session);
    return fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
      .then(function (r) {
        if (r.status === 400 || r.status === 401) return null; // sign-in expired for good
        if (!r.ok) throw new Error("refresh " + r.status);
        return r.json();
      })
      .then(function (d) {
        if (!d) {
          session = null;
        } else {
          session = {
            access_token: d.access_token,
            refresh_token: d.refresh_token,
            expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
            email: (d.user && d.user.email) || session.email,
          };
        }
        save();
        return session;
      });
  }

  function checkExtras() {
    return refreshIfNeeded()
      .then(function (s) {
        if (!s) return false;
        return fetch(SUPABASE_URL + "/rest/v1/rpc/has_extras", {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: "Bearer " + s.access_token,
            "Content-Type": "application/json",
          },
          body: "{}",
        }).then(function (r) {
          return r.ok ? r.json() : false;
        });
      })
      .catch(function () {
        return Store.get("hasExtras", false); // offline: trust the last answer
      })
      .then(function (yes) {
        extras = yes === true;
        Store.set("hasExtras", extras);
        notify();
        return extras;
      });
  }

  return {
    init: function () {
      load();
      extras = !!session && Store.get("hasExtras", false);
      var result = readLinkFromAddress();
      checkExtras();
      return result;
    },
    onChange: function (fn) {
      listeners.push(fn);
    },
    email: function () {
      return session ? session.email : "";
    },
    signedIn: function () {
      return !!session;
    },
    hasExtras: function () {
      return extras;
    },
    refresh: checkExtras,
    sendLink: function (email) {
      var back = location.origin + location.pathname;
      return fetch(SUPABASE_URL + "/auth/v1/otp?redirect_to=" + encodeURIComponent(back), {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, create_user: true }),
      }).then(function (r) {
        if (r.ok) return true;
        return r.json().then(
          function (d) {
            throw new Error(d.msg || d.error_description || d.message || "Couldn't send the link");
          },
          function () {
            throw new Error("Couldn't send the link");
          },
        );
      });
    },
    signOut: function () {
      var s = session;
      session = null;
      extras = false;
      save();
      Store.set("hasExtras", false);
      notify();
      if (s)
        fetch(SUPABASE_URL + "/auth/v1/logout", {
          method: "POST",
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + s.access_token },
        }).catch(function () {});
    },
    paymentLink: function () {
      if (!EXTRAS_PAYMENT_LINK) return "";
      var e = session && session.email;
      return EXTRAS_PAYMENT_LINK + (e ? (EXTRAS_PAYMENT_LINK.indexOf("?") < 0 ? "?" : "&") + "prefilled_email=" + encodeURIComponent(e) : "");
    },
  };
})();

// ---------- Page parts: the account button, the sign-in box, and the Extras locks ----------

var LOCKED_TABS = { visual: "the Style board", export: "Export & print" };

function renderAccountBar() {
  var bar = document.getElementById("accountBar");
  if (!bar) return;
  if (Account.signedIn()) {
    bar.innerHTML =
      '<span class="acct-email">' +
      esc(Account.email()) +
      "</span>" +
      (Account.hasExtras() ? '<span class="acct-badge">Extras &#10003;</span>' : "") +
      '<button class="acct-link" onclick="Account.signOut()">Sign out</button>';
  } else {
    bar.innerHTML = '<button class="acct-link" onclick="openSignIn()">Sign in</button>';
  }
}

function renderLocks() {
  var open = Account.hasExtras();
  Object.keys(LOCKED_TABS).forEach(function (id) {
    var panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.toggle("locked", !open);
    var wall = panel.querySelector(":scope > .paywall");
    if (open) {
      if (wall) wall.remove();
      return;
    }
    if (!wall) {
      wall = document.createElement("div");
      wall.className = "paywall";
      panel.insertBefore(wall, panel.firstChild);
    }
    wall.innerHTML = paywallHtml(LOCKED_TABS[id]);
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    var m = /switchTab\('(\w+)'\)/.exec(t.getAttribute("onclick") || "");
    t.classList.toggle("tab-locked", !open && !!(m && LOCKED_TABS[m[1]]));
  });
  var share = document.getElementById("shareLock");
  if (share) share.style.display = open ? "none" : "";
}

function paywallHtml(what) {
  var link = Account.paymentLink();
  var buy = link
    ? '<a class="btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">Get Extras &mdash; ' + EXTRAS_PRICE + "</a>"
    : '<button class="btn primary" disabled>Extras coming soon</button>';
  var who = Account.signedIn()
    ? '<p class="paywall-small">Signed in as ' +
      esc(Account.email()) +
      '. Already paid? <button class="acct-link" onclick="checkExtrasNow()">Check again</button></p>'
    : '<p class="paywall-small">Already have Extras? <button class="acct-link" onclick="openSignIn()">Sign in</button></p>';
  return (
    '<div class="paywall-card"><div class="paywall-icon">' + SUN_SVG + "</div>" +
    "<h3>" +
    esc(what.charAt(0).toUpperCase() + what.slice(1)) +
    " is part of BoardCraft Extras</h3>" +
    "<p>One payment of <strong>" +
    EXTRAS_PRICE +
    "</strong>, yours to keep. Unlocks unlimited parties and recipes, scaling recipes to your guest count, copying a party, the Style board with real food photos, Export &amp; print, and sharing your boards to Community.</p>" +
    '<div class="paywall-actions">' +
    buy +
    "</div>" +
    (link ? '<p class="paywall-small">Use the same email at checkout that you sign in with.</p>' : "") +
    who +
    "</div>"
  );
}

function checkExtrasNow() {
  Account.refresh().then(function (yes) {
    toast(yes ? "Extras unlocked. Enjoy!" : "No Extras found for this email yet.");
  });
}

function openSignIn() {
  var m = document.getElementById("signInModal");
  m.classList.add("open");
  document.getElementById("signInForm").style.display = "";
  document.getElementById("signInSent").style.display = "none";
  document.getElementById("signInError").textContent = "";
  setTimeout(function () {
    document.getElementById("signInEmail").focus();
  }, 50);
}
function closeSignIn() {
  document.getElementById("signInModal").classList.remove("open");
}
function submitSignIn(ev) {
  if (ev) ev.preventDefault();
  var input = document.getElementById("signInEmail");
  var email = input.value.trim().toLowerCase();
  var err = document.getElementById("signInError");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    err.textContent = "Please enter a valid email address.";
    return false;
  }
  var btn = document.getElementById("signInBtn");
  btn.disabled = true;
  btn.textContent = "Sending…";
  err.textContent = "";
  Account.sendLink(email)
    .then(function () {
      document.getElementById("signInForm").style.display = "none";
      document.getElementById("signInSent").style.display = "";
      document.getElementById("signInSentTo").textContent = email;
    })
    .catch(function (e) {
      err.textContent = /rate|seconds|many/i.test(e.message)
        ? "Too many sign-in emails just now. Please wait a minute and try again."
        : "Sorry, that didn't work: " + e.message;
    })
    .then(function () {
      btn.disabled = false;
      btn.textContent = "Email me a sign-in link";
    });
  return false;
}

function shareNeedsExtras() {
  if (Account.hasExtras()) return false;
  toast("Sharing to Community is part of BoardCraft Extras.");
  return true;
}

(function fillContact() {
  var a = document.getElementById("contactLink");
  if (!a) return;
  if (CONTACT_EMAIL) {
    a.href = "mailto:" + CONTACT_EMAIL;
    a.textContent = CONTACT_EMAIL;
  } else a.parentNode.style.display = "none";
})();
