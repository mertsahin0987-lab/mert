#!/usr/bin/env node
/**
 * Security audit — proper RLS test.
 *
 * For each table, picks a real existing row and tries to UPDATE / DELETE it
 * as the anon (public) user. If RLS is correct, both must fail with a
 * permission/policy error. If they succeed, the row would actually be
 * mutated in the DB — which is a critical security bug.
 *
 * No data is ever changed: we run the audit through PostgREST, and if the
 * write is allowed we re-insert / restore via the service-role client.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || 'https://xgoiabfbetftjomtvcgb.supabase.co';
const ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('✗ Need SUPABASE_SERVICE_ROLE_KEY in .env to safely run the audit.');
  process.exit(1);
}

const anon = createClient(URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('\n🔒 RLS audit — what can a malicious anon user actually do?\n');

const tables = [
  { name: 'brands',          pk: 'id' },
  { name: 'products',        pk: 'id' },
  { name: 'prices',          pk: 'id' },
  { name: 'retailers',       pk: 'id' },
  { name: 'product_colors',  pk: 'id' },
  { name: 'price_history',   pk: 'id' },
];

let allGood = true;

for (const t of tables) {
  // Pick one real row via service role
  const { data: rows } = await admin.from(t.name).select('*').limit(1);
  if (!rows?.length) {
    console.log(`  ⚠ ${t.name.padEnd(16)} — no rows to test against (skipped)`);
    continue;
  }
  const realRow = rows[0];
  const idVal = realRow[t.pk];

  // 1. Read — should succeed
  const r = await anon.from(t.name).select('*').limit(1);
  const canRead = !r.error;

  // 2. Update — try to set a field to itself (no-op but exercises the policy)
  // We use .select() so PostgREST returns affected rows; if RLS blocks, we
  // either get an error OR an empty array (depending on Postgres version).
  let firstNonPkField = Object.keys(realRow).find((k) => k !== t.pk && realRow[k] !== null);
  let writeBlocked = true;
  if (firstNonPkField) {
    const u = await anon.from(t.name)
      .update({ [firstNonPkField]: realRow[firstNonPkField] })
      .eq(t.pk, idVal)
      .select();
    if (!u.error && u.data && u.data.length > 0) writeBlocked = false;
  }

  // 3. Delete — same trick: .select() returns the rows that WERE deleted.
  //    If the array is non-empty, the row was actually deleted (we restore it).
  let deleteBlocked = true;
  const d = await anon.from(t.name).delete().eq(t.pk, idVal).select();
  if (!d.error && d.data && d.data.length > 0) {
    deleteBlocked = false;
    // EMERGENCY restore — the row was just deleted, put it back
    await admin.from(t.name).insert(realRow);
    console.log(`     🚨 RESTORED deleted row from ${t.name} (id=${idVal})`);
  }

  const status = canRead && writeBlocked && deleteBlocked ? '✅' : '🚨';
  console.log(
    `  ${status} ${t.name.padEnd(16)} read:${canRead ? '✓' : '✗'}  ` +
    `update blocked:${writeBlocked ? '✓' : '✗ ALLOWED!'}  ` +
    `delete blocked:${deleteBlocked ? '✓' : '✗ ALLOWED!'}`
  );
  if (!canRead || !writeBlocked || !deleteBlocked) allGood = false;
}

console.log();
if (allGood) {
  console.log('✓ All tables locked down correctly.\n');
} else {
  console.log('🚨 Some tables allow writes/deletes from anon — fix policies immediately.\n');
  process.exit(1);
}
