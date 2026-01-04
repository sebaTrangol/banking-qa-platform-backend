import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { store } from "../store/store";
import { isValidRut, normalizeRut } from "../utils/rut";


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
    : identifier;

  const user = store.users.find(
      u => u.type === identifierType && u.identifier === normalizedIdentifier
  );


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

  // Flags por token (por defecto)
  store.qaFlagsByToken.set(token, {
    latencyMs: 0,
    forceError: null,
    offline: false,
    forceSessionExpiry: false,
    sessionPolicy: "single"
  });

  // Policy single-session: revoca tokens previos del mismo user
  const policy = store.qaFlagsByToken.get(token)!.sessionPolicy;
  if (policy === "single") {
    for (const [t, s] of store.sessionsByToken.entries()) {
      if (s.userId === user.id) store.sessionsByToken.set(t, { ...s, revoked: true });
    }
  }

  store.sessionsByToken.set(token, { token, userId: user.id, expiresAt, revoked: false, device });

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
