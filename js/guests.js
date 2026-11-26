// Guest list & RSVPs.
// Each party can get an invite link. Guests open it, see the party details and answer
// (name, email, phone, yes / maybe / no, how many are coming, allergies or notes).
// Answers are saved in the BoardCraft database; only the host who is signed in can read them.
var FREE_GUEST_LIMIT = 20;

var GuestsApi = (function () {
  function call(path, opts, needAuth) {
    opts = opts || {};
    var tokenP = needAuth ? Account.token() : Promise.resolve(null);
    return tokenP.then(function (token) {
      if (needAuth && !token) throw new Error("signed_out");
      var headers = Object.assign(
        { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + (token || SUPABASE_ANON_KEY), "Content-Type": "application/json" },
        opts.headers || {},
      );
      return fetch(SUPABASE_URL + path, { method: opts.method || "GET", headers: headers, body: opts.body }).then(function (r) {
        if (!r.ok)
          return r.text().then(function (t) {
            var msg = t;
            try {
              msg = JSON.parse(t).message || t;
            } catch (e) {}
            throw new Error(msg);
          });
        return r.status === 204 ? null : r.json();
      });
    });
  }
  return {
    // Create or update this party online, and get its invite link token.
    saveEvent: function (party, message) {
      var body = {
        local_id: party.id,
        name: (party.name || "My party").slice(0, 80),
        event_date: party.date || null,
        start_time: party.time || null,
        location: party.place ? party.place.slice(0, 120) : null,
        updated_at: new Date().toISOString(),
      };
      if (message !== undefined) body.message = message ? message.slice(0, 1000) : null;
      return call(
        "/rest/v1/events?on_conflict=owner,local_id&select=id,invite_token,message,rsvp_open,max_party_size",
        { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(body) },
        true,
      ).then(function (rows) {
        return rows[0];
      });
    },
    setOpen: function (eventId, open) {
      return call("/rest/v1/events?id=eq." + eventId, { method: "PATCH", body: JSON.stringify({ rsvp_open: open }) }, true);
    },
    setMaxParty: function (eventId, max) {
      return call("/rest/v1/events?id=eq." + eventId, { method: "PATCH", body: JSON.stringify({ max_party_size: max }) }, true);
    },
    listGuests: function (eventId) {
      return call("/rest/v1/guests?event_id=eq." + eventId + "&select=*&order=created_at.asc", {}, true);
    },
    addGuest: function (g) {
      return call("/rest/v1/guests", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(g) }, true).then(function (r) {
        return r[0];
      });
    },
    updateGuest: function (id, g) {
      return call("/rest/v1/guests?id=eq." + id, { method: "PATCH", body: JSON.stringify(g) }, true);
    },
    deleteGuest: function (id) {
      return call("/rest/v1/guests?id=eq." + id, { method: "DELETE" }, true);
    },
    getInvite: function (token) {
      return call("/rest/v1/rpc/get_invite_v2", { method: "POST", body: JSON.stringify({ p_token: token }) }, false).then(function (rows) {
        return rows && rows[0];
      });
    },
    submitRsvp: function (token, a) {
      return call(
        "/rest/v1/rpc/submit_rsvp_v2",
        {
          method: "POST",
          body: JSON.stringify({
            p_token: token, p_name: a.name, p_email: a.email, p_phone: a.phone, p_status: a.status,
            p_party_size: a.size, p_note: a.note, p_email_ok: a.emailOk, p_text_ok: false, p_companions: a.companions || [],
          }),
        },
        false,
      );
    },
  };
})();

// ---------- host side: the Guests tab ----------
var guestState = { loading: false, error: "", event: null, guests: [], editing: null, adding: false };
var STATUS_LABEL = { yes: "Coming", maybe: "Maybe", no: "Can't come", invited: "Waiting" };

function inviteLink(token) {
  return location.origin + location.pathname + "?rsvp=" + token;
}
function guestTotals(list) {
  var t = { yes: 0, maybe: 0, no: 0, invited: 0, people: 0 };
  list.forEach(function (g) {
    t[g.status] = (t[g.status] || 0) + 1;
    if (g.status === "yes") t.people += g.party_size || 1;
  });
  return t;
}
function loadGuests() {
  if (!Account.signedIn()) {
    renderGuests();
    return;
  }
  guestState.loading = true;
  guestState.error = "";
  renderGuests();
  GuestsApi.saveEvent(Parties.active())
    .then(function (ev) {
      guestState.event = ev;
      Store.set("inviteToken", ev.invite_token);
      return GuestsApi.listGuests(ev.id);
    })
    .then(function (list) {
      guestState.guests = list || [];
      var t = guestTotals(guestState.guests);
      Store.set("rsvpSummary", { yes: t.yes, people: t.people, maybe: t.maybe, no: t.no, invited: t.invited, total: guestState.guests.length });
    })
    .catch(function (e) {
      guestState.error = e.message === "signed_out" ? "" : "Couldn't load your guest list. Check your connection and try again.";
    })
    .then(function () {
      guestState.loading = false;
      renderGuests();
    });
}

function renderGuests() {
  var el = document.getElementById("guestsBody");
  if (!el) return;
  var p = Parties.active();
  if (!Account.signedIn()) {
    el.innerHTML =
      '<div class="card guests-intro"><h3>Guest list &amp; RSVPs</h3>' +
      "<p>Send your guests one link. They tap it, see your party details, and tell you if they're coming, how many are in their group, and any allergies. Their answers show up here.</p>" +
      "<p>Sign in first so your guest list is saved safely to your account and only you can see it.</p>" +
      '<button class="btn primary" onclick="openSignIn()">Sign in to start your guest list</button></div>';
    return;
  }
  if (guestState.loading && !guestState.event) {
    el.innerHTML = '<p class="muted" style="padding:1rem 0">Loading your guest list...</p>';
    return;
  }
  if (guestState.error) {
    el.innerHTML = '<div class="card"><p>' + esc(guestState.error) + '</p><button class="btn" onclick="loadGuests()">Try again</button></div>';
    return;
  }
  var ev = guestState.event;
  if (!ev) {
    el.innerHTML = "";
    return;
  }
  var list = guestState.guests;
  var t = guestTotals(list);
  var extras = Account.hasExtras();
  var link = inviteLink(ev.invite_token);

  var html =
    '<div class="rsvp-totals">' +
    '<div class="tot c-mint"><b>' + t.people + "</b><span>coming</span></div>" +
    '<div class="tot c-lemon"><b>' + t.maybe + "</b><span>maybe</span></div>" +
    '<div class="tot c-berry"><b>' + t.no + "</b><span>can't come</span></div>" +
    '<div class="tot c-lilac"><b>' + t.invited + "</b><span>waiting</span></div></div>";
  if (t.people && t.people !== guests)
    html += '<p class="card-hint">Your food plan is for ' + guests + ' guests. <button class="acct-link" onclick="useRsvpCount(' + t.people + ')">Plan food for ' + t.people + " instead</button></p>";

  html +=
    '<div class="card invite-card"><h3>Your invite link</h3>' +
    "<p class=\"muted small\">Text it, email it, or post it. Anyone with the link can RSVP to " + esc(p.name) + ".</p>" +
    '<div class="link-row"><input id="inviteLink" readonly value="' + esc(link) + '" onfocus="this.select()"><button class="btn primary sm" onclick="copyInvite()">Copy link</button></div>' +
    '<div class="share-form-row" style="margin-top:0.8rem"><label for="inviteMsg">Note to your guests (shows on the invite)</label><textarea id="inviteMsg" rows="2" maxlength="1000" placeholder="e.g. Bring a lawn chair! Parking is on the street.">' + esc(ev.message || "") + "</textarea></div>" +
    '<div class="row-gap"><button class="btn sm" onclick="saveInviteMsg()">Save note</button>' +
    '<label class="check-row"><input type="checkbox" ' + (ev.rsvp_open ? "checked" : "") + ' onchange="toggleRsvpOpen(this.checked)"> Accepting RSVPs</label></div>' +
    '<div class="share-form-row" style="margin-top:0.8rem"><label for="maxParty">How many people can each guest bring?</label><select id="maxParty" onchange="saveMaxParty(this.value)">' + maxPartyOptions(ev.max_party_size) + "</select></div>" +
    "<p class=\"muted small\" style=\"margin-top:6px\">Party name, date, time and location come from Home. Edit them there and they update on the invite.</p></div>";

  html +=
    '<div class="recipes-head"><h3 class="sec" style="margin:0">Guests</h3><span class="muted small">' +
    (extras ? list.length + " on the list" : list.length + " of " + FREE_GUEST_LIMIT + " free") +
    '</span><button class="btn sm" onclick="loadGuests()">Refresh</button><button class="btn primary sm" onclick="startAddGuest()">' + icon("plus", 14) + " Add guest</button></div>";

  if (guestState.adding) html += guestFormHtml(null);
  if (!list.length && !guestState.adding)
    html += '<div class="card"><p class="muted">No one yet. Share your invite link, or add guests yourself.</p></div>';
  list.forEach(function (g) {
    if (guestState.editing === g.id) {
      html += guestFormHtml(g);
      return;
    }
    var contact = [g.email, g.phone].filter(Boolean).join(" · ");
    html +=
      '<div class="guest-row"><button class="guest-main" onclick="editGuest(\'' + g.id + '\')"><b>' + esc(g.name) + "</b>" +
      (contact ? '<span class="muted small">' + esc(contact) + "</span>" : "") +
      (g.companions && g.companions.length ? '<span class="guest-with">With ' + esc(g.companions.join(", ")) + "</span>" : "") +
      (g.note ? '<span class="guest-note">' + esc(g.note) + "</span>" : "") +
      '</button><span class="pill s-' + g.status + '">' + STATUS_LABEL[g.status] + (g.status === "yes" && g.party_size > 1 ? " · " + g.party_size : "") + "</span></div>";
  });

  // updates to guests
  var emailable = list.filter(function (g) {
    return g.email && g.email_ok && g.status !== "no";
  });
  html +=
    '<div class="card updates-card"><h3>Send guests an update' + (extras ? "" : ' <span class="extras-tag">' + icon("lock", 11) + " Extras</span>") + "</h3>" +
    '<p class="muted small" style="margin-bottom:10px">' + emailable.length + " guest" + (emailable.length === 1 ? " has" : "s have") + " asked for email updates. Everyone gets their own copy, and their replies come to your email.</p>" +
    '<div class="share-form-row"><label for="updSubject">Subject</label><input id="updSubject" maxlength="120" placeholder="e.g. Parking update for Saturday"></div>' +
    '<div class="share-form-row"><label for="updMsg">Message</label><textarea id="updMsg" rows="4" maxlength="5000" placeholder="e.g. We\'re moving inside because of rain. Same time, same place!"></textarea></div>' +
    '<div class="row-gap"><button class="btn primary sm" id="updSend" onclick="sendGuestUpdate()">Send update</button>' +
    '<button class="btn sm" onclick="copyGuestEmails()">Copy their email addresses</button></div>' +
    '<p class="muted small" style="margin-top:6px">The email shows your party name, date and place, plus a button to see the invite. You can send up to 5 updates a day.</p></div>';
  el.innerHTML = html;
}

function guestFormHtml(g) {
  g = g || { name: "", email: "", phone: "", status: "invited", party_size: 1, note: "", companions: [] };
  var id = g.id || "new";
  var opts = ["invited", "yes", "maybe", "no"]
    .map(function (s) {
      return '<option value="' + s + '"' + (g.status === s ? " selected" : "") + ">" + STATUS_LABEL[s] + "</option>";
    })
    .join("");
  return (
    '<form class="card guest-form" onsubmit="return saveGuest(event,\'' + id + "')\">" +
    "<h3>" + (g.id ? "Edit guest" : "Add a guest") + "</h3>" +
    '<div class="share-form-row"><label for="gfName">Name</label><input id="gfName" required maxlength="80" value="' + esc(g.name) + '"></div>' +
    '<div class="form-2"><div class="share-form-row"><label for="gfEmail">Email</label><input id="gfEmail" type="email" maxlength="200" value="' + esc(g.email || "") + '"></div>' +
    '<div class="share-form-row"><label for="gfPhone">Phone</label><input id="gfPhone" type="tel" maxlength="40" value="' + esc(g.phone || "") + '"></div></div>' +
    '<div class="form-2"><div class="share-form-row"><label for="gfStatus">Answer</label><select id="gfStatus">' + opts + "</select></div>" +
    '<div class="share-form-row"><label for="gfSize">How many in their group</label><input id="gfSize" type="number" min="0" max="20" value="' + esc(g.party_size) + '"></div></div>' +
    '<div class="share-form-row"><label for="gfWith">Who else is in their group? (separate names with commas)</label><input id="gfWith" maxlength="600" placeholder="e.g. Sam Lee, Ava Lee" value="' + esc((g.companions || []).join(", ")) + '"></div>' +
    '<div class="share-form-row"><label for="gfNote">Allergies or notes</label><input id="gfNote" maxlength="500" value="' + esc(g.note || "") + '"></div>' +
    '<div class="row-gap end">' +
    (g.id ? '<span id="gfDel"><button type="button" class="btn danger-link" onclick="askDeleteGuest(\'' + g.id + '\')">' + icon("trash", 14) + " Remove</button></span>" : "") +
    '<button type="button" class="btn" onclick="cancelGuest()">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>'
  );
}
function startAddGuest() {
  if (!Account.hasExtras() && guestState.guests.length >= FREE_GUEST_LIMIT) {
    showExtras("A guest list over " + FREE_GUEST_LIMIT + " guests");
    return;
  }
  guestState.adding = true;
  guestState.editing = null;
  renderGuests();
  var n = document.getElementById("gfName");
  if (n) n.focus();
}
function editGuest(id) {
  guestState.editing = id;
  guestState.adding = false;
  renderGuests();
}
function cancelGuest() {
  guestState.editing = null;
  guestState.adding = false;
  renderGuests();
}
function saveGuest(ev, id) {
  ev.preventDefault();
  var email = document.getElementById("gfEmail").value.trim().toLowerCase();
  var g = {
    name: document.getElementById("gfName").value.trim().slice(0, 80),
    email: email || null,
    phone: document.getElementById("gfPhone").value.trim().slice(0, 40) || null,
    status: document.getElementById("gfStatus").value,
    party_size: Math.max(0, Math.min(20, Math.round(Number(document.getElementById("gfSize").value) || 0))),
    note: document.getElementById("gfNote").value.trim().slice(0, 500) || null,
    companions: document.getElementById("gfWith").value.split(",").map(function (x) { return x.trim().slice(0, 80); }).filter(Boolean).slice(0, 19),
  };
  if (!g.name) return false;
  var job =
    id === "new"
      ? GuestsApi.addGuest(Object.assign({ event_id: guestState.event.id, source: "host" }, g))
      : GuestsApi.updateGuest(id, Object.assign({ updated_at: new Date().toISOString() }, g));
  job
    .then(function () {
      guestState.adding = false;
      guestState.editing = null;
      toast("Guest saved.");
      loadGuests();
    })
    .catch(function (e) {
      toast(/duplicate|unique/i.test(e.message) ? "Someone with that email is already on the list." : "That didn't save. Please try again.");
    });
  return false;
}
function askDeleteGuest(id) {
  document.getElementById("gfDel").innerHTML =
    'Remove this guest? <button type="button" class="btn sm danger" onclick="deleteGuest(\'' + id + '\')">Yes, remove</button>';
}
function deleteGuest(id) {
  GuestsApi.deleteGuest(id)
    .then(function () {
      guestState.editing = null;
      toast("Guest removed.");
      loadGuests();
    })
    .catch(function () {
      toast("That didn't work. Please try again.");
    });
}
function copyText(text, done) {
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    toast(done);
  }
  if (navigator.clipboard)
    navigator.clipboard.writeText(text).then(function () {
      toast(done);
    }, fallback);
  else fallback();
}
function copyInvite() {
  copyText(document.getElementById("inviteLink").value, "Invite link copied. Paste it into a text or email.");
}
function saveInviteMsg() {
  var msg = document.getElementById("inviteMsg").value.trim();
  GuestsApi.saveEvent(Parties.active(), msg)
    .then(function (ev) {
      guestState.event = ev;
      toast("Note saved. Guests will see it on the invite.");
    })
    .catch(function () {
      toast("That didn't save. Please try again.");
    });
}
function toggleRsvpOpen(open) {
  GuestsApi.setOpen(guestState.event.id, open)
    .then(function () {
      guestState.event.rsvp_open = open;
      toast(open ? "Guests can RSVP again." : "RSVPs are closed. The invite still shows your party details.");
    })
    .catch(function () {
      toast("That didn't save. Please try again.");
      loadGuests();
    });
}
function copyGuestEmails() {
  if (!Account.hasExtras()) {
    showExtras("Sending updates to your guests");
    return;
  }
  var emails = guestState.guests
    .filter(function (g) {
      return g.email && g.email_ok && g.status !== "no";
    })
    .map(function (g) {
      return g.email;
    });
  if (!emails.length) {
    toast("No guests have asked for email updates yet.");
    return;
  }
  copyText(emails.join(", "), emails.length + " email address" + (emails.length === 1 ? "" : "es") + " copied.");
}
function sendGuestUpdate() {
  if (!Account.hasExtras()) {
    showExtras("Sending updates to your guests");
    return;
  }
  var subject = document.getElementById("updSubject").value.trim();
  var message = document.getElementById("updMsg").value.trim();
  if (!subject || !message) {
    toast("Add a subject and a message first.");
    return;
  }
  var count = guestState.guests.filter(function (g) { return g.email && g.email_ok && g.status !== "no"; }).length;
  if (!count) {
    toast("No guests have asked for email updates yet.");
    return;
  }
  var btn = document.getElementById("updSend");
  if (btn.getAttribute("data-confirm") !== "1") {
    btn.setAttribute("data-confirm", "1");
    btn.textContent = "Yes, email " + count + " guest" + (count === 1 ? "" : "s");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Sending...";
  Account.token()
    .then(function (token) {
      if (!token) throw new Error("signed_out");
      return fetch(SUPABASE_URL + "/functions/v1/send-guest-update", {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: guestState.event.id, subject: subject, message: message, origin: location.origin }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || "send_failed");
          return j;
        });
      });
    })
    .then(function (j) {
      document.getElementById("updSubject").value = "";
      document.getElementById("updMsg").value = "";
      toast("Update sent to " + j.sent + " guest" + (j.sent === 1 ? "" : "s") + ".");
    })
    .catch(function (e) {
      var m = {
        needs_extras: "Sending updates is part of Extras.",
        too_many: "You've sent 5 updates today. Try again tomorrow.",
        no_guests: "No guests have asked for email updates yet.",
        email_not_set_up: "Email sending isn't switched on yet.",
        signed_out: "Please sign in again.",
      }[e.message];
      toast(m || "That didn't send. Please try again.");
    })
    .then(function () {
      btn.disabled = false;
      btn.removeAttribute("data-confirm");
      btn.textContent = "Send update";
    });
}
function useRsvpCount(n) {
  setGuests(n);
  renderGuests();
  toast("Your food plan is now for " + n + " guests.");
}

// How many people one invite covers (the guest included). Empty means no limit.
var MAX_PARTY_CHOICES = [
  [1, "Just themselves"],
  [2, "A plus-one (2 people)"],
  [3, "Up to 3 people"],
  [4, "Up to 4 people"],
  [5, "Up to 5 people"],
  [6, "Up to 6 people"],
  [8, "Up to 8 people"],
  [10, "Up to 10 people"],
  ["", "No limit"],
];
function maxPartyOptions(cur) {
  cur = cur == null ? "" : cur;
  return MAX_PARTY_CHOICES.map(function (c) {
    return '<option value="' + c[0] + '"' + (String(c[0]) === String(cur) ? " selected" : "") + ">" + c[1] + "</option>";
  }).join("");
}
function saveMaxParty(v) {
  var max = v === "" ? null : Number(v);
  GuestsApi.setMaxParty(guestState.event.id, max)
    .then(function () {
      guestState.event.max_party_size = max;
      toast(max === 1 ? "Each invite is now just for the guest." : max ? "Each guest can now bring a group of up to " + max + "." : "Guests can bring as many people as they like.");
    })
    .catch(function () {
      toast("That didn't save. Please try again.");
      loadGuests();
    });
}

// ---------- guest side: the invite page (?rsvp=...) ----------
var RSVP_TOKEN = (function () {
  var m = /[?&]rsvp=([a-f0-9]{16,64})/i.exec(location.search);
  return m ? m[1] : null;
})();
var rsvpInvite = null;
var rsvpAnswer = Object.assign({ status: "" }, (function () {
  try {
    return JSON.parse(localStorage.getItem("boardcraft:rsvp:" + RSVP_TOKEN) || "{}");
  } catch (e) {
    return {};
  }
})());

function startRsvpPage() {
  document.body.classList.add("rsvp-mode");
  var box = document.getElementById("rsvpView");
  box.hidden = false;
  box.innerHTML = '<p class="muted" style="text-align:center;padding:3rem 0">Opening your invitation...</p>';
  GuestsApi.getInvite(RSVP_TOKEN)
    .then(function (inv) {
      rsvpInvite = inv;
      renderRsvp(rsvpAnswer.sent ? "thanks" : "form");
    })
    .catch(function () {
      box.innerHTML = '<div class="rsvp-card"><h2>Hmm, we couldn\'t open this invitation.</h2><p>Check your connection and try again, or ask your host for a new link.</p></div>';
    });
}
function rsvpHeader(inv) {
  var p = { date: inv.event_date, time: inv.start_time, place: inv.location };
  var d = partyDate(p);
  var when = [d ? d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "", inv.start_time ? fmtTime(inv.start_time) : ""].filter(Boolean).join(" at ");
  return (
    '<div class="rsvp-hero"><small>You\'re invited to</small><h1>' + esc(inv.name) + "</h1>" +
    (when ? "<p>" + icon("cal", 16) + " " + esc(when) + "</p>" : "") +
    (inv.location ? "<p>" + esc(inv.location) + "</p>" : "") +
    "</div>" +
    (inv.message ? '<div class="rsvp-msg">' + esc(inv.message) + "</div>" : "")
  );
}
function renderRsvp(mode) {
  var box = document.getElementById("rsvpView");
  var inv = rsvpInvite;
  if (!inv) {
    box.innerHTML = '<div class="rsvp-card"><h2>This invitation link isn\'t working.</h2><p>Please ask your host to send it again.</p></div>';
    return;
  }
  var brand = '<div class="rsvp-brand"><span class="logo small-logo">BoardCraft<span class="logo-sun">' + SUN_SVG + "</span></span></div>";
  var foot = '<p class="rsvp-foot">Your answers are only shared with your host. <br>Planned with BoardCraft · <a href="' + location.pathname + '">Plan your own party</a></p>';
  if (mode === "thanks") {
    var msg = { yes: "Yay, see you there!", maybe: "Thanks! Let your host know when you're sure.", no: "Thanks for letting your host know. You'll be missed!" }[rsvpAnswer.status] || "Thanks!";
    box.innerHTML =
      brand + '<div class="rsvp-card">' + rsvpHeader(inv) + '<div class="rsvp-thanks"><h2>' + msg + "</h2>" +
      '<button class="btn" onclick="renderRsvp(\'form\')">Change my answer</button></div></div>' + foot;
    return;
  }
  if (!inv.rsvp_open) {
    box.innerHTML = brand + '<div class="rsvp-card">' + rsvpHeader(inv) + '<p class="rsvp-closed">RSVPs are closed for this party. Please contact your host directly.</p></div>' + foot;
    return;
  }
  var a = rsvpAnswer;
  var choice = function (v, label) {
    return '<button type="button" class="rsvp-choice' + (a.status === v ? " on" : "") + '" data-v="' + v + '" onclick="pickRsvp(\'' + v + "')\">" + label + "</button>";
  };
  box.innerHTML =
    brand + '<div class="rsvp-card">' + rsvpHeader(inv) +
    '<form class="rsvp-form" onsubmit="return sendRsvp(event)">' +
    '<h3>Will you be there?</h3><div class="rsvp-choices">' + choice("yes", "Yes!") + choice("maybe", "Maybe") + choice("no", "Can't make it") + "</div>" +
    '<div class="share-form-row"><label for="rvName">Your name</label><input id="rvName" required maxlength="80" autocomplete="name" value="' + esc(a.name || "") + '"></div>' +
    rsvpSizeHtml(a) +
    '<div class="share-form-row"><label for="rvEmail">Email</label><input id="rvEmail" type="email" maxlength="200" autocomplete="email" value="' + esc(a.email || "") + '"></div>' +
    '<div class="share-form-row"><label for="rvPhone">Phone (optional)</label><input id="rvPhone" type="tel" maxlength="40" autocomplete="tel" value="' + esc(a.phone || "") + '"></div>' +
    '<div class="share-form-row"><label for="rvNote">Allergies, dietary needs or a note for the host (optional)</label><textarea id="rvNote" rows="2" maxlength="500">' + esc(a.note || "") + "</textarea></div>" +
    '<label class="check-row rsvp-consent"><input type="checkbox" id="rvEmailOk" ' + (a.emailOk === false ? "" : "checked") + "> Email me updates about this party</label>" +
    '<p class="signin-error" id="rvError"></p>' +
    '<button class="btn primary rsvp-send" type="submit" id="rvSend">Send my RSVP</button></form></div>' + foot;
  syncRsvpSize();
}
function rsvpMax() {
  var m = rsvpInvite && rsvpInvite.max_party_size;
  return m ? Math.max(1, Math.min(20, m)) : 20;
}
function rsvpSizeHtml(a) {
  var max = rsvpMax();
  if (max === 1) return '<p class="muted small" id="rvSizeRow">This invitation is just for you.</p>';
  var cur = Math.min(max, Math.max(1, a.size || 1));
  var opts = "";
  for (var i = 1; i <= max; i++) opts += '<option value="' + i + '"' + (i === cur ? " selected" : "") + ">" + (i === 1 ? "Just me" : "Me + " + (i - 1)) + "</option>";
  return (
    '<div id="rvSizeRow"><div class="share-form-row"><label for="rvSize">Who\'s coming?' + (rsvpInvite.max_party_size ? ' <span class="muted small">(up to ' + max + " people on this invite)</span>" : "") + '</label>' +
    '<select id="rvSize" onchange="syncRsvpNames()" style="max-width:200px">' + opts + "</select></div>" +
    '<div id="rvNames"></div></div>'
  );
}
function syncRsvpNames() {
  var box = document.getElementById("rvNames");
  var sel = document.getElementById("rvSize");
  if (!box || !sel) return;
  var keep = [].map.call(box.querySelectorAll("input"), function (x) { return x.value; });
  var saved = rsvpAnswer.companions || [];
  var n = Number(sel.value) - 1;
  var html = "";
  for (var i = 0; i < n; i++) {
    var v = keep[i] != null ? keep[i] : saved[i] || "";
    html += '<div class="share-form-row"><label for="rvWith' + i + '">Guest ' + (i + 2) + ' name</label><input id="rvWith' + i + '" maxlength="80" placeholder="Their name (helps with seating)" value="' + esc(v) + '"></div>';
  }
  box.innerHTML = html;
}
function pickRsvp(v) {
  rsvpAnswer.status = v;
  document.querySelectorAll(".rsvp-choice").forEach(function (b) {
    b.classList.toggle("on", b.getAttribute("data-v") === v);
  });
  syncRsvpSize();
}
function syncRsvpSize() {
  var row = document.getElementById("rvSizeRow");
  if (row) row.style.display = rsvpAnswer.status === "no" ? "none" : "";
  syncRsvpNames();
}
function sendRsvp(ev) {
  ev.preventDefault();
  var err = document.getElementById("rvError");
  if (!rsvpAnswer.status) {
    err.textContent = "Please choose Yes, Maybe or Can't make it.";
    return false;
  }
  var email = document.getElementById("rvEmail").value.trim();
  var a = {
    status: rsvpAnswer.status,
    name: document.getElementById("rvName").value.trim(),
    email: email,
    phone: document.getElementById("rvPhone").value.trim(),
    size: rsvpAnswer.status === "no" ? 0 : document.getElementById("rvSize") ? Math.max(1, Math.min(rsvpMax(), Number(document.getElementById("rvSize").value) || 1)) : 1,
    companions: rsvpAnswer.status === "no" ? [] : [].map.call(document.querySelectorAll("#rvNames input"), function (x) { return x.value.trim().slice(0, 80); }).filter(Boolean),
    note: document.getElementById("rvNote").value.trim(),
    emailOk: !!email && document.getElementById("rvEmailOk").checked,
  };
  if (!a.name) {
    err.textContent = "Please add your name.";
    return false;
  }
  var btn = document.getElementById("rvSend");
  btn.disabled = true;
  btn.textContent = "Sending...";
  GuestsApi.submitRsvp(RSVP_TOKEN, a)
    .then(function () {
      rsvpAnswer = Object.assign(a, { sent: true });
      try {
        localStorage.setItem("boardcraft:rsvp:" + RSVP_TOKEN, JSON.stringify(rsvpAnswer));
      } catch (e) {}
      renderRsvp("thanks");
    })
    .catch(function (e) {
      err.textContent = /guest_list_full/.test(e.message)
        ? "Sorry, this party's guest list is full. Please contact your host."
        : /rsvp_closed/.test(e.message)
          ? "RSVPs are closed for this party. Please contact your host."
          : "That didn't send. Please check your connection and try again.";
      btn.disabled = false;
      btn.textContent = "Send my RSVP";
    });
  return false;
}
