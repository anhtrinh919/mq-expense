// Admin: replace an account's synced country-code list with the canonical SEA list.
// Tombstones the account's existing countryCodes records and inserts the canonical set
// (encrypted with the account's data key), all with a bumped last-write-wins timestamp so
// the change propagates to the user's device on next sync. Does not touch past expenses
// (each expense copies its account code at capture time).
//   tsx server/scripts/set-country-codes.ts <email>
// Requires the same MQX_MASTER_KEY env as the server.

import { db } from "../db/sqlite.ts";
import { findByEmail } from "../lib/accounts.ts";
import { unwrapDek, encryptRecord } from "../lib/crypto.ts";

// Keep in sync with SEED_CODES in src/data/repos.ts (the default for fresh accounts).
const CODES: Array<{ country: string; accountCode: string }> = [
  { country: "Cambodia", accountCode: "8741/4109" },
  { country: "Indonesia", accountCode: "8741/4104" },
  { country: "Malaysia", accountCode: "8741/4102" },
  { country: "Myanmar", accountCode: "8741/4108" },
  { country: "Philippines", accountCode: "8741/4106" },
  { country: "Singapore", accountCode: "8741/4107" },
  { country: "Thailand", accountCode: "8741/4103" },
  { country: "Vietnam", accountCode: "8741/4105" },
  { country: "SEA Head Office & Others", accountCode: "8741/4101" },
];

function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("usage: tsx server/scripts/set-country-codes.ts <email>");
    process.exit(1);
  }
  const account = findByEmail(email);
  if (!account) {
    console.error(`error: no account for ${email}`);
    process.exit(1);
  }

  const dek = unwrapDek(account.enc_dek);
  const now = Date.now();

  const apply = db.transaction(() => {
    // Retire all existing country codes (propagates as deletes).
    db.prepare(
      "UPDATE sync_records SET data=NULL, deleted=1, updated_at=? WHERE account_id=? AND store='countryCodes'",
    ).run(now, account.id);

    // Insert the canonical list as fresh records, slightly newer so they win.
    const ins = db.prepare(
      "INSERT OR REPLACE INTO sync_records (account_id, store, record_id, data, updated_at, deleted) VALUES (?, 'countryCodes', ?, ?, ?, 0)",
    );
    CODES.forEach((c, i) => {
      const id = `cc_${now}_${i}`;
      const record = { id, country: c.country, accountCode: c.accountCode, sortOrder: i };
      ins.run(account.id, id, encryptRecord(JSON.stringify(record), dek), now + 1);
    });
  });
  apply();

  console.log(`Set ${CODES.length} country codes for ${email}. They'll appear on her device on the next sync (reopen the app).`);
}

main();
