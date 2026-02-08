# API Usage - Banking Demo

Ubicacion de coleccion y environment:
- `postman/BankingDemo.postman_collection.json`
- `postman/BankingDemo.local.postman_environment.json`

## 1) Requisitos previos

1. Levantar backend:
```bash
cd /Users/sebastiantrangol/Proyectos/BankingDemo/banking-demo-backend-mock
npm run dev
```

2. Verificar health:
```bash
curl http://192.168.0.88:4000/health
```
Respuesta esperada:
```json
{ "ok": true }
```

## 2) Importar en Postman

1. Importar:
- `BankingDemo.postman_collection.json`
- `BankingDemo.local.postman_environment.json`

2. Seleccionar environment: `Banking Demo Local`.

## 3) Variables del environment

- `baseUrl`: URL del backend (ej: `http://192.168.0.88:4000`)
- `rut`: RUT para login
- `password`: clave del usuario
- `accountId`: cuenta para consultar movimientos
- `toRut`: RUT destinatario transferencia
- `toAccountNumber`: numero cuenta destino
- `transferAmount`: monto transferencia
- `transferComment`: comentario transferencia

Variables de coleccion autogeneradas:
- `accessToken` (se setea en login)
- `userId` (se setea en login)
- `fromAccountId` (se setea en GET /accounts)
- `fromAccountNumber` (se setea en GET /accounts)

## 4) Flujo recomendado de ejecucion

1. `GET /health`
2. `POST /auth/login (RUT)`
3. `GET /accounts`
4. `GET /accounts/:id/movements`
5. `POST /transfers`
6. `POST /qa/flags` (opcional QA)
7. `POST /auth/logout`

## 5) Endpoints y uso

### GET /health
Verifica estado del backend.

Response `200`:
```json
{ "ok": true }
```

---

### POST /auth/login
Autentica usuario y retorna JWT.

Request body:
```json
{
  "identifierType": "RUT",
  "identifier": "201342347",
  "password": "123456",
  "device": {
    "platform": "android",
    "id": "emulator"
  }
}
```

Response `200`:
```json
{
  "session": {
    "accessToken": "jwt...",
    "expiresAt": "2026-02-08T...",
    "user": {
      "id": "usr_6",
      "name": "Gandita",
      "identifierType": "RUT",
      "identifierMasked": "12.***.***-9"
    }
  }
}
```

Errores frecuentes:
- `400 INVALID_REQUEST`
- `400 INVALID_RUT`
- `401 INVALID_CREDENTIALS`
- `403 USER_BLOCKED`

---

### POST /auth/logout
Revoca sesion actual.

Headers:
- `Authorization: Bearer {{accessToken}}`

Response `200`:
```json
{ "ok": true }
```

---

### GET /accounts
Retorna cuentas del usuario autenticado.

Headers:
- `Authorization: Bearer {{accessToken}}`

Response `200`:
```json
{
  "accounts": [
    {
      "id": "acc_usr_6_1",
      "type": "checking",
      "currency": "CLP",
      "balance": 210000,
      "numberMasked": "4888000"
    }
  ]
}
```

Errores:
- `401 UNAUTHORIZED`
- `401 SESSION_REVOKED`
- `401 SESSION_EXPIRED`

---

### GET /accounts/:id/movements
Retorna movimientos de una cuenta del usuario.

Headers:
- `Authorization: Bearer {{accessToken}}`

Path param:
- `id` (ej: `acc_usr_6_1`)

Response `200`:
```json
{
  "movements": [
    {
      "id": "m_123",
      "date": "2026-02-08T...",
      "description": "Transferencia recibida",
      "amount": 1000,
      "currency": "CLP"
    }
  ]
}
```

Errores:
- `404 ACCOUNT_NOT_FOUND`
- `401` por sesion/token

---

### POST /transfers
Transfiere desde cuenta origen a cuenta destino real del cliente (RUT + cuenta).

Headers:
- `Authorization: Bearer {{accessToken}}`
- `Content-Type: application/json`

Request body:
```json
{
  "fromAccountId": "acc_usr_6_1",
  "toIdentifierType": "RUT",
  "toIdentifier": "123456785",
  "toAccountNumber": "43211234",
  "amount": 1000,
  "comment": "prueba postman"
}
```

Response `201`:
```json
{
  "transfer": {
    "id": "trf_...",
    "fromAccountId": "acc_usr_6_1",
    "to": {
      "identifierType": "RUT",
      "identifier": "123456785",
      "accountNumber": "43211234",
      "name": "Juan Perez"
    },
    "amount": 1000,
    "currency": "CLP",
    "comment": "prueba postman",
    "createdAt": "2026-02-08T..."
  }
}
```

Errores:
- `400 INVALID_REQUEST`
- `400 INVALID_AMOUNT`
- `404 ACCOUNT_NOT_FOUND`
- `404 RECIPIENT_NOT_FOUND`
- `404 RECIPIENT_ACCOUNT_NOT_FOUND`
- `409 INSUFFICIENT_FUNDS`

---

### POST /qa/flags
Configura comportamiento QA por token.

Headers:
- `Authorization: Bearer {{accessToken}}`
- `Content-Type: application/json`

Request body:
```json
{
  "latencyMs": 0,
  "forceError": null,
  "offline": false,
  "forceSessionExpiry": false,
  "sessionPolicy": "single"
}
```

Response `200`:
```json
{
  "flags": {
    "latencyMs": 0,
    "forceError": null,
    "offline": false,
    "forceSessionExpiry": false,
    "sessionPolicy": "single"
  }
}
```

## 6) Troubleshooting rapido

1. `Network request timed out`
- Revisar `baseUrl` en environment.
- Confirmar IP actual Mac.
- Probar `GET /health` desde navegador del dispositivo.

2. `401 UNAUTHORIZED`
- Ejecutar login nuevamente.
- Confirmar que `{{accessToken}}` se seteo.

3. `RECIPIENT_ACCOUNT_NOT_FOUND`
- Validar que `toAccountNumber` exista para el RUT destino.

4. `USER_BLOCKED`
- Revisar `users.blocked` en SQLite.
