// Community boards, stored in the BoardCraft Supabase database so everyone sees them.
// The key below is the public "anon" key: it is meant to be in the page, and the database's
// row-level security rules decide what it may do (read visible posts, add posts, like, upload photos).
var SUPABASE_URL = "https://dcuxrpaknuspeoafypor.supabase.co";
var SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdXhycGFrbnVzcGVvYWZ5cG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzQxMTEsImV4cCI6MjA5MTMxMDExMX0.n1KM3Wnpus7wzKAcDf6Lv3_VuWkWqrgOtO3WZT6iJLI";
var PHOTO_BUCKET = "board-photos";

var Community = (function () {
  var headers = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY };
  function h(extra) {
    return Object.assign({}, headers, extra || {});
  }
  function check(r) {
    if (!r.ok)
      return r.text().then(function (t) {
        throw new Error(r.status + " " + t);
      });
    return r.status === 204 ? null : r.json();
  }
  return {
    list: function () {
      return fetch(
        SUPABASE_URL +
          "/rest/v1/community_posts?select=id,created_at,title,handle,description,occasion,items,photo_url,likes_count,is_featured&order=is_featured.asc,created_at.desc&limit=100",
        { headers: h() },
      ).then(check);
    },
    create: function (post) {
      return fetch(SUPABASE_URL + "/rest/v1/community_posts", {
        method: "POST",
        headers: h({ "Content-Type": "application/json", Prefer: "return=representation" }),
        body: JSON.stringify(post),
      })
        .then(check)
        .then(function (rows) {
          return rows[0];
        });
    },
    like: function (id, delta) {
      return fetch(SUPABASE_URL + "/rest/v1/rpc/like_post", {
        method: "POST",
        headers: h({ "Content-Type": "application/json" }),
        body: JSON.stringify({ post_id: id, delta: delta }),
      }).then(check);
    },
    uploadPhoto: function (blob) {
      var name = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + ".jpg";
      return fetch(SUPABASE_URL + "/storage/v1/object/" + PHOTO_BUCKET + "/" + name, {
        method: "POST",
        headers: h({ "Content-Type": "image/jpeg", "x-upsert": "false" }),
        body: blob,
      })
        .then(check)
        .then(function () {
          return SUPABASE_URL + "/storage/v1/object/public/" + PHOTO_BUCKET + "/" + name;
        });
    },
  };
})();

// Shrinks a phone photo to at most 1600px on its longest side before upload, so posts load fast.
function shrinkPhoto(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var max = 1600;
      var s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(
        function (b) {
          b ? resolve(b) : reject(new Error("Could not read that photo"));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("That file doesn't look like a photo"));
    };
    img.src = url;
  });
}
