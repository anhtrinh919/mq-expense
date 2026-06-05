// Admin: create an account directly (operator-only). Used to seed a second manager
// or pre-create an account outside the invite flow. Accounts are otherwise invite-only.
//   tsx server/scripts/add-account.ts <email> <name> <pin> [manager|peer]
// Requires the same MQX_MASTER_KEY env as the server (it wraps the new account's data key).

import { findByEmail, createAccount, type Role } from "../lib/accounts.ts";

function main() {
  const [, , email, name, pin, roleArg] = process.argv;
  if (!email || !name || !pin) {
    console.error("usage: tsx server/scripts/add-account.ts <email> <name> <pin> [manager|peer]");
    process.exit(1);
  }
  if (!/^\d{4,8}$/.test(pin)) {
    console.error("error: PIN must be 4 to 8 digits");
    process.exit(1);
  }
  const role: Role = roleArg === "peer" ? "peer" : "manager";
  if (roleArg && roleArg !== "peer" && roleArg !== "manager") {
    console.error("error: role must be 'manager' or 'peer'");
    process.exit(1);
  }
  if (findByEmail(email)) {
    console.error(`error: an account already exists for ${email}`);
    process.exit(1);
  }
  const account = createAccount({ email, name, role, pin });
  console.log(`created ${account.role} account ${account.email} (${account.name}). They can log in with this PIN.`);
}

main();
