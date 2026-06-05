// Admin: reset an account's first-run onboarding so the welcome wizard runs again.
// Flips onboardingComplete=false in the account's synced profile and bumps its
// last-write-wins timestamp, so the change wins over the copy on the user's device and
// propagates on their next sync. The user must then log out + log back in (the wizard
// is triggered on login). Keeps the rest of the profile (name, country, currency) intact.
//   tsx server/scripts/reset-onboarding.ts <email>
// Requires the same MQX_MASTER_KEY env as the server.

import { db } from "../db/sqlite.ts";
import { findByEmail } from "../lib/accounts.ts";
import { unwrapDek, decryptRecord, encryptRecord } from "../lib/crypto.ts";

function main() {
  const [, , email] = process.argv;
  if (!email) {
    console.error("usage: tsx server/scripts/reset-onboarding.ts <email>");
    process.exit(1);
  }
  const account = findByEmail(email);
  if (!account) {
    console.error(`error: no account for ${email}`);
    process.exit(1);
  }

  const row = db
    .prepare("SELECT data, deleted FROM sync_records WHERE account_id=? AND store='profile' AND record_id='profile'")
    .get(account.id) as { data: Buffer | null; deleted: number } | undefined;

  if (!row || row.deleted || !row.data) {
    console.log(`${email}: no synced profile yet — the first-run wizard already shows on next login. Nothing to reset.`);
    return;
  }

  const dek = unwrapDek(account.enc_dek);
  const profile = JSON.parse(decryptRecord(row.data, dek)) as Record<string, unknown>;
  profile.onboardingComplete = false;
  const sealed = encryptRecord(JSON.stringify(profile), dek);

  db.prepare(
    "UPDATE sync_records SET data=?, updated_at=?, deleted=0 WHERE account_id=? AND store='profile' AND record_id='profile'",
  ).run(sealed, Date.now(), account.id);

  console.log(`Reset onboarding for ${email}. On her device: log out, then log back in — the welcome wizard will run.`);
}

main();
