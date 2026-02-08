# SQL Commands (SQLite) - Banking Demo Backend

## 1) Entrar a SQLite desde terminal (VS Code)

```bash
cd /Users/sebastiantrangol/Proyectos/BankingDemo/banking-demo-backend-mock
sqlite3 data/banking-demo.sqlite
```

Salir:

```sql
.quit
```

## 2) Comandos basicos de inspeccion

```sql
.tables
.schema users
.schema accounts
.schema movements
.schema sessions
.schema qa_flags
.schema transfers
```

## 3) Consultas utiles para login/sesion

Ver usuario por RUT:

```sql
SELECT id, type, identifier, name, blocked
FROM users
WHERE identifier = '16855463K';
```

Desbloquear usuario:

```sql
UPDATE users
SET blocked = 0
WHERE identifier = '16855463K';
```

Bloquear usuario:

```sql
UPDATE users
SET blocked = 1
WHERE identifier = '16855463K';
```

Ver sesiones activas de un usuario:

```sql
SELECT token, user_id, expires_at, revoked, device_platform, device_id
FROM sessions
WHERE user_id = 'usr_4'
ORDER BY expires_at DESC;
```

Revocar todas las sesiones de un usuario:

```sql
UPDATE sessions
SET revoked = 1
WHERE user_id = 'usr_4';
```

## 4) Cuentas y movimientos

Cuentas de un usuario:

```sql
SELECT id, user_id, type, currency, balance, number_masked
FROM accounts
WHERE user_id = 'usr_1';
```

Movimientos por cuenta:

```sql
SELECT id, account_id, date, description, amount, currency
FROM movements
WHERE account_id = 'acc_usr_1_1'
ORDER BY date DESC;
```

## 5) Transferencias

Ultimas transferencias:

```sql
SELECT id, from_account_id, to_user_id, to_account_id, amount, currency, created_at
FROM transfers
ORDER BY created_at DESC
LIMIT 20;
```

## 6) QA flags

Ver flags por token:

```sql
SELECT token, latency_ms, force_error, offline, force_session_expiry, session_policy
FROM qa_flags;
```

Limpiar todos los flags QA:

```sql
DELETE FROM qa_flags;
```

## 7) Ejecutar sin entrar a modo interactivo

Ejemplo (una sola linea desde zsh/bash):

```bash
sqlite3 /Users/sebastiantrangol/Proyectos/BankingDemo/banking-demo-backend-mock/data/banking-demo.sqlite \
"SELECT id,identifier,name,blocked FROM users;"
```
