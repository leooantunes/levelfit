// Exclui a conta de quem chama (exigência da App Store, regra 5.1.1(v)).
// Roda no servidor com a chave secreta — ela nunca vai para o app.
//
// Ordem: fotos das provas da pessoa → duelos em que ela é a única jogadora (e as fotos deles)
// → o usuário. O banco apaga em cascata a participação e as provas (on delete cascade);
// denúncias ficam anonimizadas (on delete set null).
//
// verify_jwt = false (recomendado com as novas chaves); o usuário é validado aqui dentro.
import { createClient } from 'npm:@supabase/supabase-js@2';

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
  if (!legacy) throw new Error('Chave secreta não disponível');
  return legacy;
}

async function removePhotos(admin: ReturnType<typeof createClient>, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await admin.storage.from('proofs').remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Não autenticado' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'Sessão inválida' }, 401);
  const uid = userData.user.id;

  try {
    // 1. Fotos das provas da pessoa.
    const { data: own, error: e1 } = await admin.from('checkins').select('photo_path').eq('player_id', uid);
    if (e1) throw e1;
    await removePhotos(admin, (own ?? []).map((r) => r.photo_path).filter(Boolean));

    // 2. Duelos em que ela é a única jogadora: some o duelo inteiro (com fotos de quem já saiu).
    const { data: mine, error: e2 } = await admin.from('duel_players').select('duel_id').eq('player_id', uid);
    if (e2) throw e2;
    for (const { duel_id } of mine ?? []) {
      const { count, error: e3 } = await admin
        .from('duel_players')
        .select('player_id', { count: 'exact', head: true })
        .eq('duel_id', duel_id);
      if (e3) throw e3;
      if ((count ?? 0) > 1) continue;
      const { data: rest, error: e4 } = await admin.from('checkins').select('photo_path').eq('duel_id', duel_id);
      if (e4) throw e4;
      await removePhotos(admin, (rest ?? []).map((r) => r.photo_path).filter(Boolean));
      const { error: e5 } = await admin.from('duels').delete().eq('id', duel_id);
      if (e5) throw e5;
    }

    // 3. O usuário (cascata: duel_players e checkins dele).
    const { error: e6 } = await admin.auth.admin.deleteUser(uid);
    if (e6) throw e6;

    return json({ ok: true });
  } catch (e) {
    console.error('delete-account', uid, e);
    return json({ error: 'Não foi possível excluir a conta agora. Tente de novo.' }, 500);
  }
});
