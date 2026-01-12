import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { store } from "../store/store";

type JwtPayload = { sub?: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("Authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.missingToken" });
  }

  const token = match[1];

  // 1) firma JWT
  try {
    jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.invalidToken" });
  }

  // 2) sesión en store (revocado/expirado)
  const session = store.sessionsByToken.get(token);
  if (!session) {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.sessionNotFound" });
  }

  if (session.revoked) {
    return res.status(401).json({ errorCode: "SESSION_REVOKED", messageKey: "auth.error.sessionRevoked" });
  }

  const expiresAtMs = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return res.status(401).json({ errorCode: "SESSION_EXPIRED", messageKey: "auth.error.sessionExpired" });
  }

  // inyectar contexto
  (req as any).auth = { token, userId: session.userId };
  next();
}
