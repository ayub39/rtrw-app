// ============================================================
//  Supabase Edge Function: kirim-push
// ------------------------------------------------------------
//  Ngirim Web Push ke langganan (push_sub) pakai VAPID.
//
//  Deploy:
//    supabase functions deploy kirim-push
//  Set secret (sekali):
//    supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:kamu@email.com
//  (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY otomatis tersedia.)
//
//  Panggil (POST JSON): { org_id?, user_id?, title, body, url? }
//   - org_id  : kirim ke semua langganan 1 organisasi
//   - user_id : kirim ke 1 user tertentu
//   (salah satu wajib diisi)
//
//  CATATAN KEAMANAN: fungsi ini belum cek role pemanggil. Untuk
//  produksi, batasi agar hanya pengurus yang boleh broadcast
//  (verifikasi JWT + cek is_pengurus), atau panggil via Database
//  Webhook server-side saja.
// ============================================================
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@laporpakrt.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { org_id, user_id, title, body, url } = await req.json();
    if (!org_id && !user_id) return json({ error: "org_id atau user_id wajib diisi" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    let q = sb.from("push_sub").select("endpoint,p256dh,auth");
    q = user_id ? q.eq("user_id", user_id) : q.eq("org_id", org_id);
    const { data: subs, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const payload = JSON.stringify({ title: title || "LaporPakRT", body: body || "", url: url || "./" });
    let ok = 0, gone = 0, fail = 0;
    await Promise.all((subs || []).map(async (s: any) => {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try { await webpush.sendNotification(sub, payload); ok++; }
      catch (e: any) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) { gone++; await sb.from("push_sub").delete().eq("endpoint", s.endpoint); }
        else fail++;
      }
    }));
    return json({ ok, gone, fail, total: (subs || []).length });
  } catch (e: any) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
});
