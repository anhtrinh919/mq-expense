// Single-file SQLite store for Phase 3: accounts, invites, sessions, and per-user
// encrypted sync records. No user data is stored in the clear — sync_records.data is
// AES-256-GCM ciphertext under the account's wrapped DEK (see server/lib/crypto.ts).

import Database from "better-sqlite3";
import { DB_PATH } from "../lib/env.ts";

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,           -- stored lowercased
    name            TEXT NOT NULL,
    role            TEXT NOT NULL,                  -- 'manager' | 'peer'
    pin_hash        TEXT NOT NULL,
    pin_salt        TEXT NOT NULL,
    enc_dek         BLOB NOT NULL,                  -- per-user data key, wrapped under master key
    invited_by      TEXT,
    disabled        INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    INTEGER,
    created_at      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    token       TEXT PRIMARY KEY,
    created_by  TEXT NOT NULL,
    email       TEXT,
    status      TEXT NOT NULL,                      -- 'pending' | 'redeemed' | 'revoked' | 'expired'
    redeemed_by TEXT,
    expires_at  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);

  CREATE TABLE IF NOT EXISTS sync_records (
    account_id TEXT NOT NULL,
    store      TEXT NOT NULL,                       -- 'expenses' | 'images' | 'reports' | 'profile' | 'countryCodes'
    record_id  TEXT NOT NULL,
    data       BLOB,                                -- sealed (iv||tag||ciphertext); NULL when deleted
    updated_at INTEGER NOT NULL,                    -- last-write-wins key
    deleted    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, store, record_id)
  );
  CREATE INDEX IF NOT EXISTS idx_sync_cursor ON sync_records(account_id, updated_at);
`);
