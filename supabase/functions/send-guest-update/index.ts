// Sends a host's update email to every guest of one party who asked for updates.
// Only the signed-in owner of the party, with Extras, can send. Each guest gets their own copy,
// so no one sees anyone else's address. Replies go to the host.
// Deployed to Supabase as the "send-guest-update" Edge Function. Needs the RESEND_API_KEY secret.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FROM_DOMAIN = "updates.quinnandcogulfcoast.com";
const MAX_PER_DAY = 5;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function okOrigin(o: string) {
  return /^https:\/\/boardcraft-ten\.vercel\.app$/.test(o) ||
    /^https:\/\/boardcraft-git-[a-z0-9-]+-boardcraftapps-projects\.vercel\.app$/.test(o) ||
    /^http:\/\/localhost(:\d+)?$/.test(o);
}
function fmtDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d + "T12:00:00Z");
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return ((h + 11) % 12 + 1) + (m ? ":" + String(m).padStart(2, "0") : "") + " " + (h < 12 ? "AM" : "PM");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ error: "email_not_set_up" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  const user = u?.user;
  if (!user?.email) return json({ error: "signed_out" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const subject = String(body.subject || "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 5000);
  const origin = String(body.origin || "");
  if (!subject || !message || !body.event_id) return json({ error: "missing" }, 400);

  const { data: ev } = await admin.from("events").select("*").eq("id", body.event_id).eq("owner", user.id).maybeSingle();
  if (!ev) return json({ error: "not_found" }, 404);

  const { data: buyer } = await admin.from("extras_buyers").select("email").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!buyer) return json({ error: "needs_extras" }, 403);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("guest_updates").select("id", { count: "exact", head: true }).eq("event_id", ev.id).gte("created_at", since);
  if ((count || 0) >= MAX_PER_DAY) return json({ error: "too_many" }, 429);

  const { data: guests } = await admin.from("guests").select("name,email,status").eq("event_id", ev.id).eq("email_ok", true).neq("status", "no").not("email", "is", null).limit(500);
  const list = (guests || []).filter((g: any) => /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(g.email));
  if (!list.length) return json({ error: "no_guests" }, 400);

  const party = String(ev.name || "Your party").replace(/["<>\r\n]/g, "").slice(0, 60);
  const link = okOrigin(origin) ? origin + "/?rsvp=" + ev.invite_token : "https://boardcraft-ten.vercel.app/?rsvp=" + ev.invite_token;
  const when = [fmtDate(ev.event_date), fmtTime(ev.start_time)].filter(Boolean).join(" at ");
  const details = [when, ev.location].filter(Boolean).map((x) => esc(x)).join("<br>");
  const html = (name: string) => `<!doctype html><html><body style="margin:0;background:#f5f3fa;font-family:Helvetica,Arial,sans-serif;color:#1f1a2e">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#d63c74;color:#fff;border-radius:18px 18px 0 0;padding:22px 24px"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9">An update about</div><div style="font-size:26px;font-weight:800;margin-top:4px">${esc(party)}</div>${details ? `<div style="margin-top:8px;font-size:15px">${details}</div>` : ""}</div>
<div style="background:#fff;border-radius:0 0 18px 18px;padding:22px 24px;font-size:16px;line-height:1.55">
${name ? `<p style="margin:0 0 12px">Hi ${esc(name.split(" ")[0])},</p>` : ""}<div style="white-space:pre-wrap">${esc(message)}</div>
<p style="margin:22px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#3fc1a5;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px">See the invite or change your RSVP</a></p>
</div>
<p style="font-size:12px;color:#5d5670;text-align:center;margin-top:16px">You're getting this because you asked for updates when you RSVP'd. Reply to this email to reach your host.<br>To stop updates, open the invite and uncheck "Email me updates".<br>Sent with BoardCraft by Quinn &amp; Co.</p>
</div></body></html>`;
  const text = (name: string) => `${name ? "Hi " + name.split(" ")[0] + ",\n\n" : ""}${message}\n\n${party}${when ? "\n" + when : ""}${ev.location ? "\n" + ev.location : ""}\n\nSee the invite or change your RSVP: ${link}\n\nYou're getting this because you asked for updates when you RSVP'd. Reply to reach your host. To stop updates, open the invite and uncheck "Email me updates".`;

  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100).map((g: any) => ({
      from: `${party} <party@${FROM_DOMAIN}>`,
      to: [g.email],
      reply_to: user.email,
      subject,
      html: html(g.name || ""),
      text: text(g.name || ""),
    }));
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("resend error", r.status, t.slice(0, 300));
      if (!sent) return json({ error: "send_failed" }, 502);
      break;
    }
    sent += batch.length;
  }
  await admin.from("guest_updates").insert({ event_id: ev.id, subject, recipients: sent });
  return json({ sent });
});
