import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "banking-demo.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('RUT','EMAIL')),
      identifier TEXT NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      blocked INTEGER NOT NULL DEFAULT 0,
      UNIQUE(type, identifier)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL,
      balance REAL NOT NULL,
      number_masked TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      device_platform TEXT,
      device_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qa_flags (
      token TEXT PRIMARY KEY,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      force_error INTEGER,
      offline INTEGER NOT NULL DEFAULT 0,
      force_session_expiry INTEGER NOT NULL DEFAULT 0,
      session_policy TEXT NOT NULL DEFAULT 'single',
      FOREIGN KEY (token) REFERENCES sessions(token) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_account_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      to_account_id TEXT NOT NULL,
      to_identifier_type TEXT NOT NULL CHECK (to_identifier_type IN ('RUT','EMAIL')),
      to_identifier TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id)
    );
  `);
}

export function seedDb() {
  const row = db.prepare("SELECT COUNT(1) as count FROM users").get() as { count: number };
  if (row.count > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (id, type, identifier, password, name, blocked) VALUES (@id, @type, @identifier, @password, @name, @blocked)"
  );
  const insertAccount = db.prepare(
    "INSERT INTO accounts (id, user_id, type, currency, balance, number_masked) VALUES (@id, @user_id, @type, @currency, @balance, @number_masked)"
  );
  const insertMovement = db.prepare(
    "INSERT INTO movements (id, account_id, date, description, amount, currency) VALUES (@id, @account_id, @date, @description, @amount, @currency)"
  );

  const users = [
    { id: "usr_1", type: "RUT", identifier: "123456785", password: "123456", name: "Juan Pérez", blocked: 0 },
    { id: "usr_2", type: "EMAIL", identifier: "qa@demo.cl", password: "123456", name: "QA Demo", blocked: 0 },
    { id: "usr_3", type: "RUT", identifier: "111111111", password: "123456", name: "Blocked User", blocked: 0 },
    { id: "usr_4", type: "RUT", identifier: "16855463K", password: "123456", name: "seba T", blocked: 0 },
    { id: "usr_5", type: "RUT", identifier: "163334445", password: "123456", name: "Nino Antonio", blocked: 0 },
    { id: "usr_6", type: "RUT", identifier: "201342347", password: "123456", name: "Gandita", blocked: 0 },
  ];

  const accounts = [
    { id: "acc_usr_1_1", user_id: "usr_1", type: "checking", currency: "CLP", balance: 1250000, number_masked: "43211234" },
    { id: "acc_usr_1_2", user_id: "usr_1", type: "savings", currency: "CLP", balance: 320000, number_masked: "4444876" },
    { id: "acc_usr_2_1", user_id: "usr_2", type: "checking", currency: "CLP", balance: 780000, number_masked: "45332211" },
    { id: "acc_usr_2_2", user_id: "usr_2", type: "savings", currency: "CLP", balance: 98000, number_masked: "4055667" },
    { id: "acc_usr_3_1", user_id: "usr_3", type: "checking", currency: "CLP", balance: 15000, number_masked: "4011999" },
    { id: "acc_usr_4_1", user_id: "usr_4", type: "checking", currency: "CLP", balance: 0, number_masked: "4000111" },
    { id: "acc_usr_5_1", user_id: "usr_5", type: "checking", currency: "CLP", balance: 450000, number_masked: "4999000" },
    { id: "acc_usr_6_1", user_id: "usr_6", type: "checking", currency: "CLP", balance: 210000, number_masked: "4888000" },
  ];

  const movements = [
    { id: "m_1", account_id: "acc_usr_1_1", date: "2025-02-01T12:00:00.000Z", description: "Compra débito", amount: -25990, currency: "CLP" },
    { id: "m_2", account_id: "acc_usr_1_1", date: "2025-01-30T09:20:00.000Z", description: "Transferencia recibida", amount: 120000, currency: "CLP" },
    { id: "m_3", account_id: "acc_usr_1_1", date: "2025-01-27T18:40:00.000Z", description: "Pago de servicios", amount: -18900, currency: "CLP" },
    { id: "m_4", account_id: "acc_usr_1_2", date: "2025-02-02T10:10:00.000Z", description: "Interés mensual", amount: 3500, currency: "CLP" },
    { id: "m_5", account_id: "acc_usr_2_1", date: "2025-02-03T08:00:00.000Z", description: "Sueldo", amount: 980000, currency: "CLP" },
    { id: "m_6", account_id: "acc_usr_2_1", date: "2025-02-04T19:30:00.000Z", description: "Compra crédito", amount: -12990, currency: "CLP" },
    { id: "m_7", account_id: "acc_usr_3_1", date: "2025-01-15T15:00:00.000Z", description: "Transferencia enviada", amount: -5000, currency: "CLP" },
    { id: "m_8", account_id: "acc_usr_5_1", date: "2025-02-05T11:45:00.000Z", description: "Compra débito", amount: -7900, currency: "CLP" },
    { id: "m_9", account_id: "acc_usr_6_1", date: "2025-02-06T13:10:00.000Z", description: "Transferencia recibida", amount: 45000, currency: "CLP" },
  ];

  const txn = db.transaction(() => {
    for (const u of users) insertUser.run(u);
    for (const a of accounts) insertAccount.run(a);
    for (const m of movements) insertMovement.run(m);
  });
  txn();
}
