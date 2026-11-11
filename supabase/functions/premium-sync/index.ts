// Sincroniza o Premium de um usuário com o RevenueCat e grava em public.entitlements.
//
// Dois jeitos de chamar:
// 1. Webhook do RevenueCat (header Authorization = segredo REVENUECAT_WEBHOOK_AUTH):
//    sincroniza todos os IDs do evento (app_user_id, aliases, transferências).
// 2. Pelo app, logo depois de comprar/restaurar (Authorization = token do usuário):
//    sincroniza só quem chamou.
//
// Em ambos, o estado vem de GET /v1/subscribers do RevenueCat (recomendação deles:
// não interpretar cada tipo de evento). O app usa o ID do usuário do Supabase como
// appUserID no RevenueCat.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   REVENUECAT_SECRET_API_KEY  — chave secreta do projeto no RevenueCat
//   REVENUECAT_WEBHOOK_AUTH    — o mesmo valor configurado no header do webhook
// verify_jwt = false: a autenticação é feita aqui dentro.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Entitlement do painel do RevenueCat que libera o Pro (mensal, anual e vitalício).
// Vitalício = expires_date null → is_lifetime.
const ENTITLEMENT = 'levelfit_pro';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    try {
      const key = JSON.parse(keys).default;
      if (key) return key;
    } catch {
      // cai para a chave legada
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('Chave secreta do Supabase não disponível');
  return legacy;
}

type RcEntitlement = { expires_date: string | null; grace_period_expires_date: string | null; product_identifier: string };

async function sync(admin: ReturnType<typeof createClient>, uid: string, rcKey: string) {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${rcKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat respondeu ${res.status}`);
  const body = await res.json();
  const ent: RcEntitlement | undefined = body?.subscriber?.entitlements?.[ENTITLEMENT];

  const ends = [ent?.expires_date, ent?.grace_period_expires_date].filter(Boolean).map((d) => new Date(d!).getTime());
  const isLifetime = !!ent && ent.expires_date === null;
  const premiumUntil = ends.length ? new Date(Math.max(...ends)).toISOString() : null;

  const { error } = await admin.from('entitlements').upsert({
    user_id: uid,
    premium_until: premiumUntil,
    is_lifetime: isLifetime,
    product_id: ent?.product_identifier ?? null,
    updated_at: new Date().toISOString(),
  });
  // Usuário apagado ou ID desconhecido: ignora (FK com auth.users).
  if (error && !/foreign key/i.test(error.message)) throw error;

  const active = isLifetime || (premiumUntil !== null && new Date(premiumUntil).getTime() > Date.now());
  return { premium: active, premiumUntil, isLifetime };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const rcKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!rcKey) return json({ error: 'Assinaturas ainda não configuradas' }, 503);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = req.headers.get('Authorization') ?? '';
  const webhookAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');

  try {
    // 1. Webhook do RevenueCat
    if (webhookAuth && (auth === webhookAuth || auth === `Bearer ${webhookAuth}`)) {
      const payload = await req.json().catch(() => null);
      const ev = payload?.event ?? {};
      const ids = new Set<string>(
        [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? []), ...(ev.transferred_from ?? []), ...(ev.transferred_to ?? [])].filter(
          (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id),
        ),
      );
      for (const id of ids) await sync(admin, id, rcKey);
      return json({ ok: true, synced: ids.size });
    }

    // 2. App: usuário logado
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Não autenticado' }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'Sessão inválida' }, 401);
    return json(await sync(admin, data.user.id, rcKey));
  } catch (e) {
    console.error('premium-sync', e);
    return json({ error: 'Não foi possível verificar a assinatura agora.' }, 500);
  }
});
