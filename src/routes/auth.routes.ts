import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { isValidRut, normalizeRut } from "../utils/rut";
import { requireAuth } from "../middlewares/auth";
import { applyQaFlags } from "../middlewares/qa";
import { db } from "../db";


export const authRouter = Router();

authRouter.post("/auth/login", (req, res) => {
  console.log("POSTMAN BODY >>>", req.body);
  console.log("CONTENT-TYPE >>>", req.headers["content-type"]);

  const { identifierType, identifier, password, device } = req.body ?? {};

  // Validación formal de RUT (solo input limpio, sin puntos/guion)
  if (identifierType === "RUT") {
    const normalized = normalizeRut(String(identifier));

    // Regla 2A: backend solo acepta limpio (si venía con separadores, se limpia igual,
    // pero si quedan caracteres inválidos, falla)
    if (!isValidRut(normalized)) {
      return res.status(400).json({
        errorCode: "INVALID_RUT",
        messageKey: "auth.error.invalidRut"
      });
    }
  }

  if (!identifierType || !identifier || !password) {
    return res.status(400).json({ errorCode: "INVALID_REQUEST", messageKey: "common.error.invalidRequest" });
  }

  const normalizedIdentifier =
    identifierType === "RUT"
      ? normalizeRut(String(identifier))
      : String(identifier).trim().toLowerCase();

  const user = db
    .prepare("SELECT id, type, identifier, password, name, blocked FROM users WHERE type = ? AND identifier = ?")
    .get(identifierType, normalizedIdentifier) as
    | { id: string; type: "RUT" | "EMAIL"; identifier: string; password: string; name: string; blocked: number }
    | undefined;


  if (!user || user.password !== password) {
    return res.status(401).json({ errorCode: "INVALID_CREDENTIALS", messageKey: "auth.error.invalidCredentials" });
  }

  if (user.blocked) {
    return res.status(403).json({ errorCode: "USER_BLOCKED", messageKey: "auth.error.userBlocked" });
  }

  // Token JWT firmado mock (opción 5C)
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: env.TOKEN_TTL_SECONDS });

  // Expiración forzada (header)
  const forceExpiryHeader = req.header("X-Force-Session-Expiry") === "true";
  const expiresAt = forceExpiryHeader
    ? new Date(Date.now()).toISOString()
    : new Date(Date.now() + env.TOKEN_TTL_SECONDS * 1000).toISOString();

  // Crear sesión
  db.prepare(
    `
    INSERT INTO sessions (token, user_id, expires_at, revoked, device_platform, device_id)
    VALUES (@token, @user_id, @expires_at, 0, @device_platform, @device_id)
  `
  ).run({
    token,
    user_id: user.id,
    expires_at: expiresAt,
    device_platform: device?.platform ?? null,
    device_id: device?.id ?? null,
  });

  // Flags por token (por defecto)
  db.prepare(
    `
    INSERT INTO qa_flags (token, latency_ms, force_error, offline, force_session_expiry, session_policy)
    VALUES (@token, 0, NULL, 0, 0, 'single')
  `
  ).run({ token });

  // Policy single-session: revoca tokens previos del mismo user
  db.prepare("UPDATE sessions SET revoked = 1 WHERE user_id = ? AND token <> ?").run(user.id, token);

  return res.status(200).json({
    session: {
      accessToken: token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        identifierType: user.type,
        identifierMasked: user.type === "RUT" ? "12.***.***-9" : "q***@demo.cl"
      }
    }
  });  
});

authRouter.post("/auth/logout", requireAuth, applyQaFlags, (req, res) => {
  const token = (req as any).auth.token as string;
  db.prepare("UPDATE sessions SET revoked = 1 WHERE token = ?").run(token);
  db.prepare("DELETE FROM qa_flags WHERE token = ?").run(token);
  return res.status(200).json({ ok: true });
});
