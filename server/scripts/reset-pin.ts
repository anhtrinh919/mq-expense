// Admin PIN reset — the only way to reset a forgotten PIN (no email, no in-app reset).
// A user tells the operator; the operator runs:
//   tsx server/scripts/reset-pin.ts <email> <newPin>
// Server-managed encryption means the data key is independent of the PIN, so this
// sets a new PIN without touching the user's synced data.

import { findByEmail, setPin } from "../lib/accounts.ts";

function main() {
  const [, , email, newPin] = process.argv;
  if (!email || !newPin) {
    console.error("usage: tsx server/scripts/reset-pin.ts <email> <newPin>");
    process.exit(1);
  }
  if (!/^\d{4,8}$/.test(newPin)) {
    console.error("error: PIN must be 4 to 8 digits");
    process.exit(1);
  }
  const account = findByEmail(email);
  if (!account) {
    console.error(`error: no account for ${email}`);
    process.exit(1);
  }
  setPin(account.id, newPin);
  console.log(`reset PIN for ${account.email} (${account.name}). They can log in with the new PIN; their data is unchanged.`);
}

main();
